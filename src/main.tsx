import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
// The two typefaces are served by the site itself: no request to another server.
import '@fontsource-variable/readex-pro/wght.css';
import '@fontsource/rakkas/latin-400.css';
import '@fontsource/rakkas/arabic-400.css';
import './index.css';
import App from './App.tsx';
import { content } from './content/index.ts';
import { matchRoute } from './routes.ts';
import { startSpeedInsights } from './lib/speed-insights.ts';

const root = document.getElementById('root')!;
const path = window.location.pathname;
const app = (
  <StrictMode>
    <App path={path} />
  </StrictMode>
);

// The build writes every page to HTML and notes on the root element which address it drew (data-path).
// When that is the page this address shows, React takes over the HTML that is already there. Otherwise - the dev
// server, or a host that answers an unknown address with the home page - React draws the page from nothing.
const slugs = content.projects.map((project) => project.slug);
const drawn = root.dataset.path;
const sameView = drawn !== undefined && JSON.stringify(matchRoute(drawn, slugs)) === JSON.stringify(matchRoute(path, slugs));

if (sameView) hydrateRoot(root, app);
else createRoot(root).render(app);

startSpeedInsights(__VERCEL_ENV__);
