import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/external',
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-external', open: 'never' }]],
  use: {
    baseURL: process.env.RESTFUL_BOOKER_BASE_URL ?? 'https://restful-booker.herokuapp.com',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
});
