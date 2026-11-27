// The drawing in the hero: an eight-pointed star of the kind found in Cairo's stone and woodwork, shown the way
// it is constructed - circle, radii, two squares - like an engineering drawing. Decoration only: hidden from
// screen readers. The lines draw themselves once when the page opens (not at all with "reduce motion").
import type { CSSProperties } from 'react';

const R = 88;
const point = (index: number, radius = R, steps = 8): [number, number] => {
  const angle = (index * 2 * Math.PI) / steps - Math.PI / 2;
  // Rounded, so the page drawn on the server and the one in the browser agree to the last digit.
  return [Math.round(radius * Math.cos(angle) * 100) / 100, Math.round(radius * Math.sin(angle) * 100) / 100];
};
const path = (indexes: number[], radius = R): string =>
  `${indexes.map((index, i) => `${i === 0 ? 'M' : 'L'}${point(index, radius).join(' ')}`).join(' ')} Z`;

// The circle that every side of the two squares touches.
const INNER = Math.round(R * Math.cos(Math.PI / 4) * 100) / 100;
// The corners of the small octagon where the lines of the {8/3} star cross.
const CORE = Math.round(R * (Math.SQRT2 - 1) * 100) / 100;

export default function StarDrawing() {
  let order = 0;
  // pathLength 1 lets one CSS rule draw every line, whatever its real length; --i staggers them.
  const draw = () => ({ pathLength: 1, style: { '--i': order++ } as CSSProperties });

  // The drawing stands in a box of its own (tracker B13): the browser turns a box with the scroll on its own layer,
  // but not an SVG element (index.css, star-away).
  return (
    <div className="star" aria-hidden="true">
      <svg viewBox="-100 -100 200 200" focusable="false">
        {/* Construction: circles and radii, thin and dashed. */}
        <g className="star__construction">
          <circle r={R} />
          <circle r={INNER} />
          <circle r={CORE} />
          {[0, 1, 2, 3].map((index) => {
            const [x, y] = point(index);
            return <line key={`d${index}`} x1={x} y1={y} x2={-x} y2={-y} />;
          })}
          {[0, 1, 2, 3].map((index) => {
            const [x, y] = point(index * 2 + 1, R, 16);
            return <line key={`h${index}`} x1={x} y1={y} x2={-x} y2={-y} />;
          })}
        </g>

        {/* The {8/3} star: every third point joined. */}
        <path d={path([0, 3, 6, 1, 4, 7, 2, 5])} {...draw()} className="star__line star__line--fine" />

        {/* The eight-pointed star itself: two squares, one turned by 45 degrees. */}
        <path d={path([0, 2, 4, 6])} {...draw()} className="star__line star__line--main" />
        <path d={path([1, 3, 5, 7])} {...draw()} className="star__line star__line--main" />

        {/* The octagon in the middle. */}
        <path d={path([0, 1, 2, 3, 4, 5, 6, 7], CORE)} {...draw()} className="star__line star__line--fine" />

        {/* Notes of the draughtsman. */}
        <g className="star__notes">
          <path d={`M0 ${-R * 0.3} A${R * 0.3} ${R * 0.3} 0 0 1 ${point(1, R * 0.3).join(' ')}`} />
          <text x="13" y={-R * 0.36}>
            45°
          </text>
          <line x1="0" y1="0" x2={point(2)[0]} y2="0" className="star__radius" />
          <text x={R * 0.52} y="-3.5">
            r
          </text>
          <circle r="1.6" className="star__centre" />
        </g>
      </svg>
    </div>
  );
}
