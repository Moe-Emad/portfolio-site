// Loads the content files of content/ into the site (tracker F1). Vite puts the JSON into the build, so the
// browser never fetches it. A file with the wrong shape stops the build and the dev server with a message that
// names the file and the field. The browser of a visitor does not check again (tracker F51): the build has drawn
// every page with this content, so the check could only repeat a known result there.
import archive from '../../content/archive.json';
import experience from '../../content/experience.json';
import profile from '../../content/profile.json';
import skills from '../../content/skills.json';
import { contentProblems, shownProjects } from './schema.ts';
import type { Content, Project } from './schema.ts';

const projectModules = import.meta.glob('../../content/projects/*.json', { eager: true, import: 'default' });
const projectFiles = Object.entries(projectModules).map(
  ([path, value]): [string, unknown] => [path.replace('../../', ''), value],
);

// SSR: the build, which draws every page with this module. DEV: the dev server, in the terminal and the browser.
// In the build for the browser both are false, and the check is left out of its JavaScript.
if (import.meta.env.SSR || import.meta.env.DEV) {
  const problems = contentProblems({ profile, experience, skills, archive, projectFiles });
  if (problems.length > 0) {
    throw new Error(`The content has ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  }
}

export const content: Content = {
  profile,
  experience,
  skills,
  archive,
  // A draft keeps its file and is checked above, but the site leaves it out everywhere (tracker F17).
  projects: shownProjects(projectFiles.map(([, value]) => value as Project)),
};

export const featuredProjects = content.projects.filter((project) => project.featured);
export const otherProjects = content.projects.filter((project) => !project.featured);
export const projectBySlug = (slug: string): Project | undefined => content.projects.find((project) => project.slug === slug);
