#!/usr/bin/env node
'use strict';
// Fills in the width and height of the pictures named in content/projects (tracker F6) and makes their smaller
// copies in AVIF (tracker F52) and WebP (tracker F5):
//   npm run pictures
// The page writes the size of each picture into the HTML so that nothing jumps while it loads, and the content
// check wants both numbers. After adding pictures - in the admin panel or by hand - this command reads the size
// from each file (JPEG, PNG and WebP) and writes it into the project file. Sizes that are already right stay.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

/** { width, height } of a JPEG, PNG or WebP file, read from the first bytes. Throws for anything else. */
function pictureSize(buffer) {
  // PNG: signature, then the IHDR chunk with width and height.
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  // JPEG: walk the segments to the first "start of frame".
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length && buffer[offset] === 0xff) {
      const marker = buffer[offset + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }
  // WebP: RIFF....WEBP, then VP8 (lossy), VP8L (lossless) or VP8X (extended).
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buffer.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8X') return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  throw new Error('not a JPEG, PNG or WebP picture');
}

/** Writes missing or wrong sizes into the project files. Returns the lines to print. */
function fillSizes(root = ROOT) {
  const lines = [];
  const dir = path.join(root, 'content', 'projects');
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    const file = path.join(dir, name);
    const project = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = false;
    for (const image of project.images || []) {
      const picture = path.join(root, 'public', image.src);
      if (!fs.existsSync(picture)) {
        lines.push(`${name}: ${image.src} does not exist in public/`);
        continue;
      }
      let size;
      try {
        size = pictureSize(fs.readFileSync(picture));
      } catch (error) {
        lines.push(`${name}: ${image.src} - ${error.message}`);
        continue;
      }
      if (image.width !== size.width || image.height !== size.height) {
        Object.assign(image, size);
        changed = true;
        lines.push(`${name}: ${image.src} is ${size.width} x ${size.height}`);
      }
    }
    if (changed) fs.writeFileSync(file, `${JSON.stringify(project, null, 2)}\n`);
  }
  return lines;
}

/**
 * How each format is written. Screenshots are flat colours and text: at these settings the letters stay sharp.
 * - WebP at quality 80 (F5).
 * - AVIF at quality 60, with the colour kept at full resolution (WebP halves it): on the 51 screenshots of F52
 *   about a fifth smaller than WebP, and as close to the original (SSIM and PSNR) on 49 of them, the other two
 *   within 0.001 SSIM. Below 60 it fell behind WebP on most of them. Effort 7 of 9: about 1.5 s for a 1440 px
 *   picture; the lower efforts give larger files at the same quality.
 */
const ENCODE = {
  avif: (pipeline) => pipeline.avif({ quality: 60, effort: 7, chromaSubsampling: '4:4:4' }),
  webp: (pipeline) => pipeline.webp({ quality: 80, effort: 6 }),
};

/**
 * Makes the AVIF and WebP copies of every picture named in the project files (names, widths and formats:
 * src/lib/pictures.js). A copy that exists and is newer than its picture is left alone. Returns the lines to print.
 */
async function writeCopies(root = ROOT) {
  const sharp = require('sharp');
  const { FORMATS, copies } = await import('../../src/lib/pictures.js');
  const lines = [];
  const dir = path.join(root, 'content', 'projects');
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    const project = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    for (const image of project.images || []) {
      const picture = path.join(root, 'public', image.src);
      if (!fs.existsSync(picture) || !Number.isInteger(image.width)) continue;
      for (const format of FORMATS) {
        for (const copy of copies(image.src, image.width, format)) {
          const file = path.join(root, 'public', copy.src);
          if (fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(picture).mtimeMs) continue;
          await ENCODE[format](sharp(picture).resize({ width: copy.width, withoutEnlargement: true })).toFile(file);
          lines.push(`${copy.src} (${(fs.statSync(file).size / 1024).toFixed(0)} kB)`);
        }
      }
    }
  }
  return lines;
}

if (require.main === module) {
  const sizes = fillSizes();
  console.log(sizes.length ? sizes.join('\n') : 'pictures: every size is already right.');
  writeCopies().then(
    (copies) => console.log(copies.length ? `pictures: ${copies.length} copies written\n  ${copies.join('\n  ')}` : 'pictures: every AVIF and WebP copy is already there.'),
    (error) => {
      console.error(`pictures: ${error.stack ?? error}`);
      process.exit(1);
    },
  );
}

module.exports = { pictureSize, fillSizes, writeCopies };
