/**
 * lib/router
 * express router
 */

const express = require('express');

const log = require('./log');
const db = require('./db');

const router = new express.Router();


// home - latest report
router.get('/', (req, res) => db.getLatestReport()
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
router.get('/reports', (req, res) => db.Report.findAll({
  attributes: ['id', 'date'],
  order: [
    ['postGuid', 'DESC'],
  ],
})
  .then((reports) => {
    res.render('report-list.hjs', {
      reports,
    });
  }));

// report by id
router.get('/reports/:id', (req, res) => {
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

// report JSON index
router.get('/api/reports', (req, res) =>
  db.Report.findAll({
    attributes: ['id', 'date', 'postGuid'],
    order: [
      ['postGuid', 'DESC'],
    ],
  })
    .then(reports => res.send(reports))
);

// report JSON by id
router.get('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  return db.getReportById(id)
    .then((report) => {
      if (!report) {
        return res.status(404).send({ error: 404 });
      }
      return res.send(report);
    })
    .catch((error) => {
      log.error(error);
      res.status(500).send('500');
    });
});

// forecast by ID
router.get('/api/forecasts/:id', (req, res) => {
  const { id } = req.params;
  return db.getForecastById(id)
    .then((forecast) => {
      if (!forecast) {
        return res.status(404).send({
          error: 404,
        });
      }

      return res.send(forecast);
    });
});

// anything else is a 404
router.get('*', (req, res) => res.status(404).render('404.hjs'));

module.exports = router;
