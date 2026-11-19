# The admin panel

Edit what the site says in the browser, through forms, without opening a code editor. The panel is
[Pages CMS](https://pagescms.org), a free and open-source editor for sites whose content lives in a GitHub
repository. It has no database: when you press Save, it makes a commit in this repository, the host builds the
site again, and the change is online a minute or two later.

Nothing was added to the public site for this. There is no `/admin` address on it and no sign-in page to defend;
the only way in is your GitHub account.

This setup follows the documented format of Pages CMS, but it could not be tried from here because it needs your
GitHub sign-in. The first visit will show whether a form needs adjusting (see "If a form looks wrong").

## Signing in, the first time

1. Open [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub.
2. It asks to install its GitHub app. Choose **Only select repositories** and pick `portfolio-site`. It needs
   to read and write that one repository; give it nothing else.
3. Open the repository in the panel and choose the branch `main`.

## What you can edit

| In the panel | It edits | It changes on the site |
|---|---|---|
| Profile | `content/profile.json` | The name in both scripts, the headline, the "How I work" text, the links |
| Experience | `content/experience.json` | The jobs. Leave "End month" empty for a job that is still going |
| Skills | `content/skills.json` | The groups and their skills |
| Projects | `content/projects/*.json` | Each project: texts, facts, pictures, order, and whether it shows with a picture on the home page |
| Smaller and earlier work | `content/archive.json` | The short list under the projects |
| Media | `public/images/` | Upload screenshots here, in `projects/<address of the page>/` |

Rules the forms cannot know:

- **True facts only.** "Measured facts" are for figures that were counted.
- **Write a technology the same way everywhere** ("Next.js" in a project and in Skills). The number after a skill
  counts the projects that name it exactly so.
- **The address of a project page** ("slug") is lower-case words with hyphens. Do not change it once the site is
  online: links to the old address would break.
- **Every picture needs a description** of what it shows, for people who cannot see it.
- **A project that is Finished or Live needs at least one picture.** One that is In progress or a Prototype may
  have none.

## Saving, and what protects the live site

A save in the panel is a commit on `main`. Two things then happen by themselves:

- GitHub runs the checks. The content check knows the shape of every file and names the field when something is
  wrong, for example a missing summary.
- The host builds the site. The build runs the same check, so **a broken content file cannot go online**: the
  build fails and the site stays as it was. Look at the red mark next to the commit on GitHub to see what to fix,
  then save again.

For a larger change you may prefer to see it before it is public: make a branch in the panel, edit there, and
open a pull request on GitHub. The host builds a preview address for it.

## Pictures

1. Upload the screenshots in **Media**, into `projects/<address of the page>/`. JPEG, PNG or WebP. Keep them under
   about 300 kB each: 1440 pixels wide is plenty for a desktop screenshot.
2. In the project, add an entry under **Pictures** for each one: pick the file, describe it, choose desktop or
   phone. The first picture is the cover.
3. The width and height can be left empty in the panel, but the site needs them, and each picture needs its
   smaller WebP copies. On the PC, pull the change and let both be made, then commit and push the result through
   a branch as usual:

   ```powershell
   git pull
   ```

   ```powershell
   npm run pictures
   ```

   Until then the check on GitHub is red and the new pictures do not go online; everything else stays as it was.

## If a form looks wrong

The forms come from `.pages.yml`, which is written by `npm run cms-config` from `tools/build/pages-cms.cjs`. If the
panel shows a field oddly, or a list cannot be edited, that file is the place to change: look up the field type in
the [Pages CMS documentation](https://pagescms.org/docs/configuration/), change the description of the field,
run the command, and commit both files.

One caution from its issue list: nested text fields in JSON files have shown as `[object Object]` for some users.
If "Links" or "Pictures" look like that, do not save that form: edit the file by hand (README, "Changing what
the site says") and note it in the tracker.

A new kind of field always goes into both places in the same pull request - `src/content/schema.ts` and
`tools/build/pages-cms.cjs`. The panel saves only the fields it knows, so a field it does not know would disappear
from the file on the next save. A test (`tools/build/pages-cms.test.cjs`) fails when the two are out of step.

## Without the panel

Everything the panel does is an edit to a JSON file. The README explains which file holds what.
