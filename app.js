/* ============================================
   Plates — Guided Workout & Rest Flow
   ============================================ */

(() => {
  'use strict';

  // ── Constants & Configuration ──
  const MAX_ROUTINES = 12;

  // Rest periods per training goal (in seconds)
  const REST_CONFIG = {
    strength:     { label: 'Build Strength',  rest: 180, tip: '3 min rest for complete ATP recovery' },
    hypertrophy:  { label: 'Hypertrophy',     rest: 90,  tip: '90s rest to maximize muscle growth' },
    endurance:    { label: 'Endurance',        rest: 45,  tip: '45s rest to sustain heart rate & stamina' },
    'weight-loss':{ label: 'Weight Loss',      rest: 30,  tip: '30s rest to maximize metabolic burn' },
    hiit:         { label: 'HIIT',             rest: 20,  tip: '20s rest for intense intervals' },
    powerlifting: { label: 'Powerlifting',     rest: 300, tip: '5 min rest for maximum neural readiness' },
  };

  const CATEGORY_LABELS = {
    protein:      '🥩 Protein',
    supplements:  '💊 Supplements',
    carbs:        '🍚 Carbs',
    'fruits-veg': '🥦 Fruits & Veg',
    dairy:        '🥛 Dairy',
    other:        '📦 Other',
  };

  // Default seed routines if the user has none yet
  const DEFAULT_ROUTINES = [
    {
      id: 'default-push',
      name: 'Push Day (Chest & Triceps)',
      exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Shoulder Press', 'Cable Tricep Pushdown'],
      defaultSets: 3,
    },
    {
      id: 'default-pull',
      name: 'Pull Day (Back & Biceps)',
      exercises: ['Conventional Deadlift', 'Wide-Grip Lat Pulldown', 'Bent-Over Barbell Row', 'Incline Dumbbell Curl'],
      defaultSets: 3,
    },
    {
      id: 'default-legs',
      name: 'Leg Day (Quads & Hamstrings)',
      exercises: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press Machine', 'Standing Calf Raises'],
      defaultSets: 3,
    },
  ];

  // ── State Management ──
  let routines     = loadJSON('plates_routines', null);
  if (!routines || routines.length === 0) {
    routines = DEFAULT_ROUTINES;
    saveJSON('plates_routines', routines);
  }

  let history      = loadJSON('plates_history', []);
  let shoppingList = loadJSON('plates_shopping', []);
  let currentGoal  = localStorage.getItem('plates_goal') || 'strength';
  let currentTheme = localStorage.getItem('plates_theme') || 'dark';
  let editingRoutineId = null;

  // Active workout session state (persists across page reloads!)
  let activeSession = loadJSON('plates_active_session', null);
  let sessionTimerInterval = null;
  let restTimerInterval = null;

  // ── DOM References ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Global Header
  const goalSelect         = $('#goal-select');
  const btnThemeToggle     = $('#theme-toggle');
  const metaThemeColor     = $('#meta-theme-color');

  // Navigation
  const navBtnWorkouts     = $('#nav-btn-workouts');
  const navBtnActive       = $('#nav-btn-active');
  const navBtnHistory      = $('#nav-btn-history');
  const navBtnShopping     = $('#nav-btn-shopping');
  const activeIndicator    = $('#active-indicator');

  // Routines Tab
  const routinesGrid       = $('#routines-grid');
  const btnAddRoutine      = $('#btn-add-routine');
  const sessionBanner      = $('#session-banner');
  const bannerRoutineName  = $('#banner-routine-name');
  const bannerElapsed      = $('#banner-elapsed');
  const btnResumeSession   = $('#btn-resume-session');

  // Active Guided Session Tab
  const activeEmptyState   = $('#active-empty-state');
  const activeWorkoutView  = $('#active-workout-view');
  const btnGotoRoutines    = $('#btn-goto-routines');
  const activeRoutineBadge = $('#active-routine-badge');
  const activeElapsedTimer = $('#active-elapsed-timer');
  const btnFinishWorkout   = $('#btn-finish-workout');
  const btnCancelWorkout   = $('#btn-cancel-workout');
  const exerciseStepper    = $('#exercise-stepper');
  const activeStepLabel    = $('#active-step-label');
  const activeExerciseName = $('#active-exercise-name');
  const activeSetCounter   = $('#active-set-counter');
  const setIndicatorDots   = $('#set-indicator-dots');

  // Contextual Between-Set Rest Panel
  const activeRestPanel    = $('#active-rest-panel');
  const restGoalLabel      = $('#rest-goal-label');
  const restDigits         = $('#rest-digits');
  const restNextHint       = $('#rest-next-hint');
  const btnRestMinus       = $('#btn-rest-minus');
  const btnRestPlus        = $('#btn-rest-plus');
  const btnRestSkip        = $('#btn-rest-skip');

  // Set Logger Form
  const setWeightInput     = $('#set-weight-input');
  const setRepsInput       = $('#set-reps-input');
  const btnWeightMinus     = $('#btn-weight-minus');
  const btnWeightPlus      = $('#btn-weight-plus');
  const btnWeightPlus10    = $('#btn-weight-plus10');
  const btnRepsMinus       = $('#btn-reps-minus');
  const btnRepsPlus        = $('#btn-reps-plus');
  const btnCompleteSet     = $('#btn-complete-set');
  const exerciseSetsList   = $('#exercise-sets-list');
  const btnAddExtraSet     = $('#btn-add-extra-set');
  const btnPrevExercise    = $('#btn-prev-exercise');
  const btnNextExercise    = $('#btn-next-exercise');

  // History Tab
  const historyList        = $('#history-list');
  const btnClearHistory    = $('#btn-clear-history');

  // Shopping Tab
  const shoppingInput      = $('#shopping-input');
  const shoppingCategory   = $('#shopping-category');
  const btnAddShopping     = $('#btn-add-shopping');
  const shoppingListEl     = $('#shopping-list');

  // Routine Modal
  const modalRoutine       = $('#modal-routine');
  const modalRoutineTitle  = $('#modal-routine-title');
  const routineNameInput   = $('#routine-name');
  const exerciseList       = $('#exercise-list');
  const btnAddExercise     = $('#btn-add-exercise');
  const btnSaveRoutine     = $('#btn-save-routine');
  const btnCancelRoutine   = $('#btn-cancel-routine');

  // Workout Complete Celebration Modal
  const modalComplete      = $('#modal-workout-complete');
  const completeRoutineName= $('#complete-routine-name');
  const completeDuration   = $('#complete-duration');
  const completeVolume     = $('#complete-volume');
  const completeSets       = $('#complete-sets');
  const completeExercises  = $('#complete-exercises-summary');
  const btnCloseComplete   = $('#btn-close-complete');

  // ── Helper Utilities ──
  function loadJSON(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data !== null ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2400);
  }

  // Synthesised Web Audio Gym Chimes (no external files needed, 100% offline!)
  function playSetChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }

  function playRestEndChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Two crisp bell chimes
      [0, 0.16].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 659.25 : 880, ctx.currentTime + delay); // E5 -> A5
        gain.gain.setValueAtTime(0.28, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.32);
      });
    } catch {}
  }

  // ── Tab Navigation ──
  function switchTab(tabName) {
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    if (tabName === 'active') {
      renderActiveWorkoutView();
    }
  }

  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if (btnGotoRoutines) {
    btnGotoRoutines.addEventListener('click', () => switchTab('workouts'));
  }
  if (btnResumeSession) {
    btnResumeSession.addEventListener('click', () => switchTab('active'));
  }

  // ── Theme Management ──
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('plates_theme', theme);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#f5f7fb' : '#090b0e');
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const next = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      toast(next === 'light' ? '☀️ Light mode active' : '🌙 Dark mode active');
    });
  }

  // ── Goal Management ──
  goalSelect.value = currentGoal;
  goalSelect.addEventListener('change', () => {
    currentGoal = goalSelect.value;
    localStorage.setItem('plates_goal', currentGoal);
    const cfg = REST_CONFIG[currentGoal];
    toast(`Goal set: ${cfg.label} (${cfg.rest}s rest)`);
    if (restGoalLabel) {
      restGoalLabel.textContent = `${cfg.label} (${cfg.rest}s)`;
    }
  });

  // ══════════════════════════════════════════
  //  ROUTINES MANAGEMENT
  // ══════════════════════════════════════════

  function renderRoutines() {
    // Render top resume banner if a session is currently running
    if (activeSession) {
      sessionBanner.hidden = false;
      bannerRoutineName.textContent = `Active: ${activeSession.routineName}`;
      bannerElapsed.textContent = `⏱️ ${fmtTime(activeSession.elapsedSeconds)} elapsed`;
      activeIndicator.hidden = false;
    } else {
      sessionBanner.hidden = true;
      activeIndicator.hidden = true;
    }

    if (!routines || routines.length === 0) {
      routinesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1">
          <svg class="empty-state-plate" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="16.5" stroke="currentColor" stroke-width="2.2" class="plate-outer"/>
            <circle cx="18" cy="18" r="14" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.45"/>
            <circle cx="18" cy="18" r="11" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>
            <circle cx="18" cy="18" r="6" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6" class="plate-hub"/>
            <circle cx="18" cy="18" r="3.2" fill="var(--bg-base)" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="18" cy="13.2" r="0.9" fill="currentColor" opacity="0.8"/>
            <circle cx="18" cy="22.8" r="0.9" fill="currentColor" opacity="0.8"/>
            <circle cx="13.2" cy="18" r="0.9" fill="currentColor" opacity="0.8"/>
            <circle cx="22.8" cy="18" r="0.9" fill="currentColor" opacity="0.8"/>
          </svg>
          <p class="empty-state-text">No routines created yet.<br>Tap <strong>+ Add Routine</strong> to build your workout.</p>
        </div>`;
      return;
    }

    routinesGrid.innerHTML = routines.map(r => `
      <div class="routine-card" data-id="${r.id}">
        <div class="routine-card-header">
          <span class="routine-card-title">${esc(r.name)}</span>
          <div class="routine-card-actions">
            <button class="btn-icon" data-action="edit" data-id="${r.id}" title="Edit routine">✏️</button>
            <button class="btn-icon danger" data-action="delete" data-id="${r.id}" title="Delete routine">🗑️</button>
          </div>
        </div>

        <ul class="routine-card-exercises">
          ${r.exercises.slice(0, 4).map(e => `<li>${esc(e)}</li>`).join('')}
          ${r.exercises.length > 4 ? `<li style="color:var(--text-muted)">+${r.exercises.length - 4} more</li>` : ''}
        </ul>

        <div class="routine-card-actions-row">
          <span class="routine-count">${r.exercises.length} exercise${r.exercises.length !== 1 ? 's' : ''}</span>
          <button class="btn-primary btn-start-workout" data-action="start" data-id="${r.id}">
            Start Workout ▶
          </button>
        </div>
      </div>
    `).join('');

    // Wire Start Workout buttons
    routinesGrid.querySelectorAll('[data-action="start"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startGuidedWorkout(btn.dataset.id);
      });
    });

    // Wire Card Click (also starts workout)
    routinesGrid.querySelectorAll('.routine-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        startGuidedWorkout(card.dataset.id);
      });
    });

    // Wire Edit & Delete
    routinesGrid.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRoutineModal(btn.dataset.id);
      });
    });

    routinesGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this routine?')) return;
        routines = routines.filter(r => r.id !== btn.dataset.id);
        saveJSON('plates_routines', routines);
        renderRoutines();
        toast('Routine deleted');
      });
    });
  }

  // ── Routine Modal Handlers ──
  btnAddRoutine.addEventListener('click', () => {
    if (routines.length >= MAX_ROUTINES) {
      toast(`Max limit of ${MAX_ROUTINES} routines reached.`);
      return;
    }
    openRoutineModal(null);
  });

  function openRoutineModal(id) {
    editingRoutineId = id;
    const routine = id ? routines.find(r => r.id === id) : null;
    modalRoutineTitle.textContent = routine ? 'Edit Routine' : 'Add Routine';
    routineNameInput.value = routine ? routine.name : '';
    exerciseList.innerHTML = '';

    const list = routine ? routine.exercises : ['', ''];
    list.forEach(ex => addExerciseInputRow(ex));

    modalRoutine.hidden = false;
    routineNameInput.focus();
  }

  function addExerciseInputRow(value = '') {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
      <input type="text" placeholder="Exercise name (e.g. Incline Bench Press)" value="${esc(value)}" maxlength="50" />
      <button type="button" class="btn-icon danger" title="Remove">✕</button>
    `;
    row.querySelector('.btn-icon').addEventListener('click', () => row.remove());
    exerciseList.appendChild(row);
  }

  btnAddExercise.addEventListener('click', () => {
    addExerciseInputRow();
    const inputs = exerciseList.querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  });

  btnSaveRoutine.addEventListener('click', () => {
    const name = routineNameInput.value.trim();
    if (!name) { toast('Enter a routine name'); return; }

    const exercises = [...exerciseList.querySelectorAll('input')]
      .map(i => i.value.trim())
      .filter(Boolean);

    if (exercises.length === 0) { toast('Add at least one exercise'); return; }

    if (editingRoutineId) {
      const r = routines.find(r => r.id === editingRoutineId);
      if (r) {
        r.name = name;
        r.exercises = exercises;
      }
    } else {
      routines.push({
        id: uid(),
        name,
        exercises,
        defaultSets: 3,
      });
    }

    saveJSON('plates_routines', routines);
    modalRoutine.hidden = true;
    renderRoutines();
    toast(editingRoutineId ? 'Routine updated' : 'Routine added');
  });

  btnCancelRoutine.addEventListener('click', () => { modalRoutine.hidden = true; });
  modalRoutine.addEventListener('click', (e) => { if (e.target === modalRoutine) modalRoutine.hidden = true; });

  // ══════════════════════════════════════════
  //  ACTIVE GUIDED WORKOUT ENGINE
  // ══════════════════════════════════════════

  function startGuidedWorkout(routineId) {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    // Check if an existing session is in progress
    if (activeSession && activeSession.routineId !== routineId) {
      if (!confirm(`You already have an active workout for "${activeSession.routineName}". Start a new one instead?`)) {
        switchTab('active');
        return;
      }
      discardSession();
    }

    // Initialize fresh active session
    activeSession = {
      routineId: routine.id,
      routineName: routine.name,
      startTime: Date.now(),
      elapsedSeconds: 0,
      currentExerciseIndex: 0,
      exercises: routine.exercises.map(exName => ({
        name: exName,
        targetSets: routine.defaultSets || 3,
        sets: [],
      })),
      rest: {
        active: false,
        remain: 0,
        total: 0,
      },
    };

    saveJSON('plates_active_session', activeSession);
    startSessionTimer();
    renderRoutines();
    switchTab('active');
    toast(`Workout started: ${routine.name} 💪`);
  }

  function startSessionTimer() {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(() => {
      if (!activeSession) return;
      activeSession.elapsedSeconds++;
      activeElapsedTimer.textContent = `⏱️ ${fmtTime(activeSession.elapsedSeconds)}`;
      bannerElapsed.textContent = `⏱️ ${fmtTime(activeSession.elapsedSeconds)} elapsed`;
      // Auto-save every 15s
      if (activeSession.elapsedSeconds % 15 === 0) {
        saveJSON('plates_active_session', activeSession);
      }
    }, 1000);
  }

  function renderActiveWorkoutView() {
    if (!activeSession) {
      activeEmptyState.hidden = false;
      activeWorkoutView.hidden = true;
      activeIndicator.hidden = true;
      return;
    }

    activeEmptyState.hidden = true;
    activeWorkoutView.hidden = false;
    activeIndicator.hidden = false;

    // Routine Badge & Elapsed Timer
    activeRoutineBadge.textContent = activeSession.routineName;
    activeElapsedTimer.textContent = `⏱️ ${fmtTime(activeSession.elapsedSeconds)}`;

    const currentEx = activeSession.exercises[activeSession.currentExerciseIndex];
    if (!currentEx) return;

    // Stepper Pills (Exercise List Navigation)
    exerciseStepper.innerHTML = activeSession.exercises.map((ex, idx) => {
      const isCurrent = idx === activeSession.currentExerciseIndex;
      const isDone = ex.sets.length >= ex.targetSets && ex.sets.length > 0;
      return `
        <button class="stepper-pill ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}" data-idx="${idx}">
          <span class="stepper-pill-idx">${idx + 1}.</span>
          <span>${esc(ex.name)}</span>
          ${isDone ? '<span>✓</span>' : ''}
        </button>
      `;
    }).join('');

    exerciseStepper.querySelectorAll('.stepper-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeSession.currentExerciseIndex = parseInt(pill.dataset.idx, 10);
        saveJSON('plates_active_session', activeSession);
        renderActiveWorkoutView();
      });
    });

    // Current Exercise Card Details
    activeStepLabel.textContent = `Exercise ${activeSession.currentExerciseIndex + 1} of ${activeSession.exercises.length}`;
    activeExerciseName.textContent = currentEx.name;

    const currentSetNum = currentEx.sets.length + 1;
    const isOverTarget = currentSetNum > currentEx.targetSets;
    activeSetCounter.textContent = isOverTarget
      ? `Extra Set ${currentSetNum}`
      : `Set ${currentSetNum} of ${currentEx.targetSets}`;

    // Set Indicator Progress Dots
    const totalDots = Math.max(currentEx.targetSets, currentEx.sets.length);
    setIndicatorDots.innerHTML = Array.from({ length: totalDots }).map((_, i) => {
      const isCompleted = i < currentEx.sets.length;
      const isNow = i === currentEx.sets.length;
      return `<div class="set-dot ${isCompleted ? 'completed' : isNow ? 'active' : ''}"></div>`;
    }).join('');

    // Pre-fill inputs from previous set or reasonable defaults
    const prevSet = currentEx.sets[currentEx.sets.length - 1];
    if (prevSet) {
      setWeightInput.value = prevSet.weight;
      setRepsInput.value = prevSet.reps;
    } else {
      // Look for previous exercise weight or default
      if (!setWeightInput.value) setWeightInput.value = 135;
      if (!setRepsInput.value) setRepsInput.value = 10;
    }

    // Render sets logged for this exercise today
    if (currentEx.sets.length === 0) {
      exerciseSetsList.innerHTML = `<div style="color:var(--text-muted); font-size:13px">No sets completed yet. Ready for Set 1!</div>`;
    } else {
      exerciseSetsList.innerHTML = currentEx.sets.map((s, idx) => `
        <div class="set-record-row">
          <span class="set-record-num">Set ${idx + 1}</span>
          <span class="set-record-detail"><strong>${s.weight} lbs</strong> × ${s.reps} reps</span>
          <div style="display:flex; align-items:center; gap:8px">
            <span class="set-record-check">✓</span>
            <button class="set-record-del" data-set-idx="${idx}" title="Delete set">✕</button>
          </div>
        </div>
      `).join('');

      exerciseSetsList.querySelectorAll('.set-record-del').forEach(delBtn => {
        delBtn.addEventListener('click', () => {
          const sIdx = parseInt(delBtn.dataset.setIdx, 10);
          currentEx.sets.splice(sIdx, 1);
          saveJSON('plates_active_session', activeSession);
          renderActiveWorkoutView();
        });
      });
    }

    // Previous / Next Exercise Buttons
    btnPrevExercise.disabled = activeSession.currentExerciseIndex === 0;
    btnNextExercise.textContent = activeSession.currentExerciseIndex === activeSession.exercises.length - 1
      ? 'Finish Workout 🏆'
      : 'Next Exercise ▶';

    // If rest is currently running, keep it visible
    if (activeSession.rest && activeSession.rest.active) {
      showRestPanel();
    } else {
      activeRestPanel.hidden = true;
    }
  }

  // ── Set Logger Stepper Adjustments ──
  btnWeightMinus.addEventListener('click', () => {
    const val = Math.max(0, (parseFloat(setWeightInput.value) || 0) - 5);
    setWeightInput.value = val;
  });

  btnWeightPlus.addEventListener('click', () => {
    const val = (parseFloat(setWeightInput.value) || 0) + 5;
    setWeightInput.value = val;
  });

  btnWeightPlus10.addEventListener('click', () => {
    const val = (parseFloat(setWeightInput.value) || 0) + 10;
    setWeightInput.value = val;
  });

  btnRepsMinus.addEventListener('click', () => {
    const val = Math.max(1, (parseInt(setRepsInput.value, 10) || 1) - 1);
    setRepsInput.value = val;
  });

  btnRepsPlus.addEventListener('click', () => {
    const val = (parseInt(setRepsInput.value, 10) || 0) + 1;
    setRepsInput.value = val;
  });

  // ── Logging a Set & Triggering Contextual Rest ──
  btnCompleteSet.addEventListener('click', logCurrentSet);
  setRepsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') logCurrentSet(); });
  setWeightInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') logCurrentSet(); });

  function logCurrentSet() {
    if (!activeSession) return;
    const currentEx = activeSession.exercises[activeSession.currentExerciseIndex];
    if (!currentEx) return;

    const weight = parseFloat(setWeightInput.value) || 0;
    const reps   = parseInt(setRepsInput.value, 10) || 0;

    if (reps <= 0) {
      toast('Please enter at least 1 rep');
      setRepsInput.focus();
      return;
    }

    // Log the set
    currentEx.sets.push({
      weight,
      reps,
      timestamp: Date.now(),
    });

    // Tactile & Audio feedback
    playSetChime();
    if (navigator.vibrate) navigator.vibrate([80]);

    toast(`Set ${currentEx.sets.length} logged: ${weight} lbs × ${reps} reps!`);

    // Determine recommended rest time for current goal
    const goalCfg = REST_CONFIG[currentGoal] || REST_CONFIG.strength;
    const restSeconds = goalCfg.rest;

    // Start contextual rest timer between sets!
    startRestTimer(restSeconds);

    saveJSON('plates_active_session', activeSession);
    renderActiveWorkoutView();
  }

  // ── Contextual Rest Timer Engine ──
  function startRestTimer(seconds) {
    if (!activeSession) return;

    activeSession.rest = {
      active: true,
      remain: seconds,
      total: seconds,
    };

    showRestPanel();

    clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
      if (!activeSession || !activeSession.rest || !activeSession.rest.active) {
        clearInterval(restTimerInterval);
        return;
      }

      activeSession.rest.remain--;
      restDigits.textContent = fmtTime(activeSession.rest.remain);

      if (activeSession.rest.remain <= 0) {
        clearInterval(restTimerInterval);
        activeSession.rest.active = false;
        activeRestPanel.hidden = true;
        saveJSON('plates_active_session', activeSession);

        // Completion chime & haptic
        playRestEndChime();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        toast('⏱️ Rest complete — Time to lift!');

        // Check if all sets for this exercise are done
        const currentEx = activeSession.exercises[activeSession.currentExerciseIndex];
        if (currentEx && currentEx.sets.length >= currentEx.targetSets) {
          if (activeSession.currentExerciseIndex < activeSession.exercises.length - 1) {
            // Auto advance hint
            toast(`Great work on ${currentEx.name}! Moving to next exercise.`);
            activeSession.currentExerciseIndex++;
            saveJSON('plates_active_session', activeSession);
            renderActiveWorkoutView();
          }
        }
      }
    }, 1000);
  }

  function showRestPanel() {
    activeRestPanel.hidden = false;
    const cfg = REST_CONFIG[currentGoal] || REST_CONFIG.strength;
    restGoalLabel.textContent = `${cfg.label} (${cfg.rest}s)`;
    restDigits.textContent = fmtTime(activeSession.rest.remain);

    const currentEx = activeSession.exercises[activeSession.currentExerciseIndex];
    const nextSetNum = currentEx ? currentEx.sets.length + 1 : 1;
    restNextHint.textContent = `Up Next: Set ${nextSetNum} of ${currentEx ? currentEx.name : ''}`;
  }

  btnRestPlus.addEventListener('click', () => {
    if (activeSession && activeSession.rest && activeSession.rest.active) {
      activeSession.rest.remain += 30;
      restDigits.textContent = fmtTime(activeSession.rest.remain);
      toast('+30s rest added');
    }
  });

  btnRestMinus.addEventListener('click', () => {
    if (activeSession && activeSession.rest && activeSession.rest.active) {
      activeSession.rest.remain = Math.max(0, activeSession.rest.remain - 15);
      restDigits.textContent = fmtTime(activeSession.rest.remain);
    }
  });

  btnRestSkip.addEventListener('click', () => {
    if (activeSession && activeSession.rest) {
      activeSession.rest.active = false;
      clearInterval(restTimerInterval);
      activeRestPanel.hidden = true;
      saveJSON('plates_active_session', activeSession);
      toast('Rest skipped — let\'s lift! 💪');
      setRepsInput.focus();
    }
  });

  // ── Exercise Navigation Controls ──
  btnAddExtraSet.addEventListener('click', () => {
    if (!activeSession) return;
    const currentEx = activeSession.exercises[activeSession.currentExerciseIndex];
    if (currentEx) {
      currentEx.targetSets++;
      saveJSON('plates_active_session', activeSession);
      renderActiveWorkoutView();
      toast(`Added extra set! Total: ${currentEx.targetSets}`);
    }
  });

  btnPrevExercise.addEventListener('click', () => {
    if (!activeSession || activeSession.currentExerciseIndex === 0) return;
    activeSession.currentExerciseIndex--;
    saveJSON('plates_active_session', activeSession);
    renderActiveWorkoutView();
  });

  btnNextExercise.addEventListener('click', () => {
    if (!activeSession) return;
    if (activeSession.currentExerciseIndex === activeSession.exercises.length - 1) {
      finishWorkoutSession();
    } else {
      activeSession.currentExerciseIndex++;
      saveJSON('plates_active_session', activeSession);
      renderActiveWorkoutView();
    }
  });

  // ── Cancel / Discard Session ──
  btnCancelWorkout.addEventListener('click', () => {
    if (confirm('Discard this workout session? Any uncompleted sets will be lost.')) {
      discardSession();
      renderRoutines();
      switchTab('workouts');
      toast('Workout discarded');
    }
  });

  function discardSession() {
    clearInterval(sessionTimerInterval);
    clearInterval(restTimerInterval);
    activeSession = null;
    localStorage.removeItem('plates_active_session');
    activeIndicator.hidden = true;
    sessionBanner.hidden = true;
  }

  // ── Finish Workout & Celebration ──
  btnFinishWorkout.addEventListener('click', finishWorkoutSession);

  function finishWorkoutSession() {
    if (!activeSession) return;

    // Calculate total sets logged
    let totalSets = 0;
    let totalVolume = 0;
    const loggedExercises = [];

    activeSession.exercises.forEach(ex => {
      if (ex.sets.length > 0) {
        totalSets += ex.sets.length;
        ex.sets.forEach(s => {
          totalVolume += (s.weight * s.reps);
        });
        loggedExercises.push({
          name: ex.name,
          sets: ex.sets,
        });
      }
    });

    if (totalSets === 0) {
      toast('Log at least one set before finishing');
      return;
    }

    // Create history entry
    const historyEntry = {
      id: uid(),
      routineId: activeSession.routineId,
      routineName: activeSession.routineName,
      date: new Date().toISOString(),
      durationSeconds: activeSession.elapsedSeconds,
      totalVolume,
      totalSets,
      goal: currentGoal,
      exercises: loggedExercises,
    };

    history.unshift(historyEntry);
    saveJSON('plates_history', history);

    // Populate Celebration Modal
    const durationMin = Math.round(activeSession.elapsedSeconds / 60);
    completeRoutineName.textContent = activeSession.routineName;
    completeDuration.textContent = `${durationMin}m`;
    completeVolume.textContent = `${totalVolume.toLocaleString()} lbs`;
    completeSets.textContent = totalSets;

    completeExercises.innerHTML = loggedExercises.map(ex => `
      <div class="completed-summary-item">
        <strong>${esc(ex.name)}</strong>
        <span>${ex.sets.length} sets (${ex.sets.map(s => `${s.weight}×${s.reps}`).join(', ')})</span>
      </div>
    `).join('');

    modalComplete.hidden = false;

    // Play celebration audio & haptic
    playRestEndChime();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    // Clean up active session
    discardSession();
    renderRoutines();
    renderHistory();
  }

  btnCloseComplete.addEventListener('click', () => {
    modalComplete.hidden = true;
    switchTab('history');
  });

  // ══════════════════════════════════════════
  //  WORKOUT HISTORY
  // ══════════════════════════════════════════

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p class="empty-state-text">No workouts logged yet.<br>Choose a routine to start your first session.</p>
        </div>`;
      return;
    }

    historyList.innerHTML = history.map(entry => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const durationStr = entry.durationSeconds ? ` · ⏱️ ${Math.round(entry.durationSeconds / 60)} min` : '';
      const volumeStr = entry.totalVolume ? ` · 🏋️ ${entry.totalVolume.toLocaleString()} lbs volume` : '';

      return `
        <div class="history-card">
          <div class="history-date">${dateStr} · ${timeStr}${durationStr}${volumeStr}</div>
          <div class="history-routine-name">${esc(entry.routineName)}</div>
          <div class="history-exercises">
            ${entry.exercises.map(ex => `
              <div class="history-exercise">
                <span class="history-exercise-name">${esc(ex.name)}</span>
                <span>${ex.sets.map(s => `${s.weight} lbs × ${s.reps}`).join(' · ')}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  btnClearHistory.addEventListener('click', () => {
    if (!confirm('Clear all workout history? This cannot be undone.')) return;
    history = [];
    saveJSON('plates_history', history);
    renderHistory();
    toast('History cleared');
  });

  // ══════════════════════════════════════════
  //  SHOPPING LIST
  // ══════════════════════════════════════════

  function renderShopping() {
    if (shoppingList.length === 0) {
      shoppingListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <p class="empty-state-text">Your shopping list is empty.<br>Add supplements, protein, and meals above.</p>
        </div>`;
      return;
    }

    const groups = {};
    shoppingList.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    const categoryOrder = ['protein', 'supplements', 'carbs', 'fruits-veg', 'dairy', 'other'];
    shoppingListEl.innerHTML = categoryOrder
      .filter(cat => groups[cat])
      .map(cat => `
        <div class="shopping-category-group">
          <h3>${CATEGORY_LABELS[cat] || cat}</h3>
          ${groups[cat].map(item => `
            <div class="shopping-item ${item.checked ? 'checked' : ''}" data-id="${item.id}">
              <div class="shopping-checkbox ${item.checked ? 'checked' : ''}" data-id="${item.id}"></div>
              <span class="shopping-item-name">${esc(item.name)}</span>
              <button class="shopping-item-delete" data-id="${item.id}" title="Remove item">✕</button>
            </div>
          `).join('')}
        </div>
      `).join('');

    shoppingListEl.querySelectorAll('.shopping-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const item = shoppingList.find(i => i.id === cb.dataset.id);
        if (item) {
          item.checked = !item.checked;
          saveJSON('plates_shopping', shoppingList);
          renderShopping();
        }
      });
    });

    shoppingListEl.querySelectorAll('.shopping-item-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        shoppingList = shoppingList.filter(i => i.id !== btn.dataset.id);
        saveJSON('plates_shopping', shoppingList);
        renderShopping();
      });
    });
  }

  btnAddShopping.addEventListener('click', addShoppingItem);
  shoppingInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addShoppingItem(); });

  function addShoppingItem() {
    const name = shoppingInput.value.trim();
    if (!name) return;
    shoppingList.push({
      id: uid(),
      name,
      category: shoppingCategory.value,
      checked: false,
    });
    saveJSON('plates_shopping', shoppingList);
    shoppingInput.value = '';
    renderShopping();
    toast('Item added');
  }

  // ══════════════════════════════════════════
  //  APP INITIALIZATION
  // ══════════════════════════════════════════
  applyTheme(currentTheme);
  renderRoutines();
  renderHistory();
  renderShopping();

  // If a session was already in progress, resume timer and state
  if (activeSession) {
    startSessionTimer();
    renderActiveWorkoutView();
  }

})();
