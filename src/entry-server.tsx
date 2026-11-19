// The build side of the site (tracker F4): tools/build/build.mjs loads this file and writes every page to HTML.
// Nothing here runs in a browser.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import { headHtml, pageHead, robotsTxt, sitemapXml, sitePaths, siteUrl } from './head.ts';

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

/** One page: the HTML of the app and the tags of its head. */
export function render(path: string): { app: string; head: string } {
  return {
    app: renderToString(
      <StrictMode>
        <App path={path} />
      </StrictMode>,
    ),
    head: headHtml(pageHead(path), SITE),
  };
}

/** Files next to the pages: robots.txt, and sitemap.xml when the address of the site is known. */
export function siteFiles(): { file: string; text: string }[] {
  const files = [{ file: 'robots.txt', text: robotsTxt(SITE) }];
  if (SITE) files.push({ file: 'sitemap.xml', text: sitemapXml(SITE) });
  return files;
}

export const site = SITE;
