// The shape of the content files in content/ (tracker F1), and the check that every file has it.
// Hand-written on purpose: no package, and every message names the file and the field in plain words.
// Used by the unit tests (the gate) and by the site when it loads the content.

export interface Profile {
  name: string;
  nameArabic: string;
  role: string;
  location: string;
  /** One sentence under the name. */
  headline: string;
  /** Paragraphs of the "about" text. */
  about: string[];
  links: { linkedin: string; github?: string };
}

export interface Job {
  id: string;
  role: string;
  organisation: string;
  /** What the organisation is, when the name alone does not say it. */
  organisationNote?: string;
  /** YYYY-MM */
  start: string;
  /** YYYY-MM. null, empty or left out means "to this day". */
  end?: string | null;
  highlights: string[];
  /** The slug of the project on this site that this job was about; Experience links to its page. */
  project?: string;
}

export interface SkillGroup {
  group: string;
  /** What this group is for, in one line. */
  note: string;
  skills: string[];
}

export interface ProjectImage {
  /** Path below public/, starting with "/". */
  src: string;
  /** What the picture shows, for people who cannot see it. */
  alt: string;
  caption?: string;
  device: 'desktop' | 'phone';
  /** The size of the file in pixels: the page keeps the place free before the picture has loaded. */
  width: number;
  height: number;
}

export interface Project {
  slug: string;
  title: string;
  titleArabic?: string;
  /** One line for lists and link previews. */
  summary: string;
  kind: 'Client work' | 'Own product' | 'Modernization' | 'Work experience' | 'Earlier work';
  /** The year, or the span of years, the work was done. */
  year?: string;
  status: 'Live' | 'In progress' | 'Finished' | 'Prototype';
  featured: boolean;
  /** true: kept in content/ and still checked, but left out of the whole site (tracker F17). */
  draft?: boolean;
  /** Position in lists: low numbers first. */
  order: number;
  /** What I did on it. */
  role: string;
  stack: string[];
  /** Paragraphs: what it is and why it exists. */
  description: string[];
  /** Points worth a closer look: a short title and one or two sentences. */
  highlights: { title: string; text: string }[];
  /** Measured facts, shown as small figures. Never an estimate. */
  facts: { value: string; label: string }[];
  images: ProjectImage[];
  links: { live?: string; liveLabel?: string };
}

/**
 * What every page needs of a project (tracker F53): the list of work, the palette, the link to the next project and
 * the head of its page. The paragraphs, the text of the points, the other pictures and the links are on its own page
 * only, which loads the whole file.
 */
export type ProjectCard = Pick<
  Project,
  'slug' | 'title' | 'titleArabic' | 'summary' | 'kind' | 'year' | 'status' | 'featured' | 'order' | 'role' | 'stack' | 'facts'
> & {
  /** The titles of the points, without their text. */
  highlights: { title: string }[];
  /** The first picture only, the cover. */
  images: ProjectImage[];
};

export interface ArchiveEntry {
  title: string;
  tech: string;
  summary: string;
}

export interface Content {
  profile: Profile;
  experience: Job[];
  skills: SkillGroup[];
  /** The cards of the projects the site shows, in their order. */
  projects: ProjectCard[];
  archive: ArchiveEntry[];
}

const KINDS = ['Client work', 'Own product', 'Modernization', 'Work experience', 'Earlier work'];
const STATUSES = ['Live', 'In progress', 'Finished', 'Prototype'];
/** The narrowest first picture of a featured project, in pixels (tracker F27). */
const MIN_COVER_WIDTH = 1200;

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Collects problems as "file: field - what is wrong". */
class Checker {
  problems: string[] = [];
  private file: string;

  constructor(file: string) {
    this.file = file;
  }

  fail(field: string, message: string): void {
    this.problems.push(`${this.file}: ${field} - ${message}`);
  }

