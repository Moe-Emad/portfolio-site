# Code tracker

One row per item. Groups are worked in this order: **A** = dependency and secret safety, **B** = bugs and security,
**F** = features and the look of a modern site, **D** = docs and developer setup. An item is done when its pull
request is merged. Status: planned, in progress, done.

Items up to F27 were done before this repository was published, and brought here in one pull request (D4): their
issue and pull request numbers do not link here. From D4 on, the numbers are those of this repository.

## A - dependency and secret safety

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| A1 | #1 | Project files and working rules | Every later step needs rules to follow and a place to be tracked | `chore/a1-project-files` | #20 | done |
| A2 | #2 | Git hooks and secret scan | Nothing stops a key, a `.env` file or a push to main | `chore/a2-git-hooks` | #21 | done |
| A3 | #3 | Fix the 8 dependency advisories, lock the install | 1 critical, 6 high, 1 moderate in the locked versions; installs run package scripts | `chore/a3-dependency-safety` | #22 | done |
| A4 | #4 | One gate command, and the same gate on GitHub | No single command says the project is healthy; nothing checks a pull request | `chore/a4-gate-and-ci` | #25 | done |
| A5 | #5 | Browser tests: Playwright smoke tests and axe checks | Page, form and CSS changes need a real browser, on desktop and phone sizes | `chore/a5-browser-tests` | #27 | done |
| A6 | #54 | Record the picomatch advisory that has no fix yet | A new advisory without a fixed version stopped the gate for every item | `chore/a6-picomatch-advisory` | #55 | done |
| A7 | #4 | The weekly minor and patch updates, and a lock check that knows bundled packages | Dependabot's update (#3) failed the lock check: Tailwind CSS 4.3 brings a package that carries six others inside its own download | `chore/a7-dependency-updates` | #5 | done |
| A8 | #6 | Remove the withdrawn picomatch advisory, and keep the accepted list from going stale | The advisory accepted in A6 was withdrawn on 2026-11-18; the gate only failed on new advisories, so nothing noticed | `chore/a8-withdrawn-advisory` | #7 | done |

## B - bugs and security

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| B1 | #6 | Imports with the wrong letter case | The build fails on every Linux host, so the site cannot be deployed | `fix/b1-import-letter-case` | #23 | done |
| B2 | #7 | Lint errors: a component breaks the rules of hooks | `npm run lint` fails with 2 errors and 1 warning | `fix/b2-lint-errors` | #24 | done |
| B3 | #8 | Contact form gives no answer and fails silently | A visitor cannot tell if the message went out; no protection against bots | `fix/b3-contact-form` | #31 | done |
| B4 | #9 | Navigation: dead link, wrong scroll target, a button that is not a link | Menu points to a section that does not exist; the main button is not reachable by keyboard | `fix/b4-navigation` | #30 | done |
| B5 | #10 | Placeholder content and unused files | Sample figures nobody measured on the page; 4.4 MB of unused files served publicly | `fix/b5-untrue-and-leftover-content` | #28 | done |
| B6 | #71 | /work/ shows the list of work instead of "page not found" | Every project lives under /work/, so a visitor who shortens the address expects the list there | `fix/b6-work-page` | #72 | done |
| B7 | #10 | The build starts Vite without npx, so the host's npm settings print no warnings | The build machine of Vercel sets an npm setting npm 11 does not know; every start of npm printed a warning, two of them from our build | `fix/b7-build-without-npx` | #11 | done |
| B8 | #12 | Headers, caching and the install and build commands on Vercel | The live site is on Vercel, which reads vercel.json, not public/_headers; its install and build commands were left to the defaults | `fix/b8-vercel-settings` | #13 | done |
| B9 | #16 | A printed page shows every block | A block not yet scrolled to stayed clipped on paper, so a page printed or saved as a PDF lost text and pictures | `fix/b9-print-every-block` | #17 | done |
| B10 | #18 | After a failed send the label of the first field stays in view | The form put the cursor in a field just under the bar and its label stayed hidden behind the bar | `fix/b10-form-label-in-view` | #19 | done |
| B11 | #64 | A Content-Security-Policy: the site runs only its own scripts | Without a policy the browser runs any script that finds its way into a page, and lets it load code from anywhere and send data anywhere | `fix/b11-content-security-policy` | #65 | done |
| B12 | #68 | npm run weight counts every picture of a page, the same on every run | It counted four of the seven pictures of the home page on a desktop and three on a phone: its quick scroll never got near the bottom of a page that scrolls smoothly | `fix/b12-weight-every-picture` | #69 | done |

