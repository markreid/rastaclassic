/**
 * lib/magicseaweed
 * handle interactions with the Magic Seaweed API
 */

const fetch = require('node-fetch');
const assert = require('assert');
const moment = require('moment-timezone');

const db = require('./db');
const util = require('./util');
const log = require('./log');

const { MAGIC_SEAWEED_API_KEY, MAGIC_SEAWEED_SPOT_IDS, TIMEZONE } = process.env;

const SPOT_IDS = MAGIC_SEAWEED_SPOT_IDS.split(',');
log.info(`Magic Seaweed Spot IDs are ${SPOT_IDS.join(', ')}`);


// fetch a forecast from MSW
function fetchForecast(spotId) {
  const url = `https://magicseaweed.com/api/${MAGIC_SEAWEED_API_KEY}/forecast/?spot_id=${spotId}&units=uk`;
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        const err = new Error(`Bad response fetching Magic Seaweed forecast: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response.text();
    })
    .catch(err => log.error('Error in fetchForecast()', err));
}


// fetch a forecast and put it in the db
function fetchAndSave(spotId) {
  assert.ok(spotId);
  log.info(`fetching MSW forecast for spotId ${spotId}`);
  return fetchForecast(spotId)
    .then((json) => {
      db.Forecast.create({
        json,
        spotId,
      });
    })
    .catch(err => log.error('Error in magicseaweed/fetchAndSavec()', err));
}

function fetchAndSaveAllSpots() {
  return util.sequentialPromises(SPOT_IDS.map(spotId => () => fetchAndSave(spotId)));
}


async function whenToSync() {
  // get the most recent forecast
  const latest = await db.getLatestForecast();
  const timestamp = latest ? latest.timestamp : 1;
  log.info(`Latest forecast timestamp is ${moment(timestamp).tz(TIMEZONE)}`);

  const nextFetchAt = util.nextFetchTime(timestamp);
  const msUntilNextFetch = util.msUntil(nextFetchAt);
  log.info(`Next forecast fetch is at ${nextFetchAt}, ${nextFetchAt.fromNow()}`);
  return msUntilNextFetch;
}

async function sync() {
  log.info('msw.sync()');

  const msToSync = await whenToSync();

  if (msToSync > 0) {
    log.info(`setTimeout for msw.sync() in ${msToSync} ms`);
    return setTimeout(sync, msToSync);
  }

  // we actually have to sync, so do it.
  log.info('time to sync msw');
  return fetchAndSaveAllSpots()
    .then(sync)
    .catch(err => log.error('Error in magicseaweed/sync after fetchAndSaveAllSpots()', err));
}

module.exports = {
  fetchForecast,
  fetchAndSave,
  sync,
};
