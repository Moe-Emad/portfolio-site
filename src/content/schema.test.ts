// Unit tests of the content check (tracker F1), and the check of the real files in content/: npm run test:unit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  contentProblems,
  experienceProblems,
  formatPeriod,
  profileProblems,
  projectCard,
  projectProblems,
  shownProjects,
  sortProjects,
} from './schema.ts';
import type { Project } from './schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = (file: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const projectFiles = (): [string, unknown][] =>
  fs
    .readdirSync(path.join(ROOT, 'content', 'projects'))
    .filter((name) => name.endsWith('.json'))
    .map((name) => [`content/projects/${name}`, read(`content/projects/${name}`)]);

const GOOD_PROJECT = {
  slug: 'sample-project',
  title: 'Sample project',
  summary: 'One line about it.',
  kind: 'Own product',
  year: '2026',
  status: 'Prototype',
  featured: false,
  order: 1,
  role: 'Everything.',
  stack: ['React'],
  description: ['What it is.'],
  highlights: [{ title: 'A point', text: 'Why it matters.' }],
  facts: [],
  images: [],
  links: {},
};

test('the content files of this repo have no problems', () => {
  const problems = contentProblems({
    profile: read('content/profile.json'),
    experience: read('content/experience.json'),
    skills: read('content/skills.json'),
    archive: read('content/archive.json'),
    projectFiles: projectFiles(),
  });
  assert.deepEqual(problems, []);
});

// The client work on the page is the developer's recent experience, so it is in Experience too (tracker F16).
test('every client project on the page has its entry in Experience, linked to it', () => {
  const jobs = read('content/experience.json') as { project?: string }[];
  const named = new Set(jobs.map((job) => job.project).filter(Boolean));
  const missing = projectFiles()
    .map(([, project]) => project as Project)
    .filter((project) => project.kind === 'Client work' && !named.has(project.slug))
    .map((project) => project.slug);
  assert.deepEqual(missing, []);
});

test('a job may name a project of the site; a name that is not a project is a problem', () => {
  const job = { id: 'a', role: 'R', organisation: 'O', start: '2026-01', end: null, highlights: ['x'] };
  const base = { profile: read('content/profile.json'), skills: read('content/skills.json'), archive: [], projectFiles: [['content/projects/sample-project.json', GOOD_PROJECT]] as [string, unknown][] };
  assert.deepEqual(contentProblems({ ...base, experience: [{ ...job, project: 'sample-project' }] }), []);
  assert.match(
    contentProblems({ ...base, experience: [{ ...job, project: 'no-such-project' }] }).join('\n'),
    /content\/experience\.json \[job 1\]: project - "no-such-project" is not a project of the site/,
  );
});

// A draft is checked like any project but left out of the site (tracker F17).
test('a draft is left out of the shown projects, its file is still checked, and no job may name it', () => {
  const draft = { ...GOOD_PROJECT, slug: 'draft-project', title: 'Draft project', order: 2, draft: true } as Project;
  const shown = { ...GOOD_PROJECT } as Project;
  assert.deepEqual(shownProjects([draft, shown]).map((project) => project.slug), ['sample-project']);
  assert.match(projectProblems({ ...draft, draft: 'yes' }, 'content/projects/draft-project.json').join('\n'), /draft - must be true or false/);
  const job = { id: 'a', role: 'R', organisation: 'O', start: '2026-01', end: null, highlights: ['x'], project: 'draft-project' };
  const problems = contentProblems({
    profile: read('content/profile.json'),
    skills: read('content/skills.json'),
    archive: [],
    experience: [job],
    projectFiles: [['content/projects/draft-project.json', draft]],
  });
  assert.match(problems.join('\n'), /project - "draft-project" is a draft, so the site does not show it/);
});

// A project is named as the product, without a version number such as "v2" (tracker F32).
test('no project title carries a version number', () => {
  const versioned = projectFiles()
    .map(([, project]) => (project as Project).title)
    .filter((title) => /\bv\d+\b|\bversion\s*\d/i.test(title));
  assert.deepEqual(versioned, []);
});

// RPLMS gives the Laravel version it runs on, not the way there, and its text names no versions of its own
// (tracker F32). The address of its page keeps "rplms-v2", so links already shared keep working.
test('the Laravel figure of RPLMS is the version it runs on, and its text speaks of no "Version 1" or "Version 2"', () => {
  const project = read('content/projects/rplms-v2.json') as Project;
  assert.deepEqual(
    project.facts.find((fact) => fact.label === 'Laravel version'),
    { value: '13', label: 'Laravel version' },
  );
  assert.doesNotMatch([project.summary, ...project.description].join(' '), /\bVersion \d/);
});

