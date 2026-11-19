// Unit tests of the picture copies (tracker F5): npm run test:unit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { COPY_WIDTHS, webpCopies, webpSrcSet } from './pictures.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('a wide picture gets every narrower copy and one at full width', () => {
  assert.deepEqual(webpCopies('/images/projects/a/01-home.jpg', 1440), [
    { src: '/images/projects/a/01-home-640.webp', width: 640 },
    { src: '/images/projects/a/01-home-828.webp', width: 828 },
    { src: '/images/projects/a/01-home-1100.webp', width: 1100 },
    { src: '/images/projects/a/01-home.webp', width: 1440 },
  ]);
});

test('a copy is never wider than the picture', () => {
  assert.deepEqual(
    webpCopies('/b.png', 800).map((copy) => copy.width),
    [640, 800],
  );
  assert.deepEqual(webpCopies('/c.jpeg', 390), [{ src: '/c.webp', width: 390 }]);
  assert.deepEqual(webpCopies('/d.jpg', COPY_WIDTHS[0]), [{ src: '/d.webp', width: COPY_WIDTHS[0] }]);
});

test('the srcset names every copy with its width', () => {
  assert.equal(webpSrcSet('/b.png', 800), '/b-640.webp 640w, /b.webp 800w');
});

test('every copy of every picture of this repo exists in public/', () => {
  const missing = [];
  const dir = path.join(ROOT, 'content', 'projects');
  for (const name of fs.readdirSync(dir)) {
    const project = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    for (const image of project.images) {
      for (const copy of webpCopies(image.src, image.width)) {
        if (!fs.existsSync(path.join(ROOT, 'public', copy.src))) missing.push(copy.src);
      }
    }
  }
  assert.deepEqual(missing, [], 'run "npm run pictures" and commit the new files');
});
