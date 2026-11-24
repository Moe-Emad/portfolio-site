// The build side of the site (tracker F4): tools/build/build.mjs loads this file and writes every page to HTML.
// Nothing here runs in a browser.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import { content, loadProject } from './content/index.ts';
import { headHtml, pageHead, robotsTxt, sitemapXml, sitePaths, siteUrl } from './head.ts';
import { matchRoute } from './routes.ts';

export { checkContent } from './content/index.ts';

const SITE = siteUrl(import.meta.env);

/** The address the "not found" page is drawn for. Hosts serve it as 404.html for any unknown address. */
export const NOT_FOUND_PATH = '/404';

/** The pages to write: { path, file } with the file below the build folder. */
export function pages(): { path: string; file: string }[] {
  return [
    ...sitePaths().map((path) => ({ path, file: `${path.slice(1)}index.html` })),
    { path: NOT_FOUND_PATH, file: '404.html' },
  ];
}

/**
 * One page: the HTML of the app and the tags of its head. projectFile: on the page of a project, the content file
 * its script is made from (tracker F53); the build names that script in the head of the page.
 */
export async function render(path: string): Promise<{ app: string; head: string; projectFile?: string }> {
  const route = matchRoute(
    path,
    content.projects.map((card) => card.slug),
  );
  const project = route.page === 'project' ? await loadProject(route.slug) : undefined;
  return {
    app: renderToString(
      <StrictMode>
        <App path={path} project={project} />
      </StrictMode>,
    ),
    head: headHtml(pageHead(path, SITE), SITE),
    projectFile: route.page === 'project' ? `content/projects/${route.slug}.json` : undefined,
  };
}

/** Files next to the pages: robots.txt, and sitemap.xml when the address of the site is known. */
export function siteFiles(): { file: string; text: string }[] {
  const files = [{ file: 'robots.txt', text: robotsTxt(SITE) }];
  if (SITE) files.push({ file: 'sitemap.xml', text: sitemapXml(SITE) });
  return files;
}

export const site = SITE;
