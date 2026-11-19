// Browser tests (tracker A5). Start them with "npm run test:browser": that command builds the site for the tests
// first. Running "npx playwright test" alone is refused, so the tests never run against a stale or real build.
import { defineConfig, devices } from '@playwright/test';

if (process.env.E2E_BUILD !== 'dist-e2e') {
  throw new Error('Start the browser tests with: npm run test:browser');
}

// Its own port: a dev server on 5173 or a preview on 4173 is not touched.
const PORT = 4319;

export default defineConfig({
  testDir: 'tests/browser',
  outputDir: 'test-results',
  fullyParallel: true,
  // A GitHub runner has two cores.
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: true,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
