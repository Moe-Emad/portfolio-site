#!/usr/bin/env node
// The build (tracker F4): npm run build [-- --outDir <folder>] [--mode <mode>]
//   1. Vite builds the browser side into the build folder (dist/).
//   2. Vite builds the build side (src/entry-server.tsx) into a folder next to it.
//   3. Every page is drawn to HTML with that and written to its own file:
//        /                 -> index.html
//        /work/<slug>/     -> work/<slug>/index.html
//        unknown address   -> 404.html
//      plus robots.txt, and sitemap.xml when VITE_SITE_URL is set.
//      The content is checked first; a broken file stops the build before a page is written.
//      Every page names the fonts of its first view in its head (tracker F55).
//      The page of a project names the script with the text of its project in its head (tracker F53), found in
//      the manifest Vite writes for this; the manifest itself is not left in the build folder.
// So the server sends real HTML: search engines and link previews read the text, the page shows before any
// JavaScript runs, and any static host can serve the folder as it is.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEAD_START = '<!--page-head-start-->';
const HEAD_END = '<!--page-head-end-->';
const ROOT_TAG = '<div id="root"></div>';

/** The value of "--name value" in the arguments, or the fallback. */
function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** Vite's own command file, the one `npx vite` would start. */
const VITE_BIN = path.join(path.dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin', 'vite.js');

/**
 * Runs Vite with the given arguments and returns the result of spawnSync (tracker B7). Vite's command file is
 * started with this same Node.js, without npx and without a shell: npx starts npm, and npm warns about every npm
 * setting in the environment it does not know - the build machine of Vercel sets one (npm_config_cache_dir).
 */
export function vite(args, options = {}) {
  return spawnSync(process.execPath, [VITE_BIN, ...args], { cwd: ROOT, stdio: 'inherit', ...options });
}

function runVite(args) {
  const result = vite(args);
  if (result.status !== 0) {
    console.error(`build: "vite ${args.join(' ')}" failed.${result.error ? ` ${result.error.message}` : ''}`);
    process.exit(result.status ?? 1);
  }
}

/** One page: the template with the head of the page between the markers and the app inside the root element. */
export function fillTemplate(template, { path: pagePath, head, app }) {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  if (start < 0 || end < start) throw new Error(`index.html: the markers ${HEAD_START} and ${HEAD_END} are missing`);
  if (!template.includes(ROOT_TAG)) throw new Error(`index.html: ${ROOT_TAG} is missing`);
  return (
    template.slice(0, start) +
    head +
    template.slice(end + HEAD_END.length)
  ).replace(ROOT_TAG, `<div id="root" data-path="${pagePath}">${app}</div>`);
}

/**
 * The tag that asks the browser for the script made from a content file, so that it loads together with the
 * script of the page instead of after it (tracker F53). '' when there is no such file. manifest: Vite's manifest
 * of the build, keyed by the source file ("content/projects/relic.json").
 */
export function preloadTag(manifest, source) {
  const file = source ? manifest[source]?.file : undefined;
  if (!file) return '';
  // crossorigin as on the page's own <script type="module">: the browser can then use the file it fetched early.
  return `<link rel="modulepreload" crossorigin href="/${file}" />`;
}

/**
 * The fonts of every first view (tracker F55), as Vite's manifest names their source: Rakkas for the name in the
 * bar and the titles, Readex Pro for the text. Their Latin parts; the Arabic parts load when Arabic text needs them.
 */
export const FIRST_VIEW_FONTS = [
  'node_modules/@fontsource/rakkas/files/rakkas-latin-400-normal.woff2',
  'node_modules/@fontsource-variable/readex-pro/files/readex-pro-latin-wght-normal.woff2',
];

/**
 * The tags that ask the browser for the fonts of the first view together with the stylesheet: otherwise it finds
 * them only in the stylesheet, and asked for Rakkas after Readex Pro had arrived. Stops the build when a font is
 * not in the manifest (a new version of a font package may name its files differently).
 */
export function fontPreloadTags(manifest) {
  return FIRST_VIEW_FONTS.map((source) => {
    const file = manifest[source]?.file;
    if (!file) throw new Error(`${source} is not in the build: the fonts named in the head of each page have changed (FIRST_VIEW_FONTS)`);
    // crossorigin: a font is always fetched in that mode, so without it the browser would fetch it a second time.
    return `<link rel="preload" as="font" type="font/woff2" crossorigin href="/${file}" />`;
  });
}

async function main() {
  const outDir = option('outDir', 'dist');
  const mode = option('mode', '');
  const modeArgs = mode ? ['--mode', mode] : [];
  const out = path.join(ROOT, outDir);
  const ssrDir = `${outDir}-ssr`;
  const ssr = path.join(ROOT, ssrDir);
  const manifestFile = path.join(out, '.vite', 'manifest.json');

  runVite(['build', '--outDir', outDir, '--emptyOutDir', '--manifest', '--logLevel', 'warn', ...modeArgs]);
  runVite(['build', '--ssr', 'src/entry-server.tsx', '--outDir', ssrDir, '--emptyOutDir', '--logLevel', 'warn', ...modeArgs]);

  try {
    const server = await import(pathToFileURL(path.join(ssr, 'entry-server.js')).href);
    await server.checkContent();
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const fonts = fontPreloadTags(manifest);
    const template = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    const pages = server.pages();
    for (const page of pages) {
      const file = path.join(out, page.file);
      const { app, head, projectFile } = await server.render(page.path);
      const tags = [head, ...fonts, preloadTag(manifest, projectFile)].filter(Boolean);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, fillTemplate(template, { path: page.path, app, head: tags.join('\n    ') }));
    }
    const files = server.siteFiles();
    for (const { file, text } of files) fs.writeFileSync(path.join(out, file), text);

    console.log(`build: ${pages.length} pages and ${files.map((entry) => entry.file).join(', ')} written to ${outDir}/`);
    if (!server.site) {
      console.log('build: VITE_SITE_URL is not set - no sitemap.xml, no canonical links, no share picture address.');
    }
  } finally {
    fs.rmSync(ssr, { recursive: true, force: true });
    fs.rmSync(path.dirname(manifestFile), { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`build: ${error.stack ?? error}`);
    process.exit(1);
  });
}
