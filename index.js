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


// configure the routes
app.get('/reports/all', (req, res) => { // eslint-disable-line arrow-body-style
  return db.Report.findAll({
    attributes: ['id', 'date'],
    order: [
      ['postGuid', 'DESC'],
    ]
  })
    .then((reports) => {
      res.render('report-list.hjs', {
        reports,
      });
    });
});

app.get('/reports/:id', (req, res) => {
  const { id } = req.params;
  return db.getReportById(id)
    .then((report) => {
      if (!report) {
        return res.status(404).send('404 bro');
      }
      return res.render('report.hjs', report);
    })
    .catch((error) => {
      log.error(error);
      res.status(500).send('500');
    });
});

app.get('/:offset?', (req, res) => {
  const { offset } = req.params;
  return db.getLatestReport(Number(offset) || 0)
    .then(report => res.render('report.hjs', report))
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

// start syncing with rasta's server
util.createPhotosFolder().then(() => util.sync());
