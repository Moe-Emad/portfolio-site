// The page that is photographed for the share picture (tracker F4, F44): the role line, the name in two scripts and
// the line under it on blue, with the star of the first screen. Everything it says comes from content/profile.json,
// so a new name, role or headline reaches the picture with the next `npm run og-image`.
import { roleLine } from '../../src/lib/profile.js';

/** Text from the profile, safe to put between tags. */
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The HTML of the share picture, 1200 x 630.
 * @param {{ name: string, nameArabic: string, role: string, location: string, headline: string }} profile
 * @param {(file: string) => string} font  the address of a font file below node_modules
 * @returns {string}
 */
export function sharePage(profile, font) {
  const [first, ...rest] = profile.name.split(' ').map(escape);
  // The headline as on the home page, in two lines after its first comma when it has one.
  const headline = escape(profile.headline).replace(/, /, ',<br>');

  // The star of the hero, drawn with the same numbers as src/components/StarDrawing.tsx.
  const R = 88;
  const point = (index, radius = R) => {
    const angle = (index * 2 * Math.PI) / 8 - Math.PI / 2;
    return `${(radius * Math.cos(angle)).toFixed(2)} ${(radius * Math.sin(angle)).toFixed(2)}`;
  };
  const shape = (indexes, radius) => `${indexes.map((index, i) => `${i === 0 ? 'M' : 'L'}${point(index, radius)}`).join(' ')} Z`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Rakkas; src: url("${font('@fontsource/rakkas/files/rakkas-latin-400-normal.woff2')}"); unicode-range: U+0000-00FF; }
  @font-face { font-family: Rakkas; src: url("${font('@fontsource/rakkas/files/rakkas-arabic-400-normal.woff2')}"); unicode-range: U+0600-06FF, U+FE70-FEFF; }
  @font-face { font-family: Readex; src: url("${font('@fontsource-variable/readex-pro/files/readex-pro-latin-wght-normal.woff2')}"); font-weight: 200 700; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #1034a6; color: #fff; font-family: Readex; position: relative; }
  .text { position: absolute; left: 80px; top: 76px; }
  .role { font-size: 28px; font-weight: 500; color: #d5deff; }
  .sign { margin-top: 16px; display: grid; grid-template-columns: auto 1fr; align-items: baseline; width: fit-content; font-family: Rakkas; font-size: 120px; line-height: .95; }
  .sign .first { grid-column: 1 / -1; }
  .sign .arabic { justify-self: end; color: #ffc83d; font-size: .7em; line-height: 1.25; }
  .line { position: absolute; left: 80px; bottom: 72px; width: 570px; font-size: 28px; font-weight: 300; line-height: 1.45; }
  svg { position: absolute; right: -60px; top: 65px; width: 500px; height: 500px; }
  </style></head><body>
  <div class="text">
    <p class="role">${escape(roleLine(profile.role, profile.location))}</p>
    <div class="sign"><span class="first">${first}</span><span>${rest.join(' ')}</span><span class="arabic" lang="ar" dir="rtl">${escape(profile.nameArabic)}</span></div>
  </div>
  <p class="line">${headline}</p>
  <svg viewBox="-100 -100 200 200">
    <g fill="none" stroke="rgba(255,255,255,.3)" stroke-width=".35" stroke-dasharray="1.4 1.6">
      <circle r="${R}"/><circle r="${(R * Math.SQRT1_2).toFixed(2)}"/>
    </g>
    <path d="${shape([0, 3, 6, 1, 4, 7, 2, 5])}" fill="none" stroke="#fff" stroke-width=".45"/>
    <path d="${shape([0, 2, 4, 6])}" fill="none" stroke="#ffc83d" stroke-width="1.05" stroke-linejoin="round"/>
    <path d="${shape([1, 3, 5, 7])}" fill="none" stroke="#ffc83d" stroke-width="1.05" stroke-linejoin="round"/>
    <path d="${shape([0, 1, 2, 3, 4, 5, 6, 7], R * (Math.SQRT2 - 1))}" fill="none" stroke="#fff" stroke-width=".45"/>
    <circle r="1.6" fill="#ffc83d"/>
  </svg>
  </body></html>`;
}
