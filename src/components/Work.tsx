import { useState } from 'react';
import type { ReactNode } from 'react';
import { content } from '../content/index.ts';
import { homeWork, projectMeta } from '../content/schema.ts';
import type { ProjectCard } from '../content/schema.ts';
import { projectPath } from '../routes.ts';
import Shot from './Shot.tsx';
import Dimension from './Dimension.tsx';
import SectionTitle from './SectionTitle.tsx';
import StarMark from './StarMark.tsx';

type Kind = ProjectCard['kind'];

// The tabs of the list, in this order, named as a group would be (tracker F19).
const KIND_TABS: { kind: Kind; label: string }[] = [
  { kind: 'Client work', label: 'Client work' },
  { kind: 'Own product', label: 'Own products' },
  { kind: 'Modernization', label: 'Modernization' },
  { kind: 'Work experience', label: 'Work experience' },
  { kind: 'Earlier work', label: 'Earlier work' },
];

/** The kinds that have at least one project. */
function kindTabs(projects: ProjectCard[]): { kind: Kind; label: string }[] {
  return KIND_TABS.filter((tab) => projects.some((project) => project.kind === tab.kind));
}

/** A tab is named by its kind alone; the line under the tabs says how many projects are shown (tracker F49). */
function Tab({ label, pressed, onPress }: { label: string; pressed: boolean; onPress: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onPress}>
      {label}
    </button>
  );
}

// At most this many points of a project are named in its row; its page has them all.
const MAX_POINTS = 4;

// sizes: a row's picture takes 7/12 of the row from 60rem, up to about 58rem on a wide screen (F18, F25); a picture
// of the grid on the home page half the width of the page from 48rem (F61).
const ROW_SIZES = '(min-width: 60rem) min(56vw, 58rem), 100vw';
const GRID_SIZES = '(min-width: 104rem) 51rem, (min-width: 48rem) 46vw, 100vw';

/**
 * What a row says beyond its one sentence (tracker F25), all from the project's own content: its measured figures
 * (shown at their real value from the start, F48), my part, and the titles of the points its page looks at closer.
 * The points are shown only where the text column is wide enough to sit beside its picture (see index.css).
 */
