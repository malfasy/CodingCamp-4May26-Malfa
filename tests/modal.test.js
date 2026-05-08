/**
 * Tests: TaskModal — Tasks 9.2 and 9.3
 *
 * Task 9.2: Unit tests for `sortTasks` and modal open/close DOM state
 *   - sortTasks(tasks, "az") returns alphabetically sorted array without mutating input
 *   - sortTasks(tasks, "done-last") places all done tasks after undone tasks
 *   - sortTasks(tasks, "default") preserves createdAt ascending order
 *   - After closeEditModal(), no .edit-tasks-modal or .modal-backdrop in DOM
 *   Validates: Requirements 4.3, 4.4, 4.10, 4.11
 *
 * Task 9.3: Property test for sort non-destructive (Property 8)
 *   Property 8: Sort non-destructive — sortTasks(tasks, strategy).length === tasks.length
 *   for all valid strategies and any tasks array; original array is not mutated
 *   **Validates: Requirements 4.4**
 *
 * Run with: node tests/modal.test.js
 */

'use strict';

// ─── sortTasks (extracted from js/app.js) ─────────────────────────────────────
/**
 * Return a new sorted array of tasks without mutating the original.
 * (Requirements 4.3, 4.4)
 *
 * @param {Array}  tasks     Array of Task objects
 * @param {string} strategy  "default" | "az" | "done-last"
 * @returns {Array}  New array (shallow copy), original is NOT mutated
 */
function sortTasks(tasks, strategy) {
  const sorted = tasks.slice(); // shallow copy — never mutate the caller's array

  if (strategy === 'az') {
    sorted.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
  } else if (strategy === 'done-last') {
    sorted.sort((a, b) => {
      if (a.done === b.done) return 0;
      if (a.done === true)   return 1;
      return -1;
    });
  } else { // "default"
    sorted.sort((a, b) => a.createdAt - b.createdAt);
  }

  return sorted;
}

// ─── Minimal DOM mock ─────────────────────────────────────────────────────────
// Tracks elements appended to document.body in an array.
// Implements querySelector to find elements by class name.
// Implements remove() on elements.
function createDomMock() {
  const bodyChildren = [];

  function makeElement(className) {
    const el = {
      className,
      _children: [],
      _listeners: {},
      dataset: {},
      style: {},
      textContent: '',
      hidden: false,
      disabled: false,
      getAttribute() { return null; },
      setAttribute() {},
      addEventListener(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
      },
      appendChild(child) { this._children.push(child); },
      removeChild(child) {
        const idx = this._children.indexOf(child);
        if (idx !== -1) this._children.splice(idx, 1);
      },
      querySelector(selector) {
        // Support ".classname" selectors only
        const cls = selector.startsWith('.') ? selector.slice(1) : null;
        if (!cls) return null;
        return findByClass(this._children, cls);
      },
      querySelectorAll(selector) {
        const cls = selector.startsWith('.') ? selector.slice(1) : null;
        if (!cls) return [];
        return findAllByClass(this._children, cls);
      },
      focus() {},
      remove() {
        // Remove from bodyChildren if present
        const idx = bodyChildren.indexOf(this);
        if (idx !== -1) bodyChildren.splice(idx, 1);
      },
      get firstChild() {
        return this._children.length > 0 ? this._children[0] : null;
      },
    };
    return el;
  }

  function findByClass(children, cls) {
    for (const child of children) {
      if (child.className && child.className.split(' ').includes(cls)) return child;
      const found = findByClass(child._children || [], cls);
      if (found) return found;
    }
    return null;
  }

  function findAllByClass(children, cls) {
    const results = [];
    for (const child of children) {
      if (child.className && child.className.split(' ').includes(cls)) results.push(child);
      const nested = findAllByClass(child._children || [], cls);
      results.push(...nested);
    }
    return results;
  }

  const body = {
    _children: bodyChildren,
    classList: { add() {}, remove() {} },
    appendChild(child) { bodyChildren.push(child); },
    removeChild(child) {
      const idx = bodyChildren.indexOf(child);
      if (idx !== -1) bodyChildren.splice(idx, 1);
    },
    querySelector(selector) {
      const cls = selector.startsWith('.') ? selector.slice(1) : null;
      if (!cls) return null;
      return findByClass(bodyChildren, cls);
    },
    querySelectorAll(selector) {
      const cls = selector.startsWith('.') ? selector.slice(1) : null;
      if (!cls) return [];
      return findAllByClass(bodyChildren, cls);
    },
  };

  const doc = {
    body,
    _activeElement: null,
    get activeElement() { return this._activeElement; },
    getElementById() { return null; },
    createElement(tag) {
      return makeElement('');
    },
    querySelector(selector) {
      return body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };

  return { doc, body, bodyChildren, makeElement };
}

// ─── closeEditModal implementation (mirrors TaskModal.close from js/app.js) ───
function makeCloseEditModal(doc) {
  return function closeEditModal() {
    const modal    = doc.querySelector('.edit-tasks-modal');
    const backdrop = doc.querySelector('.modal-backdrop');
    if (modal)    modal.remove();
    if (backdrop) backdrop.remove();
  };
}

// ─── openEditModal implementation (minimal — appends backdrop + modal) ────────
function makeOpenEditModal(doc) {
  return function openEditModal() {
    // Guard: do not open a second modal if one is already present
    if (doc.querySelector('.edit-tasks-modal')) return;

    const backdrop = doc.createElement('div');
    backdrop.className = 'modal-backdrop';
    doc.body.appendChild(backdrop);

    const modal = doc.createElement('div');
    modal.className = 'edit-tasks-modal';
    doc.body.appendChild(modal);
  };
}

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
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ALPHA_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

function randomText(maxLen = 30) {
  const len = randomInt(1, maxLen);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHA_CHARS[randomInt(0, ALPHA_CHARS.length - 1)];
  }
  if (s.trim() === '') s = 'task' + randomInt(1, 9999);
  return s;
}

