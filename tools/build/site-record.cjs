'use strict';
// The record of this site (tracker F2): figures the page shows about how it was built, counted from the files of
// the repository at build time - so the page can never show a number nobody measured.
//   itemsDone / itemsPlanned   rows of docs/tracking/CODE-TRACKER.md
//   tests                      test(...) calls in the tool tests, the unit tests and the browser tests
//   lessons                    rows of docs/pitfalls.md
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function files(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

/** Rows of the tracker: { total, done }. A row starts with an item id such as "| B3 |". */
function trackerCounts(text) {
  const rows = text.split('\n').filter((line) => /^\| [ABFD]\d+ \|/.test(line));
  return { total: rows.length, done: rows.filter((line) => /\|\s*done\s*\|\s*$/.test(line)).length };
}

/** Number of test(...) calls at the start of a line in a source text. */
function testCount(text) {
  return (text.match(/^\s*test\(/gm) || []).length;
}

/** Rows of the pitfalls table: lines that start with "| <number> |". */
function lessonCount(text) {
  return text.split('\n').filter((line) => /^\| \d+ \|/.test(line)).length;
}

function siteRecord(root = ROOT) {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const tracker = trackerCounts(read('docs/tracking/CODE-TRACKER.md'));
  const testFiles = [
    ...files(path.join(root, 'tools'), /\.test\.cjs$/),
    ...files(path.join(root, 'src'), /\.test\.(js|ts)$/),
    ...files(path.join(root, 'tests'), /\.spec\.js$/),
  ];
  return {
    itemsDone: tracker.done,
    itemsPlanned: tracker.total,
    tests: testFiles.reduce((sum, file) => sum + testCount(fs.readFileSync(file, 'utf8')), 0),
    lessons: lessonCount(read('docs/pitfalls.md')),
  };
}

module.exports = { siteRecord, trackerCounts, testCount, lessonCount };
