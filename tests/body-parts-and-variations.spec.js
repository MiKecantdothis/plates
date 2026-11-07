const { test, expect, startRoutine, stored } = require('./support/fixtures');

test.describe('Workouts per Body Part and Dynamic Exercise Variations', () => {
  test('routines are grouped by body part and filterable by body part chips', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-workouts');

    // Filter bar should be visible with chips
    await expect(page.locator('#bodypart-filters')).toBeVisible();
    await expect(page.locator('.bodypart-chip[data-part="all"]')).toHaveClass(/\bactive\b/);

    // Initial routines should include Chest, Back, Legs groups
    await expect(page.locator('.bodypart-group[data-bodypart="Chest"]')).toBeVisible();
    await expect(page.locator('.bodypart-group[data-bodypart="Back"]')).toBeVisible();
    await expect(page.locator('.bodypart-group[data-bodypart="Legs"]')).toBeVisible();

    // Clicking 'Chest' filter chip shows only Chest routines
    await page.click('.bodypart-chip[data-part="Chest"]');
    await expect(page.locator('.bodypart-chip[data-part="Chest"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('.bodypart-group[data-bodypart="Chest"]')).toBeVisible();
    await expect(page.locator('.bodypart-group[data-bodypart="Back"]')).toHaveCount(0);
    await expect(page.locator('.bodypart-group[data-bodypart="Legs"]')).toHaveCount(0);

    // Clicking 'All' filter chip restores all groups
    await page.click('.bodypart-chip[data-part="all"]');
    await expect(page.locator('.bodypart-group[data-bodypart="Chest"]')).toBeVisible();
    await expect(page.locator('.bodypart-group[data-bodypart="Back"]')).toBeVisible();
  });

  test('creating a workout with a selected body part stores it properly', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-workouts');
    await page.click('#btn-add-routine');

    await expect(page.locator('#modal-routine')).toBeVisible();
    await page.fill('#routine-name', 'Boulder Shoulders');
    await page.selectOption('#routine-body-part', 'Shoulders');
    await page.locator('#exercise-list input').first().fill('Overhead Dumbbell Press');
    await page.click('#btn-save-routine');

    await expect(page.locator('#modal-routine')).toBeHidden();

    // Routine should be persisted with bodyPart
    const routines = await stored(page, 'plates_routines');
    const created = routines.find((r) => r.name === 'Boulder Shoulders');
    expect(created).toBeDefined();
    expect(created.bodyPart).toBe('Shoulders');

    // It should render under Shoulders group with a Shoulders badge
    await expect(page.locator('.bodypart-group[data-bodypart="Shoulders"]')).toBeVisible();
    const shoulderCard = page.locator('.routine-card', { hasText: 'Boulder Shoulders' });
    await expect(shoulderCard).toBeVisible();
    await expect(shoulderCard.locator('.routine-bodypart-badge')).toHaveText('Shoulders');
  });

  test('can dynamically add an exercise variation during an active workout session', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page, 'default-push');

    // Initially 4 exercises in default-push
    await expect(page.locator('#active-step-label')).toHaveText('Exercise 1 of 4');
    await expect(page.locator('.stepper-pill[data-idx]')).toHaveCount(4);

    // Open Add Exercise Modal via bottom button
    await page.click('#btn-add-exercise-active');
    await expect(page.locator('#modal-add-exercise-active')).toBeVisible();

    // Fill in new exercise name and target sets
    await page.fill('#active-new-exercise-name', 'Cable Chest Flyes');
    await page.fill('#active-new-exercise-sets', '3');
    await page.selectOption('#active-new-exercise-position', 'next');
    await page.click('#btn-confirm-add-exercise-active');

    // Modal should close and new exercise should now be active
    await expect(page.locator('#modal-add-exercise-active')).toBeHidden();
    await expect(page.locator('#active-exercise-name')).toHaveText('Cable Chest Flyes');
    await expect(page.locator('#active-step-label')).toHaveText('Exercise 2 of 5');
    await expect(page.locator('.stepper-pill[data-idx]')).toHaveCount(5);

    // Log a set for the dynamically added exercise
    await page.fill('#set-weight-input', '25');
    await page.fill('#set-reps-input', '12');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(1);
    await expect(page.locator('.set-record-detail')).toContainText('25');

    // Active session stored in localStorage should reflect the dynamically added exercise
    const session = await stored(page, 'plates_active_session');
    expect(session.exercises).toHaveLength(5);
    expect(session.exercises[1].name).toBe('Cable Chest Flyes');
    expect(session.exercises[1].sets).toHaveLength(1);
  });

  test('can remove an uncompleted exercise variation from active session', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page, 'default-push');

    // Add an exercise variation
    await page.click('#btn-stepper-add-exercise');
    await expect(page.locator('#modal-add-exercise-active')).toBeVisible();
    await page.fill('#active-new-exercise-name', 'Optional Dips');
    await page.click('#btn-confirm-add-exercise-active');

    await expect(page.locator('#active-exercise-name')).toHaveText('Optional Dips');
    await expect(page.locator('#active-step-label')).toHaveText('Exercise 2 of 5');

    // Since no sets have been logged yet for Optional Dips, Remove Exercise should be visible
    await expect(page.locator('#btn-remove-exercise-active')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#btn-remove-exercise-active');

    // Should return to 4 exercises
    await expect(page.locator('.stepper-pill[data-idx]')).toHaveCount(4);
    const session = await stored(page, 'plates_active_session');
    expect(session.exercises).toHaveLength(4);
    expect(session.exercises.some((e) => e.name === 'Optional Dips')).toBe(false);
  });
});

