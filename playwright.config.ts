import { defineConfig, devices } from '@playwright/test';

/*
 * Deliberately not Vite's default preview port. Reusing whatever already
 * answers on a well known port silently runs the whole suite against someone
 * else's server, which is a confusing way to fail.
 */
const PORT = 4319;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Preview serves the real build, so the end to end run exercises the same
    // bundle and the same base path that GitHub Pages will serve.
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    port: PORT,
    // Always build and serve fresh, so a run can never test a stale bundle.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
