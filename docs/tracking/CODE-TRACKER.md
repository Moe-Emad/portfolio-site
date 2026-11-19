# Code tracker

One row per item. Groups are worked in this order: **A** = dependency and secret safety, **B** = bugs and security,
**F** = features and the look of a modern site, **D** = docs and developer setup. An item is done when its pull
request is merged. Status: planned, in progress, done.

Items up to F27 were done in a private working repository and brought here in one pull request (D4): their
issue and pull request numbers refer to that repository. From D4 on, the numbers are those of this repository.

## A - dependency and secret safety

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| A1 | #1 | Project files and working rules | Every later step needs rules to follow and a place to be tracked | `chore/a1-project-files` | #20 | done |
| A2 | #2 | Git hooks and secret scan | `.env` was committed in the original repo; nothing stops a key or a push to main | `chore/a2-git-hooks` | #21 | done |
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
| B5 | #10 | Untrue and leftover tutorial content | Invented figures on the page; 4.4 MB of unused tutorial files served publicly | `fix/b5-untrue-and-leftover-content` | #28 | done |
| B6 | #71 | /work/ shows the list of work instead of "page not found" | Every project lives under /work/, so a visitor who shortens the address expects the list there | `fix/b6-work-page` | #72 | done |

## F - features and the look

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| F1 | #11 | Content in data files with a checked shape | Changing a text means editing code; an admin panel needs content in files | `feat/f1-content-files` | #32 | done |
| F2 | #12 | A design of its own | The look and the 3D room come from a public tutorial; 1.4 MB of JavaScript | `feat/f2-design` | #33 | done |
| F3 | #13 | Real projects, each with its own page and real screenshots | The strongest projects are missing and every repo is private | `feat/f3-project-pages` | #34 | done |
| F4 | #14 | Pages as real HTML, and what search engines and link previews need | The server sends an empty page; no description, no share image | `feat/f4-real-html-and-seo` | #35 | done |
| F5 | #15 | Speed: modern picture formats, own fonts, less JavaScript | Full-size PNG files and a font from another server slow the first view | `feat/f5-speed` | #39 | done |
| F6 | #16 | Edit the content from an admin panel, without a database | Changing a text should not need a code editor or a server to defend | `feat/f6-admin-panel` | #38 | done |
| F7 | #17 | A command palette for the whole site | Sets the site apart and makes it quick to move around | `feat/f7-command-palette` | #40 | done |
| F8 | #41 | Pictures for TPMS, and a rule that a finished project has one | A finished project without a single screen looks unfinished | `feat/f8-tpms-pictures` | #42 | done |
| F9 | #43 | TPMS pictures of the redesigned pages | The pictures showed a dated page with dead picture links and no phone layout | `feat/f9-tpms-redesign-pictures` | #44 | done |
| F10 | #45 | TPMS pictures with a fuller course list | Four sample courses made the platform look empty | `feat/f10-tpms-more-courses` | #46 | done |
| F11 | #47 | The MTC training platform as a main project; Athelvoid and TPMS join the main list | The largest project was missing, and the developer chose which projects are the main ones | `feat/f11-mtc-and-main-list` | #48 | done |
| F12 | #49 | Relic pictures of the reworked interface | The pictures showed a chat window that hid the product; the developer judged the interface poor | `feat/f12-relic-redesign-pictures` | #50 | done |
| F13 | #51 | No picture of the MTC admin panel | The developer does not want the back office of a client shown, for security | `fix/f13-mtc-no-admin-screens` | #52 | done |
| F14 | #53 | Relic page shows the deeper analysis | Relic was reworked further (complete reports, answers with sources, pacing to the AI service's limit); the page showed the earlier state | `feat/f14-relic-deeper-analysis` | #56 | done |
| F15 | #57 | Athelvoid page shows the reworked site and its safe admin area | The page said the admin area was not safe yet; it has been fixed and the look reworked | `feat/f15-athelvoid-rework` | #58 | done |
| F16 | #61 | MTC and Jpro in Experience, linked to their project pages; Experience matches the CV | The developer's recent client work was missing from Experience, and two entries disagreed with the CV | `feat/f16-experience-client-work` | #62 | done |
| F17 | #63 | Draft projects are left out of the site; SaaS LMS is a draft | SaaS LMS is only a plan and weakened the list; the developer asked to take it off for now | `feat/f17-draft-projects` | #64 | done |
| F18 | #65 | Use the width of wide screens | On a wide screen almost half the width was empty at the sides; the developer does not like wasted space | `feat/f18-wide-screens` | #66 | done |
| F19 | #67 | A calmer head for Selected work, with tabs by kind | Fourteen technology buttons looked busy and generic above seven projects; the developer did not like the section | `feat/f19-work-head` | #68 | done |
| F20 | #69 | Life and motion: an opening for the first screen, pictures that unroll into view | The developer found the page static and asked for life and animations | `feat/f20-motion` | #70 | done |
| F21 | #73 | The RPLMS home page as its first picture | The developer finds the home page a better first picture than a property page | `feat/f21-rplms-home-picture` | #74 | done |
| F22 | #75 | Smaller and earlier work as a sheet of cells | The plain three-column table looked flat; the developer asked for more glamour | `feat/f22-archive-sheet` | #76 | done |
| F23 | #77 | Content rises into place as you scroll | The developer wants the page to come alive while scrolling, not only the pictures | `feat/f23-scroll-motion` | #78 | done |
| F24 | #79 | Skills as readable rows of tags, without counts | The developer found the counts pointless and the five narrow columns hard to read | `feat/f24-skills-rows` | #80 | done |
| F25 | #81 | More about each project in the list of work | Under each project's text a large area beside its picture was empty; the developer wants it used | `feat/f25-project-details` | #82 | done |
| F26 | #83 | A new headline under the name | The developer does not like introducing themselves with "every change tested and written down"; they chose a new line | `feat/f26-headline` | #84 | done |
| F27 | #85 | A sharp first picture of Molok El-Sook | Its first picture was 800 px wide and shown about 920 px wide, so it was stretched (found in F25) | `feat/f27-molok-picture` | #86 | done |

