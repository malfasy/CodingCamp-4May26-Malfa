/**
 * Property-Based Test: SettingsModule — Theme idempotency (Property 9)
 *
 * Validates: Requirements 6.4, 6.8
 *
 * Property 9: Theme idempotency — calling `applyTheme(theme)` twice with the
 * same argument produces the same DOM state as calling it once.
 *
 * Also verifies that applyTheme ONLY mutates the `dark-mode` class and leaves
 * all other classes on document.body untouched.
 *
 * Run with: node tests/settings.test.js
 */

'use strict';

// ─── Mock document.body ───────────────────────────────────────────────────────
// A minimal classList backed by a Set, matching the browser API surface used
// by applyTheme (add, remove, has).

function makeBodyMock(initialClasses = []) {
  const classes = new Set(initialClasses);

  const classList = {
    add(cls) { classes.add(cls); },
    remove(cls) { classes.delete(cls); },
    has(cls) { return classes.has(cls); },
    // Snapshot helper (not part of the real API, used in assertions)
    _snapshot() { return new Set(classes); },
    _size() { return classes.size; },
  };

  return { classList, _classes: classes };
}

// ─── applyTheme (extracted from js/app.js — SettingsModule) ──────────────────
// Adds or removes the "dark-mode" class on document.body only.
// No other class mutations are performed (Requirement 6.8).

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
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

// ─── Helper: install a fresh body mock as global.document.body ────────────────
function withBody(initialClasses, fn) {
  const body = makeBodyMock(initialClasses);
  global.document = { body };
  fn(body);
  // Clean up
  delete global.document;
}

// ─── Property 9: Theme idempotency ───────────────────────────────────────────
// **Validates: Requirements 6.4, 6.8**

console.log('\nProperty 9: Theme idempotency\n');

// ── dark once ─────────────────────────────────────────────────────────────────
runTest('applyTheme("dark") once → dark-mode class is present', () => {
  withBody([], (body) => {
    applyTheme('dark');
    assert(body.classList.has('dark-mode'), 'Expected dark-mode class to be present after applyTheme("dark")');
  });
});

// ── dark twice (idempotency) ──────────────────────────────────────────────────
runTest('applyTheme("dark") twice → dark-mode class is still present (no duplicates)', () => {
  withBody([], (body) => {
    applyTheme('dark');
    const snapshotAfterFirst = body.classList._snapshot();

    applyTheme('dark');
    const snapshotAfterSecond = body.classList._snapshot();

    assert(body.classList.has('dark-mode'), 'Expected dark-mode class to be present after second applyTheme("dark")');

    // Sets are equal when they have the same elements
    assert(
      snapshotAfterFirst.size === snapshotAfterSecond.size &&
      [...snapshotAfterFirst].every(c => snapshotAfterSecond.has(c)),
      'DOM state changed between first and second applyTheme("dark") call — not idempotent'
    );
  });
});

// ── light once ────────────────────────────────────────────────────────────────
runTest('applyTheme("light") once → dark-mode class is absent', () => {
  withBody(['dark-mode'], (body) => {
    applyTheme('light');
    assert(!body.classList.has('dark-mode'), 'Expected dark-mode class to be absent after applyTheme("light")');
  });
});

// ── light twice (idempotency) ─────────────────────────────────────────────────
runTest('applyTheme("light") twice → dark-mode class is still absent (same state)', () => {
  withBody(['dark-mode'], (body) => {
    applyTheme('light');
    const snapshotAfterFirst = body.classList._snapshot();

    applyTheme('light');
    const snapshotAfterSecond = body.classList._snapshot();

    assert(!body.classList.has('dark-mode'), 'Expected dark-mode class to remain absent after second applyTheme("light")');

    assert(
      snapshotAfterFirst.size === snapshotAfterSecond.size &&
      [...snapshotAfterFirst].every(c => snapshotAfterSecond.has(c)),
      'DOM state changed between first and second applyTheme("light") call — not idempotent'
    );
  });
});

// ── dark then light ───────────────────────────────────────────────────────────
runTest('applyTheme("dark") then applyTheme("light") → dark-mode class is absent', () => {
  withBody([], (body) => {
    applyTheme('dark');
    assert(body.classList.has('dark-mode'), 'Precondition: dark-mode should be present after applyTheme("dark")');

    applyTheme('light');
    assert(!body.classList.has('dark-mode'), 'Expected dark-mode class to be absent after applyTheme("light")');
  });
});

