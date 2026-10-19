// The workout header (routine name, timer, Finish, Cancel) has to fit a phone screen.
const { test, expect, phoneContext } = require('./support/fixtures');

const PHONES = ['Galaxy S8', 'iPhone 13', 'Pixel 7', 'iPhone 14 Pro Max'];

for (const phone of PHONES) {
  test(`the workout header fits without squeezing anything (${phone})`, async ({ browser, server }) => {
    const context = await phoneContext(browser, phone);
    const page = await context.newPage();
    await page.goto(server.url);
    await page.click('#nav-btn-workouts');
    await page.click('[data-action="start"][data-id="default-push"]'); // the longest built-in name

    const header = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect();
      const lineCount = (el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
      };
      const icon = box(document.querySelector('#active-elapsed-timer svg'));
      const time = box(document.querySelector('#active-elapsed-text'));
      return {
        bar: box(document.querySelector('.active-top-bar')).toJSON(),
        parts: ['#active-routine-badge', '#active-elapsed-timer', '#btn-finish-workout', '#btn-cancel-workout']
          .map((sel) => ({ sel, ...box(document.querySelector(sel)).toJSON() })),
        nameLines: lineCount(document.querySelector('#active-routine-badge')),
        finishLines: lineCount(document.querySelector('#btn-finish-workout span')),
        iconBesideTime: Math.abs((icon.top + icon.bottom) / 2 - (time.top + time.bottom) / 2) < 6,
      };
    });

    expect(header.nameLines, 'the routine name stays on one line').toBe(1);
    expect(header.finishLines, '"Finish Workout" stays on one line').toBe(1);
    expect(header.iconBesideTime, 'the stopwatch sits beside the time').toBe(true);
    for (const part of header.parts) {
      expect(part.left, `${part.sel} starts inside the header`).toBeGreaterThanOrEqual(header.bar.left);
      expect(part.right, `${part.sel} ends inside the header`).toBeLessThanOrEqual(header.bar.right);
    }
    for (const button of header.parts.slice(2)) {
      expect(button.height, `${button.sel} is at least 44 px tall`).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  });
}
