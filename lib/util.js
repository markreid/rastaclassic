/**
 * lib/util
 *
 * utilities.
 */

const cheerio = require('cheerio');
const xml2js = require('xml2js');
const { promisify } = require('util');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

// promisification
const parseStringAsync = promisify(new xml2js.Parser().parseString);

// constants
const GUID_REGEX = /\?p=([0-9]+)/;
const TITLE_REGEX = /surf report/i;
const DATE_FORMAT = 'dddd, D MMMM YYYY - h:mm A';


const { CACHEBUST, TIMEZONE } = process.env;


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
 * Is a report dated today
 * @param  {Report}
 * @return {Boolean}
 */
function isReportFromToday(report) {
  const reportDate = moment(report.postTimestamp);
  const todayDate = moment();
  const isSameDay = todayDate.isSame(reportDate, 'day');
  return isSameDay;
}

/**
 * Should Rasta's report be out yet?
 * ie, is it past 08:30 AEST?
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


// generate a cachebust string for static assets
function generateCachebust() {
  return `?cb=${CACHEBUST}`;
}


module.exports = {
  parseGuid,
  parseReport,
  filterPostsForReports,
  parsePostsFromFeed,
  roundTimeToHalfa,
  isReportTime,
  countTruthy,
  createPhotosFolder,
  sequentialPromises,
  generateCachebust,
  isReportFromToday,
};
