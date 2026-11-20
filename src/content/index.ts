// Loads the content files of content/ into the site (tracker F1). Vite puts the JSON into the build, so the
// browser never fetches it as JSON.
// - Every page carries the card of each project (tracker F53): what the list of work, the palette and the link to
//   the next project need. Vite cuts it from the project's file when the site is built ("?card", vite.config.js).
// - The whole file of a project is a script of its own, loaded only by the page of that project (loadProject).
import archive from '../../content/archive.json';
import experience from '../../content/experience.json';
import profile from '../../content/profile.json';
import skills from '../../content/skills.json';
import { contentProblems, sortProjects } from './schema.ts';
import type { Content, Project, ProjectCard } from './schema.ts';

const cards = import.meta.glob<ProjectCard | null>('../../content/projects/*.json', { eager: true, query: '?card', import: 'default' });
const files = import.meta.glob<Project>('../../content/projects/*.json', { import: 'default' });

export const content: Content = {
  profile,
  experience,
  skills,
  archive,
  // A draft has no card (tracker F17): the site leaves it out everywhere.
  projects: sortProjects(Object.values(cards).filter((card): card is ProjectCard => card !== null)),
};

export const featuredProjects = content.projects.filter((project) => project.featured);
export const otherProjects = content.projects.filter((project) => !project.featured);
export const projectBySlug = (slug: string): ProjectCard | undefined => content.projects.find((project) => project.slug === slug);

/** The whole file of a project, for its own page. undefined when there is no such file. */
export async function loadProject(slug: string): Promise<Project | undefined> {
  return files[`../../content/projects/${slug}.json`]?.();
}

/**
 * Checks every content file against its shape and throws a message that names each file and field with a problem.
 * Called by the build before it draws a page (src/entry-server.tsx), and by the dev server in the browser
 * (src/main.tsx). The browser of a visitor does not check again (tracker F51): the build has drawn every page with
 * this content, so the check could only repeat a known result there.
 */
export async function checkContent(): Promise<void> {
  const projectFiles = await Promise.all(
    Object.entries(files).map(async ([path, load]): Promise<[string, unknown]> => [path.replace('../../', ''), await load()]),
  );
  const problems = contentProblems({ profile, experience, skills, archive, projectFiles });
  if (problems.length > 0) {
    throw new Error(`The content has ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  }
}
