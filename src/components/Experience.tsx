import { content, projectBySlug } from '../content/index.ts';
import { formatPeriod } from '../content/schema.ts';
import type { Job } from '../content/schema.ts';
import { projectPath } from '../routes.ts';
import SectionTitle from './SectionTitle.tsx';

function JobEntry({ job }: { job: Job }) {
  // A job about a project on this site links to its page (tracker F16).
  const project = job.project ? projectBySlug(job.project) : undefined;
  return (
    <li className="job" data-animate="draw" data-current={!job.end}>
      <p className="job__period">{formatPeriod(job.start, job.end)}</p>
      <div className="job__body">
        <h3 className="job__role">{job.role}</h3>
        <p className="job__place">
          {job.organisation}
          {job.organisationNote && <span>, {job.organisationNote}</span>}
        </p>
        <ul className="job__points">
          {job.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        {project && (
          <p className="job__project">
            The project: <a href={projectPath(project.slug)}>{project.title}</a>
          </p>
        )}
      </div>
    </li>
  );
}

/** The jobs, newest first, from content/experience.json. */
export default function Experience() {
  return (
    <section id="experience" className="section" aria-labelledby="experience-title">
      <div className="wrap">
        <SectionTitle id="experience-title">
          Experience
        </SectionTitle>
        <ol className="jobs">
          {content.experience.map((job) => (
            <JobEntry key={job.id} job={job} />
          ))}
        </ol>
      </div>
    </section>
  );
}
