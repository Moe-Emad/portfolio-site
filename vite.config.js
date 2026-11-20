import fs from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { projectCard } from "./src/content/schema.ts";
import { withPictureVersions } from "./tools/build/picture-versions.mjs";
import { writeArabicFont } from "./tools/build/arabic-font.mjs";

// The figures the page shows about itself are counted from the repository when the site is built
// (tools/build/site-record.cjs) and written into the code as a constant.
const { siteRecord } = createRequire(import.meta.url)("./tools/build/site-record.cjs");
// The headers every file of the live site gets (public/_headers), the Content-Security-Policy among them.
const { readHeadersFile } = createRequire(import.meta.url)("./tools/build/headers.cjs");

const PROJECT_FILE = /[\\/]content[\\/]projects[\\/][^\\/]+\.json$/;

/**
 * The project files as the site needs them (tracker F53). The plugin hands Vite JSON text, and Vite makes a module
 * of it as of any JSON file; a change to a file reaches the dev server as before.
 * - Every picture gets the fingerprint of its files, which its addresses carry (tracker F54).
 * - "content/projects/<slug>.json?card" is the card of that project: the part every page needs, cut from the file
 *   by projectCard() in src/content/schema.ts (null for a draft).
 * - A draft (tracker F17) is null in the build for the browser, so that no script of the site holds its text. The
 *   build's own check of the content (the SSR build) and the dev server read it whole.
 */
function projectFiles() {
  let build = false;
  let publicDir = "";
  return {
    name: "project-files",
    configResolved(config) {
      build = config.command === "build";
      publicDir = config.publicDir;
    },
    load(id, options) {
      const [file, query] = id.split("?");
      if (!PROJECT_FILE.test(file) || (query !== undefined && query !== "card")) return null;
      let project;
      try {
        project = withPictureVersions(JSON.parse(fs.readFileSync(file, "utf8")), publicDir);
      } catch (error) {
        throw new Error(`${file}: ${error.message}`);
      }
      if (query === "card") return JSON.stringify(projectCard(project));
      if (build && !options?.ssr && project.draft === true) return "null";
      return JSON.stringify(project);
    },
  };
}

/**
 * The Arabic file of Rakkas, cut down to the Arabic letters of the content (tracker F56, src/fonts/rakkas.css):
 * made before the stylesheet that names it is read, and again on the dev server when a content file changes.
 */
function arabicFont() {
  let root = process.cwd();
  return {
    name: "arabic-font",
    configResolved(config) {
      root = config.root;
    },
    async buildStart() {
      await writeArabicFont({ root });
    },
    configureServer(server) {
      server.watcher.on("change", (file) => {
        if (!/[\\/]content[\\/].+\.json$/.test(file)) return;
        writeArabicFont({ root }).catch((error) => server.config.logger.error(`arabic-font: ${error.message}`));
      });
    },
  };
}

/** The whole file of a project is a script of its own, named "project-<slug>-<hash>.js" (tracker F53). */
const isProjectFile = (chunk) => PROJECT_FILE.test(chunk.facadeModuleId ?? "");

// https://vite.dev/config/
export default defineConfig({
  plugins: [arabicFont(), projectFiles(), react(), tailwindcss()],
  define: {
    __SITE_RECORD__: JSON.stringify(siteRecord()),
    // "production", "preview" or "development" when Vercel builds the site, empty everywhere else. Speed Insights
    // starts only in production on Vercel (src/lib/speed-insights.ts).
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => (isProjectFile(chunk) ? "assets/project-[name]-[hash].js" : "assets/[name]-[hash].js"),
      },
    },
  },
  // `npm run preview`, and so the browser tests, serve the build with the headers of the live site: every browser
  // test runs under its Content-Security-Policy (tracker B11). The dev server does not send them: its live reload
  // runs inline scripts of its own.
  preview: {
    headers: readHeadersFile()["/*"],
  },
});
