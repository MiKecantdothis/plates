const { test, expect, stored } = require('./support/fixtures');

test.describe('Run Tracker with Breadcrumb Trail and Goal Alerts', () => {
  test('taskbar contains exactly 3 tabs: Dashboard, Routines, and Run, and switches cleanly', async ({ page }) => {
    await page.goto('/');

    const navButtons = page.locator('#main-nav .nav-btn');
    const buttonIds = await navButtons.evaluateAll((btns) => btns.map((b) => b.id));

    // Must contain exactly Dashboard, Routines, and Run
    expect(buttonIds).toEqual(['nav-btn-dashboard', 'nav-btn-workouts', 'nav-btn-run']);

    // Clicking Run tab opens Run panel
    await page.click('#nav-btn-run');
    await expect(page.locator('#tab-run')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#run-hud-card')).toBeVisible();
    await expect(page.locator('#run-trail-canvas')).toBeVisible();
  });

  test('distance goal selection updates targets and custom distance works', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-run');

    // Default goal is 5K
    await expect(page.locator('.run-goal-btn[data-goal="5"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#run-target-badge')).toHaveText('Target: 5.00 km');
    await expect(page.locator('#run-remaining-label')).toHaveText('5.00 km to go');

    // Click 3K goal
    await page.click('.run-goal-btn[data-goal="3"]');
    await expect(page.locator('.run-goal-btn[data-goal="3"]')).toHaveClass(/\bactive\b/);
    await expect(page.locator('#run-target-badge')).toHaveText('Target: 3.00 km');
    await expect(page.locator('#run-remaining-label')).toHaveText('3.00 km to go');

    // Set custom distance 7.5 km
    await page.fill('#run-custom-goal-input', '7.5');
    await page.click('#btn-set-custom-goal');
    await expect(page.locator('#run-target-badge')).toHaveText('Target: 7.50 km');
    await expect(page.locator('#run-remaining-label')).toHaveText('7.50 km to go');
  });

  test('runs tracking lifecycle: start, track trail, pause, resume, and discard', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-run');

    // Start Run
    await page.click('#btn-start-run');
    await expect(page.locator('#btn-start-run')).toBeHidden();
    await expect(page.locator('#btn-pause-run')).toBeVisible();
    await expect(page.locator('#run-active-indicator')).toBeVisible();

    // Simulate GPS steps
    await page.evaluate(() => {
      window.__simulateRunStep(37.7749, -122.4194, 0);
      window.__simulateRunStep(37.7840, -122.4194, 0); // ~1 km north
    });

    await expect(page.locator('#run-trail-points-count')).toHaveText('2 points');
    const distanceText = await page.locator('#run-distance-val').innerText();
    expect(parseFloat(distanceText)).toBeGreaterThan(0.5);

    // Pause Run
    await page.click('#btn-pause-run');
    await expect(page.locator('#btn-pause-run')).toHaveText('Resume ▶');
    await expect(page.locator('#run-gps-status')).toHaveText('GPS Paused');

    // Resume Run
    await page.click('#btn-pause-run');
    await expect(page.locator('#btn-pause-run')).toHaveText('Pause ⏸');
    await expect(page.locator('#run-gps-status')).toHaveText('GPS Tracking');

    // Discard Run
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#btn-discard-run');

    // Returns to idle state
    await expect(page.locator('#btn-start-run')).toBeVisible();
    await expect(page.locator('#run-distance-val')).toHaveText('0.00');
    await expect(page.locator('#run-active-indicator')).toBeHidden();
  });

  test('reaching distance goal triggers screen celebration overlay and saves to history', async ({ page }) => {
    await page.goto('/');
    await page.click('#nav-btn-run');

    // Set 1K goal for quick completion
    await page.click('.run-goal-btn[data-goal="1"]');
    await expect(page.locator('#run-target-badge')).toHaveText('Target: 1.00 km');

    // Start Run
    await page.click('#btn-start-run');

    // Simulate reaching 1 km (two steps ~1.1 km apart)
    await page.evaluate(() => {
      window.__simulateRunStep(37.7749, -122.4194, 45);
      window.__simulateRunStep(37.7850, -122.4194, 45); // ~1.12 km
    });

    // Screen celebration flash overlay should be visible
    await expect(page.locator('#run-screen-flash')).toBeVisible();
    await expect(page.locator('#run-flash-title')).toHaveText('Goal Completed!');
    await expect(page.locator('#run-flash-goal-text')).toHaveText('1.00 km Finished');

    // Save to history from flash overlay
    await page.click('#btn-save-run-flash');

    // Should switch to history tab and verify entry exists
    await expect(page.locator('#tab-history')).toHaveClass(/\bactive\b/);
    const history = await stored(page, 'plates_history');
    expect(history.length).toBeGreaterThan(0);
    const runItem = history[0];
    expect(runItem.routineName).toBe('1K Run');
    expect(runItem.bodyPart).toBe('Cardio');
    expect(runItem.distance).toBeGreaterThanOrEqual(1.0);

    // Verify history card on screen
    const historyCard = page.locator('.history-card').first();
    await expect(historyCard).toContainText('1K Run');
    await expect(historyCard).toContainText('Cardio');
  });
});

