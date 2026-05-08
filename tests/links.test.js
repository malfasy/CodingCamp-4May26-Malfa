/**
 * Tests: LinksModule — Property 7 and unit tests for validateUrl
 *
 * Tasks 11.2, 11.3
 *
 * Property 7: URL safety — all URLs stored in `links` pass `new URL(url)`
 *   without throwing and have protocol `http:` or `https:`
 *   Validates: Requirements 5.8, 8.2
 *
 * Unit tests: validateUrl specific cases
 *   Validates: Requirements 5.8, 8.2
 *
 * Run with: node tests/links.test.js
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

// ─── StorageService (minimal) ─────────────────────────────────────────────────
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
    } catch (e) {
      // Silently no-op
    }
  },
};

// ─── generateId (from app.js) ─────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── validateUrl (extracted from LinksModule in js/app.js) ───────────────────
function validateUrl(url) {
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
}

// ─── LinksModule (minimal, for addLink testing) ───────────────────────────────
const LinksModule = {
  _links: [],

  init(links) {
    this._links = Array.isArray(links) ? links : [];
  },

  validateUrl,

  addLink(label, url) {
    const trimmedLabel = (typeof label === 'string') ? label.trim() : '';
    const trimmedUrl   = (typeof url   === 'string') ? url.trim()   : '';

    if (trimmedLabel === '') {
      return { success: false, error: 'Label cannot be empty' };
    }

    if (trimmedLabel.length > 50) {
      return { success: false, error: 'Label must be 50 characters or fewer' };
    }

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

    return { success: true, error: null };
  },

  reset() {
    this._links = [];
    store.clear();
  },
};

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

// ─── Random Generators ────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[randomInt(0, chars.length - 1)];
  }
  return s;
}

/** Generate a random valid http/https URL */
function randomValidUrl() {
  const protocol = Math.random() < 0.5 ? 'http' : 'https';
  const host = randomString(randomInt(3, 12)) + '.com';
  const path = Math.random() < 0.5 ? '' : '/' + randomString(randomInt(1, 8));
  return `${protocol}://${host}${path}`;
}

/** Generate a random invalid URL (various bad forms) */
function randomInvalidUrl() {
  const badUrls = [
    '',
    '   ',
    'not-a-url',
    'javascript:alert(1)',
    'ftp://example.com',
    'data:text/html,<h1>hi</h1>',
    'file:///etc/passwd',
    'mailto:user@example.com',
    'blob:https://example.com/uuid',
    '//example.com',
    'example.com',
    randomString(randomInt(1, 20)),
    'http://' + randomString(0),   // "http://" with empty host
  ];
  return badUrls[randomInt(0, badUrls.length - 1)];
}

/** Generate a random valid label (1–50 chars) */
function randomValidLabel() {
  return randomString(randomInt(1, 50));
}

// ─── Property 7: URL safety ───────────────────────────────────────────────────
// **Validates: Requirements 5.8, 8.2**
//
// All URLs stored in `links` pass `new URL(url)` without throwing and have
// protocol `http:` or `https:`.

const PBT_CASES = 200;

console.log(`\nProperty 7: URL safety — running ${PBT_CASES} random cases\n`);

for (let i = 0; i < PBT_CASES; i++) {
  const useValid = Math.random() < 0.6;  // 60% valid, 40% invalid
  const url      = useValid ? randomValidUrl() : randomInvalidUrl();
  const label    = randomValidLabel();

  runTest(`PBT case #${i + 1}: addLink("${label}", "${url.slice(0, 40)}")`, () => {
    LinksModule.reset();

    const result = LinksModule.addLink(label, url);

    // Verify the invariant: every stored link must have a safe http/https URL
    for (const link of LinksModule._links) {
      // Must parse without throwing
      let parsed;
      try {
        parsed = new URL(link.url);
      } catch (e) {
        throw new Error(
          `Stored link has URL that fails new URL(): "${link.url}"\n` +
          `  addLink was called with url="${url}", result=${JSON.stringify(result)}`
        );
      }

      // Must have http: or https: protocol
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(
          `Stored link has unsafe protocol "${parsed.protocol}" for URL "${link.url}"\n` +
          `  addLink was called with url="${url}", result=${JSON.stringify(result)}`
        );
      }
    }

    // Cross-check: if addLink succeeded, the URL must be valid
    if (result.success) {
      const urlResult = validateUrl(url);
      assert(
        urlResult.valid,
        `addLink succeeded but validateUrl("${url}") returned invalid — inconsistency detected`
      );
    }

    // Cross-check: if addLink failed due to URL, no link should have been stored
    if (!result.success) {
      assert(
        LinksModule._links.length === 0,
        `addLink failed but a link was stored: ${JSON.stringify(LinksModule._links)}`
      );
    }
  });
}

// Additional property check: mix of valid and invalid URLs in sequence
runTest('PBT: only valid URLs accumulate across multiple addLink calls', () => {
  LinksModule.reset();

  const validUrls = [
    'https://github.com',
    'http://localhost:3000',
    'https://example.org/path?q=1',
    'http://192.168.1.1:8080',
  ];
  const invalidUrls = [
    'javascript:void(0)',
    'ftp://files.example.com',
    'not-a-url',
    '',
    'data:text/plain,hello',
  ];

  // Add all valid URLs
  for (const url of validUrls) {
    LinksModule.addLink('Label', url);
  }

  // Attempt to add all invalid URLs
  for (const url of invalidUrls) {
    LinksModule.addLink('Label', url);
  }

  // All stored links must have safe http/https URLs
  assert(
    LinksModule._links.length === validUrls.length,
    `Expected ${validUrls.length} stored links, got ${LinksModule._links.length}`
  );

  for (const link of LinksModule._links) {
    let parsed;
    try {
      parsed = new URL(link.url);
    } catch (e) {
      throw new Error(`Stored link URL fails new URL(): "${link.url}"`);
    }
    assert(
      parsed.protocol === 'http:' || parsed.protocol === 'https:',
      `Stored link has unsafe protocol "${parsed.protocol}" for URL "${link.url}"`
    );
  }
});

