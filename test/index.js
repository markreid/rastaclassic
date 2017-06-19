/* eslint-disable */

/**
 * poor man's tests for checking the parse regexes.
 * will probably abandon these tbh.
 */

require('dotenv-safe').load();

const db = require('../lib/db');
const util = require('../lib/util');


const promiseFactory = (str, broken = false) => {
  return new Promise((resolve, reject) => {
    console.log(`start ${str}`);
    setTimeout(() => {
      if (broken) {
        console.log(`reject ${str}`);
        reject(str);
      } else {
        console.log(`resolve ${str}`);
        resolve(str);
      }
    }, 300);
  });
}

const prommies = [
  () => promiseFactory('a'),
  () => promiseFactory('b'),
  () => promiseFactory('c', true),
  () => promiseFactory('d'),
];

util.sequentialPromises(prommies, false)
.then(() => console.log('all done m80'));



if (false ) util.createPhotosFolder()
  .then(() => util.grabPhoto('http://rastasurfboards.com.au/wordpress/wp-content/uploads/2017/06/009.jpg'))
  .then(() => {
    console.log('done');
  })
  .catch((error) => {
    console.error('error!');
    console.error(error);
  });





if (false) db.Report.findAll()
  .then((reports) => {
    console.log('testing swell parser...');
    reports.forEach((report) => {
      const parsed = util.parseSwell(report.get('text'));
      if (parsed) {
        // console.log(parsed);
        // console.log(report.get('text').substr(0, 100));
      } else {
        console.error('unable to parse!');
      }
    });

    console.log('testing tides parser...');
    reports.forEach((report) => {
      const parsed = util.parseTides(report.get('text'));
      if (!parsed.ht) {
        console.log(report.get('text'));
      } else {
        console.log(parsed);
      }
    });

    reports.forEach((report) => {
      const parsed = util.parseWeather(report.get('text'));
      console.log(parsed);
    });
  });

