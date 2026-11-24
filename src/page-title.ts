import { content, projectBySlug } from './content/index.ts';
import { matchRoute } from './routes.ts';

/** The title of the browser tab for an address. */
export function pageTitle(path: string): string {
  const { name, role } = content.profile;
  const route = matchRoute(
    path,
    content.projects.map((project) => project.slug),
  );
  if (route.page === 'project') return `${projectBySlug(route.slug)?.title} - ${name}`;
  if (route.page === 'not-found') return `Page not found - ${name}`;
  if (route.page === 'work') return `Work - ${name}`;
  // The home page in the words people search with: the role, and "full-stack developer" (tracker F65).
  return `${name} - ${role} and full-stack developer`;
}
