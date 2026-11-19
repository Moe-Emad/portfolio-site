#!/usr/bin/env node
// The build (tracker F4): npm run build [-- --outDir <folder>] [--mode <mode>]
//   1. Vite builds the browser side into the build folder (dist/).
//   2. Vite builds the build side (src/entry-server.tsx) into a folder next to it.
//   3. Every page is drawn to HTML with that and written to its own file:
//        /                 -> index.html
//        /work/<slug>/     -> work/<slug>/index.html
//        unknown address   -> 404.html
//      plus robots.txt, and sitemap.xml when VITE_SITE_URL is set.
// So the server sends real HTML: search engines and link previews read the text, the page shows before any
// JavaScript runs, and any static host can serve the folder as it is.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
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

function run(commandLine) {
  const result = spawnSync(commandLine, { cwd: ROOT, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`build: "${commandLine}" failed.`);
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

async function main() {
  const outDir = option('outDir', 'dist');
  const mode = option('mode', '');
  const modeFlag = mode ? ` --mode ${mode}` : '';
  const out = path.join(ROOT, outDir);
  const ssrDir = `${outDir}-ssr`;
  const ssr = path.join(ROOT, ssrDir);

  run(`npx vite build --outDir ${outDir} --emptyOutDir --logLevel warn${modeFlag}`);
  run(`npx vite build --ssr src/entry-server.tsx --outDir ${ssrDir} --emptyOutDir --logLevel warn${modeFlag}`);

  try {
    const server = await import(pathToFileURL(path.join(ssr, 'entry-server.js')).href);
    const template = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    const pages = server.pages();
    for (const page of pages) {
      const file = path.join(out, page.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, fillTemplate(template, { path: page.path, ...server.render(page.path) }));
    }
    const files = server.siteFiles();
    for (const { file, text } of files) fs.writeFileSync(path.join(out, file), text);

    console.log(`build: ${pages.length} pages and ${files.map((entry) => entry.file).join(', ')} written to ${outDir}/`);
    if (!server.site) {
      console.log('build: VITE_SITE_URL is not set - no sitemap.xml, no canonical links, no share picture address.');
    }
  } finally {
    fs.rmSync(ssr, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`build: ${error.stack ?? error}`);
    process.exit(1);
  });
}
