// Unit toggling between lbs and kg must be seamless, persistent, and reflected across the app.
const { test, expect, startRoutine, seed, stored } = require('./support/fixtures');

test('unit toggle in header switches between lbs and kg and persists', async ({ page }) => {
  await page.goto('/');

  const btnLbs = page.locator('#unit-btn-lbs');
  const btnKg = page.locator('#unit-btn-kg');

  // Default is lbs
  await expect(btnLbs).toHaveClass(/\bactive\b/);
  await expect(btnKg).not.toHaveClass(/\bactive\b/);
  expect(await page.evaluate(() => localStorage.getItem('plates_unit') || 'lbs')).toBe('lbs');

  // Click KG
  await btnKg.click();
  await expect(btnKg).toHaveClass(/\bactive\b/);
  await expect(btnLbs).not.toHaveClass(/\bactive\b/);
  expect(await page.evaluate(() => localStorage.getItem('plates_unit'))).toBe('kg');

  // Reload page to verify persistence
  await page.reload();
  await expect(page.locator('#unit-btn-kg')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#unit-btn-lbs')).not.toHaveClass(/\bactive\b/);
});

test('toggling unit updates set logger steppers, input values, and quick toggle', async ({ page }) => {
  await page.goto('/');
  await startRoutine(page);

  // In lbs mode
  await expect(page.locator('#weight-unit-label')).toHaveText('lbs');
  await expect(page.locator('#btn-weight-minus')).toHaveText('-5');
  await expect(page.locator('#btn-weight-plus')).toHaveText('+5');
  await expect(page.locator('#btn-weight-plus10')).toHaveText('+10');

  // Fill 100 lbs
  await page.fill('#set-weight-input', '100');

  // Use quick toggle in set logger to switch to kg
  await page.click('#unit-quick-toggle');
  await expect(page.locator('#weight-unit-label')).toHaveText('kg');
  await expect(page.locator('#unit-btn-kg')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#btn-weight-minus')).toHaveText('-2.5');
  await expect(page.locator('#btn-weight-plus')).toHaveText('+2.5');
  await expect(page.locator('#btn-weight-plus10')).toHaveText('+5');

  // 100 lbs converted to kg is 45.4
  expect(await page.inputValue('#set-weight-input')).toBe('45.4');

  // Test kg steppers: +2.5 should give 47.9
  await page.click('#btn-weight-plus');
  expect(await page.inputValue('#set-weight-input')).toBe('47.9');

  // +5 should give 52.9
  await page.click('#btn-weight-plus10');
  expect(await page.inputValue('#set-weight-input')).toBe('52.9');

  // -2.5 should give 50.4
  await page.click('#btn-weight-minus');
  expect(await page.inputValue('#set-weight-input')).toBe('50.4');

  // Switch back to lbs using header
  await page.click('#unit-btn-lbs');
  await expect(page.locator('#weight-unit-label')).toHaveText('lbs');
  await expect(page.locator('#btn-weight-minus')).toHaveText('-5');
});

test('logging sets and completing workout in KG saves properly and displays in history and dashboard', async ({ page }) => {
  await page.goto('/');
  // Switch to kg
  await page.click('#unit-btn-kg');

  await startRoutine(page);
  await page.fill('#set-weight-input', '50');
  await page.fill('#set-reps-input', '10');
  await page.click('#btn-complete-set');

  // Check set row shows kg
  await expect(page.locator('.set-record-detail')).toContainText('50 kg');

  // Finish workout early
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('#btn-finish-workout');

  // Modal celebration shows volume in kg (50 * 10 = 500 kg)
  await expect(page.locator('#modal-workout-complete')).toBeVisible();
  await expect(page.locator('#complete-volume')).toContainText('500 kg');

  const [saved] = await stored(page, 'plates_history');
  expect(saved.unit).toBe('kg');
  expect(saved.totalVolume).toBe(500);

  // Close complete modal to go to history
  await page.click('#btn-close-complete');
  await expect(page.locator('.history-card')).toHaveCount(1);
  await expect(page.locator('.history-date')).toContainText('500 kg volume');
  await expect(page.locator('.history-exercise')).toContainText('50 kg × 10');

  // Check Dashboard KPI
  await page.click('#nav-btn-dashboard');
  await expect(page.locator('#kpi-total-volume')).toContainText('500 kg');

  // Toggle to lbs on dashboard: 500 kg converted to lbs is 1,102 lbs
  await page.click('#unit-btn-lbs');
  await expect(page.locator('#kpi-total-volume')).toContainText('1,102 lbs');

  // Check history view now shows in lbs: 50 kg -> 110.2 lbs
  await page.click('#nav-btn-history');
  await expect(page.locator('.history-date')).toContainText('1,102 lbs volume');
  await expect(page.locator('.history-exercise')).toContainText('110.2 lbs × 10');
});
