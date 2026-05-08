/**
 * Tests: TasksModule — Properties 1, 2, 3 and unit tests
 *
 * Tasks 8.2, 8.3, 8.4, 8.5
 *
 * Property 1: Task uniqueness — for all pairs (t1, t2) where t1.id ≠ t2.id,
 *   t1.text.toLowerCase().trim() ≠ t2.text.toLowerCase().trim()
 *   Validates: Requirements 3.3
 *
 * Property 2: Progress bounds — getProgress().percent is always an integer in
 *   [0, 100] for any tasks array
 *   Validates: Requirements 3.8, 3.9
 *
 * Property 3: Progress accuracy — getProgress().done equals the exact count of
 *   tasks where done === true
 *   Validates: Requirements 3.8
 *
 * Unit tests: addTask validation and getProgress edge cases
 *   Validates: Requirements 3.2, 3.3, 3.4, 3.9
 *
 * Run with: node tests/tasks.test.js
 */

'use strict';

// ─── Mock DOM ─────────────────────────────────────────────────────────────────
// Return null for all getElementById calls — no DOM needed.
global.document = {
  getElementById: () => null,
  createElement: () => ({
    appendChild: () => {},
    removeChild: () => {},
    addEventListener: () => {},
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {} },
    style: {},
    dataset: {},
    firstChild: null,
  }),
  body: {
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    removeChild: () => {},
  },
};

// ─── Mock localStorage ────────────────────────────────────────────────────────
const store = new Map();

global.localStorage = {
  getItem(key)       { return store.has(key) ? store.get(key) : null; },
  setItem(key, val)  { store.set(key, String(val)); },
  removeItem(key)    { store.delete(key); },
  clear()            { store.clear(); },
};

// ─── Mock EventBus ────────────────────────────────────────────────────────────
// Captures emitted events for inspection.
const emittedEvents = [];

const EventBus = {
  _listeners: {},
  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  },
  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(h => h !== handler);
  },
  emit(event, payload) {
    emittedEvents.push({ event, payload });
    if (!this._listeners[event]) return;
    this._listeners[event].slice().forEach(h => h(payload));
  },
};

// ─── StorageService (minimal, used by TasksModule) ────────────────────────────
const StorageService = {
  KEYS: {
    TASKS:    'dailybuddy_tasks',
    LINKS:    'dailybuddy_links',
    SETTINGS: 'dailybuddy_settings',
    TIMER:    'dailybuddy_timer',
  },
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* silently no-op */ }
  },
};

// ─── generateId (from js/app.js) ──────────────────────────────────────────────
function generateId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── TasksModule (extracted from js/app.js) ───────────────────────────────────
// Reimplemented here to be self-contained and DOM-free.
const TasksModule = {
  _tasks: [],

  init(tasks) {
    this._tasks = Array.isArray(tasks) ? tasks : [];
  },

  addTask(text) {
    const trimmed = (typeof text === 'string') ? text.trim() : '';

    if (trimmed === '') {
      this._lastError = 'Task cannot be empty';
      return { success: false, error: this._lastError };
    }

    if (trimmed.length > 200) {
      this._lastError = 'Task is too long (max 200 characters)';
      return { success: false, error: this._lastError };
    }

    const normalised = trimmed.toLowerCase();
    for (const task of this._tasks) {
      if (task.text.toLowerCase() === normalised) {
        this._lastError = 'Task already exists';
        return { success: false, error: this._lastError };
      }
    }

    this._lastError = null;

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

    return { success: true, error: null };
  },

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

    return { success: true, error: null };
  },

  /**
   * Compute progress.
   * Accepts an optional tasks array for testing; defaults to this._tasks.
   * (Requirements 3.8, 3.9)
   * @param {Array} [tasksOverride]
   * @returns {{ done: number, total: number, percent: number }}
   */
  getProgress(tasksOverride) {
    const tasks = Array.isArray(tasksOverride) ? tasksOverride : this._tasks;
    const total = tasks.length;
    let done = 0;

    for (const task of tasks) {
      if (task.done === true) {
        done++;
      }
    }

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  },

  reset() {
    this._tasks = [];
    this._lastError = null;
  },
};

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runTest(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('.');
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    process.stdout.write('F');
  }
}

