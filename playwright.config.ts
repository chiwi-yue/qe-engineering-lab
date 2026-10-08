import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [[process.env.CI ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node scripts/ui-server.mjs',
      url: 'http://127.0.0.1:3101/api/slots',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command:
        'pnpm --filter @qe/web exec vite --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { API_ORIGIN: 'http://127.0.0.1:3101' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
