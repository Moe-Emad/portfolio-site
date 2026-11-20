// Unit tests of the picture copies (tracker F5, F52): npm run test:unit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { COPY_WIDTHS, FORMATS, copies, srcSet, versioned } from './pictures.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

test('the page offers AVIF first, then WebP', () => {
  // A browser takes the first <source> whose type it can show, so the smaller format must come first (F52).
  assert.deepEqual(FORMATS, ['avif', 'webp']);
});

test('a wide picture gets every narrower copy and one at full width, in each format', () => {
  assert.deepEqual(copies('/images/projects/a/01-home.jpg', 1440, 'webp'), [
    { src: '/images/projects/a/01-home-640.webp', width: 640 },
    { src: '/images/projects/a/01-home-828.webp', width: 828 },
    { src: '/images/projects/a/01-home-1100.webp', width: 1100 },
    { src: '/images/projects/a/01-home.webp', width: 1440 },
  ]);
  assert.deepEqual(copies('/images/projects/a/01-home.jpg', 1440, 'avif'), [
    { src: '/images/projects/a/01-home-640.avif', width: 640 },
    { src: '/images/projects/a/01-home-828.avif', width: 828 },
    { src: '/images/projects/a/01-home-1100.avif', width: 1100 },
    { src: '/images/projects/a/01-home.avif', width: 1440 },
  ]);
});

test('a copy is never wider than the picture', () => {
  assert.deepEqual(
    copies('/b.png', 800, 'avif').map((copy) => copy.width),
    [640, 800],
  );
  assert.deepEqual(copies('/c.jpeg', 390, 'webp'), [{ src: '/c.webp', width: 390 }]);
  assert.deepEqual(copies('/d.jpg', COPY_WIDTHS[0], 'avif'), [{ src: '/d.avif', width: COPY_WIDTHS[0] }]);
});

test('the srcset names every copy with its width', () => {
  assert.equal(srcSet('/b.png', 800, 'webp'), '/b-640.webp 640w, /b.webp 800w');
  assert.equal(srcSet('/b.png', 800, 'avif'), '/b-640.avif 640w, /b.avif 800w');
});

test('with a fingerprint, every address of a picture carries it', () => {
  // Tracker F54: the address changes when the picture does, so a browser may keep the file for a year.
  assert.equal(versioned('/a.jpg', '1a2b3c4d'), '/a.jpg?v=1a2b3c4d');
  assert.equal(versioned('/a.jpg', undefined), '/a.jpg');
  assert.equal(srcSet('/b.png', 800, 'avif', '1a2b3c4d'), '/b-640.avif?v=1a2b3c4d 640w, /b.avif?v=1a2b3c4d 800w');
  // The names of the files themselves never carry it: the tool that writes the copies uses them.
  assert.deepEqual(
    copies('/b.png', 800, 'webp').map((copy) => copy.src),
    ['/b-640.webp', '/b.webp'],
  );
});

test('every copy of every picture of this repo exists in public/, in each format', () => {
  const missing = [];
  const dir = path.join(ROOT, 'content', 'projects');
  for (const name of fs.readdirSync(dir)) {
    const project = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    for (const image of project.images) {
      for (const format of FORMATS) {
        for (const copy of copies(image.src, image.width, format)) {
          if (!fs.existsSync(path.join(ROOT, 'public', copy.src))) missing.push(copy.src);
        }
      }
    }
  }
  assert.deepEqual(missing, [], 'run "npm run pictures" and commit the new files');
});
