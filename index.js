// rasta classic
// yeeeee boy

require('dotenv-safe').load();

const express = require('express');
const morgan = require('morgan');
const engines = require('consolidate');

const log = require('./lib/log');
const db = require('./lib/db');
const util = require('./lib/util');

const { PORT, SYNC_EVERY_SECONDS } = process.env;
const SAFE_EXIT = new Error('SAFE_EXIT');

// sync sequelize models
db.sequelize.sync().then(() => log.info('synced sequelize models'));

// configure express app
const app = express();
app.use(morgan('dev', {
  stream: log.morganStream,
}));
app.use('/public', express.static('./public'));
app.engine('hjs', engines.hogan);

// configure the routes
app.get('/:offset?', (req, res) => {
  const { offset } = req.params;
  return db.getLatestReport(Number(offset) || 0)
    .then(report => res.render('index.hjs', report))
    .catch((error) => {
      log.error(error);
      res.status(500).send({ error });
    });
});

// and away we go...
app.listen(PORT, () => {
  log.info(`RastaClassic listening on port ${PORT}`);
  log.info(`Syncing with rasta every ${SYNC_EVERY_SECONDS} seconds...`);
});


/**
 * Hit Rasta's RSS feed and create any reports that we're missing.
 * @return {Promise}
 */
function getLatest() {
  log.info('Processing RSS feed...');
  return util.fetchRSS()
    .then(xml => util.parsePostsFromFeed(xml))
    .then(posts => util.filterPostsForReports(posts))
    .then(reports => reports.map(report => util.parseReport(report)))
    .then(reports => util.sequentialPromises(reports.map(report => () =>
      db.createReport(report)
        .then((created) => {
          if (created) {
            log.info(`Created report ${report.postGuid}.`);
            return util.snatchReportPhotos(report);
          }
          return false;
        }) // eslint-disable-line comma-dangle
    )))
    .then(() => {
      log.info('Finished processing RSS feed');
    })
    .catch((error) => {
      log.error('Error processing RSS feed:');
      log.error(error);
    });
}

// ping rasta's server for the surf report IF:
// 1. we don't have today's report
// 2. it's after 8:30am
function sync() {
  log.info('Syncing...');
  util.isReportMissing()
    .then((isMissing) => {
      if (!isMissing) {
        log.info('We already have today\'s report.');
        throw SAFE_EXIT;
      }
      log.info('We are missing today\'s report.');
      return util.isReportTime();
    })
    .then((isReportTime) => {
      if (!isReportTime) {
        log.info('It isn\'t time for Rasta\'s report yet.');
        throw SAFE_EXIT;
      }
      log.info('Rasta should be publishing his report soon.');
      return getLatest();
    })
    .catch((error) => {
      if (error !== SAFE_EXIT) {
        log.error('Error running sync():');
        log.error(error);
      }
    })
    .then(() => {
      log.info(`Checking again in ${SYNC_EVERY_SECONDS} seconds`);
      setTimeout(sync, SYNC_EVERY_SECONDS * 1000);
    });
}

util.createPhotosFolder().then(() => sync());
