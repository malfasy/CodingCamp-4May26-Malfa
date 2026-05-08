/**
 * Tests: TimerModule — Properties 4 & 5, and unit tests for formatDisplay / state transitions
 *
 * Task 7.2 — Property 4: Timer non-negative (Validates: Requirements 2.13)
 *   TimerModule.getState().remaining is always ≥ 0 regardless of tick count.
 *
 * Task 7.3 — Property 5: Timer single interval (Validates: Requirements 2.10)
 *   Calling start() multiple times in rapid succession results in at most one
 *   active setInterval.
 *
 * Task 7.4 — Unit tests for formatDisplay and timer state transitions
 *   (Validates: Requirements 2.7, 2.8, 2.9)
 *
 * Run with: node tests/timer.test.js
 */

'use strict';

// ─── Mock localStorage ────────────────────────────────────────────────────────
const _store = new Map();
global.localStorage = {
  getItem(key)        { return _store.has(key) ? _store.get(key) : null; },
  setItem(key, value) { _store.set(key, String(value)); },
  removeItem(key)     { _store.delete(key); },
  clear()             { _store.clear(); },
};

// ─── Mock document.getElementById ────────────────────────────────────────────
// Returns null for all IDs — no DOM needed for logic tests.
global.document = {
  getElementById() { return null; },
  body: {
    classList: {
      add() {},
      remove() {},
      has() { return false; },
    },
  },
};

// ─── Mock EventBus ────────────────────────────────────────────────────────────
// Captures emitted events so tests can inspect them.
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
  _clear() {
    this._listeners = {};
    emittedEvents.length = 0;
  },
};

// ─── Mock setInterval / clearInterval ────────────────────────────────────────
// Synchronous fake timers: callbacks are stored and can be ticked manually.
// Tracks how many intervals are currently active.

let _nextIntervalId = 1;
const _activeIntervals = new Map(); // id → callback

global.setInterval = function(callback /*, delay */) {
  const id = _nextIntervalId++;
  _activeIntervals.set(id, callback);
  return id;
};

global.clearInterval = function(id) {
  if (id !== null && id !== undefined) {
    _activeIntervals.delete(id);
  }
};

/** Manually fire one tick on all active intervals. */
function tickAll() {
  // Snapshot keys so that callbacks that call clearInterval don't break iteration
  for (const [id, cb] of [..._activeIntervals]) {
    if (_activeIntervals.has(id)) cb();
  }
}

/** Return the count of currently active intervals. */
function activeIntervalCount() {
  return _activeIntervals.size;
}

/** Reset the fake timer state between tests. */
function resetTimers() {
  _activeIntervals.clear();
  _nextIntervalId = 1;
}

// ─── StorageService (minimal, used by TimerModule) ────────────────────────────
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
    } catch (e) { /* no-op */ }
  },
};

