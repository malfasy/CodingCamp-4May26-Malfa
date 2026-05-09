// DailyBuddy Dashboard — app.js

// ─── StorageService ───────────────────────────────────────────────────────────
let storageAvailable = true;

// Test localStorage availability at module load time
try {
  const _testKey = '__dailybuddy_test__';
  localStorage.setItem(_testKey, '1');
  const _testVal = localStorage.getItem(_testKey);
  localStorage.removeItem(_testKey);
  if (_testVal !== '1') {
    storageAvailable = false;
  }
} catch (e) {
  storageAvailable = false;
}

const StorageService = {
  KEYS: {
    TASKS:    'dailybuddy_tasks',
    LINKS:    'dailybuddy_links',
    SETTINGS: 'dailybuddy_settings',
    TIMER:    'dailybuddy_timer',
  },

  /**
   * Read and JSON-parse a value from localStorage.
   * Returns `fallback` if the key is missing or parsing fails.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * JSON-stringify and write a value to localStorage.
   * Silently no-ops if localStorage is unavailable or the write fails.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently no-op (e.g. storage quota exceeded or unavailable)
    }
  },

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently no-op
    }
  },

  /**
   * Load all persisted application data in one call.
   * @returns {{ tasks: Array, links: Array, settings: Object, timerHistory: Array }}
   */
  loadAll() {
    return {
      tasks:        this.get(this.KEYS.TASKS,    []),
      links:        this.get(this.KEYS.LINKS,    []),
      settings:     this.get(this.KEYS.SETTINGS, {}),
      timerHistory: this.get(this.KEYS.TIMER,    []),
    };
  },
};

// ─── EventBus ─────────────────────────────────────────────────────────────────
const EventBus = {
  _listeners: {},

  /**
   * Subscribe a handler to an event.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(handler);
  },

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(h => h !== handler);
  },

  /**
   * Emit an event, calling all subscribed handlers with the given payload.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    if (!this._listeners[event]) return;
    // Iterate over a copy so handlers can safely call off() during emit
    this._listeners[event].slice().forEach(handler => handler(payload));
  },
};

// ─── ClockModule ──────────────────────────────────────────────────────────────
const ClockModule = {
  _intervalId: null,

  /**
   * Start the 1-second tick interval, updating the clock, date, and greeting DOM elements.
   * Uses a single setInterval as required by Requirement 1.7.
   */
  init() {
    // Run immediately so there's no 1-second blank on load
    this._tick();
    this._intervalId = setInterval(() => this._tick(), 1000);
  },

  /**
   * Clear the interval (cleanup).
   */
  destroy() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  /**
   * Internal tick: reads current time and updates clock DOM elements.
   * @private
   */
  _tick() {
    const now = new Date();

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    if (timeEl) timeEl.textContent = this.formatTime(now);
    if (dateEl) dateEl.textContent = this.formatDate(now);
  },

  /**
   * Format a Date as a zero-padded "HH:MM:SS" string.
   * @param {Date} date
   * @returns {string}
   */
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  },

  /**
   * Format a Date as "Weekday, Month Dayth Year" with an ordinal suffix.
   * Example: "Wednesday, May 8th 2026"
   * @param {Date} date
   * @returns {string}
   */
  formatDate(date) {
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS   = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

    const weekday = WEEKDAYS[date.getDay()];
    const month   = MONTHS[date.getMonth()];
    const day     = date.getDate();
    const year    = date.getFullYear();

    return weekday + ', ' + month + ' ' + day + this._ordinalSuffix(day) + ' ' + year;
  },

  /**
   * Return the ordinal suffix for a day number (st, nd, rd, th).
   * @param {number} day
   * @returns {string}
   * @private
   */
  _ordinalSuffix(day) {
    // Special case: 11th, 12th, 13th always use "th"
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    switch (day % 10) {
      case 1:  return 'st';
      case 2:  return 'nd';
      case 3:  return 'rd';
      default: return 'th';
    }
  },

  /**
   * Return the time-of-day greeting string for a given hour (0–23).
   * - "Good Morning"   : 5–11 inclusive
   * - "Good Afternoon" : 12–17 inclusive
   * - "Good Evening"   : 18–23 and 0–4 inclusive
   * @param {number} hour  Integer 0–23
   * @returns {"Good Morning"|"Good Afternoon"|"Good Evening"}
   */
  getGreeting(hour) {
    if (hour >= 5 && hour <= 11)  return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  },
};

