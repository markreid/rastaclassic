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


// sync sequelize models
db.sequelize.sync().then(() => log.info('synced sequelize models'));

// configure express app
const app = express();
app.use(morgan('dev', {
  stream: log.morganStream,
}));
app.use('/public', express.static('./public', {
  maxAge: 604800000, // cache for a week
}));
app.engine('hjs', engines.hogan);

// make cachebust available as context to all .render() calls
app.locals.cachebust = util.generateCachebust();


// configure the routes...

// home - latest report
app.get('/', (req, res) => db.getLatestReport()
  .then((report) => {
    if (!report) {
      return res.status(404).render('404.hjs');
    }
    return res.render('report.hjs', report);
  })
  .catch((error) => {
    log.error(error);
    res.status(500).send({ error });
  }));

// report index
app.get('/reports', (req, res) => { // eslint-disable-line arrow-body-style
  return db.Report.findAll({
    attributes: ['id', 'date'],
    order: [
      ['postGuid', 'DESC'],
    ],
  })
    .then((reports) => {
      res.render('report-list.hjs', {
        reports,
      });
    });
});

// report by id
app.get('/reports/:id', (req, res) => {
  const { id } = req.params;
  return db.getReportById(id)
    .then((report) => {
      if (!report) {
        return res.status(404).render('404.hjs');
      }
      return res.render('report.hjs', report);
    })
    .catch((error) => {
      log.error(error);
      res.status(500).send('500');
    });
});

// anything else is a 404
app.get('*', (req, res) => res.status(404).render('404.hjs'));


// and away we go...
app.listen(PORT, () => {
  log.info(`RastaClassic listening on port ${PORT}`);
  log.info(`Syncing with rasta every ${SYNC_EVERY_SECONDS} seconds...`);
});

// start syncing with rasta's server
util.createPhotosFolder().then(() => util.sync());