function makeTask(overrides) {
  return Object.assign(
    {
      id:          String(randomInt(1, 1e9)),
      text:        randomText(),
      done:        false,
      createdAt:   randomInt(1000, 1e12),
      completedAt: null,
    },
    overrides
  );
}

/**
 * Build a tasks array with unique texts and random done flags.
 * @param {number} count
 * @returns {Array}
 */
function buildRandomTasks(count) {
  const tasks = [];
  const usedTexts = new Set();
  for (let i = 0; i < count; i++) {
    let text;
    let attempts = 0;
    do {
      text = randomText();
      attempts++;
    } while (usedTexts.has(text.toLowerCase()) && attempts < 100);
    usedTexts.add(text.toLowerCase());
    tasks.push(makeTask({ text, done: Math.random() < 0.5 }));
  }
  return tasks;
}

const VALID_STRATEGIES = ['default', 'az', 'done-last'];

// ─── Unit tests: sortTasks ────────────────────────────────────────────────────
// Validates: Requirements 4.3, 4.4

console.log('\nUnit tests: sortTasks\n');

runTest('sortTasks("az"): returns alphabetically sorted array', () => {
  const tasks = [
    makeTask({ text: 'Zebra',  done: false, createdAt: 1 }),
    makeTask({ text: 'apple',  done: false, createdAt: 2 }),
    makeTask({ text: 'Mango',  done: false, createdAt: 3 }),
    makeTask({ text: 'banana', done: false, createdAt: 4 }),
  ];
  const result = sortTasks(tasks, 'az');
  const texts = result.map(t => t.text.toLowerCase());
  for (let i = 0; i < texts.length - 1; i++) {
    assert(
      texts[i].localeCompare(texts[i + 1]) <= 0,
      `Expected "${texts[i]}" ≤ "${texts[i + 1]}" in alphabetical order`
    );
  }
});

runTest('sortTasks("az"): case-insensitive ordering (Apple before banana)', () => {
  const tasks = [
    makeTask({ text: 'banana', done: false, createdAt: 1 }),
    makeTask({ text: 'Apple',  done: false, createdAt: 2 }),
    makeTask({ text: 'cherry', done: false, createdAt: 3 }),
  ];
  const result = sortTasks(tasks, 'az');
  assert(
    result[0].text === 'Apple',
    `Expected first element to be "Apple", got "${result[0].text}"`
  );
  assert(
    result[1].text === 'banana',
    `Expected second element to be "banana", got "${result[1].text}"`
  );
  assert(
    result[2].text === 'cherry',
    `Expected third element to be "cherry", got "${result[2].text}"`
  );
});