  text(raw: Raw, field: string, { optional = false, max = 2000 } = {}): void {
    const value = raw[field];
    // A form saves an optional field that was left empty as "" or null: that means "not given".
    if (optional && (value === undefined || value === null || value === '')) return;
    if (typeof value !== 'string' || value.trim() === '') this.fail(field, 'must be a text that is not empty');
    else if (value !== value.trim()) this.fail(field, 'has a space at the start or the end');
    else if (value.length > max) this.fail(field, `is longer than ${max} characters`);
  }

  texts(raw: Raw, field: string, { min = 1 } = {}): void {
    const value = raw[field];
    if (!Array.isArray(value) || value.length < min) {
      this.fail(field, `must be a list with at least ${min} text${min === 1 ? '' : 's'}`);
      return;
    }
    value.forEach((item, index) => {
      if (typeof item !== 'string' || item.trim() === '') this.fail(`${field}[${index}]`, 'must be a text that is not empty');
    });
  }

  oneOf(raw: Raw, field: string, allowed: string[]): void {
    if (typeof raw[field] !== 'string' || !allowed.includes(raw[field] as string)) {
      this.fail(field, `must be one of: ${allowed.join(', ')}`);
    }
  }

  link(raw: Raw, field: string, { optional = false } = {}): void {
    const value = raw[field];
    if (optional && (value === undefined || value === null || value === '')) return;
    if (typeof value !== 'string' || !/^https:\/\/[^\s]+$/.test(value)) this.fail(field, 'must be a link that starts with https://');
  }

  month(raw: Raw, field: string, { nullable = false } = {}): void {
    const value = raw[field];
    if (nullable && (value === null || value === undefined || value === '')) return;
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      this.fail(field, `must be a month written as YYYY-MM${nullable ? ', or null for "to this day"' : ''}`);
    }
  }
}

export function profileProblems(raw: unknown, file = 'content/profile.json'): string[] {
  const check = new Checker(file);
  if (!isObject(raw)) return [`${file}: must be an object`];
  for (const field of ['name', 'nameArabic', 'role', 'location']) check.text(raw, field, { max: 80 });
  check.text(raw, 'headline', { max: 220 });
  check.texts(raw, 'about');
  if (!isObject(raw.links)) check.fail('links', 'must be an object');
  else {
    check.link(raw.links, 'linkedin');
    check.link(raw.links, 'github', { optional: true });
  }
  return check.problems;
}

export function experienceProblems(raw: unknown, file = 'content/experience.json'): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [`${file}: must be a list with at least one job`];
  const problems: string[] = [];
  const ids = new Set<string>();
  raw.forEach((job, index) => {
    const check = new Checker(`${file} [job ${index + 1}]`);
    if (!isObject(job)) {
      problems.push(`${file} [job ${index + 1}]: must be an object`);
      return;
    }
    for (const field of ['id', 'role', 'organisation']) check.text(job, field, { max: 120 });
    check.text(job, 'organisationNote', { optional: true, max: 160 });
    check.month(job, 'start');
    check.month(job, 'end', { nullable: true });
    check.texts(job, 'highlights');
    check.text(job, 'project', { optional: true, max: 60 });
    if (typeof job.start === 'string' && typeof job.end === 'string' && job.end !== '' && job.end < job.start) check.fail('end', 'is before the start');
    if (typeof job.id === 'string') {
      if (ids.has(job.id)) check.fail('id', `"${job.id}" is used twice`);
      ids.add(job.id);
    }
    problems.push(...check.problems);
  });
  return problems;
}

export function skillsProblems(raw: unknown, file = 'content/skills.json'): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [`${file}: must be a list with at least one group`];
  const problems: string[] = [];
  raw.forEach((group, index) => {
    const check = new Checker(`${file} [group ${index + 1}]`);
    if (!isObject(group)) {
      problems.push(`${file} [group ${index + 1}]: must be an object`);
      return;
    }
    check.text(group, 'group', { max: 60 });
    check.text(group, 'note', { max: 160 });
    check.texts(group, 'skills');
    problems.push(...check.problems);
  });
  return problems;
}

