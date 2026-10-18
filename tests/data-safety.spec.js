// A single tap should never erase logged training without a way back.
const { test, expect, startRoutine, seed, stored } = require('./support/fixtures');

async function logSets(page, weights) {
  for (const weight of weights) {
    await page.fill('#set-weight-input', String(weight));
    await page.click('#btn-complete-set');
    await page.click('#btn-rest-skip');
  }
}

test('tapping the running routine resumes it instead of erasing its sets', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await logSets(page, [100, 100]);

  await page.click('#nav-btn-workouts');
  const card = page.locator('.routine-card[data-id="default-push"]');
  await expect(card.locator('[data-action="start"]')).toHaveText(/Resume/);
  await card.locator('.routine-card-title').click();

  await expect(page.locator('#tab-active')).toHaveClass(/\bactive\b/);
  const session = await stored(page, 'plates_active_session');
  expect(session.exercises[0].sets).toHaveLength(2);
});

test('finishing with planned sets left asks first, from both finish buttons', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await logSets(page, [100]);

  let question = '';
  page.once('dialog', (dialog) => { question = dialog.message(); dialog.dismiss(); });
  await page.click('#btn-finish-workout');
  expect(question).toContain('11 planned sets left');
  await expect(page.locator('#modal-workout-complete')).toBeHidden();
  expect(await stored(page, 'plates_active_session')).not.toBeNull();

  // On the last exercise, Next Exercise becomes Finish Workout. It asks too.
  await page.click('.stepper-pill[data-idx="3"]');
  await expect(page.locator('#btn-next-exercise')).toHaveText('Finish Workout');
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('#btn-next-exercise');
  await expect(page.locator('#modal-workout-complete')).toBeVisible();
});

test('a deleted set can be undone', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await logSets(page, [100, 110]);

  await page.locator('.set-record-del').first().click();
  await expect(page.locator('.set-record-row')).toHaveCount(1);
  await page.locator('.toast-action', { hasText: 'Undo' }).click();
  await expect(page.locator('.set-record-row')).toHaveCount(2);
  const session = await stored(page, 'plates_active_session');
  expect(session.exercises[0].sets.map((set) => set.weight)).toEqual([100, 110]);
});

test('clearing history can be undone', async ({ page }) => {
  await page.goto('/');
  const workouts = [1, 2, 3].map((n) => ({
    id: `w${n}`, routineId: 'default-push', routineName: `Workout ${n}`,
    date: new Date(2026, 9, n, 18).toISOString(), durationSeconds: 1800, totalVolume: 1000, totalSets: 1,
    exercises: [{ name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 10, timestamp: 0 }] }],
  }));
  await seed(page, 'plates_history', workouts);
  await page.click('#nav-btn-history');

  let question = '';
  page.once('dialog', (dialog) => { question = dialog.message(); dialog.accept(); });
  await page.click('#btn-clear-history');
  expect(question).toContain('3 logged workouts');
  await expect(page.locator('.history-card')).toHaveCount(0);

  await page.locator('.toast-action', { hasText: 'Undo' }).click();
  await expect(page.locator('.history-card')).toHaveCount(3);
  expect(await stored(page, 'plates_history')).toHaveLength(3);
});
