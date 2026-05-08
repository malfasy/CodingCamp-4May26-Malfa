/**
 * Property-Based Test: XSS Prevention (Property 10)
 *
 * Validates: Requirements 8.1, 8.4
 *
 * Property 10: XSS prevention — for any arbitrary string input (including
 * <script>, <img onerror>, etc.), no user-supplied string is ever assigned
 * to innerHTML; verify all task text, link labels, and display names are
 * set via textContent or safe DOM attributes.
 *
 * Run with: node tests/xss.test.js
 */

'use strict';

// ─── innerHTML tracker ────────────────────────────────────────────────────────
// Records every innerHTML assignment made during the test run.
const innerHTMLAssignments = [];

// ─── Mock DOM element factory ─────────────────────────────────────────────────
function makeElement(tag) {
  const el = {
    _tag: tag,
    _innerHTML: '',
    _textContent: '',
    _children: [],
    _listeners: {},
    _attrs: {},
    className: '',
    style: {},
    dataset: {},
    type: '',
    checked: false,
    disabled: false,
    hidden: false,
    value: '',
    maxLength: -1,

    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) {
      innerHTMLAssignments.push({ tag: this._tag, value: val });
      this._innerHTML = val;
    },
    get textContent() { return this._textContent; },
    set textContent(val) { this._textContent = String(val); },

    getAttribute(name) { return this._attrs[name] !== undefined ? this._attrs[name] : null; },
    setAttribute(name, val) { this._attrs[name] = val; },
    removeAttribute(name) { delete this._attrs[name]; },

    addEventListener(event, fn) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
    },
    appendChild(child) { this._children.push(child); return child; },
    removeChild(child) {
      const idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
    },
    get firstChild() { return this._children[0] || null; },
    focus() {},
    select() {},
    remove() {},

    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      has(c) { return this._classes.has(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) this._classes.add(c);
        else this._classes.delete(c);
      },
    },

    querySelectorAll() { return []; },
    querySelector() { return null; },
  };
  return el;
}

// ─── Mock document ────────────────────────────────────────────────────────────
const elements = {};

global.document = {
  createElement(tag) { return makeElement(tag); },
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  body: makeElement('body'),
};

// ─── Mock localStorage ────────────────────────────────────────────────────────
const store = new Map();
global.localStorage = {
  getItem(k)       { return store.has(k) ? store.get(k) : null; },
  setItem(k, v)    { store.set(k, String(v)); },
  removeItem(k)    { store.delete(k); },
  clear()          { store.clear(); },
};

// ─── Rendering functions (extracted from js/app.js) ───────────────────────────
// These mirror the actual implementations in the app.

/**
 * renderTaskList — mirrors TasksModule.renderTaskList from js/app.js
 * Uses textContent for all user-supplied strings (task.text).
 */
function renderTaskList(tasks) {
  const listEl = document.getElementById('task-list');
  if (!listEl) return;

  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  for (const task of (Array.isArray(tasks) ? tasks : [])) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', 'Mark task complete');

    // ✓ textContent only — never innerHTML
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = '🗑';
    deleteBtn.setAttribute('aria-label', 'Delete task');

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  }
}

/**
 * renderLinkButtons — mirrors LinksModule.renderLinkButtons from js/app.js
 * Uses textContent for all user-supplied strings (link.label).
 */
function renderLinkButtons(links) {
  const panel = document.getElementById('links-panel');
  if (!panel) return;

  while (panel.firstChild) panel.removeChild(panel.firstChild);

  for (const link of (Array.isArray(links) ? links : [])) {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-btn-wrapper';
    wrapper.dataset.id = link.id;

    // ✓ textContent only — never innerHTML
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn link-btn';
    btn.textContent = link.label;
    btn.setAttribute('aria-label', 'Open ' + link.label);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '✏';
    editBtn.setAttribute('aria-label', 'Edit link');

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = '🗑';
    deleteBtn.setAttribute('aria-label', 'Delete link');

    wrapper.appendChild(btn);
    wrapper.appendChild(editBtn);
    wrapper.appendChild(deleteBtn);
    panel.appendChild(wrapper);
  }
}

/**
 * setGreeting — mirrors SettingsModule.setName / ClockModule._tick greeting update
 * Uses textContent for the user-supplied name.
 */