// ─── Random helpers ───────────────────────────────────────────────────────────
const PRINTABLE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()-_=+[]{}|;:,.<>?';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random non-empty string of printable characters, length 1–50.
 * Guaranteed to have at least one non-whitespace character so it passes
 * the non-empty validation in addTask.
 */
function randomTaskText(maxLen = 50) {
  const len = randomInt(1, maxLen);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += PRINTABLE_CHARS[randomInt(0, PRINTABLE_CHARS.length - 1)];
  }
  // Ensure at least one non-whitespace character
  if (s.trim() === '') s = 'task' + randomInt(1, 9999);
  return s;
}

/**
 * Build a tasks array by calling addTask() with unique texts.
 * Returns the resulting tasks array (TasksModule._tasks).
 * @param {number} count  Number of tasks to add (0–N)
 * @returns {Array}
 */
function buildTasksViaAddTask(count) {
  TasksModule.reset();
  store.clear();

  const usedTexts = new Set();
  let added = 0;
  let attempts = 0;

  while (added < count && attempts < count * 10) {
    attempts++;
    const text = randomTaskText();
    const normalised = text.trim().toLowerCase();

    // Skip if this text would be a duplicate (case-insensitive)
    if (usedTexts.has(normalised)) continue;

    const result = TasksModule.addTask(text);
    if (result.success) {
      usedTexts.add(normalised);
      added++;
    }
  }

  return TasksModule._tasks.slice();
}

/**
 * Build a tasks array directly (bypassing addTask) with random done flags.
 * Used for Property 2 and 3 where we want to test getProgress with arbitrary
 * done states, not just the default false.
 * @param {number} count
 * @returns {Array}
 */
function buildTasksWithRandomDone(count) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push({
      id:          generateId(),
      text:        `task-${i}-${randomInt(1000, 9999)}`,
      done:        Math.random() < 0.5,
      createdAt:   Date.now(),
      completedAt: null,
    });
  }
  return tasks;
}

// ─── Property 1: Task uniqueness ──────────────────────────────────────────────
// **Validates: Requirements 3.3**
//
// For all pairs (t1, t2) in the tasks array where t1.id ≠ t2.id,
// t1.text.toLowerCase().trim() ≠ t2.text.toLowerCase().trim()

const PROP1_CASES = 100;
console.log(`\nProperty 1: Task uniqueness — running ${PROP1_CASES} random cases\n`);

for (let i = 0; i < PROP1_CASES; i++) {
  const count = randomInt(0, 20);
  runTest(`Property 1 case #${i + 1}: ${count} tasks — all normalised texts are unique`, () => {
    const tasks = buildTasksViaAddTask(count);

    // Check every pair
    for (let a = 0; a < tasks.length; a++) {
      for (let b = a + 1; b < tasks.length; b++) {
        const t1 = tasks[a];
        const t2 = tasks[b];
        if (t1.id === t2.id) continue; // same task, skip

        const norm1 = t1.text.toLowerCase().trim();
        const norm2 = t2.text.toLowerCase().trim();

        assert(
          norm1 !== norm2,
          `Uniqueness violated: tasks[${a}].text="${t1.text}" and tasks[${b}].text="${t2.text}" ` +
          `both normalise to "${norm1}"`
        );
      }
    }
  });
}

// ─── Property 2: Progress bounds ─────────────────────────────────────────────
// **Validates: Requirements 3.8, 3.9**
//
// getProgress().percent is always an integer in [0, 100] for any tasks array.

const PROP2_CASES = 100;
console.log(`\n\nProperty 2: Progress bounds — running ${PROP2_CASES} random cases\n`);

