/**
 * lib/db
 * model definitions
 */

const path = require('path');
const Sequelize = require('sequelize');

const log = require('./log');
const util = require('./util');

const sequelize = new Sequelize(null, null, null, {
  dialect: process.env.DB_DIALECT,
  storage: process.env.DB_STORAGE,
  logging: log.debug,
});


// import models
const Report = sequelize.import(path.join(__dirname, '/../models', 'report.js'));

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
async function getLatestReport(offset = 0) {
  const reportModel = await Report.find({
    limit: 1,
    offset,
    order: [
      ['postGuid', 'DESC'],
    ],
  });
  if (!reportModel) {
    return null;
  }
  const report = reportModel.get();
  const prev = await getPrevId(report);

  return util.parseReportForTemplate(report, {
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

  return util.parseReportForTemplate(report, nextPrev);
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
      log.debug(`postGuid ${props.postGuid} already exists in db, skipping.`);
      return false;
    }
    throw error;
  });

module.exports = {
  sequelize,
  Report,
  getLatestReport,
  getReportById,
  createReport,
  getAdjacentIds,
};
