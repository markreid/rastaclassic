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

// get the latest surf report
const getLatestReport = (offset = 0) => Report.find({
  limit: 1,
  offset,
  order: [
    ['postGuid', 'DESC'],
  ],
}).then((report) => {
  if (report) {
    return report.get();
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
  createReport,
};