// ─── Unit Tests: validateUrl ──────────────────────────────────────────────────
// **Validates: Requirements 5.8, 8.2**

console.log(`\n\nUnit tests: validateUrl\n`);

// Empty string → { valid: false }
runTest('validateUrl("") → { valid: false }', () => {
  const result = validateUrl('');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// Whitespace-only → { valid: false }
runTest('validateUrl("   ") → { valid: false }', () => {
  const result = validateUrl('   ');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// Not a URL → { valid: false }
runTest('validateUrl("not-a-url") → { valid: false }', () => {
  const result = validateUrl('not-a-url');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// javascript: protocol → { valid: false }
runTest('validateUrl("javascript:alert(1)") → { valid: false }', () => {
  const result = validateUrl('javascript:alert(1)');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// ftp: protocol → { valid: false }
runTest('validateUrl("ftp://example.com") → { valid: false }', () => {
  const result = validateUrl('ftp://example.com');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// https valid URL → { valid: true, error: null }
runTest('validateUrl("https://google.com") → { valid: true, error: null }', () => {
  const result = validateUrl('https://google.com');
  assert(result.valid === true,  `Expected valid=true, got valid=${result.valid}`);
  assert(result.error === null,  `Expected error=null, got error=${result.error}`);
});

// http localhost → { valid: true, error: null }
runTest('validateUrl("http://localhost:3000") → { valid: true, error: null }', () => {
  const result = validateUrl('http://localhost:3000');
  assert(result.valid === true,  `Expected valid=true, got valid=${result.valid}`);
  assert(result.error === null,  `Expected error=null, got error=${result.error}`);
});

// Additional edge cases

// data: protocol → { valid: false }
runTest('validateUrl("data:text/html,<h1>hi</h1>") → { valid: false }', () => {
  const result = validateUrl('data:text/html,<h1>hi</h1>');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// file: protocol → { valid: false }
runTest('validateUrl("file:///etc/passwd") → { valid: false }', () => {
  const result = validateUrl('file:///etc/passwd');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// mailto: protocol → { valid: false }
runTest('validateUrl("mailto:user@example.com") → { valid: false }', () => {
  const result = validateUrl('mailto:user@example.com');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// Non-string input (null) → { valid: false }
runTest('validateUrl(null) → { valid: false }', () => {
  const result = validateUrl(null);
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// Non-string input (undefined) → { valid: false }
runTest('validateUrl(undefined) → { valid: false }', () => {
  const result = validateUrl(undefined);
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// URL with path and query string → { valid: true, error: null }
runTest('validateUrl("https://example.com/path?q=1&r=2") → { valid: true, error: null }', () => {
  const result = validateUrl('https://example.com/path?q=1&r=2');
  assert(result.valid === true,  `Expected valid=true, got valid=${result.valid}`);
  assert(result.error === null,  `Expected error=null, got error=${result.error}`);
});

// URL with leading/trailing whitespace is trimmed and accepted
runTest('validateUrl("  https://example.com  ") → { valid: true, error: null }', () => {
  const result = validateUrl('  https://example.com  ');
  assert(result.valid === true,  `Expected valid=true, got valid=${result.valid}`);
  assert(result.error === null,  `Expected error=null, got error=${result.error}`);
});

// http IP address → { valid: true, error: null }
runTest('validateUrl("http://192.168.1.1:8080") → { valid: true, error: null }', () => {
  const result = validateUrl('http://192.168.1.1:8080');
  assert(result.valid === true,  `Expected valid=true, got valid=${result.valid}`);
  assert(result.error === null,  `Expected error=null, got error=${result.error}`);
});

// Protocol-relative URL (no scheme) → { valid: false }
runTest('validateUrl("//example.com") → { valid: false }', () => {
  const result = validateUrl('//example.com');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// Plain domain without scheme → { valid: false }
runTest('validateUrl("example.com") → { valid: false }', () => {
  const result = validateUrl('example.com');
  assert(result.valid === false, `Expected valid=false, got valid=${result.valid}`);
});

// validateUrl never throws for any input
runTest('validateUrl never throws for arbitrary inputs', () => {
  const inputs = [
    '', null, undefined, 0, false, [], {}, NaN, Infinity,
    'javascript:void(0)', '<script>alert(1)</script>',
    'http://', 'https://', ':::',
    'a'.repeat(10000),
  ];
  for (const input of inputs) {
    let threw = false;
    try {
      validateUrl(input);
    } catch (e) {
      threw = true;
    }
    assert(!threw, `validateUrl(${JSON.stringify(input)}) threw unexpectedly`);
  }
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
  console.log(`  - ${PBT_CASES + 1} property-based cases (Property 7)`);
  console.log(`  - ${total - PBT_CASES - 1} unit tests (validateUrl)`);
  console.log('');
  process.exit(0);
}
