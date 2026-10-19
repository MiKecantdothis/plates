// Weights can be kg or lb. Each set keeps the unit it was logged in, so
// switching changes what's shown and never what was saved.
const { test, expect, startRoutine, seed, stored } = require('./support/fixtures');

const workout = (id, exercises, daysAgo = 3) => {
  const now = new Date();
  return {
    id, routineId: 'default-legs', routineName: 'Leg Day (Quads & Hamstrings)',
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 12).toISOString(),
    durationSeconds: 3000, totalVolume: 0, totalSets: 1, exercises,
  };
};

test.describe('a new user in India', () => {
  test.use({ locale: 'en-IN' });

  test('starts in kg, with kg-sized steps', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page);
    await expect(page.locator('#set-weight-label')).toHaveText('Weight (kg)');
    await expect(page.locator('.unit-btn[data-unit="kg"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#btn-weight-minus')).toHaveText('-2.5');
    await expect(page.locator('#btn-weight-plus')).toHaveText('+2.5');
    await expect(page.locator('#btn-weight-plus10')).toHaveText('+5');
    await page.fill('#set-weight-input', '60');
    await page.click('#btn-weight-plus');
    await expect(page.locator('#set-weight-input')).toHaveValue('62.5');
  });
});

test.describe('a new user in the US', () => {
  test.use({ locale: 'en-US' });

  test('starts in lb, with lb-sized steps', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page);
    await expect(page.locator('#set-weight-label')).toHaveText('Weight (lb)');
    await expect(page.locator('#btn-weight-plus')).toHaveText('+5');
    await expect(page.locator('#btn-weight-plus10')).toHaveText('+10');
  });
});

test('switching units changes what is shown, never what was saved', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);
  await page.click('.unit-btn[data-unit="kg"]');
  await page.fill('#set-weight-input', '100');
  await page.fill('#set-reps-input', '5');
  await page.click('#btn-complete-set');
  await page.click('#btn-rest-skip');
  await expect(page.locator('.set-record-detail').first()).toContainText('100 kg × 5');

  await page.click('.unit-btn[data-unit="lb"]');
  await expect(page.locator('.set-record-detail').first()).toContainText('220.5 lb × 5');
  await expect(page.locator('#set-weight-input')).toHaveValue('220.5'); // the box converts too
  const session = await stored(page, 'plates_active_session');
  expect(session.exercises[0].sets[0]).toMatchObject({ weight: 100, unit: 'kg', reps: 5 });
});

test.describe('someone who logged sets before units existed', () => {
  test.use({ locale: 'en-IN' });

  test('keeps seeing lb, is asked once, and the numbers never change', async ({ page }) => {
    const old = workout('old', [{ name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 10, timestamp: 0 }] }]);
    await page.goto('/');
    // Recreate storage as it was before this update: history, but no unit chosen
    await page.evaluate((h) => {
      localStorage.setItem('plates_history', JSON.stringify(h));
      localStorage.removeItem('plates_unit');
    }, [old]);
    await page.reload();

    await expect(page.locator('#unit-question')).toBeVisible();
    await expect(page.locator('#kpi-total-volume')).toHaveText('1,000 lb');
    await page.click('#btn-legacy-kg');
    await expect(page.locator('#unit-question')).toBeHidden();
    await expect(page.locator('#kpi-total-volume')).toHaveText('1,000 kg');
    await page.click('#nav-btn-history');
    await expect(page.locator('.history-exercise').first()).toContainText('100 kg × 10');

    await page.reload();
    await expect(page.locator('#unit-question')).toBeHidden();
    expect(await stored(page, 'plates_history')).toEqual([old]); // nothing rewritten
  });
});

test('impossible sets are caught before they are saved', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page); // en-US, so lb
  await page.fill('#set-weight-input', '-50');
  await page.click('#btn-complete-set');
  await expect(page.locator('.toast')).toHaveText("Weight can't be below zero");

  await page.fill('#set-weight-input', '60');
  await page.fill('#set-reps-input', '5000');
  await page.click('#btn-complete-set');
  await expect(page.locator('.toast')).toHaveText('Reps go up to 100');

  let question = '';
  page.once('dialog', (dialog) => { question = dialog.message(); dialog.dismiss(); });
  await page.fill('#set-reps-input', '5');
  await page.fill('#set-weight-input', '6000'); // an extra zero
  await page.click('#btn-complete-set');
  expect(question).toContain('6000 lb');

  const session = await stored(page, 'plates_active_session');
  expect(session.exercises[0].sets).toHaveLength(0);
});

test('personal records compare weights across units', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('plates_unit', 'kg'));
  await seed(page, 'plates_history', [
    workout('a', [{ name: 'Barbell Back Squat', sets: [{ weight: 200, reps: 3, unit: 'lb', timestamp: 0 }] }], 2),
    workout('b', [{ name: 'Barbell Back Squat', sets: [{ weight: 100, reps: 3, unit: 'kg', timestamp: 0 }] }], 5),
  ]);
  await expect(page.locator('.pr-record-badge').first()).toHaveText('100 kg'); // 200 lb is 90.7 kg
});
