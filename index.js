// rasta classic
// yeeeee boy

require('dotenv-safe').load();

const express = require('express');
const morgan = require('morgan');
const engines = require('consolidate');

const log = require('./lib/log');
const db = require('./lib/db');
const util = require('./lib/util');
const router = require('./lib/router');
const rasta = require('./lib/rasta');
const msw = require('./lib/magicseaweed');

const { PORT, SYNC_EVERY_SECONDS } = process.env;

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
app.use(router);

// start listening
app.listen(PORT, () => {
  log.info(`RastaClassic listening on port ${PORT}`);
  log.info(`Syncing with rasta every ${SYNC_EVERY_SECONDS} seconds...`);
});


// sync sequelize models,
// ensure photos folder exists,
// sync with rasta's server
db.sequelize.sync()
  .then(() => log.info('synced sequelize models'))
  .then(() => util.createPhotosFolder())
  .then(() => log.debug('created photos folder'))
  .then(() => rasta.sync())
  .then(() => msw.sync());

