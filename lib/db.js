/**
 * lib/db
 * model definitions
 */

const path = require('path');
const Sequelize = require('sequelize');

const log = require('./log');

const sequelize = new Sequelize(null, null, null, {
  dialect: process.env.DB_DIALECT,
  storage: process.env.DB_STORAGE,
  logging: (query, debugInfo) => { // eslint-disable-line no-unused-vars
    log.debug(query);
  },
});


// import models
const Report = sequelize.import(path.join(__dirname, '/../models', 'report.js'));
const Forecast = sequelize.import(path.join(__dirname, '/../models', 'forecast.js'));

/**
 * Add a couple of extra attributes to a report before
 * it gets passed to a view.
 * @param  {Object} report
 * @param  {Object} nextPrev
 * @return {Object}
 */
function parseReportForTemplate(report, nextPrev = {}) {
  const { next, prev } = nextPrev;
  const postImages = report.postImages ? report.postImages.split(',') : [];
  return Object.assign({}, report, {
    extraImages: postImages.map((img, i) => ({
      filename: `${report.postGuid}-${i}.jpg`,
    })).slice(1),
    next,
    prev,
  });
}

// get the id/date of the next surf report, if available.
function getNextId(report) {
  return Report.find({
    where: {
      postGuid: {
        $gt: report.postGuid,
      },
    },
    order: [
      ['postGuid', 'ASC'],
    ],
    limit: 1,
    attributes: ['id', 'date'],
  });
}

// get the id/date of the previous surf report, if available.
function getPrevId(report) {
  return Report.find({
    where: {
      postGuid: {
        $lt: report.postGuid,
      },
    },
    order: [
      ['postGuid', 'DESC'],
    ],
    limit: 1,
    attributes: ['id', 'date'],
  });
}

// given a report, return the id of the next and previous reports.
async function getAdjacentIds(report) {
  const next = await getNextId(report);
  const prev = await getPrevId(report);

  return {
    next: next ? next.get() : null,
    prev: prev ? prev.get() : null,
  };
}


// get the latest surf report
async function getLatestReport() {
  const reportModel = await Report.find({
    limit: 1,
    order: [
      ['postGuid', 'DESC'],
    ],
  });
  if (!reportModel) {
    return null;
  }
  const report = reportModel.get();
  const prev = await getPrevId(report);

  return parseReportForTemplate(report, {
    prev,
  });
}


// get a single report by its id
async function getReportById(id) {
  const reportModel = await Report.findById(id);
  if (!reportModel) {
    return null;
  }

  const report = reportModel.get();
  const nextPrev = await getAdjacentIds(report);

  return parseReportForTemplate(report, nextPrev);
}

// get a single forecast by its id
function getForecastById(forecastId) {
  return Forecast.findById(forecastId)
    .then((forecast) => {
      if (!forecast) {
        return null;
      }
      const { id, spotId, json, timestamp } = forecast.get();
      return {
        id,
        spotId,
        timestamp,
        json: JSON.parse(json),
      };
    });
}

function getLatestForecast() {
  return Forecast.find({
    limit: 1,
    order: [
      ['id', 'DESC'],
    ],
  });
}

// create a surf report.
// silently ignores unique constraints on postGuid.
const createReport = props => Report.create(props)
  .then((report) => {
    log.info(`Added surf report ${props.postGuid} to the db.`);
    return report;
  })
  .catch((error) => {
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields.includes('postGuid')) {
      log.info(`postGuid ${props.postGuid} already exists in db, skipping.`);
      return false;
    }
    log.error(error);
    throw error;
  });


module.exports = {
  sequelize,
  Report,
  Forecast,
  getLatestReport,
  getReportById,
  getForecastById,
  getLatestForecast,
  createReport,
  getAdjacentIds,
};
