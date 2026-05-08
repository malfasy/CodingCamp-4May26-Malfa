/**
 * Unit Tests: ClockModule — formatTime, formatDate, getGreeting, _ordinalSuffix
 *
 * Validates: Requirements 1.3, 1.4, 1.5
 *
 * Tests:
 *   - formatTime returns "HH:MM:SS" and zero-pads single digits
 *   - getGreeting returns correct string for all boundary hours
 *   - formatDate returns correct format with ordinal suffixes
 *
 * Run with: node tests/clock.test.js
 */

'use strict';

// ─── ClockModule (extracted from js/app.js) ───────────────────────────────────
const ClockModule = {
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

// ─── Helper: build a Date from explicit parts ─────────────────────────────────
// Uses local time so tests are timezone-independent.
function makeDate({ year = 2026, month = 0, day = 1, hour = 0, minute = 0, second = 0 } = {}) {
  // month is 0-indexed (0 = January)
  return new Date(year, month, day, hour, minute, second);
}

// ─── formatTime tests ─────────────────────────────────────────────────────────
console.log('\nformatTime\n');

runTest('formatTime: returns a string matching \\d{2}:\\d{2}:\\d{2}', () => {
  const date = makeDate({ hour: 14, minute: 30, second: 45 });
  const result = ClockModule.formatTime(date);
  assert(
    /^\d{2}:\d{2}:\d{2}$/.test(result),
    `Expected HH:MM:SS format, got: "${result}"`
  );
});

runTest('formatTime: zero-pads single-digit hours', () => {
  const date = makeDate({ hour: 9, minute: 0, second: 0 });
  const result = ClockModule.formatTime(date);
  assert(result.startsWith('09:'), `Expected hour "09", got: "${result}"`);
});

runTest('formatTime: zero-pads single-digit minutes', () => {
  const date = makeDate({ hour: 10, minute: 5, second: 0 });
  const result = ClockModule.formatTime(date);
  assert(result.split(':')[1] === '05', `Expected minute "05", got: "${result}"`);
});

runTest('formatTime: zero-pads single-digit seconds', () => {
  const date = makeDate({ hour: 10, minute: 0, second: 7 });
  const result = ClockModule.formatTime(date);
  assert(result.split(':')[2] === '07', `Expected second "07", got: "${result}"`);
});

runTest('formatTime: midnight (00:00:00)', () => {
  const date = makeDate({ hour: 0, minute: 0, second: 0 });
  const result = ClockModule.formatTime(date);
  assert(result === '00:00:00', `Expected "00:00:00", got: "${result}"`);
});

runTest('formatTime: end of day (23:59:59)', () => {
  const date = makeDate({ hour: 23, minute: 59, second: 59 });
  const result = ClockModule.formatTime(date);
  assert(result === '23:59:59', `Expected "23:59:59", got: "${result}"`);
});

runTest('formatTime: all single-digit components are zero-padded (01:02:03)', () => {
  const date = makeDate({ hour: 1, minute: 2, second: 3 });
  const result = ClockModule.formatTime(date);
  assert(result === '01:02:03', `Expected "01:02:03", got: "${result}"`);
});

// ─── getGreeting tests ────────────────────────────────────────────────────────
console.log('\n\ngetGreeting\n');

// Core examples
runTest('getGreeting(9) → "Good Morning"', () => {
  assert(ClockModule.getGreeting(9) === 'Good Morning', `Expected "Good Morning", got: "${ClockModule.getGreeting(9)}"`);
});

runTest('getGreeting(14) → "Good Afternoon"', () => {
  assert(ClockModule.getGreeting(14) === 'Good Afternoon', `Expected "Good Afternoon", got: "${ClockModule.getGreeting(14)}"`);
});

runTest('getGreeting(20) → "Good Evening"', () => {
  assert(ClockModule.getGreeting(20) === 'Good Evening', `Expected "Good Evening", got: "${ClockModule.getGreeting(20)}"`);
});

// Boundary hours — Morning (5–11 inclusive)
runTest('getGreeting(5) → "Good Morning" (lower boundary)', () => {
  assert(ClockModule.getGreeting(5) === 'Good Morning', `Expected "Good Morning", got: "${ClockModule.getGreeting(5)}"`);
});

runTest('getGreeting(11) → "Good Morning" (upper boundary)', () => {
  assert(ClockModule.getGreeting(11) === 'Good Morning', `Expected "Good Morning", got: "${ClockModule.getGreeting(11)}"`);
});

// Boundary hours — Afternoon (12–17 inclusive)
runTest('getGreeting(12) → "Good Afternoon" (lower boundary)', () => {
  assert(ClockModule.getGreeting(12) === 'Good Afternoon', `Expected "Good Afternoon", got: "${ClockModule.getGreeting(12)}"`);
});

runTest('getGreeting(17) → "Good Afternoon" (upper boundary)', () => {
  assert(ClockModule.getGreeting(17) === 'Good Afternoon', `Expected "Good Afternoon", got: "${ClockModule.getGreeting(17)}"`);
});

// Boundary hours — Evening (18–23 and 0–4 inclusive)
runTest('getGreeting(18) → "Good Evening" (lower boundary)', () => {
  assert(ClockModule.getGreeting(18) === 'Good Evening', `Expected "Good Evening", got: "${ClockModule.getGreeting(18)}"`);
});

runTest('getGreeting(23) → "Good Evening" (upper boundary, late night)', () => {
  assert(ClockModule.getGreeting(23) === 'Good Evening', `Expected "Good Evening", got: "${ClockModule.getGreeting(23)}"`);
});

runTest('getGreeting(0) → "Good Evening" (midnight)', () => {
  assert(ClockModule.getGreeting(0) === 'Good Evening', `Expected "Good Evening", got: "${ClockModule.getGreeting(0)}"`);
});

runTest('getGreeting(4) → "Good Evening" (upper boundary, early morning)', () => {
  assert(ClockModule.getGreeting(4) === 'Good Evening', `Expected "Good Evening", got: "${ClockModule.getGreeting(4)}"`);
});

// ─── _ordinalSuffix tests ─────────────────────────────────────────────────────
console.log('\n\n_ordinalSuffix\n');

const ordinalCases = [
  [1,  'st'],
  [2,  'nd'],
  [3,  'rd'],
  [4,  'th'],
  [10, 'th'],
  [11, 'th'],  // special case
  [12, 'th'],  // special case
  [13, 'th'],  // special case
  [21, 'st'],
  [22, 'nd'],
  [23, 'rd'],
  [24, 'th'],
  [31, 'st'],
];

for (const [day, expected] of ordinalCases) {
  runTest(`_ordinalSuffix(${day}) → "${expected}"`, () => {
    const result = ClockModule._ordinalSuffix(day);
    assert(result === expected, `Expected "${expected}" for day ${day}, got: "${result}"`);
  });
}

// ─── formatDate tests ─────────────────────────────────────────────────────────
console.log('\n\nformatDate\n');

runTest('formatDate: overall format is "Weekday, Month Day<suffix> Year"', () => {
  // 2026-05-08 is a Friday
  const date = makeDate({ year: 2026, month: 4, day: 8 }); // month 4 = May
  const result = ClockModule.formatDate(date);
  assert(
    /^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}(st|nd|rd|th) \d{4}$/.test(result),
    `Format mismatch: "${result}"`
  );
});