## F - features and the look

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| F1 | #11 | Content in data files with a checked shape | Changing a text means editing code; an admin panel needs content in files | `feat/f1-content-files` | #32 | done |
| F2 | #12 | A design of its own | A generic look, and a 3D room that cost 1.4 MB of JavaScript | `feat/f2-design` | #33 | done |
| F3 | #13 | Real projects, each with its own page and real screenshots | The strongest projects are missing, and a visitor cannot see them anywhere else | `feat/f3-project-pages` | #34 | done |
| F4 | #14 | Pages as real HTML, and what search engines and link previews need | The server sends an empty page; no description, no share image | `feat/f4-real-html-and-seo` | #35 | done |
| F5 | #15 | Speed: modern picture formats, own fonts, less JavaScript | Full-size PNG files and a font from another server slow the first view | `feat/f5-speed` | #39 | done |
| F6 | #16 | Edit the content from an admin panel, without a database | Changing a text should not need a code editor or a server to defend | `feat/f6-admin-panel` | #38 | done |
| F7 | #17 | A command palette for the whole site | Sets the site apart and makes it quick to move around | `feat/f7-command-palette` | #40 | done |
| F8 | #41 | Pictures for TPMS, and a rule that a finished project has one | A finished project without a single screen looks unfinished | `feat/f8-tpms-pictures` | #42 | done |
| F9 | #43 | TPMS pictures of the redesigned pages | The pictures showed a dated page with dead picture links and no phone layout | `feat/f9-tpms-redesign-pictures` | #44 | done |
| F10 | #45 | TPMS pictures with a fuller course list | Four sample courses made the platform look empty | `feat/f10-tpms-more-courses` | #46 | done |
| F11 | #47 | The MTC training platform as a main project; Athelvoid and TPMS join the main list | The largest project was missing, and the main list was chosen anew | `feat/f11-mtc-and-main-list` | #48 | done |
| F12 | #49 | Relic pictures of the reworked interface | The pictures showed an earlier interface whose chat window hid the product | `feat/f12-relic-redesign-pictures` | #50 | done |
| F13 | #51 | No picture of the MTC admin panel | The back office of a client's system is not shown, for security | `fix/f13-mtc-no-admin-screens` | #52 | done |
| F14 | #53 | Relic page shows the deeper analysis | Relic was reworked further (complete reports, answers with sources, pacing to the AI service's limit); the page showed the earlier state | `feat/f14-relic-deeper-analysis` | #56 | done |
| F15 | #57 | Athelvoid page shows the reworked site and its safe admin area | The page showed the earlier site; its admin area and its look have been reworked | `feat/f15-athelvoid-rework` | #58 | done |
| F16 | #61 | MTC and Jpro in Experience, linked to their project pages; Experience matches the CV | Recent client work was missing from Experience, and two entries disagreed with the CV | `feat/f16-experience-client-work` | #62 | done |
| F17 | #63 | Draft projects are left out of the site; SaaS LMS is a draft | SaaS LMS is still a plan; it stays in the content but off the site for now | `feat/f17-draft-projects` | #64 | done |
| F18 | #65 | Use the width of wide screens | On a wide screen almost half the width was empty at the sides | `feat/f18-wide-screens` | #66 | done |
| F19 | #67 | A calmer head for Selected work, with tabs by kind | Fourteen technology buttons looked busy and generic above seven projects | `feat/f19-work-head` | #68 | done |
| F20 | #69 | Life and motion: an opening for the first screen, pictures that unroll into view | The page felt static | `feat/f20-motion` | #70 | done |
| F21 | #73 | The RPLMS home page as its first picture | The home page shows the product better than a property page | `feat/f21-rplms-home-picture` | #74 | done |
| F22 | #75 | Smaller and earlier work as a sheet of cells | The plain three-column table looked flat | `feat/f22-archive-sheet` | #76 | done |
| F23 | #77 | Content rises into place as you scroll | Only the pictures moved while scrolling; the rest of the page stood still | `feat/f23-scroll-motion` | #78 | done |
| F24 | #79 | Skills as readable rows of tags, without counts | The counts said little, and the five narrow columns were hard to read | `feat/f24-skills-rows` | #80 | done |
| F25 | #81 | More about each project in the list of work | Under each project's text a large area beside its picture was empty | `feat/f25-project-details` | #82 | done |
| F26 | #83 | A new headline under the name | The old line, "every change tested and written down", described the process instead of the work | `feat/f26-headline` | #84 | done |
| F27 | #85 | A sharp first picture of Molok El-Sook | Its first picture was 800 px wide and shown about 920 px wide, so it was stretched (found in F25) | `feat/f27-molok-picture` | #86 | done |
| F28 | #14 | Speed Insights on the live site | Nothing measured how fast the live site is for real visitors; the budgets measure a test build | `feat/f28-speed-insights` | #15 | done |
| F29 | #20 | The palette shows where you are without saffron | The saffron ring and edge looked like a stock component and were faint in the light theme (below 3:1) | `feat/f29-palette-marks` | #21 | done |
| F30 | #22 | The points of a project page sit under a hairline, not beside a saffron stripe | A saffron stripe down the side of every point used the accent colour as decoration; the rest of the page separates its parts with hairlines | `feat/f30-highlight-hairlines` | #23 | done |
| F31 | #24 | The footer says only the year and the name | The line also said how the site was built, which is for the repository, not the page | `feat/f31-footer-line` | #26 | done |
| F32 | #25 | RPLMS is called RPLMS, and its figure gives Laravel 13 | The product is RPLMS; the version it runs on matters, not the way there | `feat/f32-rplms-name` | #28 | done |
| F33 | #27 | The gallery of a project page leaves no empty half rows | Phone screens stood in a row of their own beside a large empty area, and an odd number of wide screens left half a row empty | `feat/f33-gallery-rows` | #29 | done |
| F34 | #30 | Section titles stand without a saffron bar under them | The same short bar under every title is the look of many stock templates and spent the accent colour on decoration; the lists under the titles already open with a hairline | `feat/f34-section-titles` | #31 | done |
| F35 | #32 | Tools are listed as plain text, without chips or pills | The skills showed boxed chips that changed under the mouse although they are not links, and a project page round pills; the rows of the work list already gave the tools as a plain line | `feat/f35-plain-tool-lists` | #33 | done |
| F36 | #34 | The line above the name says Software engineer based in Egypt | Asked for, and the way the introduction under "How I work" already says it; the words now come from one place for the page, its description and the link preview | `feat/f36-based-in` | #35 | done |
| F37 | #36 | Two corner radii instead of five | Fully round buttons stood beside 4 px buttons in the first view, and five radii without a rule read as parts from different kits | `feat/f37-two-radii` | #37 | done |
| F38 | #38 | The figures of a project as a title block instead of a strip of big numbers | Seven rows of large numbers in the display face read as a dashboard and outweighed the name of each project; on a phone four figures wrapped as three and one | `feat/f38-figures` | #39 | done |
| F39 | #40 | The title block of a project page in the corner of the blue band | The right half of the band was empty on a wide screen while the figures ran the full width under the cover in four mostly empty cells; my part sat in the one card left on a page of hairlines | `feat/f39-band-corner` | #41 | done |
| F40 | #42 | Each row of the work list has its name on top | The name of a project was in the text face and little larger than its figures and summary, smaller than the heading of the lesser work below; my part was muted under a label in ink | `feat/f40-row-names` | #43 | done |
| F41 | #44 | Smaller and earlier work as a register | Eight equal cells with the same star in every corner and a hover on cells that are not links; their names in the display face competed with the main work since F40 | `feat/f41-register` | #45 | done |
| F42 | #46 | Name and email side by side in the contact form on a wide screen | Each field took the full width of its column, 924 px at 1920 for a name, which made the form taller than the text beside it | `feat/f42-form-pair` | #47 | done |
| F43 | #48 | The phone menu fills the screen, and touch screens see no keyboard hints | The open menu ended in the middle of a phone screen over the first screen; the palette named arrow keys, Enter and Esc on touch screens | `feat/f43-phone-menu` | #49 | done |
| F44 | #50 | The link preview says the headline of the home page | The share picture still said the line of before F26 under the name, typed into its script, while the home page had a new headline | `feat/f44-share-line` | #51 | done |
| F45 | #52 | The first screen has one button, and the role stands under the name | A line over the name and a pair of equal buttons are the pattern of countless templates, and the two buttons competed for the one main way on | `feat/f45-first-screen` | #53 | done |
| F46 | #54 | On a phone the star stands under the buttons, at full strength | On a phone the star was enlarged behind the name at 22 % opacity, its lines across the name, the role and the headline, and too faint to read as a drawing | `feat/f46-phone-star` | #55 | done |
| F47 | #56 | A blueprint dark theme | The dark theme was navy with lavender text, a generic dark mode, and its tinted bands differed from the ground by 1.06 | `feat/f47-blueprint` | #57 | done |
| F48 | #58 | Lines draw themselves instead of text rising | Almost every block of text rose into place while scrolling and the figures counted up, rewriting their text while it was read: the motion of a template, not of a drawing | `feat/f48-draw-motion` | #59 | done |
| F49 | #60 | The tabs of the work list name their kind without a count | Every tab carried the number of its projects (two of them 1), the look of a shop's filter bar, while the line under the tabs already said the number; at 1024 px the wider tabs pushed the title of the section onto two lines | `feat/f49-tab-names` | #61 | done |
| F50 | #62 | Each screen in a frame of its own kind, and covers no wider than their pixels | Every screenshot stood in the same card with its caption inside, a phone screen as a tall rectangle; the 1440 px cover of a project page was stretched to 1664 px on a wide screen and looked soft | `feat/f50-screen-frames` | #63 | done |
| F51 | #66 | The content is checked when the site is built, not in every visit | The JavaScript was 873 B under its budget; every visit repeated in the browser the check of the content that the build and the tests had already made | `feat/f51-content-check-at-build` | #67 | done |
| F52 | #72 | AVIF copies of the screenshots | The pictures were the largest part of every page and came only as WebP; AVIF holds the same screenshot about a fifth smaller, as close to the original | `feat/f52-avif-copies` | #73 | done |
| F53 | #74 | Each page loads only the project text it shows | The script of every page carried the whole file of every project, the draft included (about 10 kB compressed), while the home page shows a card of each and a project page only its own text; the JavaScript was 3 kB under its budget | `feat/f53-project-text-per-page` | #75 | done |
| F54 | #76 | Browsers keep the pictures, and fetch a changed one at once | The host sent every picture with max-age=0, so every visit asked about each picture again (nine round trips on a second visit to a project page); the pictures keep their names when replaced, so a long cache alone would show old ones | `feat/f54-picture-cache` | #77 | done |
| F55 | #78 | The fonts of the first view are fetched with the stylesheet | The browser found the two typefaces only in the stylesheet and asked for Rakkas last: on a slow connection the name and the titles stood in a stand-in typeface for about 0.4 s and the page moved when it arrived | `feat/f55-font-preload` | #79 | done |
| F56 | #80 | The Arabic font holds only the letters the site shows | Every page downloaded the whole Arabic file of Rakkas (26 kB) for ten letters, and its face, without a range, was taken for every character, Latin text included | `feat/f56-arabic-font-subset` | #81 | done |
| F57 | #82 | Skills on the lines of Experience on a wide screen | At 1920 px the tools of each group ended near the middle of the row and the right of the section stayed empty, while Experience above uses the width in three columns | `feat/f57-skills-columns` | #83 | done |
| F58 | #84 | Screenshots sharp on sharp screens, starting with Jpro | On a screen with two pixels per point, as most laptops, the 1,440 px screenshots were enlarged and looked soft; the site had no copy for such a screen | `feat/f58-sharp-screenshots` | #85 | done |

