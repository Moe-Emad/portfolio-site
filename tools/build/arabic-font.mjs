// The Arabic font of the site (tracker F56). The site draws a few Arabic words in Rakkas: the name of the profile
// and the Arabic titles of projects. The Arabic file of Rakkas holds every Arabic letter (25.7 kB); this cuts it
// down to the letters the content uses, with every form they take in a word: the shaping tables go along, so a
// letter joins its neighbours as in the whole font. HarfBuzz does the cutting (subset-font), the shaping engine of
// Chrome and Firefox.
// Runs when the site is built and when the dev server starts or a content file changes (vite.config.js); the file
// it writes is not committed (.gitignore), so a new Arabic title needs no extra command.
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

/** The whole Arabic file of Rakkas, below the project folder. */
export const SOURCE = 'node_modules/@fontsource/rakkas/files/rakkas-arabic-400-normal.woff2';
/** The cut-down file, below the project folder; src/fonts/rakkas.css names it. */
export const TARGET = 'src/fonts/generated/rakkas-arabic.woff2';

const ARABIC = /[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-ﻼ]/u;

function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsonFiles(full);
    return entry.name.endsWith('.json') ? [full] : [];
  });
}

/** Every Arabic character in the content files of the project, each once, sorted. */
export function arabicText(root) {
  const letters = new Set();
  for (const file of jsonFiles(path.join(root, 'content'))) {
    for (const character of fs.readFileSync(file, 'utf8')) if (ARABIC.test(character)) letters.add(character);
  }
  return [...letters].sort().join('');
}

/**
 * Writes the cut-down font when it differs from the file already there. Returns { letters, bytes, written }.
 * root: the project folder (its content/); source and target: the whole font and the file to write.
 */
export async function writeArabicFont({ root, source = path.join(root, SOURCE), target = path.join(root, TARGET) }) {
  const letters = arabicText(root);
  const font = await subsetFont(fs.readFileSync(source), letters, { targetFormat: 'woff2' });
  if (fs.existsSync(target) && fs.readFileSync(target).equals(font)) return { letters, bytes: font.length, written: false };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, font);
  return { letters, bytes: font.length, written: true };
}
