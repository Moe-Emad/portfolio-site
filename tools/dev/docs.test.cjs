'use strict';
// The docs must not drift from the project (tracker D1): the README names every npm script, the files and
// folders it points to exist, and its commands are written for PowerShell.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DOCS = ['README.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter((name) => name.endsWith('.md')).map((name) => `docs/${name}`)];

// The repository is public (tracker D4): no doc names another repository of the developer (they are private), a
// password setting of another project, or the folders of other projects on the developer's PC. Notes like that are
// for the developer alone.
test('the public docs name no private repository, no password setting and no folder of another project', () => {
  const tracking = fs.readdirSync(path.join(ROOT, 'docs', 'tracking')).filter((name) => name.endsWith('.md')).map((name) => `docs/tracking/${name}`);
  const rules = [
    [/Moe-Emad\/(?!portfolio-site\b)[A-Za-z0-9._-]+/g, 'another repository of the developer'],
    [/EMAIL_(?:PASS|USER)\w*/g, 'a password setting of another project'],
    [/[A-Z]:\\(?:xampp\\|Code Projects\\(?!portfolio-site\b))[^\s`"')]*/gi, 'a folder of another project'],
  ];
  const found = [];
  for (const file of [...DOCS, 'CHANGELOG.md', ...tracking]) {
    for (const [pattern, what] of rules) {
      for (const match of read(file).matchAll(pattern)) found.push(`${file}: ${what}: ${match[0]}`);
    }
  }
  assert.deepEqual(found, []);
});

// The docs describe the site (tracker D5). Working notes are kept in local/, which is never committed: the origin
// of the site, private repositories and backups, the software of the developer's PC, the arrangements with a
// client, security work that is still open, and notes about the developer's own likes and wishes.
test('the public docs hold no working notes', () => {
  const tracking = fs.readdirSync(path.join(ROOT, 'docs', 'tracking')).filter((name) => name.endsWith('.md')).map((name) => `docs/tracking/${name}`);
  const rules = [
    [/tutorial|\binvented\b/gi, 'the origin of the site'],
    [/\bprivate (?:working )?repo(?:s|sitory|sitories)?\b|\bbackup\b/gi, 'a private repository or backup'],
    [/\b(?:XAMPP|Laragon|MariaDB)\b/gi, "the software of the developer's PC"],
    [/\b(?:consent|proposal|internal documents|staging)\b/gi, 'an arrangement with a client'],
    [/\bnot set yet\b|\bbefore the site goes online\b|\bcommitted once\b/gi, 'security work that is still open'],
    [/\bthe developer\b(?! tools)/gi, 'a note about the developer'],
  ];
  const found = [];
  for (const file of [...DOCS, 'CHANGELOG.md', ...tracking]) {
    for (const [pattern, what] of rules) {
      for (const match of read(file).matchAll(pattern)) found.push(`${file}: ${what}: ${match[0]}`);
    }
  }
  assert.deepEqual(found, []);
});

test('the local notes are never committed', () => {
  assert.match(read('.gitignore'), /^\/local\/$/m, '.gitignore must hold the line /local/');
});

test('the README explains every npm script', () => {
  const readme = read('README.md');
  const scripts = Object.keys(JSON.parse(read('package.json')).scripts);
  const missing = scripts.filter((name) => !readme.includes(`npm run ${name}`));
  assert.deepEqual(missing, [], 'npm scripts the README does not mention');
});

test('every npm script named in the docs exists', () => {
  const scripts = Object.keys(JSON.parse(read('package.json')).scripts);
  for (const file of DOCS) {
    const named = [...read(file).matchAll(/npm run ([a-z][a-z0-9:-]*)/g)].map((match) => match[1]);
    const unknown = [...new Set(named)].filter((name) => !scripts.includes(name));
    assert.deepEqual(unknown, [], `${file} names npm scripts that do not exist`);
  }
});

test('the files and folders the README points to exist', () => {
  const readme = read('README.md');
  // Markdown links to files of the repo, and paths written as code that start with a known folder.
  const linked = [...readme.matchAll(/\]\((?!https?:)([^)#]+)\)/g)].map((match) => match[1]);
  // Not branch names such as `docs/...`.
  const coded = [...readme.matchAll(/`((?:content|public|src|tests|tools|docs)\/[^`<* ]*)`/g)]
    .map((match) => match[1])
    .filter((target) => !target.endsWith('...'));
  const missing = [...new Set([...linked, ...coded])].filter((target) => !fs.existsSync(path.join(ROOT, target)));
  assert.deepEqual(missing, [], 'paths in the README that do not exist');
});

test('commands for the developer are PowerShell: one per block, no bash chaining', () => {
  for (const file of DOCS) {
    const blocks = [...read(file).matchAll(/```powershell\n([\s\S]*?)```/g)].map((match) => match[1].trim());
    for (const block of blocks) {
      assert.ok(!block.includes('&&'), `${file}: "&&" does not work in PowerShell 5.1:\n${block}`);
      assert.ok(!/\\\n/.test(block), `${file}: a backslash line continuation is bash:\n${block}`);
      assert.equal(block.split('\n').length, 1, `${file}: one command per block, so each can be copied on its own:\n${block}`);
    }
  }
});

test('the docs use plain hyphens, not long dashes', () => {
  for (const file of DOCS) {
    assert.ok(!/[–—]/.test(read(file)), `${file} has a long dash`);
  }
});

test('the deploy guide names every setting of .env.example, and the security headers exist', () => {
  const guide = read('docs/deploy.md');
  const names = [...read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
  assert.ok(names.length >= 4, 'settings in .env.example');
  const missing = names.filter((name) => !guide.includes(name));
  assert.deepEqual(missing, [], 'settings the deploy guide does not mention');

  const headers = read('public/_headers');
  for (const header of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy:', 'Cache-Control: public, max-age=31536000, immutable']) {
    assert.ok(headers.includes(header), `public/_headers has no "${header}"`);
  }
  assert.match(read('.node-version'), /^22\s*$/, 'hosts read the Node.js version from .node-version');
});

test('the README leads to the deploy guide', () => {
  assert.match(read('README.md'), /\]\(docs\/deploy\.md\)/);
});
