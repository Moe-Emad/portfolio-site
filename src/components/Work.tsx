import { useState } from 'react';
import { content } from '../content/index.ts';
import { projectMeta } from '../content/schema.ts';
import type { Project } from '../content/schema.ts';
import { projectPath } from '../routes.ts';
import Shot from './Shot.tsx';
import SectionTitle from './SectionTitle.tsx';

type Kind = Project['kind'];

/** The small eight-pointed star of the first screen, in the corner of each cell of the earlier work. */
function StarMark() {
  return (
    <svg className="archive__mark" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <path d="M0 -10 L10 0 L0 10 L-10 0 Z" />
      <path d="M-7.07 -7.07 L7.07 -7.07 L7.07 7.07 L-7.07 7.07 Z" />
    </svg>
  );
}

// The tabs of the list, in this order, named as a group would be (tracker F19).
const KIND_TABS: { kind: Kind; label: string }[] = [
  { kind: 'Client work', label: 'Client work' },
  { kind: 'Own product', label: 'Own products' },
  { kind: 'Modernization', label: 'Modernization' },
  { kind: 'Work experience', label: 'Work experience' },
  { kind: 'Earlier work', label: 'Earlier work' },
];

/** The kinds that have at least one project, with their counts. */
function kindTabs(projects: Project[]): { kind: Kind; label: string; count: number }[] {
  return KIND_TABS.map((tab) => ({ ...tab, count: projects.filter((project) => project.kind === tab.kind).length })).filter(
    (tab) => tab.count > 0,
  );
}

function Tab({ label, count, pressed, onPress }: { label: string; count: number; pressed: boolean; onPress: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onPress}>
      <span className="kinds__label">{label}</span> <span className="kinds__count">{count}</span>
    </button>
  );
}

// At most this many points of a project are named in its row; its page has them all.
const MAX_POINTS = 4;

/**
 * What a row says beyond its one sentence (tracker F25), all from the project's own content: its measured figures
 * (whole numbers count up as they come into view), my part, and the titles of the points its page looks at closer.
 * The points are shown only where the text column is wide enough to sit beside its picture (see index.css).
 */
function ProjectDetails({ project }: { project: Project }) {
  const points = project.highlights.slice(0, MAX_POINTS);
  return (
    <div className="project__details" data-animate="rise">
      {project.facts.length > 0 && (
        <dl className="project__facts">
          {project.facts.map((fact) => (
            <div key={fact.label}>
              <dt data-count={/^\d+$/.test(fact.value) || undefined}>{fact.value}</dt>
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

function ProjectRow({ project }: { project: Project }) {
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
      {/* sizes: from 60rem the picture takes 7/12 of the row, up to about 58rem on a wide screen (F18, F25). */}
      {project.featured && cover && <Shot image={cover} sizes="(min-width: 60rem) min(56vw, 58rem), 100vw" />}
    </article>
  );
}

/**
 * The work: every project from content/projects with tabs by kind, then the smaller pieces.
 * page: shown as a page of its own at /work/ (tracker B6), so its title is the h1 of the page.
 */
export default function Work({ page = false }: { page?: boolean }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const tabs = kindTabs(content.projects);
  const total = content.projects.length;
  const shown = kind ? content.projects.filter((project) => project.kind === kind) : content.projects;
  const label = tabs.find((tab) => tab.kind === kind)?.label;

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="wrap">
        <div className="work-head" data-animate="rise">
          <div>
            <SectionTitle id="work-title" pageTitle={page}>
              Selected work
            </SectionTitle>
            <p className="section__lead">
              Client work, my own products and one long modernization. The code is private, so every project has a
              page of its own with the full story and real screens.
            </p>
          </div>
          <div className="work-head__tabs">
            <div className="kinds" role="group" aria-label="Show the work of one kind">
              <Tab label="All" count={total} pressed={kind === null} onPress={() => setKind(null)} />
              {tabs.map((tab) => (
                <Tab key={tab.kind} label={tab.label} count={tab.count} pressed={kind === tab.kind} onPress={() => setKind(tab.kind)} />
              ))}
            </div>
            <p className="kinds__status" role="status">
              {kind && label ? `${shown.length} of ${total} projects: ${label.toLowerCase()}.` : `All ${total} projects.`}
            </p>
          </div>
        </div>

        <div className="projects">
          {shown.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </div>

        {/* A sheet of cells joined by hairlines, like a drawing sheet (tracker F22). */}
        <div className="archive__head">
          <h3 className="archive__title">Smaller and earlier work</h3>
          <p className="archive__lead">Coursework, course builds and early experiments: {content.archive.length} pieces.</p>
        </div>
        <ul className="archive">
          {content.archive.map((entry) => (
            <li key={entry.title} data-animate="rise">
              <StarMark />
              <span className="archive__name">{entry.title}</span>
              <span className="archive__summary">{entry.summary}</span>
              <span className="archive__tech">{entry.tech}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
