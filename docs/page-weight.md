# Page weight

What a visitor downloads for a page, measured in a real browser on two sizes: a desktop (1440 pixels wide) and a
phone (Pixel 7). Every picture a visitor would see is brought into view and waited for, so each one is counted,
also those that load only when they come near (since B12; picture figures measured before it may be too low). HTML,
CSS and JavaScript are counted compressed (gzip), as a host sends them; fonts and pictures as they are.

Measure again after a change that touches speed, and add the table here:

```powershell
npm run weight
```

## The home page, from the original to today

| | Original | After F2-F4 (new design, real HTML) | After F5 (WebP copies) | Today (after F53) |
|---|---|---|---|---|
| Requests | 41, of them 15 to other servers | 10, all to the site itself | 10, all to the site itself | 13, all to the site itself |
| JavaScript | 414 kB | 74 kB | 74 kB | 83 kB |
| CSS | 7 kB | 6 kB | 6 kB | 9 kB |
| HTML | 0.3 kB (an empty page) | 6 kB (the whole text) | 6 kB | 9 kB |
| Fonts | 80 kB, from Google | 74 kB, from the site | 74 kB, from the site | 74 kB, from the site |
| Pictures | 2,988 kB | 393 kB | 125 kB on a desktop, 161 kB on a phone | 149 kB on a desktop, 222 kB on a phone |
| 3D models and their lighting map | 2,908 kB | none | none | none |
| **Total as it travels** | **6,397 kB** | **553 kB** | **286 kB on a desktop, 322 kB on a phone** | **325 kB on a desktop, 398 kB on a phone** |

The original was measured from a build of the first version (`583fd75`) with the same method. Its 2,908 kB of 3D data are the models of the room (1,632 kB) and a lighting map the 3D library fetched
from another server (1,276 kB). The last column counts every picture of the page; before B12 the tool missed the
lower pictures, so the picture figures of the earlier columns are too low.

## Measured on 2026-11-20, F53 (each page loads only the project text it shows)

The script of every page carried the whole file of every project, the draft included: the paragraphs and points of
each project page and the description of every picture, although the home page shows only a card of each project.
Now that script carries the card of each shown project (what the list of work, the palette and the link to the next
project need), cut from the project's file when the site is built. A project page loads the whole file of its own
project as a second, small script; its head names that script, so the browser fetches it together with the first
one instead of after it. No script of the site holds anything of the draft.

The scripts, compressed with gzip; both builds were made from the same files, with and without the change:

| | Script of every page | Script of the project | A project page loads | As the budget counts | Left of the 95 kB budget (97,280 B) |
|---|---|---|---|---|---|
| Before F53 | 92,793 B | - | 92,793 B | 94,268 B | 3,012 B |
| After F53 | 85,232 B | 1,428 B (Jpro) to 2,768 B (Relic) | 86,660 B to 88,000 B | 89,475 B | 7,805 B |

Every page downloads 7,561 B less JavaScript before it answers; a project page 4,793 B to 6,133 B less in all, in one
request more. The HTML of a project page grows by the tag that names its script (26 B compressed). Since F53 the
budget counts what one page can load: the script of every page, the EmailJS file (loaded on the first send) and
the largest project file. Before, it added up every script of the build, which would now count seven project files
where a page loads one.

Before:

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 149 kB | **332 kB** |
| `/` | phone | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 222 kB | **405 kB** |
| `/work/rplms-v2/` | desktop | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 165 kB | **344 kB** |
| `/work/rplms-v2/` | phone | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 202 kB | **380 kB** |
| `/work/relic/` | desktop | 15 | 6 kB | 9 kB | 91 kB | 74 kB | 164 kB | **344 kB** |
| `/work/relic/` | phone | 15 | 6 kB | 9 kB | 91 kB | 74 kB | 251 kB | **430 kB** |