runTest('sortTasks("az"): does NOT mutate the original array', () => {
  const tasks = [
    makeTask({ text: 'Zebra',  done: false, createdAt: 1 }),
    makeTask({ text: 'Apple',  done: false, createdAt: 2 }),
    makeTask({ text: 'Mango',  done: false, createdAt: 3 }),
  ];
  const originalOrder = tasks.map(t => t.text);
  sortTasks(tasks, 'az');
  const afterOrder = tasks.map(t => t.text);
  for (let i = 0; i < originalOrder.length; i++) {
    assert(
      originalOrder[i] === afterOrder[i],
      `Original array was mutated at index ${i}: expected "${originalOrder[i]}", got "${afterOrder[i]}"`
    );
  }
});

runTest('sortTasks("done-last"): all done tasks appear after all undone tasks', () => {
  const tasks = [
    makeTask({ text: 'A', done: true,  createdAt: 1 }),
    makeTask({ text: 'B', done: false, createdAt: 2 }),
    makeTask({ text: 'C', done: true,  createdAt: 3 }),
    makeTask({ text: 'D', done: false, createdAt: 4 }),
    makeTask({ text: 'E', done: true,  createdAt: 5 }),
  ];
  const result = sortTasks(tasks, 'done-last');
  let seenDone = false;
  for (const task of result) {
    if (task.done) {
      seenDone = true;
    } else {
      assert(
        !seenDone,
        `Undone task "${task.text}" appears after a done task — violates done-last ordering`
      );
    }
  }
});

runTest('sortTasks("done-last"): all undone tasks come first', () => {
  const tasks = [
    makeTask({ text: 'Done1',   done: true,  createdAt: 1 }),
    makeTask({ text: 'Undone1', done: false, createdAt: 2 }),
    makeTask({ text: 'Done2',   done: true,  createdAt: 3 }),
    makeTask({ text: 'Undone2', done: false, createdAt: 4 }),
  ];
  const result = sortTasks(tasks, 'done-last');
  assert(result[0].done === false, `Expected result[0].done=false, got ${result[0].done}`);
  assert(result[1].done === false, `Expected result[1].done=false, got ${result[1].done}`);
  assert(result[2].done === true,  `Expected result[2].done=true, got ${result[2].done}`);
  assert(result[3].done === true,  `Expected result[3].done=true, got ${result[3].done}`);
});

runTest('sortTasks("done-last"): does NOT mutate the original array', () => {
  const tasks = [
    makeTask({ text: 'A', done: true,  createdAt: 1 }),
    makeTask({ text: 'B', done: false, createdAt: 2 }),
    makeTask({ text: 'C', done: true,  createdAt: 3 }),
  ];
  const originalDone = tasks.map(t => t.done);
  sortTasks(tasks, 'done-last');
  const afterDone = tasks.map(t => t.done);
  for (let i = 0; i < originalDone.length; i++) {
    assert(
      originalDone[i] === afterDone[i],
      `Original array was mutated at index ${i}: expected done=${originalDone[i]}, got done=${afterDone[i]}`
    );
  }
});

runTest('sortTasks("default"): preserves createdAt ascending order', () => {
  const tasks = [
    makeTask({ text: 'C', done: false, createdAt: 300 }),
    makeTask({ text: 'A', done: false, createdAt: 100 }),
    makeTask({ text: 'B', done: false, createdAt: 200 }),
  ];
  const result = sortTasks(tasks, 'default');
  assert(result[0].createdAt === 100, `Expected createdAt=100 first, got ${result[0].createdAt}`);
  assert(result[1].createdAt === 200, `Expected createdAt=200 second, got ${result[1].createdAt}`);
  assert(result[2].createdAt === 300, `Expected createdAt=300 third, got ${result[2].createdAt}`);
});

runTest('sortTasks("default"): does NOT mutate the original array', () => {
  const tasks = [
    makeTask({ text: 'C', done: false, createdAt: 300 }),
    makeTask({ text: 'A', done: false, createdAt: 100 }),
    makeTask({ text: 'B', done: false, createdAt: 200 }),
  ];
  const originalCreatedAt = tasks.map(t => t.createdAt);
  sortTasks(tasks, 'default');
  const afterCreatedAt = tasks.map(t => t.createdAt);
  for (let i = 0; i < originalCreatedAt.length; i++) {
    assert(
      originalCreatedAt[i] === afterCreatedAt[i],
      `Original array was mutated at index ${i}: expected createdAt=${originalCreatedAt[i]}, got ${afterCreatedAt[i]}`
    );
  }
});

