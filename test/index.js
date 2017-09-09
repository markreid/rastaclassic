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
});