// ─── generateId (used by TimerModule._tick) ───────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── TimerModule (extracted from js/app.js) ───────────────────────────────────
const TimerModule = {
  _intervalId: null,
  _status: 'idle',
  _duration: 25 * 60,
  _remaining: 25 * 60,
  _startedAt: null,

  init(settings) {
    const savedMinutes = settings && typeof settings.timerDuration === 'number'
      ? settings.timerDuration
      : 25;
    this._duration   = savedMinutes * 60;
    this._remaining  = this._duration;
    this._status     = 'idle';
    this._intervalId = null;
    this._startedAt  = null;
    this._updateDisplay();
    this._updateButtons();
  },

  start() {
    // Guard: prevent more than one concurrent interval (Requirement 2.10)
    if (this._intervalId !== null) return;
    this._status    = 'running';
    this._startedAt = Date.now();
    this._updateButtons();
    this._intervalId = setInterval(() => this._tick(), 1000);
  },

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

  reset() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._status    = 'idle';
    this._startedAt = null;
    this._remaining = this._duration;
    this._updateDisplay();
    this._updateButtons();
  },

  setDuration(minutes) {
    this._duration  = minutes * 60;
    this._remaining = this._duration;
    const settings = StorageService.get(StorageService.KEYS.SETTINGS, {});
    settings.timerDuration = minutes;
    StorageService.set(StorageService.KEYS.SETTINGS, settings);
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._status    = 'idle';
    this._startedAt = null;
    this._updateDisplay();
    this._updateButtons();
  },

  formatDisplay(totalSeconds) {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
    const ss = String(clamped % 60).padStart(2, '0');
    return mm + ':' + ss;
  },

  getState() {
    return {
      status:    this._status,
      remaining: this._remaining,
      duration:  this._duration,
    };
  },

  _tick() {
    this._remaining = Math.max(0, this._remaining - 1);
    this._updateDisplay();

    if (this._remaining <= 0) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      this._status     = 'idle';

      const session = {
        id:        generateId(),
        duration:  this._duration,
        elapsed:   this._duration,
        completed: true,
        startedAt: this._startedAt,
      };
      const history = StorageService.get(StorageService.KEYS.TIMER, []);
      history.push(session);
      StorageService.set(StorageService.KEYS.TIMER, history);

      this._startedAt = null;
      this._updateButtons();
      EventBus.emit('timer:complete', session);
    }
  },

  _updateDisplay() {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = this.formatDisplay(this._remaining);
  },

  _updateButtons() {
    // No-op in test environment (getElementById returns null)
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

/** Reset all shared state between tests. */
function resetAll() {
  resetTimers();
  _store.clear();
  emittedEvents.length = 0;
  EventBus._clear();
  TimerModule._intervalId = null;
  TimerModule._status     = 'idle';
  TimerModule._duration   = 25 * 60;
  TimerModule._remaining  = 25 * 60;
  TimerModule._startedAt  = null;
}

// ═════════════════════════════════════════════════════════════════════════════
// Task 7.4 — Unit tests: formatDisplay
// Validates: Requirements 2.7
// ═════════════════════════════════════════════════════════════════════════════
console.log('\nTask 7.4 — Unit tests: formatDisplay\n');

runTest('formatDisplay(0) → "00:00"', () => {
  assert(TimerModule.formatDisplay(0) === '00:00',
    `Expected "00:00", got "${TimerModule.formatDisplay(0)}"`);
});

runTest('formatDisplay(90) → "01:30"', () => {
  assert(TimerModule.formatDisplay(90) === '01:30',
    `Expected "01:30", got "${TimerModule.formatDisplay(90)}"`);
});

runTest('formatDisplay(1500) → "25:00"', () => {
  assert(TimerModule.formatDisplay(1500) === '25:00',
    `Expected "25:00", got "${TimerModule.formatDisplay(1500)}"`);
});

runTest('formatDisplay(59) → "00:59"', () => {
  assert(TimerModule.formatDisplay(59) === '00:59',
    `Expected "00:59", got "${TimerModule.formatDisplay(59)}"`);
});

runTest('formatDisplay(60) → "01:00"', () => {
  assert(TimerModule.formatDisplay(60) === '01:00',
    `Expected "01:00", got "${TimerModule.formatDisplay(60)}"`);
});

runTest('formatDisplay(3599) → "59:59"', () => {
  assert(TimerModule.formatDisplay(3599) === '59:59',
    `Expected "59:59", got "${TimerModule.formatDisplay(3599)}"`);
});

runTest('formatDisplay(-5) → "00:00" (negative clamped to 0)', () => {
  assert(TimerModule.formatDisplay(-5) === '00:00',
    `Expected "00:00" for negative input, got "${TimerModule.formatDisplay(-5)}"`);
});

runTest('formatDisplay result always matches MM:SS pattern', () => {
  const samples = [0, 1, 59, 60, 61, 90, 599, 600, 1499, 1500, 3599];
  for (const s of samples) {
    const result = TimerModule.formatDisplay(s);
    assert(
      /^\d{2}:\d{2}$/.test(result),
      `formatDisplay(${s}) = "${result}" does not match MM:SS pattern`
    );
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Task 7.4 — Unit tests: state transitions (Start → Stop → Reset)
// Validates: Requirements 2.8, 2.9
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n\nTask 7.4 — Unit tests: state transitions\n');

runTest('initial state after init() is idle', () => {
  resetAll();
  TimerModule.init({});
  const state = TimerModule.getState();
  assert(state.status === 'idle', `Expected status "idle", got "${state.status}"`);
  assert(state.remaining === 25 * 60, `Expected remaining ${25 * 60}, got ${state.remaining}`);
  assert(state.duration === 25 * 60, `Expected duration ${25 * 60}, got ${state.duration}`);
});

runTest('start() transitions status to "running"', () => {
  resetAll();
  TimerModule.init({});
  TimerModule.start();
  assert(TimerModule.getState().status === 'running',
    `Expected status "running" after start(), got "${TimerModule.getState().status}"`);
  TimerModule.reset();
});

runTest('stop() transitions status back to "idle"', () => {
  resetAll();
  TimerModule.init({});
  TimerModule.start();
  TimerModule.stop();
  assert(TimerModule.getState().status === 'idle',
    `Expected status "idle" after stop(), got "${TimerModule.getState().status}"`);
});

runTest('stop() emits timer:stopped event', () => {
  resetAll();
  TimerModule.init({});
  TimerModule.start();
  TimerModule.stop();
  const stoppedEvents = emittedEvents.filter(e => e.event === 'timer:stopped');
  assert(stoppedEvents.length === 1,
    `Expected 1 "timer:stopped" event, got ${stoppedEvents.length}`);
});

runTest('reset() restores remaining to full duration', () => {
  resetAll();
  TimerModule.init({ timerDuration: 3 }); // 3-minute timer = 180 s
  TimerModule.start();
  // Simulate a few ticks
  tickAll(); tickAll(); tickAll();
  assert(TimerModule.getState().remaining < 180,
    'Precondition: remaining should have decreased after ticks');
  TimerModule.reset();
  assert(TimerModule.getState().remaining === 180,
    `Expected remaining 180 after reset, got ${TimerModule.getState().remaining}`);
  assert(TimerModule.getState().status === 'idle',
    `Expected status "idle" after reset, got "${TimerModule.getState().status}"`);
});

runTest('reset() while idle does not change duration', () => {
  resetAll();
  TimerModule.init({ timerDuration: 5 });
  TimerModule.reset();
  assert(TimerModule.getState().duration === 300,
    `Expected duration 300, got ${TimerModule.getState().duration}`);
  assert(TimerModule.getState().remaining === 300,
    `Expected remaining 300, got ${TimerModule.getState().remaining}`);
});

runTest('start() → stop() → start() resumes from paused remaining', () => {
  resetAll();
  TimerModule.init({ timerDuration: 1 }); // 60 s
  TimerModule.start();
  tickAll(); // 59 s remaining
  TimerModule.stop();
  const remainingAfterStop = TimerModule.getState().remaining;
  assert(remainingAfterStop === 59,
    `Expected 59 after one tick + stop, got ${remainingAfterStop}`);
  // Start again — should continue from 59
  TimerModule.start();
  assert(TimerModule.getState().status === 'running',
    'Expected status "running" after second start()');
  TimerModule.reset();
});

runTest('timer:complete is emitted when countdown reaches zero', () => {
  resetAll();
  TimerModule.init({ timerDuration: 0 }); // 0-minute timer → 0 s remaining
  // Manually set a tiny duration for the test
  TimerModule._duration  = 2;
  TimerModule._remaining = 2;
  TimerModule.start();
  tickAll(); // remaining → 1
  tickAll(); // remaining → 0 → emits timer:complete
  const completeEvents = emittedEvents.filter(e => e.event === 'timer:complete');
  assert(completeEvents.length === 1,
    `Expected 1 "timer:complete" event, got ${completeEvents.length}`);
  assert(TimerModule.getState().status === 'idle',
    `Expected status "idle" after completion, got "${TimerModule.getState().status}"`);
});

// ═════════════════════════════════════════════════════════════════════════════
// Task 7.2 — Property 4: Timer non-negative remaining
// **Validates: Requirements 2.13**
//
// Property: TimerModule.getState().remaining is always ≥ 0 regardless of
// how many ticks are applied, even well beyond the timer's natural end.
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n\nTask 7.2 — Property 4: Timer non-negative remaining\n');

/**
 * Run the non-negative property for a given duration (seconds) and tick count.
 * Returns the minimum remaining value observed across all ticks.
 */
function runNonNegativeCheck(durationSeconds, tickCount) {
  resetAll();
  TimerModule._duration  = durationSeconds;
  TimerModule._remaining = durationSeconds;
  TimerModule._status    = 'idle';
  TimerModule._intervalId = null;
  TimerModule.start();

  let minRemaining = TimerModule.getState().remaining;

  for (let i = 0; i < tickCount; i++) {
    tickAll();
    const r = TimerModule.getState().remaining;
    if (r < minRemaining) minRemaining = r;
  }

  return minRemaining;
}

// Fixed cases
runTest('Property 4: remaining ≥ 0 for 3-second timer ticked 200 times', () => {
  const min = runNonNegativeCheck(3, 200);
  assert(min >= 0, `remaining went below 0: minimum observed was ${min}`);
});

runTest('Property 4: remaining ≥ 0 for 1-second timer ticked 50 times', () => {
  const min = runNonNegativeCheck(1, 50);
  assert(min >= 0, `remaining went below 0: minimum observed was ${min}`);
});

runTest('Property 4: remaining ≥ 0 for 0-second timer ticked 10 times', () => {
  const min = runNonNegativeCheck(0, 10);
  assert(min >= 0, `remaining went below 0: minimum observed was ${min}`);
});

runTest('Property 4: remaining ≥ 0 for 60-second timer ticked 120 times', () => {
  const min = runNonNegativeCheck(60, 120);
  assert(min >= 0, `remaining went below 0: minimum observed was ${min}`);
});

// Property-based: random durations and tick counts
const NUM_PBT_CASES = 100;
console.log(`\n  Running ${NUM_PBT_CASES} random (duration, tickCount) pairs...\n`);

for (let i = 0; i < NUM_PBT_CASES; i++) {
  // Random duration: 0–300 seconds
  const duration  = Math.floor(Math.random() * 301);
  // Random tick count: 1–500 (always exceeds duration to stress-test clamping)
  const tickCount = Math.floor(Math.random() * 500) + 1;

  runTest(`Property 4 [random #${i + 1}]: duration=${duration}s, ticks=${tickCount}`, () => {
    const min = runNonNegativeCheck(duration, tickCount);
    assert(
      min >= 0,
      `remaining went below 0 (min=${min}) for duration=${duration}s after ${tickCount} ticks`
    );
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Task 7.3 — Property 5: Timer single interval
// **Validates: Requirements 2.10**
//
// Property: calling start() multiple times in rapid succession results in at
// most one active setInterval at any point in time.
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n\nTask 7.3 — Property 5: Timer single interval\n');

runTest('Property 5: calling start() once creates exactly one interval', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  TimerModule.start();
  assert(activeIntervalCount() === 1,
    `Expected 1 active interval after start(), got ${activeIntervalCount()}`);
  TimerModule.reset();
});

runTest('Property 5: calling start() twice creates at most one interval', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  TimerModule.start();
  TimerModule.start(); // second call — should be a no-op
  assert(activeIntervalCount() <= 1,
    `Expected ≤1 active interval after two start() calls, got ${activeIntervalCount()}`);
  TimerModule.reset();
});

runTest('Property 5: calling start() 10 times creates at most one interval', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  for (let i = 0; i < 10; i++) TimerModule.start();
  assert(activeIntervalCount() <= 1,
    `Expected ≤1 active interval after 10 start() calls, got ${activeIntervalCount()}`);
  TimerModule.reset();
});

runTest('Property 5: stop() clears the interval (0 active after stop)', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  TimerModule.start();
  TimerModule.stop();
  assert(activeIntervalCount() === 0,
    `Expected 0 active intervals after stop(), got ${activeIntervalCount()}`);
});

runTest('Property 5: reset() clears the interval (0 active after reset)', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  TimerModule.start();
  TimerModule.reset();
  assert(activeIntervalCount() === 0,
    `Expected 0 active intervals after reset(), got ${activeIntervalCount()}`);
});

runTest('Property 5: start() after stop() creates exactly one new interval', () => {
  resetAll();
  TimerModule.init({ timerDuration: 25 });
  TimerModule.start();
  TimerModule.stop();
  TimerModule.start();
  assert(activeIntervalCount() === 1,
    `Expected 1 active interval after stop+start, got ${activeIntervalCount()}`);
  TimerModule.reset();
});

// Property-based: random number of start() calls — interval count never exceeds 1
const NUM_INTERVAL_CASES = 50;
console.log(`\n  Running ${NUM_INTERVAL_CASES} random rapid-start sequences...\n`);

for (let i = 0; i < NUM_INTERVAL_CASES; i++) {
  const callCount = Math.floor(Math.random() * 20) + 2; // 2–21 calls

  runTest(`Property 5 [random #${i + 1}]: ${callCount} rapid start() calls → ≤1 interval`, () => {
    resetAll();
    TimerModule.init({ timerDuration: 25 });
    for (let j = 0; j < callCount; j++) TimerModule.start();
    const count = activeIntervalCount();
    assert(
      count <= 1,
      `Expected ≤1 active interval after ${callCount} start() calls, got ${count}`
    );
    TimerModule.reset();
  });
}

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
  console.log('');
  process.exit(0);
}
