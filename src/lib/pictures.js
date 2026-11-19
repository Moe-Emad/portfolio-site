// The smaller copies of a picture (tracker F5). Every screenshot named in content/projects has WebP copies next
// to it in public/, made by "npm run pictures": one at full width and narrower ones, so a phone downloads a
// picture of its own size instead of the desktop one. This file is the one place that knows their names; the
// page (src/components/Shot.tsx) and the tool that makes them (tools/build/picture-sizes.cjs) both use it.

/** The widths of the narrower copies, in pixels: a small phone, a phone with a sharp screen, a tablet. */
export const COPY_WIDTHS = [640, 828, 1100];

/**
 * The WebP copies of a picture, narrowest first: [{ src, width }].
 * src: the path of the picture below public/ (JPEG or PNG); width: its width in pixels.
 * Copies are never wider than the picture itself; the last one has its full width.
 */
export function webpCopies(src, width) {
  const base = src.replace(/\.(jpe?g|png)$/i, '');
  return [
    ...COPY_WIDTHS.filter((copy) => copy < width).map((copy) => ({ src: `${base}-${copy}.webp`, width: copy })),
    { src: `${base}.webp`, width },
  ];
}

/** The copies as the "srcset" of a <source>: "/a-640.webp 640w, /a.webp 1440w". */
export function webpSrcSet(src, width) {
  return webpCopies(src, width)
    .map((copy) => `${copy.src} ${copy.width}w`)
    .join(', ');
}
