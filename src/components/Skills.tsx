import { content } from '../content/index.ts';
import SectionTitle from './SectionTitle.tsx';

/**
 * The skills by what they are for (tracker F24): one row per group, with the name and what it is for on the
 * left and its tools on the right, as a line of text like the rows of the work list (F35). Each row rises into
 * place as it comes into view (F23).
 */
export default function Skills() {
  return (
    <section id="skills" className="section section--tinted" aria-labelledby="skills-title">
      <div className="wrap">
        <SectionTitle id="skills-title">Skills</SectionTitle>
        <p className="section__lead">The tools I work with, by what they are for.</p>
        <div className="skills">
          {content.skills.map((group) => (
            <div key={group.group} className="skill-group" data-animate="rise">
              <div className="skill-group__about">
                <h3>{group.group}</h3>
                <p>{group.note}</p>
              </div>
              <ul className="stack stack--large" aria-label={group.group}>
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
