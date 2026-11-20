// The smaller copies of a picture (tracker F5, F52). Every screenshot named in content/projects has copies next to
// it in public/, made by "npm run pictures": one at full width and narrower ones, so a phone downloads a picture of
// its own size instead of the desktop one, each in AVIF and in WebP. This file is the one place that knows their
// names; the page (src/components/Shot.tsx) and the tool that makes them (tools/build/picture-sizes.cjs) both use it.

/** The widths of the narrower copies, in pixels: a small phone, a phone with a sharp screen, a tablet. */
export const COPY_WIDTHS = [640, 828, 1100];

/**
 * The formats of the copies, in the order the page offers them. A browser takes the first it can show: AVIF is
 * about a fifth smaller than WebP for the same screenshot; WebP is there for a browser without AVIF, and the
 * original JPEG or PNG for one without either.
 */
export const FORMATS = ['avif', 'webp'];

/**
 * The copies of a picture in one format, narrowest first: [{ src, width }].
 * src: the path of the picture below public/ (JPEG or PNG); width: its width in pixels; format: one of FORMATS.
 * Copies are never wider than the picture itself; the last one has its full width.
 */
export function copies(src, width, format) {
  const base = src.replace(/\.(jpe?g|png)$/i, '');
  return [
    ...COPY_WIDTHS.filter((copy) => copy < width).map((copy) => ({ src: `${base}-${copy}.${format}`, width: copy })),
    { src: `${base}.${format}`, width },
  ];
}

/**
 * The address of a file of a picture with the fingerprint of the picture's files: "/a.avif?v=1a2b3c4d" (tracker
 * F54, tools/build/picture-versions.mjs). It changes when the picture does, so a browser may keep the file for a
 * year. Without a fingerprint, the bare path.
 */
export function versioned(src, version) {
  return version ? `${src}?v=${version}` : src;
}

/** The copies in one format as the "srcset" of a <source>: "/a-640.avif?v=1a2b3c4d 640w, /a.avif?v=1a2b3c4d 1440w". */
export function srcSet(src, width, format, version) {
  return copies(src, width, format)
    .map((copy) => `${versioned(copy.src, version)} ${copy.width}w`)
    .join(', ');
}
