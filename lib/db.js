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
  logging: log.debug,
});


// import models
const Report = sequelize.import(path.join(__dirname, '/../models', 'report.js'));


// parse a report from the db for the template.
// right now just adds the .extraImages property.
function reportForTemplate(report) {
  return Object.assign({}, report, {
    extraImages: report.postImages.split(',').map((img, i) => ({
      filename: `${report.postGuid}-${i}.jpg`,
    })).slice(1),
  });
}


// get the latest surf report
const getLatestReport = (offset = 0) => Report.find({
  limit: 1,
  offset,
  order: [
    ['postGuid', 'DESC'],
  ],
}).then((report) => {
  if (report) {
    return reportForTemplate(report.get());
  }
  return null;
});


// get a single report by its id
const getReportById = id => Report.findById(id).then((report) => {
  if (report) {
    return reportForTemplate(report.get());
  }
  return null;
});


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
};
