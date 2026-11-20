// What goes into the <head> of each page (tracker F4): title, description, the address search engines should
// keep, the picture and text of a link preview, and structured data. Pure functions: the build calls them once
// per page (src/entry-server.tsx) and the unit tests check them.
import { content, projectBySlug } from './content/index.ts';
import { versioned } from './lib/pictures.js';
import { roleLine } from './lib/profile.js';
import { pageTitle } from './page-title.ts';
import { WORK_PATH, matchRoute, projectPath } from './routes.ts';

export interface PageHead {
  title: string;
  description: string;
  /** The address of the page on the site, starting with "/". */
  path: string;
  /** The picture of a link preview: path below public/, with its size. */
  image: { src: string; width: number; height: number; alt: string };
  /** false: search engines should not list this page (the "not found" page). */
  index: boolean;
  /** Structured data (schema.org), or null. */
  data: Record<string, unknown> | null;
}

/** The share picture of the site, made by tools/build/og-image.mjs. */
export const SHARE_IMAGE = { src: '/og-image.png', width: 1200, height: 630 };

/** The address of the site without a closing slash, or '' when it is not set (VITE_SITE_URL in .env). */
export function siteUrl(env: Record<string, unknown>): string {
  const value = typeof env.VITE_SITE_URL === 'string' ? env.VITE_SITE_URL.trim().replace(/\/+$/, '') : '';
  return /^https?:\/\/[^\s/]+/.test(value) ? value : '';
}

/** Every page the build writes: the home page, the list of work and one page per project. */
export function sitePaths(): string[] {
  return ['/', WORK_PATH, ...content.projects.map((project) => projectPath(project.slug))];
}

export function pageHead(path: string): PageHead {
  const { profile } = content;
  const route = matchRoute(
    path,
    content.projects.map((project) => project.slug),
  );
  const title = pageTitle(path);
  const sameAs = [profile.links.linkedin, profile.links.github].filter(Boolean);
  const person = { '@type': 'Person', name: profile.name, jobTitle: profile.role };

  if (route.page === 'project') {
    const project = projectBySlug(route.slug)!;
    const cover = project.images[0];
    return {
      title,
      description: project.summary,
      path: projectPath(project.slug),
      // With the fingerprint of its files (tracker F54): a link preview of a changed cover fetches it anew.
      image: cover
        ? { src: versioned(cover.src, cover.version), width: cover.width, height: cover.height, alt: cover.alt }
        : { ...SHARE_IMAGE, alt: `${profile.name}, ${profile.role}` },
      index: true,
      data: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.title,
        description: project.summary,
        keywords: project.stack.join(', '),
        author: person,
      },
    };
  }

  if (route.page === 'work') {
    return {
      title,
      description: `The work of ${profile.name}: ${content.projects.map((project) => project.title).join(', ')}, and smaller and earlier projects.`,
      path: WORK_PATH,
      image: { ...SHARE_IMAGE, alt: `${profile.name}, ${profile.role}` },
      index: true,
      data: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        author: person,
        hasPart: content.projects.map((project) => ({ '@type': 'CreativeWork', name: project.title, url: projectPath(project.slug) })),
      },
    };
  }

  if (route.page === 'not-found') {
    return {
      title,
      description: 'This page does not exist.',
      path,
      image: { ...SHARE_IMAGE, alt: `${profile.name}, ${profile.role}` },
      index: false,
      data: null,
    };
  }

  return {
    title,
    description: `${profile.name}, ${roleLine(profile.role.toLowerCase(), profile.location)}. ${profile.headline}`,
    path: '/',
    image: { ...SHARE_IMAGE, alt: `${profile.name}, ${profile.role}` },
    index: true,
    data: {
      '@context': 'https://schema.org',
      ...person,
      description: profile.headline,
      address: { '@type': 'PostalAddress', addressCountry: profile.location },
      sameAs,
    },
  };
}

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The tags of a page head as HTML. site: the address of the site ('' when unknown - then the tags that need
 * a full address are left out: the kept address, og:url and og:image).
 */
export function headHtml(head: PageHead, site: string): string {
  const tags = [
    `<title>${escape(head.title)}</title>`,
    `<meta name="description" content="${escape(head.description)}" />`,
    head.index ? '' : '<meta name="robots" content="noindex" />',
    `<meta property="og:type" content="${head.path === '/' ? 'profile' : 'article'}" />`,
    `<meta property="og:site_name" content="${escape(content.profile.name)}" />`,
    `<meta property="og:title" content="${escape(head.title)}" />`,
    `<meta property="og:description" content="${escape(head.description)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ];
  if (site && head.index) {
    tags.push(
      `<link rel="canonical" href="${escape(site + head.path)}" />`,
      `<meta property="og:url" content="${escape(site + head.path)}" />`,
      `<meta property="og:image" content="${escape(site + head.image.src)}" />`,
      `<meta property="og:image:width" content="${head.image.width}" />`,
      `<meta property="og:image:height" content="${head.image.height}" />`,
      `<meta property="og:image:alt" content="${escape(head.image.alt)}" />`,
    );
  }
  if (head.data) {
    // "<" is written as \u003c so that no text of the content can close the script tag.
    tags.push(`<script type="application/ld+json">${JSON.stringify(head.data).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.filter(Boolean).join('\n    ');
}

/** sitemap.xml: every page with its full address. Needs the address of the site. */
export function sitemapXml(site: string): string {
  const urls = sitePaths().map((path) => `  <url><loc>${escape(site + path)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** robots.txt: everything may be read; the sitemap is named when the address of the site is known. */
export function robotsTxt(site: string): string {
  return `User-agent: *\nAllow: /\n${site ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`;
}
