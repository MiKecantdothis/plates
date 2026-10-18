// After one visit, the app has to open with no connection at all.
const { test, expect } = require('./support/fixtures');
const { startServer } = require('./support/server');

test.use({ serviceWorkers: 'allow' });

test('the app opens offline after a single visit', async ({ page }) => {
  const server = await startServer(); // a server this test can switch off
  await page.goto(server.url);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

  await server.close(); // the connection is gone
  await page.reload();

  // The styles loaded (the app's near-black background)...
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(5, 7, 10)');
  // ...and the script ran (it swaps the heading for a greeting)
  await expect(page.locator('#dashboard-greeting')).toHaveText(/Ready to lift\?/);
});
