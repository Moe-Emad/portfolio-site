import { createRequire } from "node:module";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The figures the page shows about itself are counted from the repository when the site is built
// (tools/build/site-record.cjs) and written into the code as a constant.
const { siteRecord } = createRequire(import.meta.url)("./tools/build/site-record.cjs");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __SITE_RECORD__: JSON.stringify(siteRecord()),
    // "production", "preview" or "development" when Vercel builds the site, empty everywhere else. Speed Insights
    // starts only in production on Vercel (src/lib/speed-insights.ts).
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ""),
  },
});
