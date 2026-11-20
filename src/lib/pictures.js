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

/** The copies in one format as the "srcset" of a <source>: "/a-640.avif 640w, /a.avif 1440w". */
export function srcSet(src, width, format) {
  return copies(src, width, format)
    .map((copy) => `${copy.src} ${copy.width}w`)
    .join(', ');
}
