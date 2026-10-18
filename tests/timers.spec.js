// Timers must follow the clock, because phones pause web pages while locked.
const { test, expect, startRoutine, stored, toSeconds } = require('./support/fixtures');

// Freeze the page's clock, so time moves only when a test says so
async function openWithFrozenClock(page) {
  await page.clock.install({ time: new Date('2026-10-18T07:00:00') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-18T07:01:00'));
}

test('rest and workout timers keep real time while the phone is locked', async ({ page }) => {
  await openWithFrozenClock(page);
  await startRoutine(page);
  await page.click('#btn-complete-set'); // the default goal, Build Strength, rests 3:00
  await expect(page.locator('#rest-digits')).toHaveText('03:00');

  // fastForward jumps ahead without running the timers in between,
  // which is what a locked phone does to a web page.
  await page.clock.fastForward('00:40');
  await expect(page.locator('#rest-digits')).toHaveText('02:20');
  await expect(page.locator('#active-elapsed-text')).toHaveText('00:40');

  await page.click('#btn-rest-plus');
  await expect(page.locator('#rest-digits')).toHaveText('02:50');
  await page.click('#btn-rest-minus');
  await expect(page.locator('#rest-digits')).toHaveText('02:35');
});

test('reopening the app mid-rest goes back to the workout and the countdown carries on', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await page.click('#btn-complete-set');
  await page.waitForTimeout(3000);
  await page.reload();

  await expect(page.locator('#tab-active')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#active-rest-panel')).toBeVisible();
  const shown = toSeconds(await page.locator('#rest-digits').innerText());
  expect(shown).toBeLessThanOrEqual(177);
  await page.waitForTimeout(2000);
  expect(toSeconds(await page.locator('#rest-digits').innerText())).toBeLessThan(shown);
});

test('a workout left open for hours is saved with the time up to its last set', async ({ page }) => {
  await openWithFrozenClock(page);
  await startRoutine(page);
  await page.click('#btn-complete-set');
  await page.click('#btn-rest-skip');
  await page.clock.fastForward('10:00');
  await page.click('#btn-complete-set'); // last set, 10 minutes in
  await page.clock.fastForward('05:00:00'); // then the workout is forgotten for 5 hours

  page.once('dialog', (dialog) => dialog.accept()); // "sets left" question
  await page.click('#btn-finish-workout');
  await expect(page.locator('#modal-workout-complete')).toBeVisible();
  const [saved] = await stored(page, 'plates_history');
  expect(saved.durationSeconds).toBe(600);
});

test('the screen is kept on during a rest and let go after it', async ({ page }) => {
  // Stand-in for the Wake Lock API that records what the app asks for
  await page.addInitScript(() => {
    window.wakeLog = [];
    const wakeLock = {
      request: async () => {
        window.wakeLog.push('request');
        const lock = new EventTarget();
        lock.release = async () => {
          window.wakeLog.push('release');
          lock.dispatchEvent(new Event('release'));
        };
        return lock;
      },
    };
    Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => wakeLock });
  });
  await page.goto('/');
  await startRoutine(page);
  await page.click('#btn-complete-set');
  await expect.poll(() => page.evaluate(() => window.wakeLog)).toEqual(['request']);
  await page.click('#btn-rest-skip');
  await expect.poll(() => page.evaluate(() => window.wakeLog)).toEqual(['request', 'release']);
});