After:

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 13 | 9 kB | 9 kB | 83 kB | 74 kB | 149 kB | **325 kB** |
| `/` | phone | 13 | 9 kB | 9 kB | 83 kB | 74 kB | 222 kB | **398 kB** |
| `/work/rplms-v2/` | desktop | 14 | 5 kB | 9 kB | 85 kB | 74 kB | 165 kB | **338 kB** |
| `/work/rplms-v2/` | phone | 14 | 5 kB | 9 kB | 85 kB | 74 kB | 202 kB | **375 kB** |
| `/work/relic/` | desktop | 16 | 6 kB | 9 kB | 86 kB | 74 kB | 164 kB | **339 kB** |
| `/work/relic/` | phone | 16 | 6 kB | 9 kB | 86 kB | 74 kB | 251 kB | **426 kB** |

## Measured on 2026-11-20, F52 (AVIF copies)

Every screenshot now has AVIF copies beside its WebP copies, in the same widths. The page offers AVIF first; a
browser that cannot show it takes the WebP copy, and one that can show neither takes the original. Both tables were
measured with `npm run weight` on the same day, before and after the change.

Before (WebP):

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 186 kB | **368 kB** |
| `/` | phone | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 272 kB | **454 kB** |
| `/work/rplms-v2/` | desktop | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 190 kB | **369 kB** |
| `/work/rplms-v2/` | phone | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 230 kB | **409 kB** |

After (AVIF):

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 149 kB | **332 kB** |
| `/` | phone | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 222 kB | **405 kB** |
| `/work/rplms-v2/` | desktop | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 165 kB | **344 kB** |
| `/work/rplms-v2/` | phone | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 202 kB | **380 kB** |

The pictures of the home page are 37 kB lighter on a desktop and 50 kB lighter on a phone, about a fifth. Each
picture now also names its AVIF copies in the HTML: 242 B more of compressed HTML on the home page (9,025 B to
9,267 B), about 200 B on a project page. The JavaScript grew by 23 B (94,245 B to 94,268 B, together with EmailJS);
3,012 B of its 95 kB budget are left.

How the quality was chosen: every screenshot was compared with its original by two measures, SSIM and PSNR, and
the WebP copies of F5 (quality 80) were the bar. AVIF at quality 60, effort 7, with the colour kept at full
resolution: the 51 screenshots at full width come to 1,837 kB against 2,305 kB in WebP, 20 % less, and 49 of them
are at least as close to the original on both measures; the other two are within 0.001 SSIM and 0.8 dB PSNR. At
quality 55 and below AVIF fell behind WebP on most screenshots, and with the colour halved as WebP does it (4:2:0)
it fell behind on coloured text. In the repository the copies are 174 AVIF files of 4.1 MB, beside the 174 WebP
files of 5.0 MB.

## Measured on 2026-11-20, B12 (every picture counted)

Before B12, `npm run weight` scrolled the window in quick steps. The page scrolls smoothly, so each step only
started a gliding scroll that the next one replaced; the page never got near the bottom and the lower pictures were
never asked for. On the home page it counted four of the seven pictures on a desktop and three on a phone, and on
the RPLMS page it missed one picture on a phone. Now it brings each picture into view and waits for it. The pages
did not change: both tables were measured on the same build, three runs before the fix and two after it, and the
runs of each gave the same figures.

Before (too few pictures):

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 10 | 9 kB | 9 kB | 91 kB | 74 kB | 136 kB | **318 kB** |
| `/` | phone | 9 | 9 kB | 9 kB | 91 kB | 74 kB | 121 kB | **303 kB** |
| `/work/rplms-v2/` | desktop | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 190 kB | **369 kB** |
| `/work/rplms-v2/` | phone | 12 | 5 kB | 9 kB | 91 kB | 74 kB | 210 kB | **389 kB** |

After (every picture):

