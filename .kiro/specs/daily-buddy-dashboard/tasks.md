# Implementation Plan: DailyBuddy Dashboard

## Overview

Implement the DailyBuddy Dashboard as three plain files — `index.html`, `css/style.css`, and `js/app.js` — with no build tools or external dependencies. The implementation follows the modular architecture defined in the design: StorageService and EventBus are built first as shared infrastructure, then each feature module (Clock, Timer, Tasks, Links, Settings) is added incrementally, and finally everything is wired together in the App bootstrap.

## Tasks

- [x] 1. Create project file structure and HTML skeleton
  - Create `index.html` with semantic layout: hero card (clock + greeting), timer card, tasks card, links card, and settings panel
  - Add `<link>` to `css/style.css` and `<script src="js/app.js" defer>` in `<head>`
  - Include a Content Security Policy `<meta>` tag restricting scripts to `'self'` and disabling `unsafe-inline` for scripts
  - Add placeholder `id` attributes for all DOM targets referenced by modules (`#clock-time`, `#clock-date`, `#greeting`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#task-input`, `#task-list`, `#progress-bar`, `#progress-label`, `#edit-tasks-btn`, `#links-panel`, `#add-link-btn`, `#theme-toggle`, `#set-name-btn`)
  - Create empty `css/style.css` and `js/app.js` files
  - _Requirements: 10.1, 10.2, 8.5_

- [x] 2. Implement StorageService and EventBus
  - [x] 2.1 Implement `StorageService` in `js/app.js`
    - Define `KEYS` namespace constants (`dailybuddy_tasks`, `dailybuddy_links`, `dailybuddy_settings`, `dailybuddy_timer`)
    - Implement `get(key, fallback)` with `JSON.parse` wrapped in try/catch returning fallback on error
    - Implement `set(key, value)` with `JSON.stringify` wrapped in try/catch that silently no-ops on failure
    - Implement `remove(key)` and `loadAll()` returning `{ tasks, links, settings, timerHistory }`
    - Detect localStorage unavailability and set a module-level flag for the App to read
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 2.2 Write property test for StorageService round-trip (Property 6)
    - **Property 6: Storage round-trip** — for any serializable value `v`, `StorageService.get(key, null)` returns a deep-equal value after `StorageService.set(key, v)`
    - **Validates: Requirements 7.10**

  - [x] 2.3 Implement `EventBus` in `js/app.js`
    - Implement `on(event, handler)`, `off(event, handler)`, and `emit(event, payload)`
    - _Requirements: (cross-module communication used by all feature modules)_

- [x] 3. Implement CSS foundation — layout, theme variables, and component styles
  - Define CSS custom properties for the light theme (colors, spacing, border-radius, shadows)
  - Define overrides for the `body.dark-mode` selector to implement the dark theme
  - Write card-based grid layout for the dashboard panels
  - Style the progress bar, modal backdrop, modal card, and link button hover state (revealing edit/delete icons)
  - Add CSS transitions for theme toggle and progress bar width
  - _Requirements: 6.3, 6.4, 6.8_

- [x] 4. Implement ClockModule
  - [x] 4.1 Implement `ClockModule` in `js/app.js`
    - Implement `formatTime(date)` returning zero-padded `"HH:MM:SS"` string
    - Implement `formatDate(date)` returning `"Weekday, Month Dayth Year"` with ordinal suffix
    - Implement `getGreeting(hour)` returning `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), or `"Good Evening"` (18–23, 0–4)
    - Implement `init()` starting a single `setInterval` at 1000 ms that updates `#clock-time`, `#clock-date`, and `#greeting`
    - Implement `destroy()` to clear the interval
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 4.2 Write unit tests for `formatTime`, `formatDate`, and `getGreeting`
    - `formatTime` returns a string matching `\d{2}:\d{2}:\d{2}` and zero-pads single digits
    - `getGreeting(9)` → `"Good Morning"`, `getGreeting(14)` → `"Good Afternoon"`, `getGreeting(20)` → `"Good Evening"`
    - Boundary hours: 5, 11, 12, 17, 18, 23, 0, 4
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 5. Implement SettingsModule
  - [x] 5.1 Implement `SettingsModule` in `js/app.js`
    - Implement `init(settings)` applying saved theme and name on load; default name to `"Friend"` when absent
    - Implement `setName(name)` saving to StorageService and updating `#greeting` immediately
    - Implement `getName()` returning saved name or `"Friend"`
    - Implement `toggleTheme()` flipping light/dark, persisting, and calling `applyTheme`
    - Implement `applyTheme(theme)` adding/removing the `dark-mode` class on `document.body` only — no other class mutations
    - Implement `getTheme()` returning `"light"` or `"dark"`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 5.2 Write property test for theme idempotency (Property 9)
    - **Property 9: Theme idempotency** — calling `applyTheme(theme)` twice with the same argument produces the same DOM state as calling it once
    - **Validates: Requirements 6.4, 6.8**

- [x] 6. Checkpoint — Verify clock, settings, and storage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement TimerModule
  - [x] 7.1 Implement `TimerModule` in `js/app.js`
    - Implement `init(settings)` loading saved duration from StorageService (default 25 min) and rendering the initial `MM:SS` display
    - Implement `formatDisplay(totalSeconds)` returning zero-padded `"MM:SS"` string
    - Implement `start()` with a guard (`if (intervalId !== null) return`) to prevent double-start; set `status = "running"`, start `setInterval` ticking every 1000 ms
    - Implement `stop()` clearing the interval and emitting `timer:stopped` with elapsed time
    - Implement `reset()` clearing the interval and restoring `remaining` to `duration`
    - Implement `setDuration(minutes)` updating duration, persisting via StorageService, and resetting the display
    - Implement `getState()` returning `{ status, remaining, duration }`
    - On each tick: decrement `remaining`, clamp to `≥ 0`, update display; when `remaining` reaches 0 clear interval, save `TimerSession`, emit `timer:complete`
    - Manage button disabled states: Start disabled while running; Stop disabled while idle
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

  - [x] 7.2 Write property test for timer non-negative remaining (Property 4)
    - **Property 4: Timer non-negative** — `TimerModule.getState().remaining` is always `≥ 0` regardless of tick count
    - **Validates: Requirements 2.13**

  - [x] 7.3 Write property test for timer single interval (Property 5)
    - **Property 5: Timer single interval** — calling `start()` multiple times in rapid succession results in at most one active `setInterval`
    - **Validates: Requirements 2.10**

  - [x] 7.4 Write unit tests for `formatDisplay` and timer state transitions
    - `formatDisplay(0)` → `"00:00"`, `formatDisplay(90)` → `"01:30"`, `formatDisplay(1500)` → `"25:00"`
    - Start → Stop → Reset state transitions
    - _Requirements: 2.7, 2.8, 2.9_

- [x] 8. Implement TasksModule — core CRUD and progress
  - [x] 8.1 Implement `TasksModule` core in `js/app.js`
    - Implement `init(tasks)` loading the tasks array and calling `renderTaskList` and `renderProgressBar`
    - Implement `addTask(text)` following the Task Addition Algorithm: trim, validate non-empty, validate ≤ 200 chars, case-insensitive duplicate check, create Task object with `generateId()`, push, save, emit `tasks:updated`, re-render
    - Implement `toggleTask(id)` flipping `done`, recording `completedAt` when marking done, saving, emitting `tasks:updated`
    - Implement `deleteTask(id)` removing from array, saving, emitting `tasks:updated`, re-rendering
    - Implement `editTask(id, newText)` with same validation as `addTask` (excluding self from duplicate check), saving, emitting `tasks:updated`
    - Implement `getProgress()` following the Progress Calculation Algorithm: count done tasks, compute `Math.round((done/total)*100)`, return `{ done, total, percent }`; return `percent: 0` when `total = 0`
    - Implement `renderTaskList(tasks)` and `renderProgressBar(progress)` using `textContent` for all user-supplied strings — never `innerHTML`
    - Implement `getHistory()` and `clearHistory()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 8.1_

  - [x] 8.2 Write property test for task uniqueness (Property 1)
    - **Property 1: Task uniqueness** — for all pairs `(t1, t2)` in the tasks array where `t1.id ≠ t2.id`, `t1.text.toLowerCase().trim() ≠ t2.text.toLowerCase().trim()`
    - **Validates: Requirements 3.3**

  - [x] 8.3 Write property test for progress bounds (Property 2)
    - **Property 2: Progress bounds** — `getProgress().percent` is always an integer in `[0, 100]` for any tasks array
    - **Validates: Requirements 3.8, 3.9**

  - [x] 8.4 Write property test for progress accuracy (Property 3)
    - **Property 3: Progress accuracy** — `getProgress().done` equals the exact count of tasks where `done === true`
    - **Validates: Requirements 3.8**

  - [x] 8.5 Write unit tests for `addTask` validation and `getProgress` edge cases
    - Empty string rejected, whitespace-only rejected, >200 chars rejected, duplicate (case-insensitive) rejected
    - `getProgress([])` → `{ done: 0, total: 0, percent: 0 }`
    - `getProgress([{done:true},{done:false}])` → `{ done: 1, total: 2, percent: 50 }`
    - _Requirements: 3.2, 3.3, 3.4, 3.9_

- [x] 9. Implement TaskModal (Edit Tasks overlay)
  - [x] 9.1 Implement `TaskModal` sub-component in `js/app.js`
    - Implement `openEditModal()` / `TaskModal.open(tasks)`: guard against double-open; create `.modal-backdrop` and `.edit-tasks-modal` elements; append to `document.body`; move focus to the close button
    - Implement `renderRows(tasks)` building each row with task label (via `textContent`), Edit button, and Delete button
    - Implement sort controls (Default / A–Z / Done Last) wired to `sortTasks(tasks, strategy)` — re-renders rows without mutating the persisted array
    - Implement `activateEditRow(id)` replacing the task label with a pre-filled `<input>` plus Save (✓) and Cancel (✗) buttons; inline validation on Save (empty, >200 chars, duplicate excluding self)
    - Implement `deactivateEditRow(id, text)` restoring the label view
    - Implement `closeEditModal()` removing `.edit-tasks-modal` and `.modal-backdrop` from DOM; safe to call when no modal is open
    - Wire backdrop click and X button click to `closeEditModal()`
    - Implement focus trapping: Tab and Shift+Tab cycle only within modal focusable elements
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14_

  - [x] 9.2 Write unit tests for `sortTasks` and modal open/close DOM state
    - `sortTasks(tasks, "az")` returns alphabetically sorted array without mutating input
    - `sortTasks(tasks, "done-last")` places all done tasks after undone tasks
    - `sortTasks(tasks, "default")` preserves `createdAt` ascending order
    - After `closeEditModal()`, no `.edit-tasks-modal` or `.modal-backdrop` in DOM
    - _Requirements: 4.3, 4.4, 4.10, 4.11_

  - [x] 9.3 Write property test for sort non-destructive (Property 8)
    - **Property 8: Sort non-destructive** — `sortTasks(tasks, strategy).length === tasks.length` for all valid strategies and any tasks array; original array is not mutated
    - **Validates: Requirements 4.4**

- [x] 10. Checkpoint — Verify tasks, modal, and timer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement LinksModule
  - [x] 11.1 Implement `LinksModule` in `js/app.js`
    - Implement `init(links)` loading the links array and calling `renderLinkButtons`
    - Implement `validateUrl(url)` following the URL Validation Algorithm: trim, check non-empty, try `new URL(trimmed)`, check protocol is `http:` or `https:`, return `{ valid, error }` — never throws
    - Implement `addLink(label, url)` following the Add Quick Link Algorithm: validate label (non-empty, ≤ 50 chars) and URL, create QuickLink with `generateId()`, push, save, hide form, re-render
    - Implement `editLink(id, label, url)` following the Edit Quick Link Algorithm: same validation, find by id, update in place, save, re-render
    - Implement `deleteLink(id)` removing from array, saving, re-rendering
    - Implement `openLink(url)` using `window.open(url, "_blank", "noopener,noreferrer")`
    - Implement `renderLinkButtons(links)` rendering each link as a styled button with `textContent` for label; attach hover listeners to reveal Edit and Delete icon buttons
    - Implement `showAddForm()` / `hideAddForm()` and `showEditForm(id)` / `hideEditForm()` for the inline forms
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, 8.1, 8.2, 8.3_

  - [x] 11.2 Write property test for URL safety (Property 7)
    - **Property 7: URL safety** — all URLs stored in `links` pass `new URL(url)` without throwing and have protocol `http:` or `https:`
    - **Validates: Requirements 5.8, 8.2**

  - [x] 11.3 Write unit tests for `validateUrl`
    - `validateUrl("")` → `{ valid: false }`
    - `validateUrl("not-a-url")` → `{ valid: false }`
    - `validateUrl("javascript:alert(1)")` → `{ valid: false }`
    - `validateUrl("ftp://example.com")` → `{ valid: false }`
    - `validateUrl("https://google.com")` → `{ valid: true, error: null }`
    - `validateUrl("http://localhost:3000")` → `{ valid: true, error: null }`
    - _Requirements: 5.8, 8.2_

- [x] 12. Implement App bootstrap and cross-module wiring
  - [x] 12.1 Implement the `App` bootstrap in `js/app.js`
    - Add `DOMContentLoaded` listener that calls `StorageService.loadAll()` then initialises modules in order: `SettingsModule.init`, `ClockModule.init`, `TasksModule.init`, `TimerModule.init`, `LinksModule.init`
    - If StorageService detected localStorage unavailability, render a subtle banner warning the user that data will not be persisted
    - Wire all button click handlers: `#theme-toggle`, `#set-name-btn`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#edit-tasks-btn`, `#add-link-btn`, task add form submit
    - _Requirements: 7.9, 10.3, 10.4, 10.5_

  - [x] 12.2 Wire EventBus cross-module events
    - Subscribe to `tasks:updated`: call `TasksModule.getProgress()` and update `#progress-bar` width and `#progress-label` text
    - Subscribe to `timer:complete`: show a notification (use `Notification` API if permission granted, otherwise display an in-page banner)
    - Subscribe to `timer:stopped`: update timer display with elapsed time
    - _Requirements: 2.5, 2.6, 3.7_

  - [x] 12.3 Write property test for XSS prevention (Property 10)
    - **Property 10: XSS prevention** — for any arbitrary string input (including `<script>`, `<img onerror>`, etc.), no user-supplied string is ever assigned to `innerHTML`; verify all task text, link labels, and display names are set via `textContent` or safe DOM attributes
    - **Validates: Requirements 8.1, 8.4**

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones
- Property tests validate universal correctness properties (Properties 1–10 from the design)
- Unit tests validate specific examples and edge cases
- No test framework setup is required per the design; tests can be added as a simple in-browser test harness or with a zero-config runner like `qunit` loaded from a local file
- All user-supplied strings must use `textContent` — never `innerHTML` — throughout the entire implementation