## D - docs and developer setup

| ID | Issue | Work item | Why | Branch | PR | Status |
|---|---|---|---|---|---|---|
| D1 | #18 | README for a fresh Windows PC | Setup should not depend on memory | `docs/d1-readme` | #36 | done |
| D2 | #19 | Deploy guide and checklist | The site has never been deployed; nothing about hosting is written down | `docs/d2-deploy-guide` | #37 | done |
| D3 | #59 | The tracker says where the reworked Relic and Athelvoid live | Both were pushed to new private repos; the findings still said "not pushed" and left the choice open | `docs/d3-rework-repos` | #60 | done |
| D4 | #1 | Publish the code of the site | Every project is private, so an employer could read none of the code; the working repository cannot be made public as it is | `chore/d4-publish` | #2 | done |

## Findings noted for later

New findings that are outside the item being worked on go here first, then become an item.

- The other pictures of Molok El-Sook (02 to 06) are still the 800 px pictures of the game's `demo/` folder. They
  are shown smaller, in the gallery of its page, so they are sharp enough; new ones at 1440 px would match the rest.
- JavaScript is at 93 kB of its 95 kB budget (`tests/browser/weight.spec.js`) since A7: React DOM 19.3 is about
  10.5 kB larger in the bundle than 19.1. The next change that adds JavaScript reaches the budget; decide then
  whether to trim or to raise it.
- The picture column of `npm run weight` depends on timing. Its scroll (steps of three quarters of a screen every
  120 ms) is faster than the pictures below the first screen load, so it counts two to five of the seven on the home
  page, differently from run to run (found in A7). Brought into view one by one, all seven load. A fix: bring each
  picture into view and wait for it, as the browser tests do.
- Before the site goes online: limit the EmailJS key to the address of the site and use a new public key
  (`docs/deploy.md`, section 2).
- The Jpro site answers on jprotraining.my and on jprotraining.com. The project page links to jprotraining.my (the
  one in its sitemap); change `links.live` in `content/projects/jpro-website.json` if the other one is the main
  address.
- MTC training platform (F11, F13) is client work, shown with the client's consent and without sensitive details.
  Keep out of this site: staging and server addresses, real phone numbers, e-mail addresses and street addresses,
  anything from the proposal or the internal documents, the launch date and the progress figures, and every screen
  of the admin panel (public pages and the learner's own area only). The pictures come from a local copy with
  made-up sample data and every outside service switched off. A content check (F13) keeps pictures of the admin
  panel off the page.
- A Content-Security-Policy header is not set yet. It needs a hash of the small theme script in `index.html`,
  written by the build into `public/_headers`, and a browser test that serves the site with it. A good next B item.
- AVIF copies of the screenshots: a trial on five pictures showed AVIF a quarter smaller than WebP (180 kB against
  247 kB), another 30 to 40 kB per page. F5 delivered WebP only; `src/lib/pictures.js` and `npm run pictures` are
  the two places to extend.
