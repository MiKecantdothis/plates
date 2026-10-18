# Implementation Plan: Stats Dashboard & Landing View

## 1. Overview & Objectives
Build a high-impact, visual **Dashboard / Landing View** for Plates that greets users with their training momentum, key performance indicators (KPIs), weekly consistency streak, and lifetime volume lifted. This serves as the primary home screen of the app.

---

## 2. Core Dashboard Components & Wireframe

### A. Quick Start Hero Card
- Dynamic greeting based on time of day ("Good morning, Mike" / "Ready to train?").
- Most recent routine one-tap quick start button (`"Start Push Day ▶"`).
- Real-time indicator if an active workout is currently paused or in progress.

### B. 7-Day Consistency Strip & Streak Counter
- Horizontal Monday–Sunday status indicators highlighting days completed this week.
- Dynamic Streak Counter: Computes current workout streak in days/weeks.
- Visual completion rate (e.g., `4 of 5 weekly workouts completed · 80%`).

### C. Big Metric KPI Grid
Four luxury glassmorphism cards with subtle electric-blue accent borders:
1. **Total Volume Moved**: Lifetime lbs (or current month lbs).
2. **Workouts Completed**: Total number of finished sessions.
3. **Total Time Trained**: Accumulated training hours and minutes.
4. **Average Session Length**: e.g., `52 mins`.

### D. Personal Records (PR) Spotlight
- Auto-extract the maximum single-set weight achieved across compound movements:
  - Barbell Bench Press
  - Squat
  - Deadlift
  - Overhead Press
- Displays date achieved and weight increase badge when a new PR is set.

### E. Micro-Charts (Pure SVG)
- **7-Day Volume Sparkline**: Pure SVG vector bar chart showing volume trends without heavy external dependencies.
- **Muscle Focus Distribution**: Percentage breakdown of Push vs Pull vs Legs vs Other based on routine tags.

---

## 3. Technical Architecture & File Updates

1. **`index.html`**:
   - Add a new primary navigation tab button: `Dashboard` (with a dashboard outline vector SVG icon).
   - Create `<section id="tab-dashboard" class="tab-panel active">` containing:
     - Hero card (`#dashboard-hero`)
     - Weekly streak row (`#dashboard-streak`)
     - KPI grid (`#dashboard-kpi-grid`)
     - PR spotlight table (`#dashboard-pr-list`)
     - Recent session cards preview

2. **`index.css`**:
   - Layout grid rules for `.dashboard-kpi-grid` (responsive 2x2 on desktop, vertical stacked or 2-col on mobile).
   - `.streak-dot-row` with active blue pulse styling for completed training days.
   - `.pr-badge` styling with outline trophy accent.
   - SVG sparkline and progress ring animations.

3. **`app.js`**:
   - Create `calculateDashboardStats()`:
     - `computeStreak(history)`: Evaluates consecutive workout days or calendar weeks.
     - `computeVolumeMetrics(history)`: Computes total volume, weekly volume, and rolling averages.
     - `extractPersonalRecords(history)`: Traverses all exercises to find peak weights.
   - Implement `renderDashboard()` to populate all metrics on app load and immediately upon workout completion.

4. **`sw.js`**:
   - Bump cache version to invalidate old bundle.

---

## 4. Edge Cases & Handling
- **New User / Empty State**: Friendly zero-state prompt ("Log your first workout to unlock training stats & PR tracking") rather than blank zeroes.
- **Unit Conversions**: Ensure calculation accounts for user preferences (lbs vs kg).
- **Performance**: Compute stats efficiently in a single pass over the `history` array to avoid UI lag.

---

## 5. Verification & Test Plan
- Verify calculations with 0, 1, and 50+ history entries.
- Verify streak logic across month boundaries and leap years.
- Verify PR detection updates dynamically as soon as a heavier set is finished.
- Responsive mobile testing (iPhone portrait viewports: 375px–430px).