export function projectProblems(raw: unknown, file: string): string[] {
  const check = new Checker(file);
  if (!isObject(raw)) return [`${file}: must be an object`];

  check.text(raw, 'slug', { max: 60 });
  if (typeof raw.slug === 'string' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.slug)) {
    check.fail('slug', 'must be lower-case words joined by hyphens, like "rental-platform"');
  }
  check.text(raw, 'title', { max: 80 });
  check.text(raw, 'titleArabic', { optional: true, max: 80 });
  check.text(raw, 'summary', { max: 180 });
  check.oneOf(raw, 'kind', KINDS);
  check.text(raw, 'year', { optional: true, max: 20 });
  check.oneOf(raw, 'status', STATUSES);
  if (typeof raw.featured !== 'boolean') check.fail('featured', 'must be true or false');
  if (raw.draft !== undefined && typeof raw.draft !== 'boolean') check.fail('draft', 'must be true or false');
  if (typeof raw.order !== 'number' || !Number.isFinite(raw.order)) check.fail('order', 'must be a number');
  check.text(raw, 'role', { max: 400 });
  check.texts(raw, 'stack');
  check.texts(raw, 'description');

  if (!Array.isArray(raw.highlights)) check.fail('highlights', 'must be a list');
  else {
    raw.highlights.forEach((highlight, index) => {
      if (!isObject(highlight)) return check.fail(`highlights[${index}]`, 'must be an object with title and text');
      const inner = new Checker(`${file}: highlights[${index}]`);
      inner.text(highlight, 'title', { max: 80 });
      inner.text(highlight, 'text', { max: 500 });
      check.problems.push(...inner.problems);
    });
  }

  if (!Array.isArray(raw.facts)) check.fail('facts', 'must be a list (it may be empty)');
  else {
    raw.facts.forEach((fact, index) => {
      if (!isObject(fact)) return check.fail(`facts[${index}]`, 'must be an object with value and label');
      const inner = new Checker(`${file}: facts[${index}]`);
      inner.text(fact, 'value', { max: 20 });
      inner.text(fact, 'label', { max: 60 });
      check.problems.push(...inner.problems);
    });
  }

  if (!Array.isArray(raw.images)) check.fail('images', 'must be a list (it may be empty)');
  else {
    raw.images.forEach((image, index) => {
      if (!isObject(image)) return check.fail(`images[${index}]`, 'must be an object with src, alt and device');
      const inner = new Checker(`${file}: images[${index}]`);
      inner.text(image, 'src', { max: 200 });
      if (typeof image.src === 'string' && !image.src.startsWith('/')) inner.fail('src', 'must start with "/" (a path below public/)');
      inner.text(image, 'alt', { max: 250 });
      inner.text(image, 'caption', { optional: true, max: 200 });
      inner.oneOf(image, 'device', ['desktop', 'phone']);
      for (const side of ['width', 'height']) {
        if (!Number.isInteger(image[side]) || (image[side] as number) <= 0) inner.fail(side, 'must be the size of the picture in pixels - "npm run pictures" fills it in');
      }
      check.problems.push(...inner.problems);
    });
    // The list of work shows the first picture of a featured project up to about 920 px wide (tracker F25, F27).
    const [first] = raw.images;
    if (raw.featured === true && isObject(first) && first.device === 'desktop' && typeof first.width === 'number' && first.width < MIN_COVER_WIDTH) {
      check.fail(
        'images[0]: width',
        `the list of work shows the first picture up to about 920 px wide, so it must be at least ${MIN_COVER_WIDTH} px wide (take it at 1440 px)`,
      );
    }
    if (raw.images.length === 0) {
      if (raw.featured === true) check.fail('images', 'a featured project needs at least one picture');
      // A project that is called done but shows no screen looks unfinished (tracker F8).
      else if (raw.status === 'Finished' || raw.status === 'Live') check.fail('images', 'a project that is Finished or Live needs at least one picture');
    }
  }

  if (!isObject(raw.links)) check.fail('links', 'must be an object (it may be empty: {})');
  else {
    check.link(raw.links, 'live', { optional: true });
    check.text(raw.links, 'liveLabel', { optional: true, max: 60 });
  }
  return check.problems;
}

