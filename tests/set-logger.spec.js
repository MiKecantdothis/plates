// Every set-logging control has to fit on a phone screen and be easy to tap.
const { test, expect, phoneContext } = require('./support/fixtures');

const PHONES = ['Galaxy S8', 'iPhone 13', 'Pixel 7', 'iPhone 14 Pro Max'];
const CONTROLS = ['#btn-weight-minus', '#set-weight-input', '#btn-weight-plus', '#btn-weight-plus10',
  '#btn-reps-minus', '#set-reps-input', '#btn-reps-plus', '#btn-complete-set'];
const STEPPERS = ['#btn-weight-minus', '#btn-weight-plus', '#btn-weight-plus10', '#btn-reps-minus', '#btn-reps-plus'];

for (const phone of PHONES) {
  test(`weight, reps and their buttons are all on screen (${phone})`, async ({ browser, server }) => {
    const context = await phoneContext(browser, phone);
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click('#nav-btn-workouts');
    await page.click('[data-action="start"][data-id="default-push"]');

    const screenWidth = page.viewportSize().width;
    for (const control of CONTROLS) {
      const box = await page.locator(control).boundingBox();
      expect(box.x, `${control} starts on screen`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${control} ends on screen`).toBeLessThanOrEqual(screenWidth);
    }
    for (const stepper of STEPPERS) {
      const box = await page.locator(stepper).boundingBox();
      expect(Math.min(box.width, box.height), `${stepper} is at least 44 px`).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  });
}