## D - docs and developer setup

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| D1 | #18 | README for a fresh Windows PC | Setup should not depend on memory | `docs/d1-readme` | #36 | done |
| D2 | #19 | Deploy guide and checklist | The site has never been deployed; nothing about hosting is written down | `docs/d2-deploy-guide` | #37 | done |
| D3 | #59 | The tracker is up to date on the reworked Relic and Athelvoid | The findings about them were out of date | `docs/d3-rework-repos` | #60 | done |
| D4 | #1 | Publish the code of the site | An employer could read none of the code behind the projects; the code of the site itself can be shown | `chore/d4-publish` | #2 | done |
| D5 | #8 | A README about the site, and public docs without working notes | The README was a setup manual, not documentation of the site; some docs carried working notes that do not belong in a public repository | `docs/d5-public-docs` | #9 | done |
| D6 | #70 | The README describes the motion of the site as it is today | The README said blocks rise into place while scrolling, the motion before F48; since then the text further down stands still and its rules draw themselves | `docs/d6-readme-motion` | #71 | done |
| D7 | #86 | The deploy guide says what EmailJS offers on the free plan | The guide said the Domains list might be on the free plan and that a site could get a public key of its own; EmailJS lists the Domains list from its paid plans and describes no second public key | `docs/d7-emailjs-plans` | - | in progress |

## Findings noted for later

New findings that are outside the item being worked on go here first, then become an item.

- The other pictures of Molok El-Sook (02 to 06) are still the 800 px pictures of the game's `demo/` folder. They
  are shown smaller, in the gallery of its page, so they are sharp enough; new ones at 1440 px would match the rest.
- On this PC, a full `npm run test:browser` while other programs are busy can stop at the 30 s limit in a few tests,
  different ones from run to run, all on the desktop size (seen in B8: 2, then 6). The same files pass on their own and
  on GitHub. If it keeps happening, run the tests with fewer workers (`npm run test:browser -- --workers 2`).
- Sharp screenshots (F58): the site carries screenshots taken at twice the size, and the four wide screenshots of
  Jpro are retaken at 2880 px. The wide screenshots of Athelvoid (7), MTC (7), Relic (8), TPMS (5), RPLMS (6) and
  Molok El-Sook (5, four of them the 800 px pictures of its demo folder) are still 1x; each project has to run with
  its data to take them again, the same pages in the same state. One item per project.
