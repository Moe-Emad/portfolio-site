// The addresses of the site (tracker F3): the home page and one page per project.
//   /                    home
//   /work/               the list of work (tracker B6)
//   /work/<slug>/        a project from content/projects
// Anything else is the "not found" page.

export type Route = { page: 'home' } | { page: 'work' } | { page: 'project'; slug: string } | { page: 'not-found' };

/** The address of the list of work. */
export const WORK_PATH = '/work/';

/** The address of a project page. Always with the closing slash: that is the folder the page is built into. */
export function projectPath(slug: string): string {
  return `/work/${slug}/`;
}

/** Which page an address shows. slugs: the projects that exist. */
export function matchRoute(path: string, slugs: string[]): Route {
  const clean = path.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'home' };
  if (clean === '/work') return { page: 'work' };
  const project = /^\/work\/([^/]+)$/.exec(clean);
  if (project?.[1] && slugs.includes(project[1])) return { page: 'project', slug: project[1] };
  return { page: 'not-found' };
}
