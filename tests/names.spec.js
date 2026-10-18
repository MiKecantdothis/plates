// Names are shown exactly as typed, and never treated as code.
const { test, expect, seed, stored } = require('./support/fixtures');

test('a name with a quote mark survives editing the routine', async ({ page }) => {
  await page.goto('/');
  await page.click('#nav-btn-workouts');
  await page.click('#btn-add-routine');
  await page.fill('#routine-name', 'Deficit Day');
  await page.locator('#exercise-list input').first().fill('3" Deficit Deadlift');
  await page.click('#btn-save-routine');

  await page.locator('.routine-card', { hasText: 'Deficit Day' }).locator('[data-action="edit"]').click();
  await expect(page.locator('#exercise-list input').first()).toHaveValue('3" Deficit Deadlift');
  await page.click('#btn-save-routine');
  const routines = await stored(page, 'plates_routines');
  expect(routines.find((r) => r.name === 'Deficit Day').exercises[0]).toBe('3" Deficit Deadlift');
});

test('names and ids from storage are shown as text, never run', async ({ page }) => {
  // The kind of value an import, a sync or an AI tool could one day write
  const sneaky = 'x" onfocus="window.ran=1" onmouseover="window.ran=1';
  await page.goto('/');
  await seed(page, 'plates_routines', [{ id: sneaky, name: sneaky, exercises: [sneaky], defaultSets: 3 }]);
  await seed(page, 'plates_shopping', [{ id: sneaky, name: sneaky, category: 'protein', checked: false, price: 10 }]);

  await page.click('#nav-btn-workouts');
  await page.locator('[data-action="edit"]').first().click(); // names go inside value="…" here
  await page.locator('#exercise-list input').first().focus();
  await expect(page.locator('#exercise-list input').first()).toHaveValue(sneaky);
  await page.click('#btn-cancel-routine');
  await page.click('#nav-btn-shopping');

  const elementsWithHandlers = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter((el) => [...el.attributes].some((attr) => attr.name.startsWith('on'))).length);
  expect(elementsWithHandlers).toBe(0);
  expect(await page.evaluate(() => window.ran)).toBeUndefined();
});
