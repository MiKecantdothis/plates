// Each exercise shows what you did last time, and starts from it.
const { test, expect, startRoutine, seed } = require('./support/fixtures');

function benchThreeDaysAgo() {
  const now = new Date();
  return [{
    id: 'h1', routineId: 'default-push', routineName: 'Push Day (Chest & Triceps)',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 12).toISOString(),
    durationSeconds: 3000, totalVolume: 1355, totalSets: 3,
    exercises: [{ name: 'Barbell Bench Press', sets: [
      { weight: 60, reps: 8, unit: 'kg', timestamp: 0 },
      { weight: 62.5, reps: 6, unit: 'kg', timestamp: 0 },
      { weight: 60, reps: 8, unit: 'kg', timestamp: 0 },
    ] }],
  }];
}

test('shows what you did last time and starts the first set from it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('plates_unit', 'kg'));
  await seed(page, 'plates_history', benchThreeDaysAgo());
  await startRoutine(page);

  const lastTime = page.locator('#last-time');
  await expect(lastTime).toHaveText('Last time (3 days ago): 60 kg × 8, 62.5 kg × 6, 60 kg × 8');
  await expect(lastTime.locator('strong')).toHaveText('60 kg × 8');
  await expect(page.locator('#set-weight-input')).toHaveValue('60');
  await expect(page.locator('#set-reps-input')).toHaveValue('8');

  // The next set follows the one you just did; last time's set 2 is highlighted
  await page.fill('#set-weight-input', '62.5');
  await page.click('#btn-complete-set');
  await page.click('#btn-rest-skip');
  await expect(page.locator('#set-weight-input')).toHaveValue('62.5');
  await expect(page.locator('#set-reps-input')).toHaveValue('8');
  await expect(lastTime.locator('strong')).toHaveText('62.5 kg × 6');
});

test('a new exercise never copies the weight from the one before', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page, 'default-pull'); // Conventional Deadlift first
  await page.fill('#set-weight-input', '140');
  for (let set = 0; set < 3; set++) {
    await page.click('#btn-complete-set');
    await page.click('#btn-rest-skip');
  }
  await page.click('#btn-next-exercise');
  await expect(page.locator('#active-exercise-name')).toHaveText('Wide-Grip Lat Pulldown');
  await expect(page.locator('#set-weight-input')).toHaveValue('');
  await expect(page.locator('#last-time')).toBeHidden();
});

test('what you type is never overwritten by the screen refreshing', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await page.fill('#set-weight-input', '60');
  await page.click('#btn-complete-set');
  await page.click('#btn-rest-skip');

  await page.fill('#set-weight-input', '65'); // going up for set 2
  await page.click('#nav-btn-dashboard');
  await page.click('#nav-btn-active'); // this redraws the workout
  await expect(page.locator('#set-weight-input')).toHaveValue('65');
});
