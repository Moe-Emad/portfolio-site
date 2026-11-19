# Page weight

What a visitor downloads for a page, measured in a real browser on two sizes: a desktop (1440 pixels wide) and a
phone (Pixel 7). The whole page is scrolled, so every picture is counted, also those that load only when they
come near. HTML, CSS and JavaScript are counted compressed (gzip), as a host sends them; fonts and pictures as
they are.

Measure again after a change that touches speed, and add the table here:

```powershell
npm run weight
```

## The home page, from the original to today

| | Original | After F2-F4 (new design, real HTML) | After F5 (this change) |
|---|---|---|---|
| Requests | 41, of them 15 to other servers | 10, all to the site itself | 10, all to the site itself |
| JavaScript | 414 kB | 74 kB | 74 kB |
| CSS | 7 kB | 6 kB | 6 kB |
| HTML | 0.3 kB (an empty page) | 6 kB (the whole text) | 6 kB |
| Fonts | 80 kB, from Google | 74 kB, from the site | 74 kB, from the site |
| Pictures | 2,988 kB | 393 kB | 125 kB on a desktop, 161 kB on a phone |
| 3D models and their lighting map | 2,908 kB | none | none |
| **Total as it travels** | **6,397 kB** | **553 kB** | **286 kB on a desktop, 322 kB on a phone** |

The original was measured from a build of the first version (`583fd75`) with the same method. Its 2,908 kB of 3D data are the models of the room (1,632 kB) and a lighting map the 3D library fetched
from another server (1,276 kB).

## Measured on 2026-11-20, F28 (Speed Insights)

Speed Insights starts only in the build Vercel makes for production, so `npm run weight` and the budgets, which
measure a test build, do not see it. The JavaScript files of the two builds, compressed with gzip:

| | Main bundle | Loaded after the page has drawn |
|---|---|---|
| Before F28 | 94,870 B | - |
| After F28, any build but Vercel's production one | 94,871 B | nothing |
| After F28, Vercel's production build | 94,949 B | 1,097 B (the package) and 7,333 B (Vercel's script, `/_vercel/speed-insights/script.js`) |

A visit to the live site downloads about 8.5 kB more, all of it after the page is drawn; the first view is
unchanged. The size of Vercel's script was read from its public copy on the day; Vercel may change it.

## Measured on 2026-11-19, A7 (React 19.3 and the other minor updates)

Only packages changed in A7, so only the code is compared. Both rows were measured on the same day with
`npm run weight`, on a desktop and a phone size, which gave the same figures.

| | HTML of `/` | HTML of `/work/rplms-v2/` | CSS | JavaScript |
|---|---|---|---|---|
| Before A7 | 9 kB | 5 kB | 8 kB | 82 kB |
| After A7 | 9 kB | 5 kB | 8 kB | 93 kB |

The 11 kB are React DOM: its browser part is about 10.5 kB larger in the bundle in 19.3 than in 19.1. The budget is
95 kB, so 2 kB are left for the next change that adds JavaScript.

Pictures are left out of this table. The scroll of `npm run weight` is faster than the pictures below the first
screen load, so it counts two to five of the seven on the home page, differently from run to run, in both versions.
Brought into view one by one, all seven load in both. This is noted in the tracker.

The page today weighs about a twentieth of the original, and it shows its text before any JavaScript arrives.

## Measured on 2026-11-17, after F5

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 10 | 6 kB | 6 kB | 74 kB | 74 kB | 125 kB | **286 kB** |
| `/` | phone | 10 | 6 kB | 6 kB | 74 kB | 74 kB | 161 kB | **322 kB** |
| `/work/rplms-v2/` | desktop | 12 | 4 kB | 6 kB | 74 kB | 74 kB | 127 kB | **285 kB** |
| `/work/rplms-v2/` | phone | 12 | 4 kB | 6 kB | 74 kB | 74 kB | 180 kB | **339 kB** |

## Measured on 2026-11-17, before F5

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 10 | 6 kB | 6 kB | 74 kB | 74 kB | 393 kB | **553 kB** |
| `/` | phone | 10 | 6 kB | 6 kB | 74 kB | 74 kB | 393 kB | **553 kB** |
| `/work/rplms-v2/` | desktop | 12 | 3 kB | 6 kB | 74 kB | 74 kB | 401 kB | **559 kB** |
| `/work/rplms-v2/` | phone | 12 | 3 kB | 6 kB | 74 kB | 74 kB | 401 kB | **559 kB** |

## What F5 changed

- Every screenshot has WebP copies in several widths (640, 828 and 1,100 pixels, and one at full width). The page
  offers them all and the browser takes the one that fits the place and the screen. Before, a phone downloaded
  the same 1,440 pixel JPEG as a desktop.
- A phone takes a little more than a desktop here because its screen has more than two real pixels per pixel of
  layout, so it asks for the sharper copy.
- The original JPEG or PNG stays as the fallback for a browser without WebP and as the picture of link previews.

AVIF is not done yet. In a trial on five of the screenshots it came to 180 kB where WebP needs 247 kB, about a
quarter less, which would take another 30 to 40 kB off a page. It would also add a second set of 82 files to the
repository. It is noted in the tracker as a follow-up.

## What keeps it that way

`tests/browser/weight.spec.js` holds the budgets, a little above today's figures: 95 kB of JavaScript and 12 kB of
CSS (compressed), 12 kB of HTML per page, 350 kB per picture and 160 kB per WebP copy. It also checks that a phone
is given a copy no wider than 1,100 pixels and that pictures below the first screen wait until they are needed.
`tests/browser/design.spec.js` checks that no request goes to another server.