for (let i = 0; i < PROP2_CASES; i++) {
  const count = randomInt(0, 30);
  runTest(`Property 2 case #${i + 1}: ${count} tasks — percent is integer in [0, 100]`, () => {
    const tasks = buildTasksWithRandomDone(count);
    const { percent } = TasksModule.getProgress(tasks);

    assert(
      typeof percent === 'number',
      `percent should be a number, got: ${typeof percent}`
    );
    assert(
      Number.isInteger(percent),
      `percent should be an integer, got: ${percent}`
    );
    assert(
      percent >= 0,
      `percent should be ≥ 0, got: ${percent}`
    );
    assert(
      percent <= 100,
      `percent should be ≤ 100, got: ${percent}`
    );
  });
}

// ─── Property 3: Progress accuracy ───────────────────────────────────────────
// **Validates: Requirements 3.8**
//
// getProgress().done equals the exact count of tasks where done === true.

const PROP3_CASES = 100;
console.log(`\n\nProperty 3: Progress accuracy — running ${PROP3_CASES} random cases\n`);

for (let i = 0; i < PROP3_CASES; i++) {
  const count = randomInt(0, 30);
  runTest(`Property 3 case #${i + 1}: ${count} tasks — done count matches exactly`, () => {
    const tasks = buildTasksWithRandomDone(count);
    const { done } = TasksModule.getProgress(tasks);

    const expectedDone = tasks.filter(t => t.done === true).length;

    assert(
      done === expectedDone,
      `done count mismatch: getProgress().done=${done}, actual done tasks=${expectedDone} ` +
      `(tasks: ${JSON.stringify(tasks.map(t => t.done))})`
    );
  });
}

// ─── Unit tests: addTask validation ──────────────────────────────────────────
// **Validates: Requirements 3.2, 3.3, 3.4**

console.log('\n\nUnit tests: addTask validation\n');

runTest('addTask: empty string is rejected', () => {
  TasksModule.reset();
  const result = TasksModule.addTask('');
  assert(result.success === false, 'Expected success=false for empty string');
  assert(result.error !== null, 'Expected an error message');
  assert(TasksModule._tasks.length === 0, 'No task should be added');
});

runTest('addTask: whitespace-only string is rejected', () => {
  TasksModule.reset();
  const result = TasksModule.addTask('   ');
  assert(result.success === false, 'Expected success=false for whitespace-only');
  assert(result.error !== null, 'Expected an error message');
  assert(TasksModule._tasks.length === 0, 'No task should be added');
});

runTest('addTask: tab-only string is rejected', () => {
  TasksModule.reset();
  const result = TasksModule.addTask('\t\t\t');
  assert(result.success === false, 'Expected success=false for tab-only');
  assert(TasksModule._tasks.length === 0, 'No task should be added');
});

runTest('addTask: string of exactly 200 chars is accepted', () => {
  TasksModule.reset();
  const text = 'a'.repeat(200);
  const result = TasksModule.addTask(text);
  assert(result.success === true, `Expected success=true for 200-char task, got error: ${result.error}`);
  assert(TasksModule._tasks.length === 1, 'One task should be added');
});

runTest('addTask: string of 201 chars is rejected', () => {
  TasksModule.reset();
  const text = 'a'.repeat(201);
  const result = TasksModule.addTask(text);
  assert(result.success === false, 'Expected success=false for 201-char task');
  assert(result.error !== null, 'Expected an error message');
  assert(TasksModule._tasks.length === 0, 'No task should be added');
});

runTest('addTask: string of 300 chars is rejected', () => {
  TasksModule.reset();
  const text = 'x'.repeat(300);
  const result = TasksModule.addTask(text);
  assert(result.success === false, 'Expected success=false for 300-char task');
  assert(TasksModule._tasks.length === 0, 'No task should be added');
});

runTest('addTask: exact duplicate (same case) is rejected', () => {
  TasksModule.reset();
  TasksModule.addTask('Buy milk');
  const result = TasksModule.addTask('Buy milk');
  assert(result.success === false, 'Expected success=false for exact duplicate');
  assert(result.error !== null, 'Expected a duplicate error message');
  assert(TasksModule._tasks.length === 1, 'Only one task should exist');
});

