import { createRequire } from "node:module";
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
  },
});