// The first picture of RPLMS is its home page: it shows what the site is at a glance (tracker F21).
test('the first picture of RPLMS is its home page, on a desktop', () => {
  const [first] = (read('content/projects/rplms-v2.json') as Project).images;
  assert.equal(first?.src, '/images/projects/rplms-v2/01-home.jpg');
  assert.equal(first?.device, 'desktop');
  assert.match(first?.alt ?? '', /home page/i);
});

// The back office of a client's platform is not shown (tracker F13).
test('the MTC page shows no screen of the admin panel', () => {
  const project = read('content/projects/mtc-training-platform.json') as Project;
  const hits = project.images.filter((image) => /admin|dashboard|editor|back office/i.test(`${image.src} ${image.alt} ${image.caption ?? ''}`));
  assert.deepEqual(
    hits.map((image) => image.src),
    [],
  );
});

test('every picture named in a project file exists in public/', () => {
  const missing: string[] = [];
  for (const [file, project] of projectFiles()) {
    for (const image of (project as Project).images) {
      if (!fs.existsSync(path.join(ROOT, 'public', image.src))) missing.push(`${file}: ${image.src}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('a good project has no problems', () => {
  assert.deepEqual(projectProblems(GOOD_PROJECT, 'content/projects/sample-project.json'), []);
});

test('a problem names the file and the field', () => {
  const problems = projectProblems({ ...GOOD_PROJECT, summary: '', status: 'Done' }, 'content/projects/sample-project.json');
  assert.deepEqual(problems, [
    'content/projects/sample-project.json: summary - must be a text that is not empty',
    'content/projects/sample-project.json: status - must be one of: Live, In progress, Finished, Prototype',
  ]);
});

test('a featured project needs a picture, and a picture needs a description', () => {
  const noPicture = projectProblems({ ...GOOD_PROJECT, featured: true }, 'p.json');
  assert.match(noPicture.join('\n'), /a featured project needs at least one picture/);
  const noAlt = projectProblems({ ...GOOD_PROJECT, images: [{ src: '/a.png', alt: '', device: 'desktop', width: 10, height: 10 }] }, 'p.json');
  assert.match(noAlt.join('\n'), /images\[0\]: alt - must be a text that is not empty/);
  const noSize = projectProblems({ ...GOOD_PROJECT, images: [{ src: '/a.png', alt: 'A', device: 'desktop' }] }, 'p.json');
  assert.match(noSize.join('\n'), /width - must be the size of the picture in pixels - "npm run pictures" fills it in/);
  const badPath = projectProblems({ ...GOOD_PROJECT, images: [{ src: 'a.png', alt: 'A', device: 'desktop', width: 10, height: 10 }] }, 'p.json');
  assert.match(badPath.join('\n'), /src - must start with "\/"/);
});

test('a project that is Finished or Live needs a picture; one still being built does not', () => {
  const picture = { src: '/a.png', alt: 'A', device: 'desktop', width: 10, height: 10 };
  for (const status of ['Finished', 'Live']) {
    const problems = projectProblems({ ...GOOD_PROJECT, status }, 'p.json');
    assert.deepEqual(problems, ['p.json: images - a project that is Finished or Live needs at least one picture']);
    assert.deepEqual(projectProblems({ ...GOOD_PROJECT, status, images: [picture] }, 'p.json'), []);
  }
  for (const status of ['In progress', 'Prototype']) {
    assert.deepEqual(projectProblems({ ...GOOD_PROJECT, status }, 'p.json'), []);
  }
  // One message, not two, for a featured project.
  const featured = projectProblems({ ...GOOD_PROJECT, status: 'Live', featured: true }, 'p.json');
  assert.deepEqual(featured, ['p.json: images - a featured project needs at least one picture']);
});

// The list of work shows the first picture of a featured project up to about 920 px wide (tracker F25), so a
// smaller file is stretched there (tracker F27). A phone picture is shown narrow and is not held to this.
test('the first desktop picture of a featured project is at least 1200 px wide', () => {
  const picture = (width: number, device = 'desktop') => ({ src: '/a.jpg', alt: 'A', device, width, height: 500 });
  const featured = { ...GOOD_PROJECT, featured: true };
  assert.deepEqual(projectProblems({ ...featured, images: [picture(800)] }, 'p.json'), [
    'p.json: images[0]: width - the list of work shows the first picture up to about 920 px wide, so it must be at least 1200 px wide (take it at 1440 px)',
  ]);
  assert.deepEqual(projectProblems({ ...featured, images: [picture(1440)] }, 'p.json'), []);
  assert.deepEqual(projectProblems({ ...featured, images: [picture(1440), picture(800)] }, 'p.json'), [], 'only the first picture');
  assert.deepEqual(projectProblems({ ...featured, images: [picture(780, 'phone')] }, 'p.json'), [], 'a phone picture');
  assert.deepEqual(projectProblems({ ...GOOD_PROJECT, images: [picture(800)] }, 'p.json'), [], 'a project that is not featured');
});

test('a slug must match its file name and be used once', () => {
  const base = { profile: read('content/profile.json'), experience: read('content/experience.json'), skills: read('content/skills.json'), archive: [] };
  const wrongName = contentProblems({ ...base, projectFiles: [['content/projects/other.json', GOOD_PROJECT]] });
  assert.match(wrongName.join('\n'), /the file must be named sample-project\.json/);
  const twice = contentProblems({
    ...base,
    projectFiles: [
      ['content/projects/sample-project.json', GOOD_PROJECT],
      ['content/projects/copy/sample-project.json', GOOD_PROJECT],
    ],
  });
  assert.match(twice.join('\n'), /"sample-project" is already used by content\/projects\/sample-project\.json/);
});

test('a link must be https, a month must be YYYY-MM, a job cannot end before it starts', () => {
  const profile = { name: 'A', nameArabic: 'B', role: 'C', location: 'D', headline: 'E', about: ['F'], links: { linkedin: 'http://example.com' } };
  assert.match(profileProblems(profile).join('\n'), /linkedin - must be a link that starts with https:\/\//);
  const job = { id: 'a', role: 'R', organisation: 'O', start: '2023-13', end: null, highlights: ['x'] };
  assert.match(experienceProblems([job]).join('\n'), /start - must be a month written as YYYY-MM/);
  assert.match(experienceProblems([{ ...job, start: '2023-07', end: '2023-01' }]).join('\n'), /end - is before the start/);
});

test('projects are shown by their order, then by title', () => {
  const projects = [
    { ...GOOD_PROJECT, title: 'B', order: 2 },
    { ...GOOD_PROJECT, title: 'C', order: 1 },
    { ...GOOD_PROJECT, title: 'A', order: 2 },
  ] as Project[];
  assert.deepEqual(sortProjects(projects).map((project) => project.title), ['C', 'A', 'B']);
});

test('the card of a project holds what the list of work needs, not the text of its page', () => {
  // Tracker F53: every page carries the cards; only the page of a project loads its whole file.
  const cover = { src: '/images/a.jpg', alt: 'The home page', device: 'desktop', width: 1440, height: 900 };
  const gallery = { src: '/images/b.jpg', alt: 'A form', caption: 'The form', device: 'phone', width: 390, height: 844 };
  const project = {
    ...GOOD_PROJECT,
    titleArabic: 'مشروع',
    facts: [{ value: '12', label: 'pages' }],
    highlights: [
      { title: 'A point', text: 'Why it matters.' },
      { title: 'Another point', text: 'Why that matters too.' },
    ],
    images: [cover, gallery],
    links: { live: 'https://example.com' },
  } as Project;
  assert.deepEqual(projectCard(project), {
    slug: 'sample-project',
    title: 'Sample project',
    titleArabic: 'مشروع',
    summary: 'One line about it.',
    kind: 'Own product',
    year: '2026',
    status: 'Prototype',
    featured: false,
    order: 1,
    role: 'Everything.',
    stack: ['React'],
    facts: [{ value: '12', label: 'pages' }],
    highlights: [{ title: 'A point' }, { title: 'Another point' }],
    images: [cover],
  });
});

test('a draft has no card: the site carries nothing of it', () => {
  assert.equal(projectCard({ ...GOOD_PROJECT, draft: true } as Project), null);
  for (const [file, raw] of projectFiles()) {
    const project = raw as Project;
    assert.equal(projectCard(project) === null, project.draft === true, file);
  }
});

test('a period reads as months, and an open end as Present', () => {
  assert.equal(formatPeriod('2023-07', '2023-10'), 'Jul 2023 - Oct 2023');
  assert.equal(formatPeriod('2021-06', null), 'Jun 2021 - Present');
});

test('an optional field that a form saved as empty counts as not given', () => {
  const project = { ...GOOD_PROJECT, titleArabic: '', year: '', links: { live: '', liveLabel: '' } };
  assert.deepEqual(projectProblems(project, 'content/projects/sample-project.json'), []);
  const job = { id: 'a', role: 'R', organisation: 'O', organisationNote: '', start: '2023-07', end: '', highlights: ['x'] };
  assert.deepEqual(experienceProblems([job]), []);
  assert.equal(formatPeriod('2023-07', ''), 'Jul 2023 - Present');
  assert.equal(formatPeriod('2023-07'), 'Jul 2023 - Present');
  // A required field stays required.
  assert.match(projectProblems({ ...GOOD_PROJECT, title: '' }, 'p.json').join('\n'), /title - must be a text that is not empty/);
});
