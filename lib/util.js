/**
 * lib/util
 *
 * utilities.
 */

const cheerio = require('cheerio');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { promisify } = require('util');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const http = require('http');

const db = require('./db');
const log = require('./log');

// promisification
const parseStringAsync = promisify(new xml2js.Parser().parseString);

// constants
const SAFE_EXIT = new Error('SAFE_EXIT');
const GUID_REGEX = /\?p=([0-9]+)/;
const TITLE_REGEX = /surf report/i;
const SWELL_REGEX = /([0-9]?( to )?[0-9])ft/i;
const HIGH_TIDE_REGEX = /((H.T|high tide) (\d{1,2}.\d{1,2}.?[ap].?m))/i;
const LOW_TIDE_REGEX = /((L.T|low tide) (\d{1,2}.\d{1,2}.?[ap].?m))/i;
const DATE_FORMAT = 'dddd, D MMMM YYYY - h:mm A';


const { CACHEBUST, TIMEZONE, RSS_FEED_URL, SYNC_EVERY_SECONDS } = process.env;


/**
 * Runs a set of Promises in sequence.
 * Pass an array of 'factory' functions that return promises.
 * Returns an array of the resolution values.
 * stopOnFailure true will cause a rejected promise to short-circuit the
 * sequence; otherwise rejected promises return null in the array.
 * @param  {Function[]}  factories
 * @param  {Boolean} stopOnFailure
 * @return {Array}    Array of resolution values
 */
async function sequentialPromises(factories, stopOnFailure = false) {
  const results = [];
  for (let i = 0; i < factories.length; i++) { // eslint-disable-line no-plusplus
    try {
      results.push(await factories[i]()); // eslint-disable-line no-await-in-loop
    } catch (err) {
      if (stopOnFailure) {
        break;
      } else {
        results.push(null);
      }
    }
  }
  return results;
}

/**
 * Parse a GUID from a permalink
 * ie, http://rastasurfboards.com.au/?p=754 => 754
 * @param  {String} raw
 * @return {Number}
 */
function parseGuid(raw) {
  try {
    return Number(raw.match(GUID_REGEX)[1]);
  } catch (e) {
    throw new Error('Unable to parse guid from url');
  }
}

/**
 * round a timestamp down to the nearest 30 minutes.
 * @return {Moment}
 */
function roundTimeToHalfa(timestamp) {
  const remainder = moment(timestamp).minute() % 30;
  return moment(timestamp).subtract(remainder, 'minutes');
}

/**
 * parse a single item from the RSS feed into
 * the props we need for a Report model
 * @param  {Object} post
 * @return {Object} Report
 */
function parseReport(post) {
  const props = {
    postGuid: parseGuid(post.guid[0]._),
    postTimestamp: post.pubDate[0],
    postContent: post['content:encoded'][0],
    postTitle: post.title[0],
  };

  const $ = cheerio.load(props.postContent);

  const postImages = $('img').map((i, el) => cheerio(el).attr('src')).toArray();
  props.postImages = postImages.join(',');
  props.image = postImages[0];

  props.text = $.text();
  props.date = roundTimeToHalfa(props.postTimestamp).tz(TIMEZONE).format(DATE_FORMAT);

  return props;
}


/**
 * fetch the RSS feed as a string
 * @param  {Number} page
 * @return {String}
 */