runTest('formatDate: correct weekday, month, day, year (2026-05-08 = Friday)', () => {
  const date = makeDate({ year: 2026, month: 4, day: 8 }); // May 8
  const result = ClockModule.formatDate(date);
  assert(result === 'Friday, May 8th 2026', `Expected "Friday, May 8th 2026", got: "${result}"`);
});

runTest('formatDate: ordinal "1st" for day 1', () => {
  const date = makeDate({ year: 2026, month: 0, day: 1 }); // Jan 1
  const result = ClockModule.formatDate(date);
  assert(result.includes('1st'), `Expected "1st" in "${result}"`);
});

runTest('formatDate: ordinal "2nd" for day 2', () => {
  const date = makeDate({ year: 2026, month: 0, day: 2 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('2nd'), `Expected "2nd" in "${result}"`);
});

runTest('formatDate: ordinal "3rd" for day 3', () => {
  const date = makeDate({ year: 2026, month: 0, day: 3 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('3rd'), `Expected "3rd" in "${result}"`);
});

runTest('formatDate: ordinal "4th" for day 4', () => {
  const date = makeDate({ year: 2026, month: 0, day: 4 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('4th'), `Expected "4th" in "${result}"`);
});

runTest('formatDate: ordinal "11th" for day 11 (special case)', () => {
  const date = makeDate({ year: 2026, month: 0, day: 11 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('11th'), `Expected "11th" in "${result}"`);
});

runTest('formatDate: ordinal "12th" for day 12 (special case)', () => {
  const date = makeDate({ year: 2026, month: 0, day: 12 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('12th'), `Expected "12th" in "${result}"`);
});

runTest('formatDate: ordinal "13th" for day 13 (special case)', () => {
  const date = makeDate({ year: 2026, month: 0, day: 13 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('13th'), `Expected "13th" in "${result}"`);
});

runTest('formatDate: ordinal "21st" for day 21', () => {
  const date = makeDate({ year: 2026, month: 0, day: 21 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('21st'), `Expected "21st" in "${result}"`);
});

runTest('formatDate: ordinal "22nd" for day 22', () => {
  const date = makeDate({ year: 2026, month: 0, day: 22 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('22nd'), `Expected "22nd" in "${result}"`);
});

runTest('formatDate: ordinal "23rd" for day 23', () => {
  const date = makeDate({ year: 2026, month: 0, day: 23 });
  const result = ClockModule.formatDate(date);
  assert(result.includes('23rd'), `Expected "23rd" in "${result}"`);
});

runTest('formatDate: all 12 month names are used correctly (spot-check December)', () => {
  // 2026-12-25 is a Friday
  const date = makeDate({ year: 2026, month: 11, day: 25 }); // month 11 = December
  const result = ClockModule.formatDate(date);
  assert(result.includes('December'), `Expected "December" in "${result}"`);
  assert(result.includes('25th'), `Expected "25th" in "${result}"`);
});

runTest('formatDate: all weekday names are used correctly (spot-check Sunday)', () => {
  // 2026-01-04 is a Sunday
  const date = makeDate({ year: 2026, month: 0, day: 4 });
  const result = ClockModule.formatDate(date);
  assert(result.startsWith('Sunday,'), `Expected "Sunday," at start, got: "${result}"`);
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
  console.log('');
  process.exit(0);
}