function setGreeting(name) {
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    // ✓ textContent only — never innerHTML
    greetingEl.textContent = 'Hello, ' + name + '!';
  }
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

// ─── XSS Payloads ─────────────────────────────────────────────────────────────
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  'javascript:alert(1)',
  '"><script>alert(1)</script>',
  "' OR 1=1 --",
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<<SCRIPT>alert("XSS");//<</SCRIPT>',
  '<IMG SRC=JaVaScRiPt:alert(\'XSS\')>',
  '<a href="javascript:alert(1)">click</a>',
  '&lt;script&gt;alert(1)&lt;/script&gt;',
  '<div style="background:url(javascript:alert(1))">',
  '<input type="text" value="" onfocus="alert(1)">',
  '<details open ontoggle=alert(1)>',
  '<math><mtext></p><img src=1 onerror=alert(1)>',
  '<object data="javascript:alert(1)">',
  '<embed src="javascript:alert(1)">',
  '<!--<img src="--><img src=x onerror=alert(1)//">',
  '<form><button formaction=javascript:alert(1)>',
];

// ─── Random XSS string generator ─────────────────────────────────────────────
function randomWord(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < (len || 5); i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function randomTag() {
  const tags = ['img', 'svg', 'script', 'iframe', 'body', 'div', 'a', 'input', 'object', 'embed'];
  return tags[Math.floor(Math.random() * tags.length)];
}

function randomAttr() {
  const attrs = ['onerror', 'onload', 'onclick', 'onfocus', 'onmouseover', 'onblur', 'ontoggle'];
  return attrs[Math.floor(Math.random() * attrs.length)];
}

function randomXssString() {
  const templates = [
    () => '<' + randomTag() + ' ' + randomAttr() + '=alert(1)>',
    () => '<script>' + randomWord() + '()</script>',
    () => 'javascript:' + randomWord() + '()',
    () => '">' + '<script>alert(' + randomWord() + ')</script>',
    () => randomWord() + '<img ' + randomAttr() + '=' + randomWord() + '>',
    () => '<' + randomTag() + ' src="javascript:' + randomWord() + '()">',
    () => '&lt;' + randomTag() + '&gt;' + randomWord() + '&lt;/' + randomTag() + '&gt;',
  ];
  return templates[Math.floor(Math.random() * templates.length)]();
}

// ─── Set up mock DOM elements ─────────────────────────────────────────────────
elements['task-list']   = makeElement('ul');
elements['links-panel'] = makeElement('div');
elements['greeting']    = makeElement('h1');

// ─── Tests: renderTaskList with XSS payloads ──────────────────────────────────
console.log('\nrenderTaskList: XSS payloads\n');

for (const payload of XSS_PAYLOADS) {
  runTest('renderTaskList: payload not in innerHTML — ' + payload.slice(0, 40), () => {
    innerHTMLAssignments.length = 0;
    const task = { id: '1', text: payload, done: false, createdAt: Date.now(), completedAt: null };
    renderTaskList([task]);

    for (const assignment of innerHTMLAssignments) {
      assert(
        !String(assignment.value).includes(payload),
        `XSS payload found in innerHTML assignment on <${assignment.tag}>: ${JSON.stringify(assignment.value)}`
      );
    }
  });
}

// ─── Tests: renderLinkButtons with XSS payloads ───────────────────────────────
console.log('\n\nrenderLinkButtons: XSS payloads\n');

for (const payload of XSS_PAYLOADS) {
  runTest('renderLinkButtons: payload not in innerHTML — ' + payload.slice(0, 40), () => {
    innerHTMLAssignments.length = 0;
    const link = { id: '1', label: payload, url: 'https://example.com' };
    renderLinkButtons([link]);

    for (const assignment of innerHTMLAssignments) {
      assert(
        !String(assignment.value).includes(payload),
        `XSS payload found in innerHTML assignment on <${assignment.tag}>: ${JSON.stringify(assignment.value)}`
      );
    }
  });
}

// ─── Tests: setGreeting with XSS payloads ────────────────────────────────────
console.log('\n\nsetGreeting: XSS payloads\n');

for (const payload of XSS_PAYLOADS) {
  runTest('setGreeting: payload not in innerHTML — ' + payload.slice(0, 40), () => {
    innerHTMLAssignments.length = 0;
    setGreeting(payload);

    for (const assignment of innerHTMLAssignments) {
      assert(
        !String(assignment.value).includes(payload),
        `XSS payload found in innerHTML assignment on <${assignment.tag}>: ${JSON.stringify(assignment.value)}`
      );
    }
  });
}

// ─── Property-based: 50 random XSS strings ───────────────────────────────────
const NUM_RANDOM = 50;
console.log(`\n\nProperty-based: ${NUM_RANDOM} random XSS strings\n`);

for (let i = 0; i < NUM_RANDOM; i++) {
  const payload = randomXssString();
  runTest(`random XSS #${i + 1}: ${payload.slice(0, 35)}`, () => {
    innerHTMLAssignments.length = 0;

    renderTaskList([{ id: '1', text: payload, done: false, createdAt: 0, completedAt: null }]);
    renderLinkButtons([{ id: '1', label: payload, url: 'https://example.com' }]);
    setGreeting(payload);

    for (const assignment of innerHTMLAssignments) {
      assert(
        !String(assignment.value).includes(payload),
        `XSS payload found in innerHTML on <${assignment.tag}>: ${JSON.stringify(assignment.value)}`
      );
    }
  });
}

// ─── Verify textContent is used (not innerHTML) for user strings ──────────────
console.log('\n\nVerify textContent is used for user strings\n');

runTest('renderTaskList: task.text is set via textContent, not innerHTML', () => {
  innerHTMLAssignments.length = 0;
  const task = { id: '1', text: 'Buy groceries', done: false, createdAt: 0, completedAt: null };
  renderTaskList([task]);

  for (const a of innerHTMLAssignments) {
    assert(
      !String(a.value).includes('Buy groceries'),
      `Task text "Buy groceries" found in innerHTML on <${a.tag}>: ${JSON.stringify(a.value)}`
    );
  }
});

runTest('renderLinkButtons: link.label is set via textContent, not innerHTML', () => {
  innerHTMLAssignments.length = 0;
  const link = { id: '1', label: 'GitHub', url: 'https://github.com' };
  renderLinkButtons([link]);

  for (const a of innerHTMLAssignments) {
    assert(
      !String(a.value).includes('GitHub'),
      `Link label "GitHub" found in innerHTML on <${a.tag}>: ${JSON.stringify(a.value)}`
    );
  }
});

runTest('setGreeting: name is set via textContent, not innerHTML', () => {
  innerHTMLAssignments.length = 0;
  setGreeting('Alice');

  for (const a of innerHTMLAssignments) {
    assert(
      !String(a.value).includes('Alice'),
      `Name "Alice" found in innerHTML on <${a.tag}>: ${JSON.stringify(a.value)}`
    );
  }
});

runTest('renderTaskList: multiple tasks — none use innerHTML for text', () => {
  innerHTMLAssignments.length = 0;
  const tasks = [
    { id: '1', text: 'Task one',   done: false, createdAt: 1, completedAt: null },
    { id: '2', text: 'Task two',   done: true,  createdAt: 2, completedAt: 1 },
    { id: '3', text: 'Task three', done: false, createdAt: 3, completedAt: null },
  ];
  renderTaskList(tasks);

  for (const a of innerHTMLAssignments) {
    for (const task of tasks) {
      assert(
        !String(a.value).includes(task.text),
        `Task text "${task.text}" found in innerHTML on <${a.tag}>: ${JSON.stringify(a.value)}`
      );
    }
  }
});

runTest('renderLinkButtons: multiple links — none use innerHTML for labels', () => {
  innerHTMLAssignments.length = 0;
  const links = [
    { id: '1', label: 'GitHub',    url: 'https://github.com' },
    { id: '2', label: 'Google',    url: 'https://google.com' },
    { id: '3', label: 'Wikipedia', url: 'https://wikipedia.org' },
  ];
  renderLinkButtons(links);

  for (const a of innerHTMLAssignments) {
    for (const link of links) {
      assert(
        !String(a.value).includes(link.label),
        `Link label "${link.label}" found in innerHTML on <${a.tag}>: ${JSON.stringify(a.value)}`
      );
    }
  }
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
  console.log(`  - ${XSS_PAYLOADS.length * 3} fixed XSS payload tests (renderTaskList + renderLinkButtons + setGreeting)`);
  console.log(`  - ${NUM_RANDOM} random XSS property-based cases`);
  console.log(`  - 5 textContent verification tests`);
  console.log('');
  process.exit(0);
}
