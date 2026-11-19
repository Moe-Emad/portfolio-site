/// <reference types="vite/client" />

/** VERCEL_ENV of the build: 'production', 'preview' or 'development' on Vercel, '' anywhere else (vite.config.js). */
declare const __VERCEL_ENV__: string;

/** Figures about how this site was built, counted from the repository at build time (tools/build/site-record.cjs). */
declare const __SITE_RECORD__: {
  itemsDone: number;
  itemsPlanned: number;
  tests: number;
  lessons: number;
};
