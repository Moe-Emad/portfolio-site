'use strict';
// Tests of the figures the page shows about itself (tools/build/site-record.cjs, tracker F2).
const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonCount, siteRecord, testCount, trackerCounts } = require('./site-record.cjs');

test('tracker: rows are counted, and only rows that end in "done" count as done', () => {
  const text = [
    '| ID | Issue | Work item | Why | Branch | PR | Status |',
    '|---|---|---|---|---|---|---|',
    '| A1 | #1 | Files | Rules | `chore/a1` | #20 | done |',
    '| B3 | #8 | Form | Silent | - | - | in progress |',
    '| F12 | #9 | Look | done before? | - | - | planned |',
    'Some text about | D1 | that is not a row.',
  ].join('\n');
  assert.deepEqual(trackerCounts(text), { total: 3, done: 1 });
});

test('tests: test(...) calls at the start of a line are counted', () => {
  const text = "test('a', () => {});\n  test('b', async () => {});\n// test('c') in a comment\nconst x = contest(1);\n";
  assert.equal(testCount(text), 2);
});

test('lessons: numbered rows of the pitfalls table are counted', () => {
  assert.equal(lessonCount('| # | Symptom |\n|---|---|\n| 1 | a |\n| 12 | b |\n'), 2);
});

test('the record of this repo has real, plausible figures', () => {
  const record = siteRecord();
  assert.ok(record.itemsPlanned >= 19, `planned: ${record.itemsPlanned}`);
  assert.ok(record.itemsDone >= 11 && record.itemsDone <= record.itemsPlanned, `done: ${record.itemsDone}`);
  assert.ok(record.tests >= 60, `tests: ${record.tests}`);
  assert.ok(record.lessons >= 7, `lessons: ${record.lessons}`);
});
