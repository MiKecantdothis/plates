const { test, expect, startRoutine, stored } = require('./support/fixtures');

test.describe('Workouts per Body Part and Dynamic Exercise Variations', () => {
  test('routines are grouped by type and filterable by type chips', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-workouts');

    // Filter bar should be visible with type chips
    await expect(page.locator('#routine-type-filters')).toBeVisible();
    await expect(page.locator('.bodypart-chip[data-rtype="all"]')).toHaveClass(/\bactive\b/);

    // Default routines should include Strength group at minimum
    await expect(page.locator('.bodypart-group[data-routinetype="strength"]')).toBeVisible();

    // Clicking 'Calisthenics' filter chip shows only calisthenics routines (or empty state)
    await page.click('.bodypart-chip[data-rtype="bodyweight"]');
    await expect(page.locator('.bodypart-chip[data-rtype="bodyweight"]')).toHaveClass(/\bactive\b/);
    // Strength group should be gone
    await expect(page.locator('.bodypart-group[data-routinetype="strength"]')).toHaveCount(0);

    // Clicking 'All' filter chip restores all groups
    await page.click('.bodypart-chip[data-rtype="all"]');
    await expect(page.locator('.bodypart-group[data-routinetype="strength"]')).toBeVisible();
  });

  test('creating a workout with individual exercise body part mappings (deadlift = back)', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-workouts');
    await page.click('#btn-add-routine');

    await expect(page.locator('#modal-routine')).toBeVisible();
    await page.fill('#routine-name', 'Heavy Pull & Shoulders');

    // First exercise: Deadlift -> should auto-select Back
    const firstRow = page.locator('#exercise-list .exercise-row').first();
    const firstInput = firstRow.locator('.exercise-name-input');
    const firstSelect = firstRow.locator('.exercise-bodypart-select');
    await firstInput.fill('Sumo Deadlift');
    await expect(firstSelect).toHaveValue('Back');

    // Second exercise: Dumbbell Lateral Raise -> should auto-select Shoulders
    const secondRow = page.locator('#exercise-list .exercise-row').nth(1);
    const secondInput = secondRow.locator('.exercise-name-input');
    const secondSelect = secondRow.locator('.exercise-bodypart-select');
    await secondInput.fill('Dumbbell Lateral Raise');
    await expect(secondSelect).toHaveValue('Shoulders');

    await page.click('#btn-save-routine');
    await expect(page.locator('#modal-routine')).toBeHidden();

    // Routine should be persisted with exerciseBodyParts mapping
    const routines = await stored(page, 'plates_routines');
    const created = routines.find((r) => r.name === 'Heavy Pull & Shoulders');
    expect(created).toBeDefined();
    expect(created.exercises).toContain('Sumo Deadlift');
    expect(created.exerciseBodyParts['Sumo Deadlift']).toBe('Back');
    expect(created.exerciseBodyParts['Dumbbell Lateral Raise']).toBe('Shoulders');

    // Routine card should display exercise body part tags
    const pullCard = page.locator('.routine-card', { hasText: 'Heavy Pull & Shoulders' });
    await expect(pullCard).toBeVisible();
    await expect(pullCard.locator('.routine-card-ex-tag', { hasText: 'Back' })).toBeVisible();
    await expect(pullCard.locator('.routine-card-ex-tag', { hasText: 'Shoulders' })).toBeVisible();
  });

  test('can dynamically add an exercise variation with target body part during an active workout session', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page, 'default-push');

    // Initially 4 exercises in default-push
    await expect(page.locator('#active-step-label')).toHaveText('Exercise 1 of 4');
    await expect(page.locator('#active-exercise-bodypart')).toHaveText('Chest');
    await expect(page.locator('.stepper-pill[data-idx]')).toHaveCount(4);

    // Open Add Exercise Modal via bottom button
    await page.click('#btn-add-exercise-active');
    await expect(page.locator('#modal-add-exercise-active')).toBeVisible();

    // Fill in new exercise name: Romanian Deadlift -> should auto-detect Back!
    await page.fill('#active-new-exercise-name', 'Romanian Deadlift');
    await expect(page.locator('#active-new-exercise-bodypart')).toHaveValue('Back');

    await page.fill('#active-new-exercise-sets', '3');
    await page.selectOption('#active-new-exercise-position', 'next');
    await page.click('#btn-confirm-add-exercise-active');

    // Modal should close and new exercise should now be active with Back badge
    await expect(page.locator('#modal-add-exercise-active')).toBeHidden();
    await expect(page.locator('#active-exercise-name')).toHaveText('Romanian Deadlift');
    await expect(page.locator('#active-exercise-bodypart')).toHaveText('Back');
    await expect(page.locator('#active-step-label')).toHaveText('Exercise 2 of 5');
    await expect(page.locator('.stepper-pill[data-idx]')).toHaveCount(5);

    // Log a set for the dynamically added exercise
    await page.fill('#set-weight-input', '100');
    await page.fill('#set-reps-input', '8');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(1);
    await expect(page.locator('.set-record-detail')).toContainText('100');

    // Active session stored in localStorage should reflect the dynamically added exercise with bodyPart
    const session = await stored(page, 'plates_active_session');
    expect(session.exercises).toHaveLength(5);
    expect(session.exercises[1].name).toBe('Romanian Deadlift');
    expect(session.exercises[1].bodyPart).toBe('Back');
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
