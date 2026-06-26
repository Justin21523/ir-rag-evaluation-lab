import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5301';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '../docs/demo/playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 980 },
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOW_MO || 80),
    },
  },
  outputDir: '../docs/demo/playwright-artifacts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
