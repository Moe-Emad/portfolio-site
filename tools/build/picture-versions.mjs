// The fingerprint of each picture (tracker F54). The screenshots keep their names when they are replaced, so the
// page names every file of a picture with a short fingerprint of its files ("/a-640.avif?v=1a2b3c4d"). It changes
// when the picture or one of its copies does, and with it the address: a browser may then keep the pictures for a
// year (public/_headers, vercel.json) and still never shows an old one.
// Worked out when the site is built and on the dev server (vite.config.js), from the files in public/; nothing is
// written into the content files.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { FORMATS, copies } from '../../src/lib/pictures.js';

/** Every file of a picture as a path below public/: the original and each of its copies. */
export function pictureFiles(image) {
  return [image.src, ...FORMATS.flatMap((format) => copies(image.src, image.width, format).map((copy) => copy.src))];
}

/** Eight hex characters that change whenever a file of the picture changes. publicDir: the folder public/. */
export function pictureVersion(publicDir, image) {
  const hash = createHash('sha256');
  for (const file of pictureFiles(image)) {
    const full = path.join(publicDir, file);
    hash.update(`${file}\n`);
    hash.update(fs.existsSync(full) ? fs.readFileSync(full) : 'missing');
  }
  return hash.digest('hex').slice(0, 8);
}

/**
 * The project with the fingerprint of each picture in its "version". A file of the wrong shape is passed on as it
 * is, so that the content check can name its problem.
 */
export function withPictureVersions(project, publicDir) {
  if (!Array.isArray(project?.images)) return project;
  return {
    ...project,
    images: project.images.map((image) =>
      image && typeof image.src === 'string' ? { ...image, version: pictureVersion(publicDir, image) } : image,
    ),
  };
}
