import { content } from '../content/index.ts';
import { projectMeta } from '../content/schema.ts';
import type { Project } from '../content/schema.ts';
import { WORK_PATH, projectPath } from '../routes.ts';
import Shot from './Shot.tsx';

/**
 * How wide the pictures of the gallery are shown, for the "sizes" of each (tracker F33). The content is about 92vw
 * wide, at most 104rem. With phone screens beside them, the wide screens share what the phones leave: one column up
 * to 80rem, two from there. The first of an odd number spans the row. A phone screen is clamp(12rem, 16vw, 19rem).
 */
const GALLERY_SIZES = {
  beside: {
    lead: '(min-width: 80rem) min(76vw, 84rem), (min-width: 52rem) 76vw, 100vw',
    pair: '(min-width: 80rem) min(38vw, 41rem), (min-width: 52rem) 76vw, 100vw',
    phone: '(min-width: 52rem) clamp(12rem, 16vw, 19rem), 19rem',
  },
  alone: {
    lead: '(min-width: 52rem) min(92vw, 104rem), 100vw',
    pair: '(min-width: 52rem) min(46vw, 51rem), 100vw',
  },
};

/** The page of one project: what it is, my part, what is worth a closer look, and the screens. */
export default function ProjectPage({ project }: { project: Project }) {
  const [cover, ...gallery] = project.images;
  const desktop = gallery.filter((image) => image.device === 'desktop');
  const phone = gallery.filter((image) => image.device === 'phone');
  // Phone screens stand beside the wide screens when there are both; the first of an odd number of wide screens
  // spans the row (the stylesheet does the same with :first-child:nth-last-child(odd)).
  const beside = desktop.length > 0 && phone.length > 0;
  const sizes = beside ? GALLERY_SIZES.beside : GALLERY_SIZES.alone;
  const lead = desktop.length % 2 === 1;

  // The next project in the order of the home page; after the last one comes the first.
  const index = content.projects.findIndex((other) => other.slug === project.slug);
  const next = content.projects[(index + 1) % content.projects.length];

  return (
    <article className="case" data-cover={Boolean(cover)} aria-labelledby="case-title">
      <header className="case__head">
        <div className="wrap">
          <p className="case__back">
            <a href={WORK_PATH}>All work</a>
          </p>
          <p className="case__meta">{projectMeta(project)}</p>
          <h1 id="case-title" className="case__title">
            {project.title}
            {project.titleArabic && (
              <span lang="ar" dir="rtl">
                {project.titleArabic}
              </span>
            )}
          </h1>
          <p className="case__summary">{project.summary}</p>
          {project.links.live && (
            <p className="case__live">
              <a href={project.links.live} target="_blank" rel="noreferrer" className="button button--sign">
                {project.links.liveLabel ?? 'Visit the site'}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          )}
        </div>
      </header>

      <div className="wrap case__body">
        {cover && (
          <div className="case__cover" data-device={cover.device}>
            <Shot image={cover} sizes={cover.device === 'phone' ? '19rem' : 'min(100vw, 72rem)'} first caption />
          </div>
        )}

        {project.facts.length > 0 && (
          <dl className="facts" data-animate="rise">
            {project.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="case__columns">
          <div className="case__story" data-animate="rise">
            <h2>What it is</h2>
            {project.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <h2>Worth a closer look</h2>
            <ul className="highlights">
              {project.highlights.map((highlight) => (
                <li key={highlight.title} data-animate="rise">
                  <h3>{highlight.title}</h3>
                  <p>{highlight.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="case__side" aria-label="About this project" data-animate="rise">
            <h2>My part</h2>
            <p>{project.role}</p>
            <h2>Built with</h2>
            <ul className="stack">
              {project.stack.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </aside>
        </div>

        {gallery.length > 0 && (
          <section className="gallery" aria-labelledby="gallery-title" data-beside={beside || undefined}>
            <h2 id="gallery-title">More screens</h2>
            <div className="gallery__body">
              {desktop.length > 0 && (
                <div className="gallery__desktop">
                  {desktop.map((image, index) => (
                    <Shot key={image.src} image={image} sizes={lead && index === 0 ? sizes.lead : sizes.pair} caption />
                  ))}
                </div>
              )}
              {phone.length > 0 && (
                <div className="gallery__phone">
                  {phone.map((image) => (
                    <Shot key={image.src} image={image} sizes={beside ? GALLERY_SIZES.beside.phone : '19rem'} caption />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {next && next.slug !== project.slug && (
          <nav className="case__next" aria-label="More work">
            <p>Next project</p>
            <a href={projectPath(next.slug)}>{next.title}</a>
            <span>{next.summary}</span>
          </nav>
        )}
      </div>
    </article>
  );
}
