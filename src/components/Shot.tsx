import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ProjectImage } from '../content/schema.ts';
import { FORMATS, srcSet, versioned } from '../lib/pictures.js';
import { useReveal } from '../lib/reveal.ts';

type Picture = Pick<ProjectImage, 'src' | 'alt' | 'width' | 'height' | 'version'>;

/**
 * One picture in the copies that fit the place and the screen (src/lib/pictures.js): AVIF, or WebP if the browser
 * cannot show AVIF (tracker F52); the original file is the fallback for a browser without either. Every address
 * carries the fingerprint of the picture's files (tracker F54). The size of the file is written into the HTML, so the
 * page keeps the place free and nothing jumps when the picture arrives.
 */
function ScreenPicture({ image, sizes, first = false }: { image: Picture; sizes: string; first?: boolean }) {
  return (
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
  );
}

/**
 * A screenshot in its frame, with its caption under the frame (tracker F50). The frame is of the screen's kind: a
 * hairline for a wide screen, the outline of a phone around a phone screen (see .shot__frame in index.css).
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
        <ScreenPicture image={image} sizes={sizes} first={first} />
      </div>
      {caption && image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}

/**
 * The same screen before and after its rework (tracker F69): the rework in the frame, the original over it up to a
 * handle. Drag the handle, or move it with the arrow keys - it is a range input over the whole frame - to show more
 * of one or the other. Both pictures keep their own description; the labels say which side is which.
 */
export function Compare({ image, sizes }: { image: ProjectImage & { before: NonNullable<ProjectImage['before']> }; sizes: string }) {
  const ref = useReveal<HTMLElement>();
  const [split, setSplit] = useState(50);
  return (
    <figure ref={ref} className="shot compare" data-device="desktop" style={{ '--split': `${split}%` } as CSSProperties}>
      <div className="shot__frame compare__frame">
        <ScreenPicture image={image} sizes={sizes} />
        <div className="compare__before">
          <ScreenPicture image={image.before} sizes={sizes} />
        </div>
        <span className="compare__label compare__label--before" aria-hidden="true">
          Original
        </span>
        <span className="compare__label compare__label--after" aria-hidden="true">
          Rework
        </span>
        <input
          className="compare__range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={split}
          onChange={(event) => setSplit(Number(event.target.value))}
          aria-label="Compare the original screen with its rework: how much of the original to show"
          aria-valuetext={`${split}% original`}
        />
        <span className="compare__handle" aria-hidden="true" />
      </div>
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  );
}
