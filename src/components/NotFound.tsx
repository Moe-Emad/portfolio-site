import { content } from '../content/index.ts';
import { projectPath } from '../routes.ts';

/** The page for an address that leads nowhere: say so, and offer the ways on. */
export default function NotFound() {
  return (
    <section className="section not-found" aria-labelledby="not-found-title">
      <div className="wrap">
        <h1 id="not-found-title" className="section__title">
          This page does not exist
        </h1>
        <p className="section__lead">
          The address may be mistyped, or the page was moved. The work is all here:
        </p>
        <ul className="not-found__list">
          {content.projects.map((project) => (
            <li key={project.slug}>
              <a href={projectPath(project.slug)}>{project.title}</a>
            </li>
          ))}
        </ul>
        <p>
          <a href="/" className="button button--primary">
            Go to the home page
          </a>
        </p>
      </div>
    </section>
  );
}
