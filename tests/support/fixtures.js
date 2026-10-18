// Shared setup: each test worker serves this folder locally, external CDNs are
// blocked, and a few helpers drive the app.
const base = require('@playwright/test');
const { startServer } = require('./server');

// The app loads Chart.js and a web font from CDNs. No test needs them, and
// blocking them keeps the tests fast and runnable without internet.
const CDNS = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.cdnfonts\.com)\//;

const test = base.test.extend({
  server: [async ({}, use) => {
    const server = await startServer();
    await use(server);
    await server.close();
  }, { scope: 'worker' }],

  baseURL: async ({ server }, use) => {
    await use(server.url);
  },

  context: async ({ context }, use) => {
    await context.route(CDNS, (route) => route.abort());
    await use(context);
  },
});

// A fresh context with another phone's screen size
async function phoneContext(browser, deviceName) {
  const { defaultBrowserType, ...device } = base.devices[deviceName];
  const context = await browser.newContext({ ...device, serviceWorkers: 'block' });
  await context.route(CDNS, (route) => route.abort());
  return context;
}

async function startRoutine(page, routineId = 'default-push') {
  await page.click('#nav-btn-workouts');
  await page.click(`[data-action="start"][data-id="${routineId}"]`);
  await base.expect(page.locator('#tab-active')).toHaveClass(/\bactive\b/);
}

// Put data in storage, then reload so the app reads it
async function seed(page, key, value) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [key, value]);
  await page.reload();
}

const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);

// "02:35" -> 155
const toSeconds = (text) => text.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);

module.exports = { test, expect: base.expect, phoneContext, startRoutine, seed, stored, toSeconds };
