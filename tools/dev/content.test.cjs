'use strict';
// Content rules (tracker B5): the site serves only files it uses, and shows none of the placeholder people, logos
// and figures of its first version.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC = path.join(ROOT, 'public');

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

/** Everything a visitor's browser can be told to load: the source, the styles and the HTML shell. */
function siteText() {
  const sources = [...files(path.join(ROOT, 'src')), ...files(path.join(ROOT, 'content')), path.join(ROOT, 'index.html')].filter((file) =>
    /\.(js|jsx|ts|tsx|css|html|json|md)$/.test(file),
  );
  return sources.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

// Files in public/ that are fetched by their fixed name, not through a path written in the source.
const BY_NAME = ['robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon.svg', 'site.webmanifest', '_headers', '_redirects'];

test('every file in public/ is used by the site', () => {
  const text = siteText();
  const unused = files(PUBLIC)
    .map((file) => path.relative(PUBLIC, file).split(path.sep).join('/'))
    .filter((name) => !BY_NAME.includes(name) && !name.startsWith('admin/') && !text.includes(`/${name}`))
    // An AVIF or WebP copy ("01-home-640.avif", "01-home.webp") is used when the picture it was made from is.
    .filter((name) => {
      const copy = /^(.*?)(-\d+)?\.(avif|webp)$/.exec(name);
      return !(copy && ['jpg', 'jpeg', 'png'].some((extension) => text.includes(`/${copy[1]}.${extension}`)));
    });
  assert.deepEqual(unused, [], 'public/ holds files that no page uses - anyone can download them');
});

test('no placeholder person, client or logo is left in the source', () => {
  const text = siteText();
  // The sample person, the sample clients and the logo of the first version.
  for (const leftover of ['Adrian', 'Esther Howard', 'Guy Hawkins', 'jsm-logo', 'company-logo']) {
    assert.ok(!text.includes(leftover), `"${leftover}" is still in the source`);
  }
});

test('the page shows no invented figures', () => {
  const text = siteText();
  for (const claim of ['Client Retention Rate', 'Satisfied Clients']) {
    assert.ok(!text.includes(claim), `"${claim}" is a figure nobody measured`);
  }
});