runTest('sortTasks: returns a new array (not the same reference)', () => {
  const tasks = [makeTask({ text: 'A', done: false, createdAt: 1 })];
  for (const strategy of VALID_STRATEGIES) {
    const result = sortTasks(tasks, strategy);
    assert(result !== tasks, `sortTasks("${strategy}") returned the same array reference — should return a new array`);
  }
});

runTest('sortTasks: empty array returns empty array for all strategies', () => {
  for (const strategy of VALID_STRATEGIES) {
    const result = sortTasks([], strategy);
    assert(Array.isArray(result), `Expected array for strategy "${strategy}"`);
    assert(result.length === 0, `Expected empty array for strategy "${strategy}", got length ${result.length}`);
  }
});

runTest('sortTasks: single-element array is unchanged for all strategies', () => {
  const task = makeTask({ text: 'Only', done: false, createdAt: 1 });
  for (const strategy of VALID_STRATEGIES) {
    const result = sortTasks([task], strategy);
    assert(result.length === 1, `Expected length 1 for strategy "${strategy}"`);
    assert(result[0] === task, `Expected same task object for strategy "${strategy}"`);
  }
});

// ─── Unit tests: modal open/close DOM state ───────────────────────────────────
// Validates: Requirements 4.10, 4.11

console.log('\n\nUnit tests: modal open/close DOM state\n');

runTest('After closeEditModal(): no .edit-tasks-modal in DOM', () => {
  const { doc } = createDomMock();
  const openEditModal  = makeOpenEditModal(doc);
  const closeEditModal = makeCloseEditModal(doc);

  openEditModal();
  // Verify modal was added
  assert(doc.querySelector('.edit-tasks-modal') !== null, 'Modal should be present after open');

  closeEditModal();
  assert(
    doc.querySelector('.edit-tasks-modal') === null,
    'Expected no .edit-tasks-modal in DOM after closeEditModal()'
  );
});

runTest('After closeEditModal(): no .modal-backdrop in DOM', () => {
  const { doc } = createDomMock();
  const openEditModal  = makeOpenEditModal(doc);
  const closeEditModal = makeCloseEditModal(doc);

  openEditModal();
  // Verify backdrop was added
  assert(doc.querySelector('.modal-backdrop') !== null, 'Backdrop should be present after open');

  closeEditModal();
  assert(
    doc.querySelector('.modal-backdrop') === null,
    'Expected no .modal-backdrop in DOM after closeEditModal()'
  );
});

runTest('After closeEditModal(): both modal and backdrop are removed together', () => {
  const { doc, bodyChildren } = createDomMock();
  const openEditModal  = makeOpenEditModal(doc);
  const closeEditModal = makeCloseEditModal(doc);

  openEditModal();
  assert(bodyChildren.length === 2, `Expected 2 elements after open, got ${bodyChildren.length}`);

  closeEditModal();
  assert(
    bodyChildren.length === 0,
    `Expected 0 elements after close, got ${bodyChildren.length}`
  );
});

runTest('closeEditModal() is safe to call when no modal is open (no error)', () => {
  const { doc } = createDomMock();
  const closeEditModal = makeCloseEditModal(doc);

  // Should not throw
  let threw = false;
  try {
    closeEditModal();
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'closeEditModal() should not throw when no modal is open');
});

runTest('closeEditModal() is idempotent — calling twice does not throw', () => {
  const { doc } = createDomMock();
  const openEditModal  = makeOpenEditModal(doc);
  const closeEditModal = makeCloseEditModal(doc);

  openEditModal();
  closeEditModal();

  let threw = false;
  try {
    closeEditModal();
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'Second closeEditModal() call should not throw');
  assert(
    doc.querySelector('.edit-tasks-modal') === null,
    'No modal should be in DOM after second close'
  );
});