// ─── SettingsModule ───────────────────────────────────────────────────────────
const SettingsModule = {
  _settings: { name: 'Friend', theme: 'light', timerDuration: 25 },

  /**
   * Apply saved theme and name on load.
   * Defaults name to "Friend" when absent (Requirement 6.1, 6.5, 6.6).
   * @param {Object} settings  Persisted settings object (may be empty or partial)
   */
  init(settings) {
    if (settings && typeof settings === 'object') {
      this._settings = Object.assign({}, this._settings, settings);
    }
    // Ensure name defaults to "Friend" when absent or empty
    if (!this._settings.name || typeof this._settings.name !== 'string' || this._settings.name.trim() === '') {
      this._settings.name = 'Friend';
    }
    // Ensure theme is valid
    if (this._settings.theme !== 'dark') {
      this._settings.theme = 'light';
    }
    // Apply the restored theme (Requirement 6.5)
    this.applyTheme(this._settings.theme);
    // Set welcome heading
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      greetingEl.textContent = 'Welcome Back, ' + this._settings.name + '!';
    }
  },

  /**
   * Save name to StorageService and update the greeting heading immediately.
   * (Requirement 6.2)
   * @param {string} name
   */
  setName(name) {
    const trimmed = (typeof name === 'string') ? name.trim() : 'Friend';
    this._settings.name = trimmed || 'Friend';
    StorageService.set(StorageService.KEYS.SETTINGS, this._settings);
    // Update greeting immediately
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      greetingEl.textContent = 'Welcome Back, ' + this._settings.name + '!';
    }
  },

  /**
   * Return the saved display name, defaulting to "Friend".
   * (Requirement 6.1)
   * @returns {string}
   */
  getName() {
    if (this._settings.name && typeof this._settings.name === 'string' && this._settings.name.trim() !== '') {
      return this._settings.name;
    }
    return 'Friend';
  },

  /**
   * Flip between light and dark theme, persist, and apply.
   * (Requirement 6.4)
   */
  toggleTheme() {
    const newTheme = this._settings.theme === 'dark' ? 'light' : 'dark';
    this._settings.theme = newTheme;
    StorageService.set(StorageService.KEYS.SETTINGS, this._settings);
    this.applyTheme(newTheme);
  },

  /**
   * Add or remove the "dark-mode" class on document.body ONLY.
   * No other class mutations are performed (Requirement 6.8).
   * @param {"light"|"dark"} theme
   */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Update the navbar theme toggle button label
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  },

  /**
   * Return the current theme.
   * (Requirement 6.3)
   * @returns {"light"|"dark"}
   */
  getTheme() {
    return this._settings.theme === 'dark' ? 'dark' : 'light';
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Generate a unique ID using crypto.randomUUID() when available,
 * falling back to a timestamp + random string combination.
 * @returns {string}
 */
function generateId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── TimerModule ──────────────────────────────────────────────────────────────
const TimerModule = {
  _intervalId: null,
  _status: 'idle',
  _duration: 25 * 60,   // seconds
  _remaining: 25 * 60,  // seconds
  _startedAt: null,

  /**
   * Load saved duration from StorageService (default 25 min) and render
   * the initial MM:SS display.
   * (Requirements 2.1, 2.12)
   * @param {Object} settings  Persisted settings object (may be empty or partial)
   */
  init(settings) {
    // Restore saved timer duration from settings (Requirement 2.12)
    const savedMinutes = settings && typeof settings.timerDuration === 'number'
      ? settings.timerDuration
      : 25;

    this._duration  = savedMinutes * 60;
    this._remaining = this._duration;
    this._status    = 'idle';
    this._intervalId = null;
    this._startedAt  = null;

    this._updateDisplay();
    this._updateButtons();
  },

  /**
   * Begin countdown interval.
   * Guard prevents double-start: if already running, returns immediately.
   * (Requirements 2.2, 2.8, 2.10)
   */
  start() {
    // Guard: prevent more than one concurrent interval (Requirement 2.10)
    if (this._intervalId !== null) return;

    this._status    = 'running';
    this._startedAt = Date.now();

    this._updateButtons();

    this._intervalId = setInterval(() => this._tick(), 1000);
  },

  /**
   * Pause the countdown and emit timer:stopped with elapsed time.
   * (Requirements 2.3, 2.9)
   */
  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    const elapsed = this._startedAt !== null
      ? Math.floor((Date.now() - this._startedAt) / 1000)
      : 0;

    this._status    = 'idle';
    this._startedAt = null;

    this._updateButtons();

    EventBus.emit('timer:stopped', elapsed);
  },

  /**
   * Stop the countdown and restore remaining to the full configured duration.
   * (Requirement 2.4)
   */
  reset() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    this._status     = 'idle';
    this._startedAt  = null;
    this._remaining  = this._duration;

    this._updateDisplay();
    this._updateButtons();
  },

  /**
   * Update duration, persist via StorageService, and reset the display.
   * (Requirements 2.11)
   * @param {number} minutes  New duration in minutes
   */
  setDuration(minutes) {
    this._duration  = minutes * 60;
    this._remaining = this._duration;

    // Persist the new duration in settings
    const settings = StorageService.get(StorageService.KEYS.SETTINGS, {});
    settings.timerDuration = minutes;
    StorageService.set(StorageService.KEYS.SETTINGS, settings);

    // Stop any running interval and reset display
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._status    = 'idle';
    this._startedAt = null;

    this._updateDisplay();
    this._updateButtons();
  },

  /**
   * Return a zero-padded "MM:SS" string for the given total seconds.
   * (Requirement 2.7)
   * @param {number} totalSeconds
   * @returns {string}
   */
  formatDisplay(totalSeconds) {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
    const ss = String(clamped % 60).padStart(2, '0');
    return mm + ':' + ss;
  },

  /**
   * Return the current timer state.
   * @returns {{ status: string, remaining: number, duration: number }}
   */
  getState() {
    return {
      status:    this._status,
      remaining: this._remaining,
      duration:  this._duration,
    };
  },

  /**
   * Internal tick called every 1000 ms by setInterval.
   * Decrements remaining, clamps to ≥ 0, updates display.
   * When remaining reaches 0: clears interval, saves TimerSession, emits timer:complete.
   * (Requirements 2.2, 2.5, 2.13)
   * @private
   */
  _tick() {
    this._remaining = Math.max(0, this._remaining - 1);
    this._updateDisplay();

    if (this._remaining <= 0) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._status     = 'idle';

      // Save completed TimerSession (Requirement 2.5)
      const session = {
        id:        generateId(),
        duration:  this._duration,
        elapsed:   this._duration,  // full duration when completed
        completed: true,
        startedAt: this._startedAt,
      };

      // Append to timer history array
      const history = StorageService.get(StorageService.KEYS.TIMER, []);
      history.push(session);
      StorageService.set(StorageService.KEYS.TIMER, history);

      this._startedAt = null;

      this._updateButtons();

      // Emit timer:complete (Requirement 2.5)
      EventBus.emit('timer:complete', session);
    }
  },

  /**
   * Update the #timer-display DOM element with the current remaining time.
   * (Requirement 2.7)
   * @private
   */
  _updateDisplay() {
    const el = document.getElementById('timer-display');
    if (el) {
      el.textContent = this.formatDisplay(this._remaining);
    }
  },

  /**
   * Manage button disabled states based on current status.
   * - Start disabled while running (Requirement 2.8)
   * - Stop disabled while idle (Requirement 2.9)
   * @private
   */
  _updateButtons() {
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');

    const isRunning = this._status === 'running';

    if (startBtn) startBtn.disabled = isRunning;
    if (stopBtn)  stopBtn.disabled  = !isRunning;
    if (resetBtn) resetBtn.disabled = false; // Reset is always available
  },
};

