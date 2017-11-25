/* eslint-env mocha */

/**
 * unit tests
 */
require('dotenv-safe').load();

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { assert } = require('chai');

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
      const post = posts[1];
      const parsed = util.parseReport(post);

      assert.equal(parsed.postGuid, 1583);
      assert.equal(parsed.postTimestamp, 'Fri, 24 Nov 2017 21:15:52 +0000');
      assert.equal(parsed.postContent.substr(0, 40), '<blockquote><p>13th Beach Surf Report 25');
      assert.equal(parsed.postTitle, '13th Beach Surf Report 25.11.17');

      assert.equal(parsed.image, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/A1A691B2-7DD5-4029-8069-FE2631E4FC0D.jpeg');
      assert.equal(parsed.postImages, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/A1A691B2-7DD5-4029-8069-FE2631E4FC0D.jpeg');
    });

    it('parses a post with multiple photos', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      const post = posts[2];
      const parsed = util.parseReport(post);

      assert.equal(parsed.postGuid, 1578);
      assert.equal(parsed.image, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/318E3688-7E63-4B02-B18B-6D843982F3D0.jpeg');
      assert.equal(parsed.postImages, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/318E3688-7E63-4B02-B18B-6D843982F3D0.jpeg,http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/F57DBE90-51C8-487A-A417-EEC781DA5B1B.jpeg');
    });

    it('parses video links', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      const post = posts[1];
      const parsed = util.parseReport(post);

      assert.equal(parsed.postGuid, 1583);
      assert.equal(parsed.postVideos, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/E936A2BB-C20A-414C-9197-24CE04E3EF89.mov');
    });

    it('parses embedded videos', async () => {
      const posts = await util.parsePostsFromFeed(xml);
      const post = posts[4];
      const parsed = util.parseReport(post);

      assert.equal(parsed.postGuid, 1571);
      assert.equal(parsed.postVideos, 'http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/11/9E4F4B19-E4DF-49D1-8DB9-01488D37EE60.mp4');
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
});
