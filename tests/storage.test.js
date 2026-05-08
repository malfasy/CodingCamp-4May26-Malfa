/**
 * Property-Based Test: StorageService round-trip (Property 6)
 *
 * Validates: Requirements 7.10
 *
 * Property 6: Storage round-trip — for any serializable value `v`,
 * `StorageService.get(key, null)` returns a deep-equal value after
 * `StorageService.set(key, v)`.
 *
 * Run with: node tests/storage.test.js
 */

'use strict';

// ─── Mock localStorage ────────────────────────────────────────────────────────
// Simulates the browser localStorage API using an in-memory Map.
const store = new Map();

const localStorageMock = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
  clear() {
    store.clear();
  },
};

// Inject mock as global so StorageService code can reference it
global.localStorage = localStorageMock;

// ─── StorageService (extracted from js/app.js) ────────────────────────────────
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
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently no-op
    }
  },

  /**
   * Remove a key from localStorage.
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently no-op
    }
  },
};

// ─── Random Value Generator ───────────────────────────────────────────────────
// Generates random JSON-serializable values: primitives, arrays, plain objects,
// and nested combinations thereof.

const MAX_DEPTH = 4;
const MAX_ARRAY_LENGTH = 8;
const MAX_OBJECT_KEYS = 6;
const STRING_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-!@#$%^&*()[]{}';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(maxLen = 20) {
  const len = randomInt(0, maxLen);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += STRING_CHARS[randomInt(0, STRING_CHARS.length - 1)];
  }
  return s;
}

function randomNumber() {
  const choices = [
    0,
    1,
    -1,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    randomInt(-1e9, 1e9),
    parseFloat((Math.random() * 1e6 - 5e5).toFixed(6)),
  ];
  return choices[randomInt(0, choices.length - 1)];
}

function randomPrimitive() {
  const type = randomInt(0, 3);
  switch (type) {
    case 0: return randomString();
    case 1: return randomNumber();
    case 2: return Math.random() < 0.5;
    case 3: return null;
  }
}

function randomSerializable(depth = 0) {
  // At max depth, only generate primitives to avoid unbounded recursion
  if (depth >= MAX_DEPTH) {
    return randomPrimitive();
  }

  const type = randomInt(0, 4);
  switch (type) {
    case 0:
    case 1:
      // Primitives are more common (2 out of 5 chances)
      return randomPrimitive();
    case 2: {
      // Array
      const len = randomInt(0, MAX_ARRAY_LENGTH);
      const arr = [];
      for (let i = 0; i < len; i++) {
        arr.push(randomSerializable(depth + 1));
      }
      return arr;
    }
    case 3: {
      // Plain object
      const numKeys = randomInt(0, MAX_OBJECT_KEYS);
      const obj = {};
      for (let i = 0; i < numKeys; i++) {
        const key = randomString(10) || `k${i}`; // ensure non-empty key
        obj[key] = randomSerializable(depth + 1);
      }
      return obj;
    }
    case 4: {
      // Nested array of objects (common real-world pattern like tasks/links arrays)
      const len = randomInt(0, 4);
      const arr = [];
      for (let i = 0; i < len; i++) {
        const numKeys = randomInt(1, MAX_OBJECT_KEYS);
        const obj = {};
        for (let j = 0; j < numKeys; j++) {
          const key = randomString(8) || `k${j}`;
          obj[key] = randomPrimitive();
        }
        arr.push(obj);
      }
      return arr;
    }
  }
}

// ─── Deep Equality ────────────────────────────────────────────────────────────
function deepEqual(a, b) {
  if (a === b) return true;

  // Handle null (typeof null === 'object')
  if (a === null || b === null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') {
    // Primitives: NaN check
    if (typeof a === 'number' && isNaN(a) && isNaN(b)) return true;
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Plain objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

// ─── Property 6: Storage round-trip ──────────────────────────────────────────
// **Validates: Requirements 7.10**
//
// For any serializable value `v`, StorageService.get(key, null) returns a
// deep-equal value after StorageService.set(key, v).

const TEST_KEY = 'pbt_roundtrip_test_key';
const NUM_CASES = 100;

console.log(`\nProperty 6: Storage round-trip — running ${NUM_CASES} random cases\n`);

// Seed with a fixed set of interesting edge cases first
const edgeCases = [
  null,
  true,
  false,
  0,
  -0,          // JSON.stringify(-0) === "0", so round-trip gives 0 (both are 0 in deepEqual)
  1,
  -1,
  '',
  'hello',
  'with "quotes" and \\backslashes',
  [],
  [null, true, false, 0, ''],
  {},
  { a: 1, b: null, c: [1, 2, 3] },
  [{ id: '1', text: 'Buy groceries', done: false, createdAt: 1715000000000, completedAt: null }],
  { name: 'Friend', theme: 'light', timerDuration: 25 },
  [{ id: 'abc', label: 'GitHub', url: 'https://github.com' }],
  { nested: { deeply: { value: [1, 2, { x: true }] } } },
  Array.from({ length: 50 }, (_, i) => ({ id: String(i), done: i % 2 === 0 })),
];

// Run edge cases
for (const value of edgeCases) {
  runTest(`edge case: ${JSON.stringify(value).slice(0, 60)}`, () => {
    store.clear();
    StorageService.set(TEST_KEY, value);
    const retrieved = StorageService.get(TEST_KEY, null);

    // Special case: -0 serializes to "0" in JSON, so round-trip gives 0.
    // Both -0 === 0 is true in JS, so deepEqual handles this correctly.
    assert(
      deepEqual(retrieved, value),
      `Round-trip failed.\n  Written:   ${JSON.stringify(value)}\n  Retrieved: ${JSON.stringify(retrieved)}`
    );
  });
}

// Run random cases to reach 100+ total
const randomCasesNeeded = Math.max(0, NUM_CASES - edgeCases.length);
for (let i = 0; i < randomCasesNeeded; i++) {
  const value = randomSerializable();
  runTest(`random case #${i + 1}: ${JSON.stringify(value).slice(0, 60)}`, () => {
    store.clear();
    StorageService.set(TEST_KEY, value);
    const retrieved = StorageService.get(TEST_KEY, null);

    assert(
      deepEqual(retrieved, value),
      `Round-trip failed.\n  Written:   ${JSON.stringify(value)}\n  Retrieved: ${JSON.stringify(retrieved)}`
    );
  });
}

// ─── Additional property checks ───────────────────────────────────────────────

// Missing key returns fallback
runTest('missing key returns fallback value', () => {
  store.clear();
  const fallback = { default: true };
  const result = StorageService.get('nonexistent_key', fallback);
  assert(result === fallback, `Expected fallback object, got: ${JSON.stringify(result)}`);
});

// Corrupted JSON returns fallback
runTest('corrupted JSON returns fallback', () => {
  store.clear();
  store.set('corrupt_key', '{not valid json}}}');
  const fallback = [];
  const result = StorageService.get('corrupt_key', fallback);
  assert(result === fallback, `Expected fallback on parse error, got: ${JSON.stringify(result)}`);
});

// remove() makes key return fallback
runTest('remove() causes subsequent get() to return fallback', () => {
  store.clear();
  StorageService.set(TEST_KEY, [1, 2, 3]);
  StorageService.remove(TEST_KEY);
  const result = StorageService.get(TEST_KEY, null);
  assert(result === null, `Expected null after remove, got: ${JSON.stringify(result)}`);
});

// Overwrite: last write wins
runTest('overwrite: last set() value is returned by get()', () => {
  store.clear();
  StorageService.set(TEST_KEY, { version: 1 });
  StorageService.set(TEST_KEY, { version: 2 });
  const result = StorageService.get(TEST_KEY, null);
  assert(
    deepEqual(result, { version: 2 }),
    `Expected { version: 2 }, got: ${JSON.stringify(result)}`
  );
});

// ─── Results ──────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n\n${'─'.repeat(60)}`);
console.log(`Results: ${passed}/${total} passed`);

if (failures.length > 0) {
  console.log(`\nFailures:`);
  for (const { name, error } of failures) {
    console.log(`\n  ✗ ${name}`);
    console.log(`    ${error.replace(/\n/g, '\n    ')}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log(`\nAll ${total} tests passed. ✓`);
  console.log(`  - ${edgeCases.length} edge cases`);
  console.log(`  - ${randomCasesNeeded} random cases`);
  console.log(`  - 4 additional property checks`);
  console.log('');
  process.exit(0);
}
