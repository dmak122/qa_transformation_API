import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  reporter: [['list'], ['html', { open: 'never' }]],
});