// ─── TasksModule ──────────────────────────────────────────────────────────────
const TasksModule = {
  _tasks: [],

  /**
   * Load the tasks array, then render the task list and progress bar.
   * (Requirements 3.12)
   * @param {Array} tasks  Persisted tasks array from StorageService
   */
  init(tasks) {
    this._tasks = Array.isArray(tasks) ? tasks : [];
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());
  },

  /**
   * Validate, deduplicate, create, save, and re-render a new task.
   * Follows the Task Addition Algorithm from the design doc.
   * (Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 8.1)
   * @param {string} text  Raw text from the user input
   */
  addTask(text) {
    const trimmed = (typeof text === 'string') ? text.trim() : '';

    // Validate non-empty
    if (trimmed === '') {
      this._showError('Task cannot be empty');
      return;
    }

    // Validate max length
    if (trimmed.length > 200) {
      this._showError('Task is too long (max 200 characters)');
      return;
    }

    // Case-insensitive duplicate check
    const normalised = trimmed.toLowerCase();
    for (const task of this._tasks) {
      if (task.text.toLowerCase() === normalised) {
        this._showError('Task already exists');
        return;
      }
    }

    // Clear any previous error
    this._clearError();

    const newTask = {
      id:          generateId(),
      text:        trimmed,
      done:        false,
      createdAt:   Date.now(),
      completedAt: null,
    };

    this._tasks.push(newTask);
    StorageService.set(StorageService.KEYS.TASKS, this._tasks);
    EventBus.emit('tasks:updated', this._tasks);
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());
  },

  /**
   * Flip the done flag on a task; record completedAt when marking done.
   * (Requirements 3.6, 3.7)
   * @param {string} id  Task ID
   */
  toggleTask(id) {
    const task = this._tasks.find(t => t.id === id);
    if (!task) return;

    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;

    StorageService.set(StorageService.KEYS.TASKS, this._tasks);
    EventBus.emit('tasks:updated', this._tasks);
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());
  },

  /**
   * Remove a task by ID, save, emit, and re-render.
   * (Requirements 3.7)
   * @param {string} id  Task ID
   */
  deleteTask(id) {
    const index = this._tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    this._tasks.splice(index, 1);
    StorageService.set(StorageService.KEYS.TASKS, this._tasks);
    EventBus.emit('tasks:updated', this._tasks);
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());
  },

  /**
   * Update a task's text with the same validation as addTask,
   * excluding the task itself from the duplicate check.
   * (Requirements 3.7, 8.1)
   * @param {string} id       Task ID
   * @param {string} newText  New text from the user
   * @returns {{ success: boolean, error: string|null }}
   */
  editTask(id, newText) {
    const trimmed = (typeof newText === 'string') ? newText.trim() : '';

    if (trimmed === '') {
      return { success: false, error: 'Task cannot be empty' };
    }

    if (trimmed.length > 200) {
      return { success: false, error: 'Task is too long (max 200 characters)' };
    }

    const normalised = trimmed.toLowerCase();
    for (const task of this._tasks) {
      if (task.id !== id && task.text.toLowerCase() === normalised) {
        return { success: false, error: 'Task already exists' };
      }
    }

    const task = this._tasks.find(t => t.id === id);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    task.text = trimmed;
    StorageService.set(StorageService.KEYS.TASKS, this._tasks);
    EventBus.emit('tasks:updated', this._tasks);
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());

    return { success: true, error: null };
  },

  /**
   * Compute progress following the Progress Calculation Algorithm.
   * (Requirements 3.8, 3.9)
   * @returns {{ done: number, total: number, percent: number }}
   */
  getProgress() {
    const total = this._tasks.length;
    let done = 0;

    for (const task of this._tasks) {
      if (task.done === true) {
        done++;
      }
    }

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  },

  /**
   * Rebuild the #task-list element from the given tasks array.
   * Uses textContent for all user-supplied strings — never innerHTML for user content.
   * (Requirements 3.1, 8.1)
   * @param {Array} tasks
   */
  renderTaskList(tasks) {
    const listEl = document.getElementById('task-list');
    if (!listEl) return;

    // Clear existing items
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    const taskArray = Array.isArray(tasks) ? tasks : [];

    for (const task of taskArray) {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' task-item--done' : '');
      li.dataset.id = task.id;

      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', () => {
        this.toggleTask(task.id);
      });

      // Text span — textContent only, never innerHTML
      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-icon task-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', () => {
        this.deleteTask(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    }
  },

  /**
   * Update the #progress-bar width/aria-valuenow and #progress-label text.
   * (Requirements 3.8, 3.9)
   * @param {{ done: number, total: number, percent: number }} progress
   */
  renderProgressBar(progress) {
    const barEl   = document.getElementById('progress-bar');
    const labelEl = document.getElementById('progress-label');

    if (barEl) {
      barEl.style.width = progress.percent + '%';
      barEl.setAttribute('aria-valuenow', String(progress.percent));
    }

    if (labelEl) {
      labelEl.textContent = progress.percent + '%';
    }
  },

  /**
   * Return all tasks where done === true.
   * (Requirement 3.10)
   * @returns {Array}
   */
  getHistory() {
    return this._tasks.filter(t => t.done === true);
  },

  /**
   * Remove all completed tasks permanently, save, and emit.
   * (Requirement 3.11)
   */
  clearHistory() {
    this._tasks = this._tasks.filter(t => t.done !== true);
    StorageService.set(StorageService.KEYS.TASKS, this._tasks);
    EventBus.emit('tasks:updated', this._tasks);
    this.renderTaskList(this._tasks);
    this.renderProgressBar(this.getProgress());
  },

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Show an inline error message in the #task-error element.
   * @param {string} message
   * @private
   */
  _showError(message) {
    const errorEl = document.getElementById('task-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  },

  /**
   * Clear the #task-error element.
   * @private
   */
  _clearError() {
    const errorEl = document.getElementById('task-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  },
};

// ─── sortTasks ────────────────────────────────────────────────────────────────
/**
 * Return a new sorted array of tasks without mutating the original.
 * (Requirements 4.3, 4.4)
 *
 * @param {Array}  tasks     Array of Task objects
 * @param {string} strategy  "default" | "az" | "done-last"
 * @returns {Array}  New array (shallow copy), original is NOT mutated
 */
function sortTasks(tasks, strategy) {
  // Shallow copy — never mutate the caller's array
  const sorted = tasks.slice();

  if (strategy === 'az') {
    // Alphabetical by text, case-insensitive
    sorted.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  } else if (strategy === 'done-last') {
    // Undone tasks first, done tasks last; preserve relative order within each group
    sorted.sort((a, b) => {
      if (a.done === b.done) return 0;
      if (a.done === true)   return 1;
      return -1;
    });
  } else {
    // "default" — sort by createdAt ascending (insertion order)
    sorted.sort((a, b) => a.createdAt - b.createdAt);
  }

  return sorted;
}

// ─── TaskModal ────────────────────────────────────────────────────────────────
/**
 * TaskModal — sub-component of TasksModule.
 * Renders a full-screen backdrop + centered modal card for bulk task management.
 * (Requirements 4.1–4.14)
 */
const TaskModal = {

  /**
   * Open the Edit Tasks modal.
   * @param {Array} tasks  The current tasks array from TasksModule
   */
  open(tasks) {
    // Guard: do not open a second modal if one is already present
    if (document.querySelector('.edit-tasks-modal')) return;

    // ── Backdrop ──────────────────────────────────────────────────────────────
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });
    document.body.appendChild(backdrop);

    // ── Modal card ────────────────────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.className = 'edit-tasks-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Edit Tasks');

    // ── Header ────────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = 'Edit Tasks';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close btn btn-icon';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // ── Task list container ───────────────────────────────────────────────────
    const taskListContainer = document.createElement('ul');
    taskListContainer.className = 'modal-task-list';

    // ── Assemble modal ────────────────────────────────────────────────────────
    modal.appendChild(header);
    modal.appendChild(taskListContainer);

    document.body.appendChild(modal);

    // Render rows
    this.renderRows(tasks);

    // ── Focus trap ────────────────────────────────────────────────────────────
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        modal.querySelectorAll('button:not([disabled]), input:not([disabled])')
      ).filter(el => el.offsetParent !== null || el === closeBtn);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });

    closeBtn.focus();
  },

  /**
   * Close the modal and remove both .edit-tasks-modal and .modal-backdrop from DOM.
   * Safe to call when no modal is open (Requirement 4.10, 4.11).
   */
  close() {
    const modal    = document.querySelector('.edit-tasks-modal');
    const backdrop = document.querySelector('.modal-backdrop');

    if (modal)    modal.remove();
    if (backdrop) backdrop.remove();
  },

  /**
   * Re-render the task rows inside the modal using the given tasks array.
   * Uses textContent for all user-supplied strings — never innerHTML for user content.
   * (Requirements 4.2, 8.1)
   * @param {Array} tasks  Tasks to display (already sorted for display)
   */
  renderRows(tasks) {
    const modal = document.querySelector('.edit-tasks-modal');
    if (!modal) return;

    const container = modal.querySelector('.modal-task-list');
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const taskArray = Array.isArray(tasks) ? tasks : TasksModule._tasks;

    for (const task of taskArray) {
      const row = document.createElement('li');
      row.className = 'modal-task-row' + (task.done ? ' modal-task-row--done' : '');
      row.dataset.id = task.id;

      // Task label — textContent only (Requirement 8.1)
      const label = document.createElement('span');
      label.className = 'modal-task-label';
      label.textContent = task.text;

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-icon modal-edit-btn';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.textContent = '✏';
      editBtn.addEventListener('click', () => this.activateEditRow(task.id, tasks));

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-icon modal-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', () => {
        TasksModule.deleteTask(task.id);
        // Re-render rows with the updated tasks array
        this.renderRows(TasksModule._tasks);
      });

      row.appendChild(label);
      row.appendChild(editBtn);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    }
  },

  /**
   * Replace the task label in a row with a pre-filled <input> plus Save and Cancel buttons.
   * Inline validation on Save: empty, >200 chars, duplicate (excluding self).
   * (Requirements 4.6, 4.7, 4.8, 4.9)
   * @param {string} id     Task ID to edit
   * @param {Array}  tasks  Current tasks array (for re-render after save)
   */
  activateEditRow(id, tasks) {
    const modal = document.querySelector('.edit-tasks-modal');
    if (!modal) return;

    const row = modal.querySelector(`.modal-task-row[data-id="${id}"]`);
    if (!row) return;

    const task = (tasks || TasksModule._tasks).find(t => t.id === id);
    if (!task) return;

    // Build inline edit controls
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-edit-input';
    input.value = task.text;
    input.setAttribute('aria-label', 'Edit task text');
    input.maxLength = 200;

    const errorSpan = document.createElement('span');
    errorSpan.className = 'modal-inline-error';
    errorSpan.setAttribute('aria-live', 'polite');
    errorSpan.hidden = true;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-icon modal-save-btn';
    saveBtn.setAttribute('aria-label', 'Save edit');
    saveBtn.textContent = '✓';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-icon modal-cancel-btn';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.textContent = '✗';

    const handleSave = () => {
      const newText = input.value.trim();

      // Inline validation (Requirement 4.8)
      if (newText === '') {
        errorSpan.textContent = 'Task cannot be empty';
        errorSpan.hidden = false;
        input.focus();
        return;
      }

      if (newText.length > 200) {
        errorSpan.textContent = 'Task is too long (max 200 characters)';
        errorSpan.hidden = false;
        input.focus();
        return;
      }

      const normalised = newText.toLowerCase();
      const currentTasks = TasksModule._tasks;
      for (const t of currentTasks) {
        if (t.id !== id && t.text.toLowerCase() === normalised) {
          errorSpan.textContent = 'Task already exists';
          errorSpan.hidden = false;
          input.focus();
          return;
        }
      }

      // Valid — delegate to TasksModule (Requirement 4.7)
      const result = TasksModule.editTask(id, newText);
      if (result.success) {
        this.renderRows(TasksModule._tasks);
      } else {
        errorSpan.textContent = result.error || 'Could not save task';
        errorSpan.hidden = false;
        input.focus();
      }
    };

    const handleCancel = () => {
      // Discard changes and restore label view (Requirement 4.9)
      this.deactivateEditRow(id, task.text);
    };

    // Allow Enter to save, Escape to cancel
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); handleSave();   }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    });

    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);

    // Replace row contents with edit controls
    while (row.firstChild) row.removeChild(row.firstChild);
    row.appendChild(input);
    row.appendChild(saveBtn);
    row.appendChild(cancelBtn);
    row.appendChild(errorSpan);

    // Focus the input and select all text
    input.focus();
    input.select();
  },

  /**
   * Restore a task row from edit mode back to the label view.
   * (Requirement 4.9)
   * @param {string} id    Task ID
   * @param {string} text  Text to display in the label
   */
  deactivateEditRow(id, text) {
    const modal = document.querySelector('.edit-tasks-modal');
    if (!modal) return;

    const row = modal.querySelector(`.modal-task-row[data-id="${id}"]`);
    if (!row) return;

    // Rebuild the label view
    while (row.firstChild) row.removeChild(row.firstChild);

    const label = document.createElement('span');
    label.className = 'modal-task-label';
    label.textContent = text; // textContent — never innerHTML (Requirement 8.1)

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-icon modal-edit-btn';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.textContent = '✏';
    editBtn.addEventListener('click', () => this.activateEditRow(id, TasksModule._tasks));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-icon modal-delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => {
      TasksModule.deleteTask(id);
      this.renderRows(TasksModule._tasks);
    });

    row.appendChild(label);
    row.appendChild(editBtn);
    row.appendChild(deleteBtn);
  },

};

