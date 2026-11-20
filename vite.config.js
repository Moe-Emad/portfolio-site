import fs from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { projectCard } from "./src/content/schema.ts";

// The figures the page shows about itself are counted from the repository when the site is built
// (tools/build/site-record.cjs) and written into the code as a constant.
const { siteRecord } = createRequire(import.meta.url)("./tools/build/site-record.cjs");
// The headers every file of the live site gets (public/_headers), the Content-Security-Policy among them.
const { readHeadersFile } = createRequire(import.meta.url)("./tools/build/headers.cjs");

const PROJECT_FILE = /[\\/]content[\\/]projects[\\/][^\\/]+\.json$/;

/**
 * The project files as the site needs them (tracker F53). The plugin hands Vite JSON text, and Vite makes a module
 * of it as of any JSON file; a change to a file reaches the dev server as before.
 * - "content/projects/<slug>.json?card" is the card of that project: the part every page needs, cut from the file
 *   by projectCard() in src/content/schema.ts (null for a draft).
 * - A draft (tracker F17) is null in the build for the browser, so that no script of the site holds its text. The
 *   build's own check of the content (the SSR build) and the dev server read it whole.
 */
function projectFiles() {
  let build = false;
  return {
    name: "project-files",
    configResolved(config) {
      build = config.command === "build";
    },
    load(id, options) {
      const [file, query] = id.split("?");
      if (!PROJECT_FILE.test(file)) return null;
      const project = () => JSON.parse(fs.readFileSync(file, "utf8"));
      if (query === "card") return JSON.stringify(projectCard(project()));
      if (query === undefined && build && !options?.ssr && project().draft === true) return "null";
      return null;
    },
  };
}

/** The whole file of a project is a script of its own, named "project-<slug>-<hash>.js" (tracker F53). */
const isProjectFile = (chunk) => PROJECT_FILE.test(chunk.facadeModuleId ?? "");

// https://vite.dev/config/
export default defineConfig({
  plugins: [projectFiles(), react(), tailwindcss()],
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
