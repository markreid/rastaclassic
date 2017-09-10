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

const { MAGIC_SEAWEED_API_KEY, MAGIC_SEAWEED_SPOT_ID, TIMEZONE } = process.env;


// fetch a forecast from MSW
function fetchForecast(spotId) {
  const url = `https://magicseaweed.com/api/${MAGIC_SEAWEED_API_KEY}/forecast/?spot_id=${spotId}`;
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        const err = new Error(`Bad response fetching Magic Seaweed forecast: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response.text();
    });
}


// fetch a forecast and put it in the db
function fetchAndSave() {
  const spotId = Number(MAGIC_SEAWEED_SPOT_ID);
  assert.ok(spotId);
  log.info(`fetching MSW forecast for spotId ${spotId}`);
  return fetchForecast(spotId)
    .then((json) => {
      db.Forecast.create({
        json,
        spotId,
      });
    });
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

  if (msToSync) {
    log.info(`setTimeout for msw.sync() in ${msToSync} ms`);
    return setTimeout(sync, msToSync);
  }

  // we actually have to sync, so do it.
  log.info('time to sync msw');
  return fetchAndSave()
    .then(sync);
}

module.exports = {
  fetchForecast,
  fetchAndSave,
  sync,
};