function ProjectDetails({ project }: { project: ProjectCard }) {
  const points = project.highlights.slice(0, MAX_POINTS);
  return (
    <div className="project__details">
      {project.facts.length > 0 && (
        <dl className="project__facts">
          {project.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.value}</dt>
              <dd>{fact.label}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="project__notes">
        <div className="project__part">
          <h4>My part</h4>
          <p>{project.role}</p>
        </div>
        {points.length > 0 && (
          <div className="project__points">
            <h4>Worth a closer look</h4>
            <ul>
              {points.map((point) => (
                <li key={point.title}>{point.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectCard }) {
  const cover = project.images[0];
  return (
    <article className="project" data-featured={project.featured}>
      <div className="project__text">
        <p className="project__meta">{projectMeta(project)}</p>
        <h3 className="project__title">
          {/* The link covers the whole row (see .project__link in index.css): one link, a large target. */}
          <a href={projectPath(project.slug)} className="project__link">
            {project.title}
          </a>
          {project.titleArabic && (
            <span className="project__title-arabic" lang="ar" dir="rtl">
              {project.titleArabic}
            </span>
          )}
        </h3>
        <p className="project__summary">{project.summary}</p>
        <ul className="stack" aria-label="Built with">
          {project.stack.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <ProjectDetails project={project} />
      </div>
      {project.featured && cover && <Shot image={cover} sizes={ROW_SIZES} />}
    </article>
  );
}

/**
 * A project on the home page (tracker F61): its picture, kind, name, sentence and tools. A large row also says my
 * part; its figures and points are on its own page and on /work/. The whole entry is one link.
 */
function HomeEntry({ project, size }: { project: ProjectCard; size: 'large' | 'small' }) {
  const cover = project.images[0];
  return (
    <article className="project" data-size={size} data-featured={size === 'large' && Boolean(cover)}>
      <div className="project__text">
        <p className="project__meta">{projectMeta(project)}</p>
        <h3 className="project__title">
          <a href={projectPath(project.slug)} className="project__link">
            {project.title}
          </a>
          {project.titleArabic && (
            <span className="project__title-arabic" lang="ar" dir="rtl">
              {project.titleArabic}
            </span>
          )}
        </h3>
        <p className="project__summary">{project.summary}</p>
        <ul className="stack" aria-label="Built with">
          {project.stack.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        {size === 'large' && (
          <p className="project__role">
            <span>My part</span> {project.role}
          </p>
        )}
      </div>
      {cover && <Shot image={cover} sizes={size === 'large' ? ROW_SIZES : GRID_SIZES} />}
    </article>
  );
}

/** The head of the work: its title and what it is. */
function WorkHead({ page, children }: { page: boolean; children?: ReactNode }) {
  return (
    <div className="work-head">
      <div>
        <SectionTitle id="work-title" pageTitle={page}>
          Selected work
        </SectionTitle>
        <p className="section__lead">
          Client work, my own products and one long modernization. The code is private, so every project has a page of
          its own with the full story and real screens.
        </p>
      </div>
      {children}
    </div>
  );
}

/**
 * The smaller pieces, as a register, like the list of sheets in a set of drawings (tracker F41): one line each. Since
 * F64 the register is drawn as a sheet of its own: blueprint paper in a double frame, the tools in saffron, and a
 * title block in its corner as on a technical drawing.
 */
function Archive() {
  return (
    <section className="sheet" aria-labelledby="archive-title">
      <div className="archive__head">
        <h3 id="archive-title" className="archive__title">
          <StarMark />
          Smaller and earlier work
        </h3>
        <p className="archive__lead">Coursework, course builds and early experiments.</p>
      </div>
      <ul className="archive">
        {content.archive.map((entry) => (
          <li key={entry.title} data-animate="draw">
            <span className="archive__name">{entry.title}</span>
            <span className="archive__summary">{entry.summary}</span>
            <span className="archive__tech">{entry.tech}</span>
          </li>
        ))}
      </ul>
      <dl className="sheet__block">
        <div>
          <dt>Pieces</dt>
          <dd>{content.archive.length}</dd>
        </div>
        <div>
          <dt>Kind</dt>
          <dd>Coursework, course builds, experiments</dd>
        </div>
        <div>
          <dt>Drawn by</dt>
          <dd>{content.profile.name}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * The work on the home page (tracker F61, F62): the first three in large rows and the others in a grid, then the way
 * to all of it at /work/, and the smaller pieces. A dimension line says how many there are (F67).
 */
function HomeWork() {
  const { large, grid } = homeWork(content.projects);
  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="wrap">
        <WorkHead page={false} />
        <Dimension>{content.projects.length} projects</Dimension>
        <div className="projects">
          {large.map((project) => (
            <HomeEntry key={project.slug} project={project} size="large" />
          ))}
        </div>
        {grid.length > 0 && (
          <div className="work-grid">
            {grid.map((project) => (
              <HomeEntry key={project.slug} project={project} size="small" />
            ))}
          </div>
        )}
        <p className="work-all">
          <a href="/work/">All work, by kind, with the figures of each project</a>
        </p>
        <Archive />
      </div>
    </section>
  );
}

/**
 * The work: on the home page a selection (HomeWork); at /work/, a page of its own (tracker B6) whose title is the h1
 * of the page, every project from content/projects in a full row, with tabs by kind, then the smaller pieces.
 */
export default function Work({ page = false }: { page?: boolean }) {
  return page ? <AllWork /> : <HomeWork />;
}

function AllWork() {
  const [kind, setKind] = useState<Kind | null>(null);
  const tabs = kindTabs(content.projects);
  const total = content.projects.length;
  const shown = kind ? content.projects.filter((project) => project.kind === kind) : content.projects;
  const label = tabs.find((tab) => tab.kind === kind)?.label;

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="wrap">
        <WorkHead page>
          <div className="work-head__tabs">
            <div className="kinds" role="group" aria-label="Show the work of one kind">
              <Tab label="All" pressed={kind === null} onPress={() => setKind(null)} />
              {tabs.map((tab) => (
                <Tab key={tab.kind} label={tab.label} pressed={kind === tab.kind} onPress={() => setKind(tab.kind)} />
              ))}
            </div>
            <p className="kinds__status" role="status">
              {kind && label ? `${shown.length} of ${total} projects: ${label.toLowerCase()}.` : `All ${total} projects.`}
            </p>
          </div>
        </WorkHead>

        <div className="projects">
          {shown.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </div>

        <Archive />
      </div>
    </section>
  );
}
