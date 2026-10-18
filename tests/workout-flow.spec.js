// The normal flow, start to finish, must work exactly as before.
const { test, expect, startRoutine, stored } = require('./support/fixtures');

test('a full workout runs from start to finish and is saved to history', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T07:00:00') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-18T07:01:00'));
  await page.selectOption('#goal-select', 'hiit'); // 20 s rests keep this short
  await startRoutine(page);

  for (let exercise = 1; exercise <= 4; exercise++) {
    await expect(page.locator('#active-step-label')).toHaveText(`Exercise ${exercise} of 4`);
    for (let set = 1; set <= 3; set++) {
      await page.click('#btn-complete-set');
      await page.clock.runFor(21_000); // the rest runs out; after set 3 the app moves on
    }
  }
  await page.click('#btn-finish-workout'); // every set done, so no question
  await expect(page.locator('#modal-workout-complete')).toBeVisible();

  const [saved] = await stored(page, 'plates_history');
  expect(saved.totalSets).toBe(12);
  expect(saved.exercises.map((e) => e.sets.length)).toEqual([3, 3, 3, 3]);
  expect(saved.durationSeconds).toBe(12 * 21);
});
