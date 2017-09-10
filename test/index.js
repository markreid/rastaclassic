/* eslint-env mocha */

/**
 * unit tests
 */
require('dotenv-safe').load();

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { assert } = require('chai');
const moment = require('moment');

const readFileAsync = promisify(fs.readFile);

const util = require('../lib/util');

describe('lib/util', async () => {
  let xml;

  before(async () => {
    xml = await readFileAsync(path.resolve(__dirname, './sample-feed.xml'), { encoding: 'utf8' });
  });

  describe('parsePostsFromFeed', () => {
    it('parse posts from xml', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      assert.equal(posts.length, 10);
      assert.isObject(posts[0]);
      assert.ok(posts[0].title);
      assert.ok(posts[0].guid);
      assert.ok(posts[0]['content:encoded']);
    });
  });

  describe('filterPostsForReports', () => {
    it('removes non-surf report posts', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      const filtered = util.filterPostsForReports(posts);
      assert.equal(filtered.length, 5);
    });
  });

  describe('parseGuid', () => {
    it('parses a guid from a permalink', () => {
      const url = 'http://rastasurfboards.com.au/?p=1083';
      const guid = util.parseGuid(url);
      assert.equal(guid, 1083);
    });

    it('throws on a bad url', () => {
      const url = 'http://somethingelse.net';
      assert.throws(() => util.parseGuid(url));
    });
  });

  describe('parseReport', () => {
    it('parses the properties from a report', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      // 1 is the first surf report
      const post = posts[1];
      const parsed = util.parseReport(post);

      assert.equal(parsed.postGuid, 1083);
      assert.equal(parsed.postTimestamp, 'Fri, 08 Sep 2017 22:52:50 +0000');
      assert.equal(parsed.postContent.substr(0, 40), '<p><a href="http://rastasurfboards.com.a');
      assert.equal(parsed.postTitle, '13th Beach Surf Report Cylinders 09.09.17');

      assert.equal(parsed.postImages, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/09/001.jpg,http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/09/008-1.jpg');
      assert.equal(parsed.image, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/09/001.jpg');
    });
  });

  describe('isTimestampFromToday', () => {
    it('tells you whether a timestamp is from today', () => {
      assert.equal(util.isTimestampFromToday(new Date()), true);
      assert.equal(util.isTimestampFromToday(new Date().valueOf() - (1000 * 60 * 60 * 25)), false);
    });

    it('throws if you pass it nothing', () => {
      assert.throws(() => util.isTimestampFromToday());
    });
  });

  describe('msUntil()', () => {
    it('returns ms between two timestamps', () => {
      const now = Date.now();
      const later = now + 1500;
      assert.equal(util.msUntil(later, now), 1500);
    });

    it('returns zero if the time is in the past', () => {
      const now = Date.now();
      const previously = now - 1500;
      assert.equal(util.msUntil(previously, now), 0);
    });

    it('throws without arguments', () => {
      assert.throws(() => util.msUntil());
    });
  });

  describe('timezone handling', () => {
    it('requires you to specify timezones', () => {
      // had an issue with timezone parsing.
      // at 'time' we pulled 'forecastTimestamp'
      // and incorrectly determined that we already had today's
      // report, and that the next one would be fetched at
      // Mon Sep 11 2017 08:30:00 GMT+1000

      // time was 0830 the 10th, melbourne
      // forecastTimestamp is 2337 the 9th, melbourne
      // so we expected that it would tell us to fetch now
      const time = '2017-09-09T18:30:00.000-04:00';
      const forecastTimestamp = '2017-09-09T13:37:20.000Z';
      const expectedFetch = '2017-11-09T08:30:00.000+10:00';

      const efValue = moment(expectedFetch).valueOf();
      const ft = util.nextFetchTime(forecastTimestamp, time);
      const ftValue = moment(ft).valueOf();

      assert.equal(efValue, ftValue);

      // assert.equal(util.isTimestampFromToday(forecastTimestamp, moment(time)), true);

      // assert.equal()

      // it went
      // util.nextFetchTime(timestamp) -> 11th 830am
      //    isTimestampFromToday(timestamp) -> false
      // so it added a day


    });
  });
});