// ─── TasksModule — delegate openEditModal / closeEditModal to TaskModal ────────
// Patch the two stub methods that were left on TasksModule so they delegate
// to TaskModal.  This keeps TasksModule as the public API while TaskModal
// owns all modal DOM logic.
TasksModule.openEditModal = function () {
  TaskModal.open(this._tasks);
};

TasksModule.closeEditModal = function () {
  TaskModal.close();
};

// ─── LinksModule ──────────────────────────────────────────────────────────────
/**
 * LinksModule — manages quick-link buttons that open URLs in a new tab.
 * Supports adding, editing, and deleting links via inline forms,
 * with edit/delete controls revealed on hover.
 * (Requirements 5.1–5.15, 8.1, 8.2, 8.3)
 */
const LinksModule = {
  _links: [],
  _addFormVisible: false,
  _editFormId: null,

  /**
   * Load the links array and render the link buttons.
   * (Requirement 5.15)
   * @param {Array} links  Persisted links array from StorageService
   */
  init(links) {
    this._links = Array.isArray(links) ? links : [];
    this.renderLinkButtons(this._links);
  },

  /**
   * Validate a URL string following the URL Validation Algorithm.
   * - Trims whitespace
   * - Checks non-empty
   * - Tries new URL(trimmed)
   * - Checks protocol is http: or https:
   * - Returns { valid, error } — never throws
   * (Requirements 5.8, 8.2)
   * @param {string} url
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateUrl(url) {
    const trimmed = (typeof url === 'string') ? url.trim() : '';

    if (trimmed === '') {
      return { valid: false, error: 'URL cannot be empty' };
    }

    try {
      const parsed = new URL(trimmed);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'URL must start with http:// or https://' };
      }

      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: 'Invalid URL format' };
    }
  },

  /**
   * Validate label and URL, create a QuickLink, persist, hide form, and re-render.
   * Follows the Add Quick Link Algorithm from the design doc.
   * (Requirements 5.5, 5.6, 5.7, 5.8)
   * @param {string} label
   * @param {string} url
   * @returns {{ success: boolean, error: string|null }}
   */
  addLink(label, url) {
    const trimmedLabel = (typeof label === 'string') ? label.trim() : '';
    const trimmedUrl   = (typeof url   === 'string') ? url.trim()   : '';

    // Validate label
    if (trimmedLabel === '') {
      return { success: false, error: 'Label cannot be empty' };
    }

    if (trimmedLabel.length > 50) {
      return { success: false, error: 'Label must be 50 characters or fewer' };
    }

    // Validate URL
    const urlResult = this.validateUrl(trimmedUrl);
    if (!urlResult.valid) {
      return { success: false, error: urlResult.error };
    }

    const newLink = {
      id:    generateId(),
      label: trimmedLabel,
      url:   trimmedUrl,
    };

    this._links.push(newLink);
    StorageService.set(StorageService.KEYS.LINKS, this._links);
    this.hideAddForm();
    this.renderLinkButtons(this._links);

    return { success: true, error: null };
  },

  /**
   * Validate label and URL, find the link by id, update in place, persist, and re-render.
   * Follows the Edit Quick Link Algorithm from the design doc.
   * (Requirements 5.12, 5.13)
   * @param {string} id
   * @param {string} label
   * @param {string} url
   * @returns {{ success: boolean, error: string|null }}
   */
  editLink(id, label, url) {
    const trimmedLabel = (typeof label === 'string') ? label.trim() : '';
    const trimmedUrl   = (typeof url   === 'string') ? url.trim()   : '';

    // Validate label
    if (trimmedLabel === '') {
      return { success: false, error: 'Label cannot be empty' };
    }

    if (trimmedLabel.length > 50) {
      return { success: false, error: 'Label must be 50 characters or fewer' };
    }

    // Validate URL
    const urlResult = this.validateUrl(trimmedUrl);
    if (!urlResult.valid) {
      return { success: false, error: urlResult.error };
    }

    const index = this._links.findIndex(l => l.id === id);
    if (index === -1) {
      return { success: false, error: 'Link not found' };
    }

    this._links[index].label = trimmedLabel;
    this._links[index].url   = trimmedUrl;

    StorageService.set(StorageService.KEYS.LINKS, this._links);
    this.hideEditForm();
    this.renderLinkButtons(this._links);

    return { success: true, error: null };
  },

  /**
   * Remove a link by ID, persist, and re-render.
   * (Requirement 5.14)
   * @param {string} id
   */
  deleteLink(id) {
    const index = this._links.findIndex(l => l.id === id);
    if (index === -1) return;

    this._links.splice(index, 1);
    StorageService.set(StorageService.KEYS.LINKS, this._links);
    this.renderLinkButtons(this._links);
  },

  /**
   * Open the link's URL in a new browser tab.
   * Uses noopener,noreferrer for security (Requirement 8.3).
   * @param {string} url
   */
  openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Render each link as a styled button with textContent for the label.
   * Attaches mouseenter/mouseleave listeners to reveal Edit and Delete icon buttons.
   * Also renders the "Add Link" button at the end of the panel.
   * (Requirements 5.1, 5.2, 5.3, 5.10, 8.1)
   * @param {Array} links
   */
  renderLinkButtons(links) {
    const panel = document.getElementById('links-panel');
    if (!panel) return;

    // Clear existing content
    while (panel.firstChild) {
      panel.removeChild(panel.firstChild);
    }

    const linkArray = Array.isArray(links) ? links : [];

    for (const link of linkArray) {
      // Wrapper holds the link button + hover controls
      const wrapper = document.createElement('div');
      wrapper.className = 'link-btn-wrapper';
      wrapper.dataset.id = link.id;

      // Main link button — textContent only (Requirement 8.1)
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-link';
      btn.textContent = link.label;
      btn.setAttribute('aria-label', 'Open ' + link.label);
      btn.addEventListener('click', () => {
        this.openLink(link.url);
      });

      // Edit icon button (hidden until hover)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-icon link-edit-btn link-action-btn';
      editBtn.setAttribute('aria-label', 'Edit link');
      editBtn.textContent = '✏';
      editBtn.style.display = 'none';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEditForm(link.id);
      });

      // Delete icon button (hidden until hover)
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-icon link-delete-btn link-action-btn';
      deleteBtn.setAttribute('aria-label', 'Delete link');
      deleteBtn.textContent = '🗑';
      deleteBtn.style.display = 'none';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteLink(link.id);
      });

      // Reveal/hide edit and delete buttons on hover (Requirement 5.10)
      wrapper.addEventListener('mouseenter', () => {
        editBtn.style.display   = '';
        deleteBtn.style.display = '';
      });
      wrapper.addEventListener('mouseleave', () => {
        editBtn.style.display   = 'none';
        deleteBtn.style.display = 'none';
      });

      wrapper.appendChild(btn);
      wrapper.appendChild(editBtn);
      wrapper.appendChild(deleteBtn);
      panel.appendChild(wrapper);
    }

    // "Add Link" button at the end of the panel (Requirement 5.3)
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.id = 'add-link-btn';
    addBtn.className = 'btn btn-add-link';
    addBtn.textContent = '+ Add Link';
    addBtn.addEventListener('click', () => {
      this.showAddForm();
    });
    panel.appendChild(addBtn);

    // If the add form was visible before re-render, restore it
    if (this._addFormVisible) {
      this._renderAddFormInPanel(panel);
    }

    // If an edit form was open before re-render, restore it
    if (this._editFormId !== null) {
      this._renderEditFormInPanel(panel, this._editFormId);
    }
  },

  /**
   * Show the inline Add Link form below the link buttons.
   * (Requirement 5.4)
   */
  showAddForm() {
    // If edit form is open, close it first
    if (this._editFormId !== null) {
      this._editFormId = null;
    }

    this._addFormVisible = true;

    const panel = document.getElementById('links-panel');
    if (!panel) return;

    // Remove any existing form
    const existing = panel.querySelector('.link-add-form');
    if (existing) existing.remove();

    this._renderAddFormInPanel(panel);
  },

  /**
   * Hide the inline Add Link form.
   * (Requirement 5.9)
   */
  hideAddForm() {
    this._addFormVisible = false;

    const panel = document.getElementById('links-panel');
    if (!panel) return;

    const form = panel.querySelector('.link-add-form');
    if (form) form.remove();
  },

  /**
   * Show the inline Edit Link form pre-filled with the link's current data.
   * (Requirement 5.11)
   * @param {string} id  Link ID to edit
   */
  showEditForm(id) {
    // If add form is open, close it first
    if (this._addFormVisible) {
      this._addFormVisible = false;
    }

    // If another edit form is open, close it first
    if (this._editFormId !== null && this._editFormId !== id) {
      const panel = document.getElementById('links-panel');
      if (panel) {
        const oldForm = panel.querySelector('.link-edit-form');
        if (oldForm) oldForm.remove();
      }
    }

    this._editFormId = id;

    const panel = document.getElementById('links-panel');
    if (!panel) return;

    // Remove any existing edit form
    const existing = panel.querySelector('.link-edit-form');
    if (existing) existing.remove();

    this._renderEditFormInPanel(panel, id);
  },

  /**
   * Hide the inline Edit Link form.
   */
  hideEditForm() {
    this._editFormId = null;

    const panel = document.getElementById('links-panel');
    if (!panel) return;

    const form = panel.querySelector('.link-edit-form');
    if (form) form.remove();
  },

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build and append the Add Link inline form to the panel.
   * @param {HTMLElement} panel
   * @private
   */
  _renderAddFormInPanel(panel) {
    const form = document.createElement('div');
    form.className = 'link-add-form link-form';

    // Label field
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'link-form-label-input';
    labelInput.placeholder = 'Label (max 50 chars)';
    labelInput.maxLength = 50;
    labelInput.setAttribute('aria-label', 'Link label');

    // URL field
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'link-form-url-input';
    urlInput.placeholder = 'https://example.com';
    urlInput.setAttribute('aria-label', 'Link URL');

    // Error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'link-form-error';
    errorSpan.setAttribute('aria-live', 'polite');
    errorSpan.hidden = true;

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary link-form-save-btn';
    saveBtn.textContent = 'Save';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary link-form-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    const handleSave = () => {
      const result = this.addLink(labelInput.value, urlInput.value);
      if (!result.success) {
        errorSpan.textContent = result.error;
        errorSpan.hidden = false;
      }
      // On success, addLink calls hideAddForm() and renderLinkButtons()
    };

    const handleCancel = () => {
      this.hideAddForm();
    };

    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);

    // Allow Enter to save
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    });

    form.appendChild(labelInput);
    form.appendChild(urlInput);
    form.appendChild(errorSpan);
    form.appendChild(saveBtn);
    form.appendChild(cancelBtn);
    panel.appendChild(form);

    // Focus the label input
    labelInput.focus();
  },

  /**
   * Build and append the Edit Link inline form to the panel, pre-filled with link data.
   * @param {HTMLElement} panel
   * @param {string} id  Link ID to edit
   * @private
   */
  _renderEditFormInPanel(panel, id) {
    const link = this._links.find(l => l.id === id);
    if (!link) {
      this._editFormId = null;
      return;
    }

    const form = document.createElement('div');
    form.className = 'link-edit-form link-form';
    form.dataset.editId = id;

    // Label field — pre-filled
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'link-form-label-input';
    labelInput.placeholder = 'Label (max 50 chars)';
    labelInput.maxLength = 50;
    labelInput.value = link.label;
    labelInput.setAttribute('aria-label', 'Edit link label');

    // URL field — pre-filled
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'link-form-url-input';
    urlInput.placeholder = 'https://example.com';
    urlInput.value = link.url;
    urlInput.setAttribute('aria-label', 'Edit link URL');

    // Error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'link-form-error';
    errorSpan.setAttribute('aria-live', 'polite');
    errorSpan.hidden = true;

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary link-form-save-btn';
    saveBtn.textContent = 'Save';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary link-form-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    const handleSave = () => {
      const result = this.editLink(id, labelInput.value, urlInput.value);
      if (!result.success) {
        errorSpan.textContent = result.error;
        errorSpan.hidden = false;
      }
      // On success, editLink calls hideEditForm() and renderLinkButtons()
    };

    const handleCancel = () => {
      this.hideEditForm();
    };

    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);

    // Allow Enter to save
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    });

    form.appendChild(labelInput);
    form.appendChild(urlInput);
    form.appendChild(errorSpan);
    form.appendChild(saveBtn);
    form.appendChild(cancelBtn);
    panel.appendChild(form);

    // Focus the label input
    labelInput.focus();
  },
};

