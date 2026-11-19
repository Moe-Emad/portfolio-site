'use strict';
// Import paths must match the real letter case of the files (tracker B1). Windows finds "components/models"
// when the folder is "components/Models"; Linux - every build server and host - does not, and the build fails.
// This test walks src/ and checks every relative import against the names on disk, letter by letter.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = /\.(js|jsx|ts|tsx|mjs|cjs)$/;
const TRY = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return SOURCE.test(entry.name) ? [full] : [];
  });
}

/** Relative import specifiers of a source text: import ... from './x', import './x', import('./x'), export ... from. */
function relativeImports(text) {
  const found = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\1/g;
  for (const match of text.matchAll(pattern)) found.push(match[2].split('?')[0]);
  return found;
}

/** True when every part of the path exists with exactly this letter case. */
function existsWithExactCase(file) {
  const parts = path.relative(ROOT, file).split(path.sep);
  let dir = ROOT;
  for (const part of parts) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

/** Problems of one import: null when a file with exactly that name exists. */
function importProblem(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = TRY.map((suffix) => base + suffix);
  if (candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile() && existsWithExactCase(candidate))) {
    return null;
  }
  const where = path.relative(ROOT, fromFile).split(path.sep).join('/');
  return candidates.some((candidate) => fs.existsSync(candidate))
    ? `${where}: "${specifier}" has the wrong letter case (Linux will not find it)`
    : `${where}: "${specifier}" does not exist`;
}

test('the import scanner finds the usual forms', () => {
  const text = `
    import a from './a';
    import { b } from "../lib/b.js";
    import './style.css';
    export { c } from './c';
    const d = () => import('./lazy/d');
    import react from 'react';
  `;
  assert.deepEqual(relativeImports(text), ['./a', '../lib/b.js', './style.css', './c', './lazy/d']);
});

test('every relative import in src/ matches the letter case on disk', () => {
  const problems = [];
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    for (const specifier of relativeImports(fs.readFileSync(file, 'utf8'))) {
      const problem = importProblem(file, specifier);
      if (problem) problems.push(problem);
    }
  }
  assert.deepEqual(problems, []);
});
