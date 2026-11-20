import { createRequire } from "node:module";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The figures the page shows about itself are counted from the repository when the site is built
// (tools/build/site-record.cjs) and written into the code as a constant.
const { siteRecord } = createRequire(import.meta.url)("./tools/build/site-record.cjs");
// The headers every file of the live site gets (public/_headers), the Content-Security-Policy among them.
const { readHeadersFile } = createRequire(import.meta.url)("./tools/build/headers.cjs");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __SITE_RECORD__: JSON.stringify(siteRecord()),
    // "production", "preview" or "development" when Vercel builds the site, empty everywhere else. Speed Insights
    // starts only in production on Vercel (src/lib/speed-insights.ts).
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
  // `npm run preview`, and so the browser tests, serve the build with the headers of the live site: every browser
  // test runs under its Content-Security-Policy (tracker B11). The dev server does not send them: its live reload
  // runs inline scripts of its own.
  preview: {
    headers: readHeadersFile()["/*"],
  },
});