// ─── App Bootstrap ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // 1. Load all persisted data
  const { tasks, links, settings, timerHistory } = StorageService.loadAll();

  // 2. Show storage warning if localStorage is unavailable (Requirement 7.9)
  if (!storageAvailable) {
    const warningEl = document.getElementById('storage-warning');
    if (warningEl) {
      warningEl.removeAttribute('hidden');
    }
  }

  // 3. Initialise modules in order (Requirements 10.3, 10.4, 10.5)
  SettingsModule.init(settings);
  ClockModule.init();
  TasksModule.init(tasks);
  TimerModule.init(settings);
  LinksModule.init(links);

  // 4. Wire button click handlers ─────────────────────────────────────────────

  // Theme toggle (Requirement 6.4)
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function () {
      SettingsModule.toggleTheme();
    });
  }

  // Set Name — open modal when navbar button clicked
  const setNameBtn = document.getElementById('set-name-btn');
  const setNameModal = document.getElementById('set-name-modal');
  if (setNameBtn && setNameModal) {
    setNameBtn.addEventListener('click', function () {
      setNameModal.removeAttribute('hidden');
      const nameInput = document.getElementById('name-input');
      if (nameInput) {
        nameInput.value = SettingsModule.getName() === 'Friend' ? '' : SettingsModule.getName();
        nameInput.focus();
      }
    });
  }

  // Save name from modal
  const saveNameBtn = document.getElementById('save-name-btn');
  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', function () {
      const nameInput = document.getElementById('name-input');
      if (nameInput) {
        SettingsModule.setName(nameInput.value);
      }
      if (setNameModal) setNameModal.setAttribute('hidden', '');
    });
  }

  // Close name modal
  const closeNameModalBtn = document.getElementById('close-name-modal-btn');
  if (closeNameModalBtn && setNameModal) {
    closeNameModalBtn.addEventListener('click', function () {
      setNameModal.setAttribute('hidden', '');
    });
  }

  // Close name modal on backdrop click
  if (setNameModal) {
    setNameModal.addEventListener('click', function (e) {
      if (e.target === setNameModal) {
        setNameModal.setAttribute('hidden', '');
      }
    });
  }

  // Allow Enter key to save name
  const nameInputEl = document.getElementById('name-input');
  if (nameInputEl) {
    nameInputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        SettingsModule.setName(nameInputEl.value);
        if (setNameModal) setNameModal.setAttribute('hidden', '');
      }
      if (e.key === 'Escape') {
        if (setNameModal) setNameModal.setAttribute('hidden', '');
      }
    });
  }

  // Timer controls (Requirements 2.2, 2.3, 2.4)
  const timerStartBtn = document.getElementById('timer-start');
  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', function () {
      TimerModule.start();
    });
  }

  const timerStopBtn = document.getElementById('timer-stop');
  if (timerStopBtn) {
    timerStopBtn.addEventListener('click', function () {
      TimerModule.stop();
    });
  }

  const timerResetBtn = document.getElementById('timer-reset');
  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', function () {
      TimerModule.reset();
    });
  }

  // Edit tasks modal (Requirement 4.1)
  const editTasksBtn = document.getElementById('edit-tasks-btn');
  if (editTasksBtn) {
    editTasksBtn.addEventListener('click', function () {
      TasksModule.openEditModal();
    });
  }

  // History button — show completed tasks modal
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', function () {
      const existing = document.querySelector('.history-backdrop');
      if (existing) { existing.remove(); return; }

      const history = TasksModule.getHistory();

      const backdrop = document.createElement('div');
      backdrop.className = 'history-backdrop';
      backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;';

      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border-radius:16px;padding:28px 32px;width:100%;max-width:480px;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);border:1px solid #e8d5f0;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';

      const title = document.createElement('h2');
      title.style.cssText = 'font-size:1.1rem;font-weight:700;color:#2d1b3d;';
      title.textContent = 'Completed Tasks';

      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'background:none;border:none;font-size:1.5rem;cursor:pointer;color:#8b6fa0;line-height:1;padding:0 4px;';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Close history');
      closeBtn.addEventListener('click', function () { backdrop.remove(); });

      header.appendChild(title);
      header.appendChild(closeBtn);
      card.appendChild(header);

      if (history.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:#8b6fa0;font-size:0.9rem;text-align:center;padding:24px 0;';
        empty.textContent = 'No completed tasks yet.';
        card.appendChild(empty);
      } else {
        const list = document.createElement('ul');
        list.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:6px;';
        for (const task of history) {
          const item = document.createElement('li');
          item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 4px;font-size:0.9rem;color:#8b6fa0;';
          const check = document.createElement('span');
          check.textContent = '✓';
          check.style.cssText = 'color:#c084c8;font-weight:700;flex-shrink:0;';
          const text = document.createElement('span');
          text.style.cssText = 'text-decoration:line-through;';
          text.textContent = task.text;
          item.appendChild(check);
          item.appendChild(text);
          list.appendChild(item);
        }
        card.appendChild(list);
      }

      backdrop.appendChild(card);
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) backdrop.remove();
      });
      document.body.appendChild(backdrop);
    });
  }

  // Add link button (Requirement 5.4)
  // Note: LinksModule re-renders #add-link-btn inside the panel on each render,
  // so we delegate via event delegation on the panel to catch the dynamic button.
  const linksPanel = document.getElementById('links-panel');
  if (linksPanel) {
    linksPanel.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'add-link-btn') {
        LinksModule.showAddForm();
      }
    });
  }

  // Task add form submit (Requirements 3.1–3.5)
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const taskInput = document.getElementById('task-input');
      if (taskInput) {
        const value = taskInput.value;
        // addTask returns undefined on success (mutates internal state)
        // and shows an error on failure — check for error element to detect failure
        const errorEl = document.getElementById('task-error');
        const hadError = errorEl ? !errorEl.hidden : false;

        TasksModule.addTask(value);

        // Clear input only when the task was successfully added
        // (i.e., the error element is now hidden after the call)
        const hasError = errorEl ? !errorEl.hidden : false;
        if (!hasError) {
          taskInput.value = '';
        }
      }
    });
  }

  // Timer duration setter (Requirement 2.11)
  const setTimerDurationBtn = document.getElementById('set-timer-duration-btn');
  if (setTimerDurationBtn) {
    setTimerDurationBtn.addEventListener('click', function () {
      const durationInput = document.getElementById('timer-duration-input');
      if (durationInput) {
        const minutes = parseInt(durationInput.value, 10);
        if (!isNaN(minutes) && minutes > 0) {
          TimerModule.setDuration(minutes);
        }
      }
    });
  }

  // 5. Wire EventBus cross-module subscriptions ───────────────────────────────

  // tasks:updated → update progress bar (Requirements 3.7, 3.8, 3.9)
  EventBus.on('tasks:updated', function () {
    const progress = TasksModule.getProgress();

    const barEl = document.getElementById('progress-bar');
    if (barEl) {
      barEl.style.width = progress.percent + '%';
      barEl.setAttribute('aria-valuenow', String(progress.percent));
    }

    const labelEl = document.getElementById('progress-label');
    if (labelEl) {
      labelEl.textContent = progress.percent + '%';
    }
  });

  // timer:complete → show notification (Requirements 2.5, 2.6)
  EventBus.on('timer:complete', function () {
    const message = 'Focus session complete! Great work!';

    // Use the Notification API if permission is already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('DailyBuddy', { body: message });
      } catch (e) {
        // Notification API unavailable in this context — fall through to banner
        _showTimerCompleteBanner(message);
      }
    } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
      // Request permission, then show notification if granted
      Notification.requestPermission().then(function (permission) {
        if (permission === 'granted') {
          try {
            new Notification('DailyBuddy', { body: message });
          } catch (e) {
            _showTimerCompleteBanner(message);
          }
        } else {
          _showTimerCompleteBanner(message);
        }
      }).catch(function () {
        _showTimerCompleteBanner(message);
      });
    } else {
      // Notification API unavailable or denied — use in-page banner
      _showTimerCompleteBanner(message);
    }
  });

  // timer:stopped → briefly show elapsed time in #timer-display (Requirement 2.6)
  EventBus.on('timer:stopped', function (elapsed) {
    const displayEl = document.getElementById('timer-display');
    if (!displayEl) return;

    // Format elapsed seconds as MM:SS
    const clamped = Math.max(0, Math.floor(elapsed || 0));
    const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
    const ss = String(clamped % 60).padStart(2, '0');
    const elapsedText = 'Elapsed: ' + mm + ':' + ss;

    // Show elapsed briefly, then restore the remaining time display
    const previousText = displayEl.textContent;
    displayEl.textContent = elapsedText;

    setTimeout(function () {
      // Restore the remaining time from TimerModule state
      const state = TimerModule.getState();
      displayEl.textContent = TimerModule.formatDisplay(state.remaining);
    }, 2000);
  });

  // ── Private helper: in-page notification banner ───────────────────────────
  /**
   * Create a .notification-banner div, append to body, auto-remove after 5 seconds.
   * @param {string} message
   */
  function _showTimerCompleteBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    // Use textContent — never innerHTML — for user-visible message (Requirement 8.1)
    banner.textContent = message;

    document.body.appendChild(banner);

    // Auto-remove after 5 seconds
    setTimeout(function () {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 5000);
  }

});
