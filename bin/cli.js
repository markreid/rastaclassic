/* eslint-disable no-console */

/**
 * bin/cli
 */

require('dotenv-safe').load();

const repl = require('repl');

const util = require('../lib/util');


// recursively iterate an object and print all keys
// that are functions, including their argument names.
// powers the 'help' function.
function printFunctions(obj, depth = 1) {
  const spacer = new Array(depth * 2).join(' ');
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'function') {
      const functionArgs = obj[key].toString().match(/\((.*?)\)/)[0];
      console.log(`${spacer}${depth ? '.' : ''}${key}${functionArgs}`);
    }
    if (typeof obj[key] === 'object') {
      console.log(`${spacer}${depth > 1 ? '.' : ''}${key}`);
      printFunctions(obj[key], depth + 1);
    }
  });
}

const commands = {
  sync: () => util.fetchLatest(),
  syncAll: () => util.syncAll(),
  help: () => printFunctions(commands),
};

console.log('rastaclassic CLI.');
console.log('available commands:');
commands.help();

const r = repl.start('> ');
r.context = Object.assign(r.context, commands);
