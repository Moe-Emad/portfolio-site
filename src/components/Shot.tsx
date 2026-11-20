import type { ProjectImage } from '../content/schema.ts';
import { FORMATS, srcSet, versioned } from '../lib/pictures.js';
import { useReveal } from '../lib/reveal.ts';

/**
 * A screenshot in its frame, with its caption under the frame (tracker F50). The frame is of the screen's kind: a
 * hairline for a wide screen, the outline of a phone around a phone screen (see .shot__frame in index.css).
 * - The browser picks a copy that fits the place and the screen (src/lib/pictures.js): AVIF, or WebP if it cannot
 *   show AVIF (tracker F52); the original file is the fallback for a browser without either.
 * - Every address carries the fingerprint of the picture's files (tracker F54): a browser may keep them for a year
 *   and fetches a picture anew as soon as it changes.
 * - The size of the file is written into the HTML, so the page keeps the place free and nothing jumps when the
 *   picture arrives.
 * - first: the picture at the top of a page loads at once; all others load when they come near the screen.
 * - sizes: how wide the picture is shown, in the words of the "sizes" attribute.
 */
export default function Shot({
  image,
  sizes,
  first = false,
  caption = false,
}: {
  image: ProjectImage;
  sizes: string;
  first?: boolean;
  caption?: boolean;
}) {
  // Further down the page the picture unrolls into view (tracker F20).
  const ref = useReveal<HTMLElement>();
  return (
    <figure ref={ref} className="shot" data-device={image.device}>
      <div className="shot__frame">
        <picture>
          {FORMATS.map((format) => (
            <source key={format} type={`image/${format}`} srcSet={srcSet(image.src, image.width, format, image.version)} sizes={sizes} />
          ))}
          <img
            src={versioned(image.src, image.version)}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading={first ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={first ? 'high' : 'auto'}
          />
        </picture>
      </div>
      {caption && image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}