runTest('openEditModal() guard: calling open twice does not create duplicate modals', () => {
  const { doc, bodyChildren } = createDomMock();
  const openEditModal = makeOpenEditModal(doc);

  openEditModal();
  openEditModal(); // second call should be a no-op

  const modals = bodyChildren.filter(el => el.className === 'edit-tasks-modal');
  assert(modals.length === 1, `Expected 1 modal, got ${modals.length}`);
});

runTest('After open then close, DOM is clean (no leftover elements)', () => {
  const { doc, bodyChildren } = createDomMock();
  const openEditModal  = makeOpenEditModal(doc);
  const closeEditModal = makeCloseEditModal(doc);

  openEditModal();
  closeEditModal();

  const hasModal    = doc.querySelector('.edit-tasks-modal') !== null;
  const hasBackdrop = doc.querySelector('.modal-backdrop') !== null;

  assert(!hasModal,    'No .edit-tasks-modal should remain after close');
  assert(!hasBackdrop, 'No .modal-backdrop should remain after close');
  assert(bodyChildren.length === 0, `Expected empty body, got ${bodyChildren.length} children`);
});

// ─── Property 8: Sort non-destructive ────────────────────────────────────────
// **Validates: Requirements 4.4**
//
// sortTasks(tasks, strategy).length === tasks.length for all valid strategies
// and any tasks array; original array is not mutated.

const PROP8_CASES = 200;
console.log(`\n\nProperty 8: Sort non-destructive — running ${PROP8_CASES} random cases\n`);

for (let i = 0; i < PROP8_CASES; i++) {
  const count    = randomInt(0, 25);
  const strategy = VALID_STRATEGIES[randomInt(0, VALID_STRATEGIES.length - 1)];

  runTest(`Property 8 case #${i + 1}: ${count} tasks, strategy="${strategy}" — length preserved, no mutation`, () => {
    const tasks = buildRandomTasks(count);

    // Snapshot the original array state before sorting
    const originalIds        = tasks.map(t => t.id);
    const originalTexts      = tasks.map(t => t.text);
    const originalDone       = tasks.map(t => t.done);
    const originalCreatedAt  = tasks.map(t => t.createdAt);
    const originalLength     = tasks.length;
    const originalRef        = tasks;

    const result = sortTasks(tasks, strategy);

    // 1. Length is preserved
    assert(
      result.length === originalLength,
      `Length changed: expected ${originalLength}, got ${result.length} (strategy="${strategy}")`
    );

    // 2. Returns a new array reference (not the same object)
    assert(
      result !== originalRef,
      `sortTasks returned the same array reference — must return a new array (strategy="${strategy}")`
    );

    // 3. Original array is not mutated — same length
    assert(
      tasks.length === originalLength,
      `Original array length changed: expected ${originalLength}, got ${tasks.length}`
    );

    // 4. Original array elements are not reordered (ids in same positions)
    for (let j = 0; j < originalLength; j++) {
      assert(
        tasks[j].id === originalIds[j],
        `Original array mutated at index ${j}: expected id="${originalIds[j]}", got "${tasks[j].id}" (strategy="${strategy}")`
      );
      assert(
        tasks[j].text === originalTexts[j],
        `Original array mutated at index ${j}: expected text="${originalTexts[j]}", got "${tasks[j].text}" (strategy="${strategy}")`
      );
      assert(
        tasks[j].done === originalDone[j],
        `Original array mutated at index ${j}: expected done=${originalDone[j]}, got ${tasks[j].done} (strategy="${strategy}")`
      );
      assert(
        tasks[j].createdAt === originalCreatedAt[j],
        `Original array mutated at index ${j}: expected createdAt=${originalCreatedAt[j]}, got ${tasks[j].createdAt} (strategy="${strategy}")`
      );
    }

    // 5. Result contains the same task objects (same references, just reordered)
    const resultIds = new Set(result.map(t => t.id));
    for (const id of originalIds) {
      assert(
        resultIds.has(id),
        `Task id="${id}" is missing from sorted result (strategy="${strategy}")`
      );
    }
  });
}

// ─── Results ──────────────────────────────────────────────────────────────────
const total = passed + failed;
const unitTestCount = total - PROP8_CASES;

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
  console.log(`  - ${unitTestCount} unit tests (sortTasks + modal open/close DOM state)`);
  console.log(`  - ${PROP8_CASES} Property 8 cases (sort non-destructive)`);
  console.log('');
  process.exit(0);
}
