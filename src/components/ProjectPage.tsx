import { content } from '../content/index.ts';
import { projectMeta } from '../content/schema.ts';
import type { Project } from '../content/schema.ts';
import { WORK_PATH, projectPath } from '../routes.ts';
import Shot from './Shot.tsx';

/** The page of one project: what it is, my part, what is worth a closer look, and the screens. */
export default function ProjectPage({ project }: { project: Project }) {
  const [cover, ...gallery] = project.images;
  const desktop = gallery.filter((image) => image.device === 'desktop');
  const phone = gallery.filter((image) => image.device === 'phone');

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
            <ul className="case__stack">
              {project.stack.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </aside>
        </div>

        {gallery.length > 0 && (
          <section className="gallery" aria-labelledby="gallery-title">
            <h2 id="gallery-title">More screens</h2>
            <div className="gallery__desktop">
              {desktop.map((image) => (
                <Shot key={image.src} image={image} sizes="(min-width: 52rem) min(50vw, 36rem), 100vw" caption />
              ))}
            </div>
            {phone.length > 0 && (
              <div className="gallery__phone">
                {phone.map((image) => (
                  <Shot key={image.src} image={image} sizes="19rem" caption />
                ))}
              </div>
            )}
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
