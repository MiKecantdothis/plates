// Browser tests for Plates. They open the real app in Chromium at phone size.
//
//   npm install
//   npx playwright install chromium
//   npm test
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    // Off so the offline copy can't affect other tests. The offline test turns it on.
    serviceWorkers: 'block',
  },
});