function fetchRSS(page = 1) {
  return fetch(`${RSS_FEED_URL}&paged=${page}`)
    .then((response) => {
      if (!response.ok) {
        const err = new Error(`Bad response fetching RSS: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return response.text();
    });
}

/**
 * return a posts array from the RSS feed
 * @param  {String} str   feed XML
 * @return {Object[]}
 */
async function parsePostsFromFeed(str) {
  const parsed = await parseStringAsync(str);
  return parsed.rss.channel[0].item;
}

/**
 * Filter out any posts that aren't surf reports
 * by dumbly regexing the title.
 * Unfortunately Rasta doesn't use his categories or tags
 * properly so we just have to guess.
 * @param  {Array} posts
 * @return {Array}
 */
function filterPostsForReports(posts) {
  return posts.filter(post => post.title[0].match(TITLE_REGEX));
}


/**
 * Are we missing a report for today's date?
 * Check latest report's date, match against today.
 * @return {Boolean}
 */
function isReportMissing() {
  return db.getLatestReport()
    .then((report) => {
      if (!report) return true;
      const latestReportDate = moment(report.postTimestamp);
      const todayDate = moment();
      const isSameDay = todayDate.isSame(latestReportDate, 'day');
      return !isSameDay;
    });
}

/**
 * Return whether it's past eight thirty today.
 * @return {Boolean}
 */
function isReportTime() {
  const eightThirty = moment().tz(TIMEZONE).hour(8).minute(30);
  return moment().isAfter(eightThirty);
}

/**
 * Count the number of truthy values in an array
 * @param  {Array} arr
 * @return {Number}
 */
function countTruthy(arr) {
  return arr.reduce((count, element) => {
    if (element) {
      return count + 1;
    }
    return count;
  }, 0);
}

/**
 * Try to parse the swell size from the report text.
 * @param  {String} report
 * @return {String}
 */
function parseSwell(report) {
  try {
    return report.match(SWELL_REGEX)[1];
  } catch (e) {
    return '';
  }
}

/**
 * Try to parse the high and low tide from the report text.
 * @param  {String} report [description]
 * @return {}        [description]
 */
function parseTides(report) {
  try {
    return {
      ht: report.match(HIGH_TIDE_REGEX)[3],
      lt: report.match(LOW_TIDE_REGEX)[3],
    };
  } catch (e) {
    return {
      ht: '',
      lt: '',
    };
  }
}

function parseWeather(report) {
  try {
    return report.match(/sunny|overcast/i)[0];
  } catch (e) {
    return '';
  }
}

function snatchPhoto(photoUrl, filename) {
  return new Promise((resolve, reject) => {
    log.info(`Snatching photo from ${photoUrl} to ${filename}...`);
    const fullPath = path.join(__dirname, '../public/photos', filename);
    const file = fs.createWriteStream(fullPath);
    file.on('close', () => {
      log.info(`Photo saved to ${filename}`);
      return resolve(true);
    });
    http.get(photoUrl, response => response.pipe(file))
      .on('error', (error) => {
        log.error(`Error snatching photo from ${photoUrl}`);
        log.error(error);
        fs.unlink(filename);
        reject(error);
      });
  });
}

/**
 * Fetch the report photos from Rasta's server.
 * Pass this a report from parseReport().
 * @param  {Object} report    parsed report props
 * @return {Promise}
 */
function snatchReportPhotos(report) {
  const photos = report.postImages.split(',');

  return sequentialPromises(photos.map((photo, i) => () =>
    snatchPhoto(photo, `${report.postGuid}-${i}.jpg`) // eslint-disable-line comma-dangle
  ));
}


// ensure the photos folder exists
function createPhotosFolder() {
  return new Promise((resolve, reject) =>
    fs.mkdir(path.join(__dirname, '../public/photos'), (err) => {
      if (err && err.code !== 'EEXIST') {
        return reject(err);
      }
      return resolve();
    }) // eslint-disable-line comma-dangle
  );
}

/**
 * Hit Rasta's RSS feed and create any reports that we're missing.
 * @return {Promise}
 */
function fetchLatest(page = 1) {
  log.info('Processing RSS feed...');
  return fetchRSS(page)
    .then(xml => parsePostsFromFeed(xml))
    .then(posts => filterPostsForReports(posts))
    .then(reports => reports.map(report => parseReport(report)))
    .then(reports => sequentialPromises(reports.map(report => () =>
      db.createReport(report)
        .then((created) => {
          if (created) {
            log.info(`Created report ${report.postGuid}.`);
            return snatchReportPhotos(report);
          }
          return false;
        }) // eslint-disable-line comma-dangle
    )))
    .then(() => {
      log.info('Finished processing RSS feed');
    })
    .catch((error) => {
      log.error('Error processing RSS feed:');
      log.error(error);
      throw error;
    });
}

// ping rasta's server for the surf report IF:
// 1. we don't have today's report
// 2. it's after 8:30am
function sync() {
  log.debug('Syncing...');
  isReportMissing()
    .then((isMissing) => {
      if (!isMissing) {
        log.debug('We already have today\'s report.');
        throw SAFE_EXIT;
      }
      log.debug('We are missing today\'s report.');
      return isReportTime();
    })
    .then((reportTime) => {
      if (!reportTime) {
        log.debug('It isn\'t time for Rasta\'s report yet.');
        throw SAFE_EXIT;
      }
      log.debug('Rasta should be publishing his report soon.');
      return fetchLatest();
    })
    .catch((error) => {
      if (error !== SAFE_EXIT) {
        log.error('Error running sync():');
        log.error(error);
      }
    })
    .then(() => {
      log.debug(`Checking again in ${SYNC_EVERY_SECONDS} seconds`);
      setTimeout(sync, SYNC_EVERY_SECONDS * 1000);
    });
}


// sync the entire history of the RSS feed.
// just runs fetchLatest() until it throws an error.
// eventually incrementing the offset will hit a 404.
async function syncAll() {
  let i = 0;
  while (++i) { // eslint-disable-line no-plusplus
    try {
      log.info(`fetching RSS page ${i}`);
      await fetchLatest(i); // eslint-disable-line no-await-in-loop
    } catch (error) {
      if (error.status && error.status === 404) {
        log.info(`Finished. Fetched ${i - 1} pages.`);
        return true;
      }
      log.error(`error fetching RSS page ${i}:`);
      log.error(error);
      return false;
    }
  }
  return false; // never happens, keep the linter quiet.
}

// generate a cachebust string for static assets
function generateCachebust() {
  return `?cb=${CACHEBUST}`;
}


module.exports = {
  parseGuid,
  parseReport,
  filterPostsForReports,
  fetchRSS,
  parsePostsFromFeed,
  roundTimeToHalfa,
  isReportMissing,
  isReportTime,
  countTruthy,
  parseSwell,
  parseTides,
  parseWeather,
  createPhotosFolder,
  snatchReportPhotos,
  snatchPhoto,
  sequentialPromises,
  fetchLatest,
  generateCachebust,
  sync,
  syncAll,
};