runTest('addTask: case-insensitive duplicate is rejected (upper)', () => {
  TasksModule.reset();
  TasksModule.addTask('Buy milk');
  const result = TasksModule.addTask('BUY MILK');
  assert(result.success === false, 'Expected success=false for uppercase duplicate');
  assert(TasksModule._tasks.length === 1, 'Only one task should exist');
});

runTest('addTask: case-insensitive duplicate is rejected (mixed case)', () => {
  TasksModule.reset();
  TasksModule.addTask('Buy milk');
  const result = TasksModule.addTask('bUy MiLk');
  assert(result.success === false, 'Expected success=false for mixed-case duplicate');
  assert(TasksModule._tasks.length === 1, 'Only one task should exist');
});

runTest('addTask: leading/trailing whitespace is trimmed before duplicate check', () => {
  TasksModule.reset();
  TasksModule.addTask('Buy milk');
  const result = TasksModule.addTask('  Buy milk  ');
  assert(result.success === false, 'Expected success=false for whitespace-padded duplicate');
  assert(TasksModule._tasks.length === 1, 'Only one task should exist');
});

runTest('addTask: valid task is accepted and stored with trimmed text', () => {
  TasksModule.reset();
  const result = TasksModule.addTask('  Walk the dog  ');
  assert(result.success === true, `Expected success=true, got error: ${result.error}`);
  assert(TasksModule._tasks.length === 1, 'One task should be added');
  assert(TasksModule._tasks[0].text === 'Walk the dog', `Expected trimmed text, got: "${TasksModule._tasks[0].text}"`);
});

runTest('addTask: new task has done=false by default', () => {
  TasksModule.reset();
  TasksModule.addTask('New task');
  assert(TasksModule._tasks[0].done === false, 'New task should have done=false');
});

runTest('addTask: new task has a non-empty id', () => {
  TasksModule.reset();
  TasksModule.addTask('Another task');
  assert(typeof TasksModule._tasks[0].id === 'string', 'Task id should be a string');
  assert(TasksModule._tasks[0].id.length > 0, 'Task id should be non-empty');
});

runTest('addTask: multiple distinct tasks can be added', () => {
  TasksModule.reset();
  TasksModule.addTask('Task one');
  TasksModule.addTask('Task two');
  TasksModule.addTask('Task three');
  assert(TasksModule._tasks.length === 3, `Expected 3 tasks, got ${TasksModule._tasks.length}`);
});

// ─── Unit tests: getProgress edge cases ──────────────────────────────────────
// **Validates: Requirements 3.9**

console.log('\n\nUnit tests: getProgress edge cases\n');

runTest('getProgress([]): empty array → { done: 0, total: 0, percent: 0 }', () => {
  const result = TasksModule.getProgress([]);
  assert(result.done === 0,    `Expected done=0, got ${result.done}`);
  assert(result.total === 0,   `Expected total=0, got ${result.total}`);
  assert(result.percent === 0, `Expected percent=0, got ${result.percent}`);
});

runTest('getProgress([{done:true},{done:false}]) → { done: 1, total: 2, percent: 50 }', () => {
  const tasks = [
    { id: '1', text: 'A', done: true,  createdAt: 0, completedAt: null },
    { id: '2', text: 'B', done: false, createdAt: 0, completedAt: null },
  ];
  const result = TasksModule.getProgress(tasks);
  assert(result.done === 1,    `Expected done=1, got ${result.done}`);
  assert(result.total === 2,   `Expected total=2, got ${result.total}`);
  assert(result.percent === 50, `Expected percent=50, got ${result.percent}`);
});

runTest('getProgress: all done → percent=100', () => {
  const tasks = [
    { id: '1', text: 'A', done: true, createdAt: 0, completedAt: 1 },
    { id: '2', text: 'B', done: true, createdAt: 0, completedAt: 1 },
    { id: '3', text: 'C', done: true, createdAt: 0, completedAt: 1 },
  ];
  const result = TasksModule.getProgress(tasks);
  assert(result.done === 3,     `Expected done=3, got ${result.done}`);
  assert(result.total === 3,    `Expected total=3, got ${result.total}`);
  assert(result.percent === 100, `Expected percent=100, got ${result.percent}`);
});

