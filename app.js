/* ============================================
   Plates — Application Logic
   ============================================ */

(() => {
  'use strict';

  // ── Constants ──
  const MAX_ROUTINES = 12;

  // Rest recommendations per goal (in seconds)
  const REST_CONFIG = {
    strength:     { label: 'Build Strength',  rest: [180, 240, 300], recommended: 180, tip: '3–5 min rest to fully recover ATP for heavy lifts' },
    hypertrophy:  { label: 'Hypertrophy',     rest: [60, 90, 120],   recommended: 90,  tip: '60–120s rest to maintain metabolic stress for growth' },
    endurance:    { label: 'Endurance',        rest: [30, 45, 60],    recommended: 45,  tip: '30–60s rest to keep heart rate elevated' },
    'weight-loss':{ label: 'Weight Loss',      rest: [30, 45, 60],    recommended: 30,  tip: '30–60s rest to maximise calorie burn & EPOC' },
    hiit:         { label: 'HIIT',             rest: [15, 20, 30],    recommended: 20,  tip: '15–30s rest for maximum intensity intervals' },
    powerlifting: { label: 'Powerlifting',     rest: [180, 300, 420], recommended: 300, tip: '3–7 min rest for full neural & ATP recovery' },
  };

  const CATEGORY_LABELS = {
    protein:      '🥩 Protein',
    supplements:  '💊 Supplements',
    carbs:        '🍚 Carbs',
    'fruits-veg': '🥦 Fruits & Veg',
    dairy:        '🥛 Dairy',
    other:        '📦 Other',
  };

  // ── State ──
  let routines     = loadJSON('plates_routines', []);
  let history      = loadJSON('plates_history', []);
  let shoppingList = loadJSON('plates_shopping', []);
  let currentGoal  = localStorage.getItem('plates_goal') || 'strength';
  let currentTheme = localStorage.getItem('plates_theme') || 'dark';
  let editingRoutineId = null;

  // Timer state
  let timerTotal   = 0;
  let timerRemain  = 0;
  let timerInterval = null;
  let timerRunning = false;

  // ── DOM Refs ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const goalSelect       = $('#goal-select');
  const btnThemeToggle   = $('#theme-toggle');
  const metaThemeColor   = $('#meta-theme-color');
  const routinesGrid     = $('#routines-grid');
  const btnAddRoutine    = $('#btn-add-routine');
  const modalRoutine     = $('#modal-routine');
  const modalRoutineTitle= $('#modal-routine-title');
  const routineNameInput = $('#routine-name');
  const exerciseList     = $('#exercise-list');
  const btnAddExercise   = $('#btn-add-exercise');
  const btnSaveRoutine   = $('#btn-save-routine');
  const btnCancelRoutine = $('#btn-cancel-routine');
  const modalLog         = $('#modal-log');
  const modalLogTitle    = $('#modal-log-title');
  const logExercises     = $('#log-exercises');
  const btnSaveLog       = $('#btn-save-log');
  const btnCancelLog     = $('#btn-cancel-log');
  const timerDigits      = $('#timer-digits');
  const timerRingProgress= $('#timer-ring-progress');
  const timerPresets     = $('#timer-presets');
  const btnTimerStart    = $('#btn-timer-start');
  const btnTimerReset    = $('#btn-timer-reset');
  const restRecommend    = $('#rest-recommendation');
  const historyList      = $('#history-list');
  const btnClearHistory  = $('#btn-clear-history');
  const shoppingInput    = $('#shopping-input');
  const shoppingCategory = $('#shopping-category');
  const btnAddShopping   = $('#btn-add-shopping');
  const shoppingListEl   = $('#shopping-list');

  // ── Helpers ──
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ── Tab Navigation ──
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ── Goal Selection ──
  goalSelect.value = currentGoal;
  goalSelect.addEventListener('change', () => {
    currentGoal = goalSelect.value;
    localStorage.setItem('plates_goal', currentGoal);
    renderTimerPresets();
  });

  // ── Theme Switcher ──
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
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      toast(nextTheme === 'light' ? '☀️ Light mode enabled' : '🌙 Dark mode enabled');
    });
  }

  // ══════════════════════════════════════
  //  ROUTINES
  // ══════════════════════════════════════

  function renderRoutines() {
    if (routines.length === 0) {
      routinesGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
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
          <p class="empty-state-text">No routines yet.<br>Tap <strong>+ Add Routine</strong> to create your first workout.</p>
        </div>`;
      return;
    }

    routinesGrid.innerHTML = routines.map(r => `
      <div class="routine-card" data-id="${r.id}">
        <div class="routine-card-header">
          <span class="routine-card-title">${esc(r.name)}</span>
          <div class="routine-card-actions">
            <button class="btn-icon" data-action="edit" data-id="${r.id}" title="Edit">✏️</button>
            <button class="btn-icon danger" data-action="delete" data-id="${r.id}" title="Delete">🗑️</button>
          </div>
        </div>
        <ul class="routine-card-exercises">
          ${r.exercises.slice(0, 5).map(e => `<li>${esc(e)}</li>`).join('')}
          ${r.exercises.length > 5 ? `<li style="color:var(--text-muted)">+${r.exercises.length - 5} more</li>` : ''}
        </ul>
        <div class="routine-count">${r.exercises.length} exercise${r.exercises.length !== 1 ? 's' : ''}</div>
      </div>
    `).join('');

    // Card click → open log
    routinesGrid.querySelectorAll('.routine-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        openLogModal(card.dataset.id);
      });
    });

    // Edit / Delete
    routinesGrid.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openRoutineModal(btn.dataset.id));
    });
    routinesGrid.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this routine?')) return;
        routines = routines.filter(r => r.id !== btn.dataset.id);
        saveJSON('plates_routines', routines);
        renderRoutines();
        toast('Routine deleted');
      });
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Routine Modal ──
  btnAddRoutine.addEventListener('click', () => {
    if (routines.length >= MAX_ROUTINES) {
      toast(`Max ${MAX_ROUTINES} routines reached`);
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

    const exercises = routine ? routine.exercises : ['', ''];
    exercises.forEach(ex => addExerciseRow(ex));

    modalRoutine.hidden = false;
    routineNameInput.focus();
  }

  function addExerciseRow(value = '') {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
      <input type="text" placeholder="Exercise name" value="${esc(value)}" maxlength="50" />
      <button class="btn-icon danger" title="Remove">✕</button>
    `;
    row.querySelector('.btn-icon').addEventListener('click', () => {
      row.remove();
    });
    exerciseList.appendChild(row);
  }

  btnAddExercise.addEventListener('click', () => {
    addExerciseRow();
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
      r.name = name;
      r.exercises = exercises;
    } else {
      routines.push({ id: uid(), name, exercises });
    }

    saveJSON('plates_routines', routines);
    modalRoutine.hidden = true;
    renderRoutines();
    toast(editingRoutineId ? 'Routine updated' : 'Routine added');
  });

  btnCancelRoutine.addEventListener('click', () => { modalRoutine.hidden = true; });
  modalRoutine.addEventListener('click', (e) => { if (e.target === modalRoutine) modalRoutine.hidden = true; });

  // ══════════════════════════════════════
  //  LOG WORKOUT
  // ══════════════════════════════════════

  let loggingRoutineId = null;

  function openLogModal(routineId) {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    loggingRoutineId = routineId;
    modalLogTitle.textContent = `Log: ${routine.name}`;

    logExercises.innerHTML = routine.exercises.map((ex, i) => `
      <div class="log-exercise-group" data-exercise="${esc(ex)}">
        <label>${esc(ex)}</label>
        <div class="log-sets" data-idx="${i}">
          ${buildSetRow(1)}
          ${buildSetRow(2)}
          ${buildSetRow(3)}
        </div>
        <button class="btn-add-set" data-idx="${i}">+ Add Set</button>
      </div>
    `).join('');

    logExercises.querySelectorAll('.btn-add-set').forEach(btn => {
      btn.addEventListener('click', () => {
        const setsDiv = btn.previousElementSibling;
        const count = setsDiv.children.length + 1;
        setsDiv.insertAdjacentHTML('beforeend', buildSetRow(count));
      });
    });

    modalLog.hidden = false;
  }

  function buildSetRow(num) {
    return `
      <div class="log-set-row">
        <span>${num}</span>
        <input type="number" placeholder="lbs" min="0" class="log-weight" />
        <span class="log-label">×</span>
        <input type="number" placeholder="reps" min="0" class="log-reps" />
      </div>`;
  }

  btnSaveLog.addEventListener('click', () => {
    const routine = routines.find(r => r.id === loggingRoutineId);
    if (!routine) return;

    const logEntry = {
      id: uid(),
      routineId: loggingRoutineId,
      routineName: routine.name,
      date: new Date().toISOString(),
      goal: currentGoal,
      exercises: [],
    };

    logExercises.querySelectorAll('.log-exercise-group').forEach(group => {
      const exerciseName = group.dataset.exercise;
      const sets = [];
      group.querySelectorAll('.log-set-row').forEach(row => {
        const weight = parseFloat(row.querySelector('.log-weight').value) || 0;
        const reps   = parseInt(row.querySelector('.log-reps').value, 10) || 0;
        if (weight > 0 || reps > 0) {
          sets.push({ weight, reps });
        }
      });
      if (sets.length > 0) {
        logEntry.exercises.push({ name: exerciseName, sets });
      }
    });

    if (logEntry.exercises.length === 0) {
      toast('Log at least one set');
      return;
    }

    history.unshift(logEntry);
    saveJSON('plates_history', history);
    modalLog.hidden = true;
    renderHistory();
    toast('Workout logged! 💪');
  });

  btnCancelLog.addEventListener('click', () => { modalLog.hidden = true; });
  modalLog.addEventListener('click', (e) => { if (e.target === modalLog) modalLog.hidden = true; });

  // ══════════════════════════════════════
  //  REST TIMER
  // ══════════════════════════════════════

  const CIRCUMFERENCE = 2 * Math.PI * 90; // matches r=90 in SVG

  function renderTimerPresets() {
    const cfg = REST_CONFIG[currentGoal];
    restRecommend.textContent = `${cfg.label}: ${cfg.tip}`;

    timerPresets.innerHTML = cfg.rest.map(sec => {
      const isRec = sec === cfg.recommended;
      return `<button class="preset-btn${isRec ? ' active' : ''}" data-sec="${sec}">${fmtTime(sec)}${isRec ? ' ★' : ''}</button>`;
    }).join('');

    // Set default timer to recommended
    setTimer(cfg.recommended);

    timerPresets.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        timerPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        stopTimer();
        setTimer(parseInt(btn.dataset.sec, 10));
      });
    });
  }

  function setTimer(sec) {
    timerTotal = sec;
    timerRemain = sec;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    timerDigits.textContent = fmtTime(timerRemain);
    const pct = timerTotal > 0 ? timerRemain / timerTotal : 0;
    timerRingProgress.style.strokeDasharray = CIRCUMFERENCE;
    timerRingProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
  }

  function startTimer() {
    if (timerRunning || timerRemain <= 0) return;
    timerRunning = true;
    btnTimerStart.textContent = 'Pause';

    timerInterval = setInterval(() => {
      timerRemain--;
      updateTimerDisplay();
      if (timerRemain <= 0) {
        stopTimer();
        timerComplete();
      }
    }, 1000);
  }

  function stopTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    btnTimerStart.textContent = 'Start';
  }

  function timerComplete() {
    // Vibrate if available
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    toast('⏱️ Rest complete — let\'s go!');
    // Flash animation
    timerDigits.style.color = 'var(--green)';
    setTimeout(() => { timerDigits.style.color = ''; }, 1500);
  }

  btnTimerStart.addEventListener('click', () => {
    if (timerRunning) stopTimer();
    else startTimer();
  });

  btnTimerReset.addEventListener('click', () => {
    stopTimer();
    const cfg = REST_CONFIG[currentGoal];
    const activePreset = timerPresets.querySelector('.preset-btn.active');
    const sec = activePreset ? parseInt(activePreset.dataset.sec, 10) : cfg.recommended;
    setTimer(sec);
  });

  // ══════════════════════════════════════
  //  HISTORY
  // ══════════════════════════════════════

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p class="empty-state-text">No history yet.<br>Log a workout from the Workouts tab.</p>
        </div>`;
      return;
    }

    historyList.innerHTML = history.map(entry => {
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      return `
        <div class="history-card">
          <div class="history-date">${dateStr} · ${timeStr} · ${REST_CONFIG[entry.goal]?.label || entry.goal}</div>
          <div class="history-routine-name">${esc(entry.routineName)}</div>
          <div class="history-exercises">
            ${entry.exercises.map(ex => `
              <div class="history-exercise">
                <span class="history-exercise-name">${esc(ex.name)}</span>
                <span>${ex.sets.map(s => `${s.weight}lbs × ${s.reps}`).join(' · ')}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  btnClearHistory.addEventListener('click', () => {
    if (!confirm('Clear all workout history?')) return;
    history = [];
    saveJSON('plates_history', history);
    renderHistory();
    toast('History cleared');
  });

  // ══════════════════════════════════════
  //  SHOPPING LIST
  // ══════════════════════════════════════

  function renderShopping() {
    if (shoppingList.length === 0) {
      shoppingListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <p class="empty-state-text">Your shopping list is empty.<br>Add items above.</p>
        </div>`;
      return;
    }

    // Group by category
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
          <h3>${CATEGORY_LABELS[cat]}</h3>
          ${groups[cat].map(item => `
            <div class="shopping-item${item.checked ? ' checked' : ''}" data-id="${item.id}">
              <div class="shopping-checkbox${item.checked ? ' checked' : ''}" data-id="${item.id}"></div>
              <span class="shopping-item-name">${esc(item.name)}</span>
              <button class="shopping-item-delete" data-id="${item.id}" title="Remove">✕</button>
            </div>
          `).join('')}
        </div>
      `).join('');

    // Check/uncheck
    shoppingListEl.querySelectorAll('.shopping-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const item = shoppingList.find(i => i.id === cb.dataset.id);
        if (item) { item.checked = !item.checked; saveJSON('plates_shopping', shoppingList); renderShopping(); }
      });
    });

    // Delete
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

  // ── Init ──
  applyTheme(currentTheme);
  renderRoutines();
  renderTimerPresets();
  renderHistory();
  renderShopping();

})();
