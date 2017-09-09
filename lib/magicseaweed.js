/**
 * lib/magicseaweed
 * handle interactions with the Magic Seaweed API
 */

const fetch = require('node-fetch');

const { MAGIC_SEAWEED_API_KEY, MAGIC_SEAWEED_SPOT_ID } = process.env;

const API_URL = `https://magicseaweed.com/api/${MAGIC_SEAWEED_API_KEY}/forecast/?spot_id=${MAGIC_SEAWEED_SPOT_ID}`;

function fetchForecast() {
  return fetch(API_URL)
    .then((response) => {
      if (!response.ok) {
        const err = new Error(`Bad response fetching Magic Seaweed forecast: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response.text();
    });
}


module.exports = {
  fetchForecast,
};