export function archiveProblems(raw: unknown, file = 'content/archive.json'): string[] {
  if (!Array.isArray(raw)) return [`${file}: must be a list`];
  const problems: string[] = [];
  raw.forEach((entry, index) => {
    const check = new Checker(`${file} [entry ${index + 1}]`);
    if (!isObject(entry)) {
      problems.push(`${file} [entry ${index + 1}]: must be an object`);
      return;
    }
    check.text(entry, 'title', { max: 80 });
    check.text(entry, 'tech', { max: 80 });
    check.text(entry, 'summary', { max: 200 });
    problems.push(...check.problems);
  });
  return problems;
}

/** Every problem of the whole content. projectFiles: [file name, parsed JSON] pairs. */
export function contentProblems(raw: {
  profile: unknown;
  experience: unknown;
  skills: unknown;
  archive: unknown;
  projectFiles: [string, unknown][];
}): string[] {
  const problems = [
    ...profileProblems(raw.profile),
    ...experienceProblems(raw.experience),
    ...skillsProblems(raw.skills),
    ...archiveProblems(raw.archive),
  ];
  const slugs = new Map<string, string>();
  for (const [file, project] of raw.projectFiles) {
    problems.push(...projectProblems(project, file));
    if (isObject(project) && typeof project.slug === 'string') {
      const expected = `${project.slug}.json`;
      if (!file.endsWith(`/${expected}`)) problems.push(`${file}: slug - the file must be named ${expected}`);
      const other = slugs.get(project.slug);
      if (other) problems.push(`${file}: slug - "${project.slug}" is already used by ${other}`);
      slugs.set(project.slug, file);
    }
  }
  if (raw.projectFiles.length === 0) problems.push('content/projects: there is no project file');
  // A job that names a project must name one the site shows (tracker F16, F17).
  const drafts = new Set(
    raw.projectFiles.map(([, project]) => project).filter((project) => isObject(project) && project.draft === true).map((project) => (project as Raw).slug),
  );
  if (Array.isArray(raw.experience)) {
    raw.experience.forEach((job, index) => {
      if (!isObject(job) || typeof job.project !== 'string' || job.project === '') return;
      const where = `content/experience.json [job ${index + 1}]: project - "${job.project}"`;
      if (!slugs.has(job.project)) problems.push(`${where} is not a project of the site`);
      else if (drafts.has(job.project)) problems.push(`${where} is a draft, so the site does not show it`);
    });
  }
  return problems;
}

/** Projects in the order the site shows them. */
export function sortProjects<T extends Pick<Project, 'order' | 'title'>>(projects: T[]): T[] {
  return [...projects].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/** The projects the site shows: drafts left out (tracker F17), in their order. */
export function shownProjects<T extends Pick<Project, 'order' | 'title' | 'draft'>>(projects: T[]): T[] {
  return sortProjects(projects.filter((project) => project.draft !== true));
}

/**
 * The card of a project (tracker F53), cut from its file when the site is built (vite.config.js). null for a
 * draft: the site leaves it out (F17), so its text is not sent to anyone's browser either.
 */
export function projectCard(project: Project): ProjectCard | null {
  if (project.draft === true) return null;
  const { slug, title, titleArabic, summary, kind, year, status, featured, order, role, stack, facts } = project;
  return {
    slug,
    title,
    titleArabic,
    summary,
    kind,
    year,
    status,
    featured,
    order,
    role,
    stack,
    facts,
    highlights: project.highlights.map((point) => ({ title: point.title })),
    images: project.images.slice(0, 1),
  };
}

/** "2021-06" and null become "Jun 2021 - Present". */
export function formatPeriod(start: string, end?: string | null): string {
  const month = (value: string): string => {
    const [year, number] = value.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[Number(number) - 1]} ${year}`;
  };
  return `${month(start)} - ${end ? month(end) : 'Present'}`;
}

/** "Modernization, 2026, in progress" - what kind of work it was, when, and where it stands. */
export function projectMeta(project: Pick<Project, 'kind' | 'year' | 'status'>): string {
  return [project.kind, project.year, project.status.toLowerCase()].filter(Boolean).join(', ');
}
