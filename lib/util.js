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
const GUID_REGEX = /\?p=([0-9]+)/;
const TITLE_REGEX = /surf report/i;
const SWELL_REGEX = /([0-9]?( to )?[0-9])ft/i;
const HIGH_TIDE_REGEX = /((H.T|high tide) (\d{1,2}.\d{1,2}.?[ap].?m))/i;
const LOW_TIDE_REGEX = /((L.T|low tide) (\d{1,2}.\d{1,2}.?[ap].?m))/i;
const DATE_FORMAT = 'dddd, D MMMM YYYY - h:mm A';


const { TIMEZONE, RSS_FEED_URL } = process.env;


/**
 * Runs promises in sequence.
 * Note! Pass an array of functions that return promises,
 * NOT an array of promises.
 * Resolve values are discarded.
 * @param  {Function[]} factories
 * @param  {Boolean} stopOnFailure  break the chain on rejection
 * @return {Promise}
 */
function sequentialPromises(factories, stopOnFailure = false) {
  return factories.reduce((acc, factory) =>
    acc.then(() => factory())
      .catch((error) => {
        if (stopOnFailure) {
          throw error;
        }
      })
    , Promise.resolve());
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
        throw new Error(`Bad response fetching RSS: ${response.status}`);
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
};