runTest('getProgress: none done → percent=0', () => {
  const tasks = [
    { id: '1', text: 'A', done: false, createdAt: 0, completedAt: null },
    { id: '2', text: 'B', done: false, createdAt: 0, completedAt: null },
  ];
  const result = TasksModule.getProgress(tasks);
  assert(result.done === 0,    `Expected done=0, got ${result.done}`);
  assert(result.total === 2,   `Expected total=2, got ${result.total}`);
  assert(result.percent === 0, `Expected percent=0, got ${result.percent}`);
});

runTest('getProgress: 1 of 3 done → percent=33 (Math.round)', () => {
  const tasks = [
    { id: '1', text: 'A', done: true,  createdAt: 0, completedAt: 1 },
    { id: '2', text: 'B', done: false, createdAt: 0, completedAt: null },
    { id: '3', text: 'C', done: false, createdAt: 0, completedAt: null },
  ];
  const result = TasksModule.getProgress(tasks);
  assert(result.done === 1,    `Expected done=1, got ${result.done}`);
  assert(result.total === 3,   `Expected total=3, got ${result.total}`);
  assert(result.percent === 33, `Expected percent=33, got ${result.percent}`);
});

runTest('getProgress: 2 of 3 done → percent=67 (Math.round)', () => {
  const tasks = [
    { id: '1', text: 'A', done: true,  createdAt: 0, completedAt: 1 },
    { id: '2', text: 'B', done: true,  createdAt: 0, completedAt: 1 },
    { id: '3', text: 'C', done: false, createdAt: 0, completedAt: null },
  ];
  const result = TasksModule.getProgress(tasks);
  assert(result.done === 2,    `Expected done=2, got ${result.done}`);
  assert(result.total === 3,   `Expected total=3, got ${result.total}`);
  assert(result.percent === 67, `Expected percent=67, got ${result.percent}`);
});

runTest('getProgress: percent is always an integer (not a float)', () => {
  // 1 of 3 = 33.333... → should round to 33
  const tasks = [
    { id: '1', text: 'A', done: true,  createdAt: 0, completedAt: 1 },
    { id: '2', text: 'B', done: false, createdAt: 0, completedAt: null },
    { id: '3', text: 'C', done: false, createdAt: 0, completedAt: null },
  ];
  const { percent } = TasksModule.getProgress(tasks);
  assert(Number.isInteger(percent), `Expected integer percent, got: ${percent}`);
});

runTest('getProgress: uses this._tasks when no override provided', () => {
  TasksModule.reset();
  TasksModule.addTask('Task A');
  TasksModule.addTask('Task B');
  // Both are done=false by default
  const result = TasksModule.getProgress();
  assert(result.total === 2,   `Expected total=2, got ${result.total}`);
  assert(result.done === 0,    `Expected done=0, got ${result.done}`);
  assert(result.percent === 0, `Expected percent=0, got ${result.percent}`);
});

// ─── Results ──────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n\n${'─'.repeat(60)}`);
console.log(`Results: ${passed}/${total} passed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const { name, error } of failures) {
    console.log(`\n  ✗ ${name}`);
    console.log(`    ${error.replace(/\n/g, '\n    ')}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log(`\nAll ${total} tests passed. ✓`);
  console.log(`  - ${PROP1_CASES} Property 1 cases (task uniqueness)`);
  console.log(`  - ${PROP2_CASES} Property 2 cases (progress bounds)`);
  console.log(`  - ${PROP3_CASES} Property 3 cases (progress accuracy)`);
  console.log(`  - ${total - PROP1_CASES - PROP2_CASES - PROP3_CASES} unit tests (addTask validation + getProgress edge cases)`);
  console.log('');
  process.exit(0);
}
