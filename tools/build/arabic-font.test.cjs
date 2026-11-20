'use strict';
// Tests of the Arabic font of the site (tools/build/arabic-font.mjs, tracker F56).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const load = () => import('./arabic-font.mjs');

/** A content folder with a profile and one project, each with an Arabic name; returns its root. */
function sampleRoot(t, projectTitle = 'ملوك') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-arabic-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'content', 'projects'), { recursive: true });
  fs.writeFileSync(path.join(root, 'content', 'profile.json'), JSON.stringify({ name: 'Sample', nameArabic: 'محمد' }));
  fs.writeFileSync(path.join(root, 'content', 'projects', 'a.json'), JSON.stringify({ title: 'A', titleArabic: projectTitle, stack: ['React'] }));
  return root;
}

test('every Arabic letter of the content is taken, once, and nothing else', async (t) => {
  const { arabicText } = await load();
  const root = sampleRoot(t);
  assert.equal(arabicText(root), [...new Set('محمدملوك')].sort().join(''));
});

test('the cut-down font is a WOFF2 file a fraction of the whole, written again only when the letters change', async (t) => {
  const { SOURCE, writeArabicFont } = await load();
  const root = sampleRoot(t);
  const options = { root, source: path.join(ROOT, SOURCE), target: path.join(root, 'out', 'rakkas-arabic.woff2') };

  const first = await writeArabicFont(options);
  assert.equal(first.written, true);
  const font = fs.readFileSync(options.target);
  assert.equal(font.toString('ascii', 0, 4), 'wOF2');
  assert.ok(font.length < fs.statSync(path.join(ROOT, SOURCE)).size / 3, `${font.length} B is not a fraction of the whole file`);

  assert.equal((await writeArabicFont(options)).written, false, 'the same letters: the file is left as it is');

  fs.writeFileSync(path.join(root, 'content', 'projects', 'b.json'), JSON.stringify({ title: 'B', titleArabic: 'السوق' }));
  const third = await writeArabicFont(options);
  assert.equal(third.written, true, 'a new title with new letters: the file is made again');
  assert.notDeepEqual(fs.readFileSync(options.target), font);
});

test('the Arabic letters of this repo include the name of the profile', async () => {
  const { arabicText } = await load();
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'profile.json'), 'utf8'));
  const name = Object.values(profile).find((value) => typeof value === 'string' && /[؀-ۿ]/.test(value));
  assert.ok(name, 'the profile has an Arabic name');
  const letters = arabicText(ROOT);
  for (const letter of name.replace(/\s/g, '')) assert.ok(letters.includes(letter), `${letter} of ${name}`);
});
