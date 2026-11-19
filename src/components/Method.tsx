import { content } from '../content/index.ts';
import SectionTitle from './SectionTitle.tsx';

// The order is the point: each step makes the next one safe. That is why this list is numbered.
const STEPS = [
  {
    title: 'Make it safe to change',
    text: 'Pin the dependencies, get secrets out of the code and its history, and set up one command that runs every check.',
  },
  {
    title: 'Fix what is broken',
    text: 'Bugs and security gaps, one small pull request each, with a test that fails without the fix.',
  },
  {
    title: 'Build what is missing',
    text: 'New features and a modern look, measured before and after: screenshots, page weight, accessibility.',
  },
  {
    title: 'Write it down',
    text: 'A tracker row and a changelog line for every change, a list of lessons, and a guide for the next person.',
  },
];

/** How I work, and the proof: figures about this very site, counted from its repository when it is built. */
export default function Method() {
  const record = __SITE_RECORD__;
  const figures = [
    { value: record.itemsDone, label: `of ${record.itemsPlanned} planned work items merged` },
    { value: record.tests, label: 'automated tests that run before every push' },
    { value: record.lessons, label: 'lessons written down so they cost time once' },
  ];

  return (
    <section id="method" className="section section--tinted" aria-labelledby="method-title">
      <div className="wrap method">
        <div className="method__about" data-animate="rise">
          <SectionTitle id="method-title">
            How I work
          </SectionTitle>
          {content.profile.about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.title} data-animate="rise">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="record" aria-labelledby="record-title" data-animate="rise">
          <h3 id="record-title">The record of this site</h3>
          <dl>
            {figures.map((figure) => (
              <div key={figure.label}>
                <dt data-count>{figure.value}</dt>
                <dd>{figure.label}</dd>
              </div>
            ))}
          </dl>
          <p className="record__note">Counted from the repository each time the site is built.</p>
        </div>
      </div>
    </section>
  );
}
