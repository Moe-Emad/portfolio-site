import { content } from '../content/index.ts';
import SectionTitle from './SectionTitle.tsx';

/**
 * The skills by what they are for (tracker F24): one row per group, with the name and what it is for on the
 * left and its tools on the right, as a line of text like the rows of the work list (F35). On a wide screen the
 * name, the note and the tools stand on the three lines of Experience above (F57): the note and the tools are a
 * body of their own, as the role and the points of a job are.
 */
export default function Skills() {
  return (
    <section id="skills" className="section section--tinted" aria-labelledby="skills-title">
      <div className="wrap">
        <SectionTitle id="skills-title">Skills</SectionTitle>
        <p className="section__lead">The tools I work with, by what they are for.</p>
        <div className="skills">
          {content.skills.map((group) => (
            <div key={group.group} className="skill-group" data-animate="draw">
              <h3>{group.group}</h3>
              <div className="skill-group__body">
                <p>{group.note}</p>
                <ul className="stack stack--large" aria-label={group.group}>
                  {group.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
