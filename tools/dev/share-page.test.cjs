'use strict';
// The share picture (tracker F44): the page photographed for public/og-image.png says what the home page says, from
// content/profile.json. Before F44 its line under the name was typed into the script and was left behind when the
// headline changed in F26.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..', '..');
const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'profile.json'), 'utf8'));
const load = () => import(pathToFileURL(path.join(ROOT, 'tools', 'build', 'share-page.mjs')).href);
const font = (file) => `fonts/${file}`;
/** The words of a page, without its tags and with single spaces. */
const words = (html) => html.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('the share picture says the name, the role line and the headline of the profile', async () => {
  const { sharePage } = await load();
  const { roleLine } = await import(pathToFileURL(path.join(ROOT, 'src', 'lib', 'profile.js')).href);
  const text = words(sharePage(profile, font));
  for (const part of profile.name.split(' ')) assert.ok(text.includes(part), `the name: ${part}`);
  assert.ok(text.includes(profile.nameArabic), 'the Arabic name');
  assert.ok(text.includes(roleLine(profile.role, profile.location)), 'the role line');
  assert.ok(text.includes(profile.headline), `the headline "${profile.headline}" in: ${text}`);
});

test('text from the profile is escaped before it goes into the page', async () => {
  const { sharePage } = await load();
  const html = sharePage({ ...profile, headline: 'Fast & <b>safe</b> web apps, built to last.' }, font);
  assert.ok(html.includes('Fast &amp; &lt;b&gt;safe&lt;/b&gt; web apps,'), 'escaped');
  assert.ok(!html.includes('<b>safe</b>'), 'no tag from the profile');
});
