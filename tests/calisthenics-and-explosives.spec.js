const { test, expect, startRoutine, stored, seed } = require('./support/fixtures');

test.describe('Weighted Calisthenics and Explosives Tracking Modes', () => {
  test('logs pure bodyweight and weighted calisthenics (BW + 15 kg × 6)', async ({ page }) => {
    await page.goto('/');
    await seed(page, 'plates_unit', 'kg');
    await startRoutine(page, 'default-pull');

    // Add dynamic calisthenics exercise: Weighted Pull-up
    await page.click('#btn-stepper-add-exercise');
    await expect(page.locator('#modal-add-exercise-active')).toBeVisible();
    await page.fill('#active-new-exercise-name', 'Weighted Pull-up');
    // Mode should auto-infer to bodyweight
    await expect(page.locator('#active-new-exercise-mode')).toHaveValue('bodyweight');
    await page.click('#btn-confirm-add-exercise-active');

    // Active exercise should now be Weighted Pull-up
    await expect(page.locator('#active-exercise-name')).toHaveText('Weighted Pull-up');
    await expect(page.locator('#set-weight-label')).toHaveText('Extra Weight (kg) — 0 for BW');
    await expect(page.locator('.mode-pill[data-mode="bodyweight"]')).toHaveClass(/active/);

    // Set 1: Bodyweight only (0 added weight, 10 reps)
    await page.fill('#set-weight-input', '0');
    await page.fill('#set-reps-input', '10');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(1);
    await expect(page.locator('.set-record-detail').first()).toHaveText('BW × 10');

    // Skip rest
    await page.click('#btn-rest-skip');

    // Set 2: Weighted calisthenics (15 kg added, 6 reps)
    await page.fill('#set-weight-input', '15');
    await page.fill('#set-reps-input', '6');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(2);
    await expect(page.locator('.set-record-detail').nth(1)).toHaveText('BW + 15 kg × 6');

    // Verify localStorage data structure
    const session = await stored(page, 'plates_active_session');
    const addedEx = session.exercises.find((e) => e.name === 'Weighted Pull-up');
    expect(addedEx).toBeDefined();
    expect(addedEx.mode).toBe('bodyweight');
    expect(addedEx.sets[0].isBW).toBe(true);
    expect(addedEx.sets[0].weight).toBe(0);
    expect(addedEx.sets[0].reps).toBe(10);
    expect(addedEx.sets[1].isBW).toBe(true);
    expect(addedEx.sets[1].weight).toBe(15);
    expect(addedEx.sets[1].reps).toBe(6);
  });

  test('logs explosive jumps with distance / height and unit switcher', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page, 'default-push');

    // Add dynamic explosive exercise: Box Jump
    await page.click('#btn-stepper-add-exercise');
    await expect(page.locator('#modal-add-exercise-active')).toBeVisible();
    await page.fill('#active-new-exercise-name', 'Box Jump');
    // Mode should auto-infer to distance
    await expect(page.locator('#active-new-exercise-mode')).toHaveValue('distance');
    await page.click('#btn-confirm-add-exercise-active');

    // Active exercise should now be Box Jump in distance mode
    await expect(page.locator('#active-exercise-name')).toHaveText('Box Jump');
    await expect(page.locator('.mode-pill[data-mode="distance"]')).toHaveClass(/active/);
    await expect(page.locator('#distance-unit-toggle')).toBeVisible();
    await expect(page.locator('#weight-unit-toggle')).toBeHidden();

    // Default distance unit should be 'in'
    await expect(page.locator('#distance-unit-toggle .active')).toHaveText('in');
    await expect(page.locator('#set-weight-label')).toHaveText('Height / Distance (in)');

    // Log 30 inches x 5 reps
    await page.fill('#set-weight-input', '30');
    await page.fill('#set-reps-input', '5');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(1);
    await expect(page.locator('.set-record-detail').first()).toHaveText('30 in × 5');

    // Skip rest
    await page.click('#btn-rest-skip');

    // Toggle distance unit to cm
    await page.click('.distance-btn[data-dunit="cm"]');
    await expect(page.locator('#distance-unit-toggle .active')).toHaveText('cm');
    await expect(page.locator('#set-weight-label')).toHaveText('Height / Distance (cm)');

    // Log 75 cm x 4 reps
    await page.fill('#set-weight-input', '75');
    await page.fill('#set-reps-input', '4');
    await page.click('#btn-complete-set');
    await expect(page.locator('.set-record-row')).toHaveCount(2);
    await expect(page.locator('.set-record-detail').nth(1)).toHaveText('75 cm × 4');

    // Check localStorage active session structure
    const session = await stored(page, 'plates_active_session');
    const jumpEx = session.exercises.find((e) => e.name === 'Box Jump');
    expect(jumpEx.mode).toBe('distance');
    expect(jumpEx.sets[0].distance).toBe(30);
    expect(jumpEx.sets[0].distanceUnit).toBe('in');
    expect(jumpEx.sets[1].distance).toBe(75);
    expect(jumpEx.sets[1].distanceUnit).toBe('cm');
  });

  test('switches modes dynamically with set-logger mode selector and logs isometric time hold', async ({ page }) => {
    await page.goto('/');
    await startRoutine(page, 'default-push');

    // Currently standard weight mode
    await expect(page.locator('.mode-pill[data-mode="weight"]')).toHaveClass(/active/);
    await expect(page.locator('#card-reps-input')).toBeVisible();

    // Switch to Time Hold mode via mode pill
    await page.click('.mode-pill[data-mode="time"]');
    await expect(page.locator('.mode-pill[data-mode="time"]')).toHaveClass(/active/);
    await expect(page.locator('#set-weight-label')).toHaveText('Duration (seconds)');
    await expect(page.locator('#card-reps-input')).toBeHidden();

    // Log a 45 second hold
    await page.fill('#set-weight-input', '45');
    await page.click('#btn-complete-set');

    await expect(page.locator('.set-record-row')).toHaveCount(1);
    await expect(page.locator('.set-record-detail').first()).toHaveText('45s hold');

    // Skip rest
    await page.click('#btn-rest-skip');

    // Switch back to weight mode
    await page.click('.mode-pill[data-mode="weight"]');
    await expect(page.locator('#card-reps-input')).toBeVisible();
    await expect(page.locator('#set-weight-label')).toContainText('Weight');
  });

  test('history view preserves and renders weighted calisthenics and explosive jump sets', async ({ page }) => {
    await page.goto('/');
    const historyEntry = {
      id: 'hist-calisthenics-test',
      date: new Date().toISOString(),
      routineId: 'default-calisthenics',
      routineName: 'Calisthenics & Explosives',
      bodyPart: 'Full Body',
      durationSeconds: 1800,
      unit: 'kg',
      exercises: [
        {
          name: 'Weighted Dips',
          bodyPart: 'Chest',
          mode: 'bodyweight',
          sets: [
            { weight: 0, reps: 12, isBW: true, unit: 'kg' },
            { weight: 20, reps: 8, isBW: true, unit: 'kg' },
          ],
        },
        {
          name: 'Broad Jump',
          bodyPart: 'Legs',
          mode: 'distance',
          sets: [
            { distance: 2.4, distanceUnit: 'm', reps: 3 },
          ],
        },
        {
          name: 'Plank',
          bodyPart: 'Core',
          mode: 'time',
          sets: [
            { seconds: 60, reps: 1 },
          ],
        },
      ],
    };
    await seed(page, 'plates_unit', 'kg');
    await seed(page, 'plates_history', [historyEntry]);

    // Navigate to History tab via Dashboard
    await page.click('#btn-goto-history-tab');
    await expect(page.locator('.history-card')).toHaveCount(1);

    const historyCard = page.locator('.history-card').first();
    await expect(historyCard).toContainText('Calisthenics & Explosives');
    await expect(historyCard).toContainText('Weighted Dips');
    await expect(historyCard).toContainText('BW × 12');
    await expect(historyCard).toContainText('BW + 20 kg × 8');
    await expect(historyCard).toContainText('Broad Jump');
    await expect(historyCard).toContainText('2.4 m × 3');
    await expect(historyCard).toContainText('Plank');
    await expect(historyCard).toContainText('60s hold');
  });
});
