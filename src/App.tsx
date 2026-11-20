import { useEffect } from 'react';
import Contact from './components/Contact.tsx';
import Experience from './components/Experience.tsx';
import Footer from './components/Footer.tsx';
import Header from './components/Header.tsx';
import Hero from './components/Hero.tsx';
import Method from './components/Method.tsx';
import NotFound from './components/NotFound.tsx';
import ProjectPage from './components/ProjectPage.tsx';
import Skills from './components/Skills.tsx';
import Work from './components/Work.tsx';
import { content } from './content/index.ts';
import type { Project } from './content/schema.ts';
import { useScrollMotion } from './lib/scroll-motion.ts';
import { pageTitle } from './page-title.ts';
import { matchRoute } from './routes.ts';

/**
 * The whole site: the address decides which page is shown between the bar at the top and the foot.
 * project: on the page of a project, its whole file (loadProject in src/content/index.ts, tracker F53).
 */
export default function App({ path, project }: { path: string; project?: Project }) {
  const route = matchRoute(
    path,
    content.projects.map((card) => card.slug),
  );

  useEffect(() => {
    document.title = pageTitle(path);
  }, [path]);

  // Blocks further down rise into place as they come into view (tracker F23).
  useScrollMotion();

  // An address like /#contact, reached from another page: the browser looks for the section before this
  // page has drawn it and stays at the top. Once the page is there, go to the section.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header home={route.page === 'home'} />
      <main id="main">
        {route.page === 'home' && (
          <>
            <Hero />
            <Work />
            <Method />
            <Experience />
            <Skills />
            <Contact />
          </>
        )}
        {route.page === 'work' && <Work page />}
        {route.page === 'project' && project && <ProjectPage project={project} />}
        {route.page === 'not-found' && <NotFound />}
      </main>
      <Footer home={route.page === 'home'} />
    </>
  );
}