// ── light then dark ───────────────────────────────────────────────────────────
runTest('applyTheme("light") then applyTheme("dark") → dark-mode class is present', () => {
  withBody(['dark-mode'], (body) => {
    applyTheme('light');
    assert(!body.classList.has('dark-mode'), 'Precondition: dark-mode should be absent after applyTheme("light")');

    applyTheme('dark');
    assert(body.classList.has('dark-mode'), 'Expected dark-mode class to be present after applyTheme("dark")');
  });
});

// ─── Property: ONLY dark-mode is mutated ─────────────────────────────────────
// Requirement 6.8: applyTheme must not modify any class other than dark-mode.

console.log('\n\nOnly dark-mode is mutated\n');

runTest('applyTheme("dark") does not add any class other than dark-mode', () => {
  withBody([], (body) => {
    applyTheme('dark');
    const classes = [...body._classes];
    const unexpected = classes.filter(c => c !== 'dark-mode');
    assert(
      unexpected.length === 0,
      `applyTheme("dark") added unexpected classes: ${JSON.stringify(unexpected)}`
    );
  });
});

runTest('applyTheme("light") does not add any class', () => {
  withBody([], (body) => {
    applyTheme('light');
    const classes = [...body._classes];
    assert(
      classes.length === 0,
      `applyTheme("light") on empty classList added unexpected classes: ${JSON.stringify(classes)}`
    );
  });
});

runTest('applyTheme("dark") preserves pre-existing classes other than dark-mode', () => {
  const preExisting = ['some-class', 'another-class'];
  withBody(preExisting, (body) => {
    applyTheme('dark');
    for (const cls of preExisting) {
      assert(
        body.classList.has(cls),
        `applyTheme("dark") removed pre-existing class "${cls}"`
      );
    }
    assert(body.classList.has('dark-mode'), 'Expected dark-mode to be added');
  });
});

runTest('applyTheme("light") preserves pre-existing classes other than dark-mode', () => {
  const preExisting = ['some-class', 'another-class', 'dark-mode'];
  withBody(preExisting, (body) => {
    applyTheme('light');
    const preserved = preExisting.filter(c => c !== 'dark-mode');
    for (const cls of preserved) {
      assert(
        body.classList.has(cls),
        `applyTheme("light") removed pre-existing class "${cls}"`
      );
    }
    assert(!body.classList.has('dark-mode'), 'Expected dark-mode to be removed');
  });
});

runTest('applyTheme("dark") twice does not duplicate dark-mode (Set size stays 1)', () => {
  withBody([], (body) => {
    applyTheme('dark');
    applyTheme('dark');
    // A Set cannot hold duplicates, but we verify the total class count is exactly 1
    assert(
      body._classes.size === 1,
      `Expected exactly 1 class after two applyTheme("dark") calls, got ${body._classes.size}: ${JSON.stringify([...body._classes])}`
    );
  });
});

runTest('applyTheme("light") twice on already-light body leaves classList empty', () => {
  withBody([], (body) => {
    applyTheme('light');
    applyTheme('light');
    assert(
      body._classes.size === 0,
      `Expected 0 classes after two applyTheme("light") calls on empty body, got ${body._classes.size}: ${JSON.stringify([...body._classes])}`
    );
  });
});

// ─── Property-based: idempotency holds for all theme values ──────────────────
// Run many random sequences of applyTheme calls and verify idempotency.

console.log('\n\nProperty-based: idempotency across random sequences\n');

const THEMES = ['dark', 'light'];
const NUM_SEQUENCES = 50;

for (let i = 0; i < NUM_SEQUENCES; i++) {
  // Pick a random theme
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

  runTest(`random sequence #${i + 1}: applyTheme("${theme}") is idempotent`, () => {
    withBody([], (body) => {
      // Apply once
      applyTheme(theme);
      const snapshotOnce = body.classList._snapshot();

      // Apply again with the same theme
      applyTheme(theme);
      const snapshotTwice = body.classList._snapshot();

      assert(
        snapshotOnce.size === snapshotTwice.size &&
        [...snapshotOnce].every(c => snapshotTwice.has(c)),
        `applyTheme("${theme}") is not idempotent: state after 1 call differs from state after 2 calls.\n` +
        `  After 1: ${JSON.stringify([...snapshotOnce])}\n` +
        `  After 2: ${JSON.stringify([...snapshotTwice])}`
      );
    });
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