| Page | Size | Requests | HTML | CSS | JavaScript | Fonts | Pictures | Total as it travels |
|---|---|---|---|---|---|---|---|---|
| `/` | desktop | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 186 kB | **368 kB** |
| `/` | phone | 13 | 9 kB | 9 kB | 91 kB | 74 kB | 272 kB | **454 kB** |
| `/work/rplms-v2/` | desktop | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 190 kB | **369 kB** |
| `/work/rplms-v2/` | phone | 13 | 5 kB | 9 kB | 91 kB | 74 kB | 230 kB | **409 kB** |

A phone takes more than a desktop for the same pictures: its screen has more than two real pixels per pixel of
layout, so it asks for the sharper copies. The pictures below the first screen still wait until they come near;
a visitor who does not scroll down downloads less.

## Measured on 2026-11-20, F51 (the content is checked when the site is built)

The browser no longer checks the content files: the build has already checked them and drawn every page with them,
and the unit tests check them again. Only the JavaScript changes. Both builds were made from the same files, with
and without the change; compressed with gzip:

| | Main bundle (every page) | EmailJS (loaded on the first send) | Together, as the budget counts | Left of the 95 kB budget (97,280 B) |
|---|---|---|---|---|
| Before F51 | 94,932 B | 1,475 B | 96,407 B | 873 B |
| After F51 | 92,745 B | 1,475 B | 94,220 B | 3,060 B |

Every page downloads 2,187 B less, and the browser has 6.9 kB less code to read before the page answers. React DOM
is about 65 kB of the main bundle; most of the rest is the site's own components and the text of the content.

## Measured on 2026-11-20, F33 (the gallery of a project page)

F33 changes how the screens under "More screens" are laid out, and with it which copy of each picture the browser
takes. Only those pictures are compared here, on all seven project pages together: each one was brought into view
and waited for, because the scroll of `npm run weight` is faster than the pictures load (see the tracker).

| Gallery pictures, all seven pages | Desktop, 1440 px | Desktop, 1920 px | Phone (Pixel 7) |
|---|---|---|---|
| Before F33 | 911 kB | 911 kB | 1,517 kB |
| After F33 | 962 kB | 1,238 kB | 1,517 kB |

Per page that is 0 to 19 kB more at 1440 px and 21 to 78 kB more at 1920 px; a phone downloads the same as before.
Before F33 the `sizes` of the gallery said 36rem at most, so on a wide screen the browser took the 640 px copy of a
picture shown about 816 px wide and stretched it. Now every picture is loaded at least as wide as it is shown (a
browser test checks it at 1920 px); the first of an odd number spans the row and takes a wider copy.

The rest, compressed: CSS 8,450 B to 8,572 B; JavaScript 96,482 B to 96,652 B (the sizes of the gallery are chosen
in the component), which leaves 628 B of the 95 kB budget; the HTML of a project page about 45 B more.

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

AVIF was not done in F5. In a trial on five of the screenshots it came to 180 kB where WebP needs 247 kB, about a
quarter less, which would take another 30 to 40 kB off a page. It would also add a second set of files to the
repository. It was added in F52 (above).

## What keeps it that way

`tests/browser/weight.spec.js` holds the budgets, a little above today's figures: 95 kB of the JavaScript one page
can load and 12 kB of CSS (compressed), 12 kB of HTML per page, 350 kB per picture and 160 kB per AVIF or WebP copy.
It checks that the script of every page holds the cards of the projects but not the text of their pages, that no
script holds anything of a draft, and that a project page loads its own file and no other, named in its head (F53).
It also checks
that every picture offers its AVIF copies first, then WebP, then the original (F52), that the browser takes an AVIF
copy and a phone one no wider than 1,100 pixels, that pictures below the first screen wait until they are needed, and
that the JavaScript carries no check of the content (F51). Another checks that `npm run weight` counts every
picture of the home page, with the pictures held back as on a slow connection (B12).
`tests/browser/design.spec.js` checks that no request goes to another server.
