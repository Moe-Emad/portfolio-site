import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
// The two typefaces are served by the site itself: no request to another server.
import '@fontsource-variable/readex-pro/wght.css';
// Rakkas with a range for each of its files, the Arabic one cut down to the letters of the content (tracker F56).
import './fonts/rakkas.css';
import './index.css';
import App from './App.tsx';
import { checkContent, content, loadProject } from './content/index.ts';
import { matchRoute } from './routes.ts';
import { startSpeedInsights } from './lib/speed-insights.ts';

async function start(): Promise<void> {
  // The dev server checks the content files here; the build has checked them before it drew a page (tracker F51).
  if (import.meta.env.DEV) await checkContent();

  const root = document.getElementById('root')!;
  const path = window.location.pathname;
  const slugs = content.projects.map((project) => project.slug);
  const route = matchRoute(path, slugs);
  // The page of a project needs the whole file of its project (tracker F53). Its head has already asked the
  // browser for that script, so it is usually there by the time this runs.
  const project = route.page === 'project' ? await loadProject(route.slug) : undefined;
  const app = (
    <StrictMode>
      <App path={path} project={project} />
    </StrictMode>
  );

  // The build writes every page to HTML and notes on the root element which address it drew (data-path).
  // When that is the page this address shows, React takes over the HTML that is already there. Otherwise - the dev
  // server, or a host that answers an unknown address with the home page - React draws the page from nothing.
  const drawn = root.dataset.path;
  const sameView = drawn !== undefined && JSON.stringify(matchRoute(drawn, slugs)) === JSON.stringify(route);

  if (sameView) hydrateRoot(root, app);
  else createRoot(root).render(app);
}

void start();
startSpeedInsights(__VERCEL_ENV__);
