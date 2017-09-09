/**
 * lib/rasta
 * the parts relating to scraping rasta's site
 */

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const http = require('http');

const log = require('./log');
const util = require('./util');
const db = require('./db');

const { RSS_FEED_URL, SYNC_EVERY_SECONDS } = process.env;
const SAFE_EXIT = new Error('SAFE_EXIT');


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
 * Fetch a photo and put it in our photos folder
 * @param  {String} photoUrl
 * @param  {String} filename    local filename
 * @return {}
 */
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

  return util.sequentialPromises(photos.map((photo, i) => () =>
    snatchPhoto(photo, `${report.postGuid}-${i}.jpg`) // eslint-disable-line comma-dangle
  ));
}

/**
 * Hit Rasta's RSS feed and create any reports that we're missing.
 * @return {Promise}
 */
function fetchLatest(page = 1) {
  log.info('Processing RSS feed...');
  return fetchRSS(page)
    .then(xml => util.parsePostsFromFeed(xml))
    .then(posts => util.filterPostsForReports(posts))
    .then(reports => reports.map(report => util.parseReport(report)))
    .then(reports => util.sequentialPromises(reports.map(report => () =>
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


/**
 * Are we missing today's report?
 */
function isTodaysReportMissing() {
  return db.getLatestReport()
    .then((report) => {
      if (!report) return true;
      return !util.isReportFromToday(report);
    });
}


// ping rasta's server for the surf report IF:
// 1. we don't have today's report
// 2. it's after 8:30am
function sync() {
  log.debug('Syncing...');
  isTodaysReportMissing()
    .then((isMissing) => {
      if (!isMissing) {
        log.debug('We already have today\'s report.');
        throw SAFE_EXIT;
      }
      log.debug('We are missing today\'s report.');
      return util.isReportTime();
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


/**
 * sync the entire history of the RSS feed.
 * just runs fetchLatest(), incrementing page counter
 * until it throws a 404.
 */
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


module.exports = {
  fetchRSS,
  fetchLatest,
  sync,
  syncAll,
};