# portfolio-site

The portfolio site of Mohammed Emad, software engineer: a home page (work, how I work, experience, skills, contact)
and a page for every project. It started as a copy of a video tutorial (kept untouched as a private backup) and was
rebuilt step by step into a site of its own. Every planned and finished change is listed in
[docs/tracking/CODE-TRACKER.md](docs/tracking/CODE-TRACKER.md); merged changes are in [CHANGELOG.md](CHANGELOG.md).

The work up to item F27 was done in a private working repository and brought here in one pull request (D4); the
issue and pull request numbers of those items refer to that repository.

## Stack

React 19, Vite 7, Tailwind CSS 4 and TypeScript. Every page is written to real HTML when the site is built, so any
static host can serve it. The texts and projects are JSON files in `content/`. The contact form sends through
EmailJS. There is no database and no server of our own.

## Requirements

- [Node.js](https://nodejs.org/) 22.18 or newer with npm (tested with Node.js 24). Check with `node -v`
- [Git](https://git-scm.com/)
- For the browser tests only: the Chromium of Playwright (one command, see "Tests")

Nothing else: no PHP, no XAMPP, no database. All commands below are for Windows PowerShell, run from the project
folder, one line each.

## First-time setup

1. **Get the code**

   ```powershell
   git clone https://github.com/Moe-Emad/portfolio-site.git "D:\Code Projects\portfolio-site"
   ```

   ```powershell
   cd "D:\Code Projects\portfolio-site"
   ```

2. **Install the packages** exactly as locked in `package-lock.json`

   ```powershell
   npm ci
   ```

   Use `npm ci`, never `npm install`: that one picks new versions and rewrites the lock file (a change of its own,
   with its own pull request). npm runs no install scripts of the downloaded packages here (`.npmrc`).

3. **Switch the git hooks on** (once per clone; `npm ci` does not do it)

   ```powershell
   npm run hooks
   ```

   From now on a commit is scanned for keys and passwords, `.env` files and database dumps are refused, and a push
   runs every check first.

4. **Settings**

   ```powershell
   Copy-Item .env.example .env
   ```

   Open `.env` and fill in the three EmailJS values from the [EmailJS dashboard](https://dashboard.emailjs.com).
   Without them the site runs and shows a short notice instead of the contact form. `VITE_SITE_URL` can stay empty
   on a PC. `.env` is never committed.

5. **Check that everything works**

   ```powershell
   npm run gate
   ```

   It must end with "gate: all ... checks passed".

## The daily start

```powershell
npm run dev
```

The site is on http://localhost:5173 and reloads when a file changes. Stop it with Ctrl+C.

To see the site exactly as it will be online (every page as its own HTML file):

```powershell
npm run build
```

```powershell
npm run preview
```

That one is on http://localhost:4173.

## After pulling changes

```powershell
git pull
```

```powershell
npm ci
```

`npm ci` is only needed when `package-lock.json` changed, but it never hurts.

## Changing what the site says

Everything the site shows is in `content/`. No component needs to be touched. There are two ways to edit it: the
admin panel in the browser ([docs/admin.md](docs/admin.md)), or the files themselves:

| To change | Edit |
|---|---|
| Name, headline, the "How I work" text, LinkedIn and GitHub links | `content/profile.json` |
| Jobs | `content/experience.json` (months as `YYYY-MM`; `"end": null` means "to this day") |
| Skills and their groups | `content/skills.json` |
| A project: texts, facts, pictures, order, featured or not | `content/projects/<slug>.json` |
| The list of smaller and earlier work | `content/archive.json` |

**A new project:** copy an existing file in `content/projects/`, name it `<slug>.json` with the same `slug` inside,
and put its screenshots in `public/images/projects/<slug>/`. Each picture needs `src`, `alt` (what it shows),
`device` (`desktop` or `phone`) and its `width` and `height` in pixels. A featured project needs at least one
picture, and so does one whose status is Finished or Live; the first picture is the cover. The page `/work/<slug>/` appears by itself.

**The number after a skill** counts the projects whose `stack` names it, so write a technology the same way in
`skills.json` and in the projects ("Next.js", not "NextJS").

After a change, run the check. It names the file and the field when something is wrong:

```powershell
npm run test:unit
```

After adding pictures, let their sizes be filled in and their smaller copies be made (WebP, in several widths, so a
phone downloads a picture of its own size). Commit the new `.webp` files with the change:

```powershell
npm run pictures
```

After adding a field to the content (in `src/content/schema.ts`), add it to the admin panel too, in
`tools/build/pages-cms.cjs`, and write its settings file again:

```powershell
npm run cms-config
```

After changing the name or the role, redraw the picture that link previews show:

```powershell
npm run og-image
```

## Putting it online

[docs/deploy.md](docs/deploy.md): where to host it, the settings, what to do in EmailJS first, and a checklist for
after every deploy.

## Tests

| Command | What it does | Time |
|---|---|---|
| `npm run gate` | Every check in one command: hooks switched on, lock file, code style, types, tool tests, unit tests, no AI attribution and no secrets in the commits of the branch, `npm audit`, the build. Run it before every commit; a push runs it too | 15 s |
| `npm run gate -- --fast` | The gate without the audit and the build (needs no network) | 10 s |
| `npm run test:browser` | The site in a real browser on a desktop and a phone size: pages load, links work, the contact form, the themes, the built HTML, and the axe accessibility rules. Run it after a change to a page, a form or the CSS | 20 s |
| `npm run test:unit` | Unit tests, and the check of every file in `content/` | 1 s |
| `npm run test:tools` | Tests of the git hooks and the developer tools | 8 s |
| `npm run lint` / `npm run typecheck` | ESLint (warnings fail too) / TypeScript | 2 s |
| `npm run weight` | What a visitor downloads for a page, measured in a real browser on both sizes, as a table for `docs/page-weight.md` | 20 s |
| `npm run locks` | The lock file: in step with `package.json`, packages from the npm registry only, with checksums | 1 s |
| `npm run secrets` | The secret scan over the whole history of the repo (the hooks only scan what is being committed) | 2 s |

The browser tests need the Chromium of Playwright once per PC:

```powershell
npx playwright install chromium
```

They build their own copy of the site (`dist-e2e/`) with made-up EmailJS settings and serve it on port 4319. They
never touch `.env`, `dist/` or a running dev server, and no mail is ever sent.

GitHub runs the gate and the browser tests on every pull request.

## How a change is made

1. A GitHub issue with why / scope / done when, and a row in the tracker.
2. A branch (`feat/...`, `fix/...`, `chore/...`, `docs/...`). Never work on `main`; a push to `main` is refused.
3. The change with its tests. Each new test is seen failing without the change and passing with it.
4. `npm run gate`, and `npm run test:browser` after a change to a page, a form or the CSS.
5. A pull request with "Closes #issue"; its number goes into the tracker row and `CHANGELOG.md`.
6. When GitHub is green: squash-merge, delete the branch, `git pull` on `main`.

Commit messages are written to a file and committed with `git commit -F <file>`. Lessons that cost time once are
in [docs/pitfalls.md](docs/pitfalls.md).

## Where things are

| Folder | What is in it |
|---|---|
| `content/` | The texts and projects (JSON) |
| `public/` | Files served as they are: screenshots, the favicon, the share picture |
| `src/components/` | The parts of the pages |
| `src/content/` | The shape of the content files and the check |
| `src/lib/` | Rules kept apart from the pages so they can be tested alone: the contact form, the command palette, the theme, the picture copies |
| `src/index.css` | The whole look: colours for both themes, type, layout |
| `tests/browser/` | The browser tests |
| `tools/build/` | The build: pages to HTML, the share picture, the figures the site shows about itself |
| `tools/dev/` | The gate, the git hooks' tools and their tests |
| `docs/` | The tracker, the pitfalls, screenshots of each change, the deploy guide (`docs/deploy.md`) |

## Troubleshooting

| Symptom | What to do |
|---|---|
| `npm ci` says the Node.js version is not supported | Install Node.js 22.18 or newer, open a new terminal, check with `node -v` |
| The gate fails at "git hooks are switched on" | `npm run hooks` |
| A commit is refused with "secret-scan" | A key, a `.env` file or a database dump is staged. Take it out (`git restore --staged <file>`); settings belong in `.env`. Never use `--no-verify` |
| A commit is refused because of the commit message | The message has an AI attribution line ("Co-Authored-By", "Generated with"). Remove it |
| `git push` is refused with "direct push to main" | Push a branch and open a pull request |
| The site shows "The content has ... problem(s)" or the unit tests fail after editing `content/` | Read the message: it names the file and the field. Often a missing comma or quote in the JSON |
| The contact form is replaced by a notice | The three EmailJS values in `.env` are missing or empty. Fill them in and start `npm run dev` again |
| The contact form says the message could not be sent | The EmailJS values are wrong, or the EmailJS account does not allow the address the site runs on (`docs/deploy.md`, section 2) |
| Browser tests: "Executable doesn't exist" | `npx playwright install chromium` |
| Browser tests: "Start the browser tests with: npm run test:browser" | Do that; `npx playwright test` alone is refused on purpose |
| Browser tests: port 4319 is in use | An earlier run is still open. Close that terminal, or find it with `netstat -ano | findstr :4319` and end the process |
| A command with `&&` fails in PowerShell | PowerShell 5.1 has no `&&`: run the commands one after the other |
| A new picture does not show | Its path in the project file must start with `/images/...` and match the file name letter by letter, upper and lower case included |
