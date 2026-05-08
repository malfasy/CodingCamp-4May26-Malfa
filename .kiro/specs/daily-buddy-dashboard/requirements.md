# Requirements Document

## Introduction

DailyBuddy Dashboard is a lightweight, single-page web dashboard that helps users organize their day at a glance. It combines a live clock with a time-of-day greeting, a configurable Pomodoro focus timer, a to-do list with progress tracking and a modal-based task editor, and a quick-links panel — all persisted in browser localStorage with no backend, no build tools, and no external dependencies.

The application is built with plain HTML, CSS, and vanilla JavaScript and is deployable as a standalone web page or browser new-tab homepage.

---

## Glossary

- **Dashboard**: The single-page DailyBuddy web application.
- **ClockModule**: The module responsible for displaying the live time, date, and greeting.
- **TimerModule**: The module responsible for the configurable countdown (Pomodoro) timer.
- **TasksModule**: The module responsible for managing the to-do list.
- **TaskModal**: The modal overlay sub-component of TasksModule for bulk task management.
- **LinksModule**: The module responsible for managing quick-link buttons.
- **SettingsModule**: The module responsible for user preferences (name, theme, timer duration).
- **StorageService**: The thin localStorage wrapper used by all modules for persistence.
- **EventBus**: The publish/subscribe bus used for decoupled cross-module communication.
- **Task**: A to-do item with an id, text, done flag, createdAt timestamp, and optional completedAt timestamp.
- **QuickLink**: A saved URL shortcut with an id, label, and url.
- **Settings**: The persisted user preferences object containing name, theme, and timerDuration.
- **TimerSession**: A record of a completed or stopped timer run, stored in localStorage.
- **Progress**: The ratio of completed tasks to total tasks, expressed as a percentage.
- **Sort Strategy**: One of three task ordering modes — Default (insertion order), A–Z (alphabetical), or Done Last.
- **Inline Edit**: Replacing a task label in the modal with a text input for direct editing.
- **Backdrop**: A semi-transparent full-viewport overlay rendered behind the Edit Tasks modal.

---

## Requirements

### Requirement 1: Live Clock and Greeting

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the dashboard, so that I have an immediate sense of the time of day and feel welcomed.

#### Acceptance Criteria

1. THE ClockModule SHALL display the current local time in `HH:MM:SS` format, updating every second.
2. THE ClockModule SHALL display the current date in the format `Weekday, Month Day Year` (e.g., "Wednesday, May 8th 2026").
3. WHEN the current hour is between 5 and 11 (inclusive), THE ClockModule SHALL produce the greeting string "Good Morning".
4. WHEN the current hour is between 12 and 17 (inclusive), THE ClockModule SHALL produce the greeting string "Good Afternoon".
5. WHEN the current hour is between 18 and 23 (inclusive) or between 0 and 4 (inclusive), THE ClockModule SHALL produce the greeting string "Good Evening".
6. THE Dashboard SHALL display the greeting string combined with the user's display name (e.g., "Good Morning, Alex!").
7. THE ClockModule SHALL use a single `setInterval` at a 1000 ms interval to drive all time updates.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a configurable countdown timer so that I can run focused work sessions and track when they complete.

#### Acceptance Criteria

1. THE TimerModule SHALL default to a duration of 25 minutes when no saved duration exists.
2. WHEN the user clicks Start, THE TimerModule SHALL begin a countdown from the current remaining time, decrementing by one second per tick.
3. WHEN the user clicks Stop, THE TimerModule SHALL pause the countdown and emit a `timer:stopped` event with the elapsed time.
4. WHEN the user clicks Reset, THE TimerModule SHALL stop the countdown and restore the display to the full configured duration.
5. WHEN the countdown reaches zero, THE TimerModule SHALL clear the interval, save a completed `TimerSession` to StorageService, and emit a `timer:complete` event.
6. WHEN a `timer:complete` event is emitted, THE Dashboard SHALL display a notification informing the user that the focus session is complete.
7. THE TimerModule SHALL display the remaining time in `MM:SS` format.
8. WHILE the timer is running, THE TimerModule SHALL disable the Start button and enable the Stop and Reset buttons.
9. WHILE the timer is idle, THE TimerModule SHALL enable the Start button and disable the Stop button.
10. THE TimerModule SHALL prevent more than one concurrent `setInterval` from being active at any time.
11. WHEN the user sets a custom duration via Settings, THE TimerModule SHALL update the duration, persist it via StorageService, and reset the display to the new duration.
12. WHEN the page loads, THE TimerModule SHALL restore the previously saved timer duration from StorageService.
13. THE TimerModule SHALL ensure the remaining time is never displayed as a negative value.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, complete, and manage tasks in a to-do list so that I can track what I need to accomplish during the day.

#### Acceptance Criteria

1. WHEN a user submits a non-empty task description, THE TasksModule SHALL create a new Task and append it to the task list.
2. WHEN a user submits a task description that is empty or contains only whitespace, THE TasksModule SHALL reject the submission and display an inline error message.
3. WHEN a user submits a task description whose trimmed, case-insensitive text matches an existing task, THE TasksModule SHALL reject the submission and display a duplicate error message.
4. WHEN a task description exceeds 200 characters, THE TasksModule SHALL reject the submission and display an error message.
5. WHEN a task is successfully added, THE TasksModule SHALL persist the updated task list to StorageService immediately.
6. WHEN a user toggles the completion checkbox on a task, THE TasksModule SHALL flip the task's `done` flag, record the `completedAt` timestamp if marking done, and persist the change.
7. WHEN the task list changes, THE TasksModule SHALL emit a `tasks:updated` event so the progress bar re-renders.
8. THE TasksModule SHALL display a progress bar showing the percentage of completed tasks out of total tasks.
9. WHEN the task list is empty, THE TasksModule SHALL display a progress percentage of 0%.
10. THE TasksModule SHALL display a history view of all tasks where `done === true`.
11. WHEN the user clears history, THE TasksModule SHALL permanently remove all completed tasks from the list and persist the change.
12. WHEN the page loads, THE TasksModule SHALL restore the full task list from StorageService.

---

### Requirement 4: Edit Tasks Modal

**User Story:** As a user, I want to open a modal to sort, edit, and delete my tasks in one place so that I can manage my task list without navigating away from the dashboard.

#### Acceptance Criteria

1. WHEN the user clicks the "Edit Tasks" button, THE TasksModule SHALL open the TaskModal overlay, rendering a semi-transparent backdrop and a centered modal card.
2. THE TaskModal SHALL render every task as a row containing the task label, an Edit button, and a Delete button.
3. THE TaskModal SHALL display sort controls offering three strategies: Default (insertion order), A–Z (alphabetical), and Done Last.
4. WHEN the user selects a sort strategy, THE TaskModal SHALL re-render the task rows in the selected order without mutating the persisted task array.
5. WHEN the user clicks the Delete button on a task row, THE TasksModule SHALL remove that task, persist the change, and re-render the modal rows and the main task list.
6. WHEN the user clicks the Edit button on a task row, THE TaskModal SHALL replace the task label with a pre-filled text input and display Save and Cancel buttons.
7. WHEN the user saves an inline edit with a valid, non-duplicate task text, THE TasksModule SHALL update the task, persist the change, and restore the row to label view.
8. WHEN the user saves an inline edit with an empty, too-long, or duplicate task text, THE TaskModal SHALL display an inline error and keep the input active.
9. WHEN the user clicks Cancel during inline edit, THE TaskModal SHALL discard changes and restore the row to its original label.
10. WHEN the user clicks the X button in the modal header, THE TaskModal SHALL close and remove the backdrop and modal from the DOM.
11. WHEN the user clicks the backdrop, THE TaskModal SHALL close and remove the backdrop and modal from the DOM.
12. WHEN the TaskModal opens, THE Dashboard SHALL move keyboard focus to the modal close button.
13. WHILE the TaskModal is open, THE Dashboard SHALL trap keyboard focus within the modal.
14. WHEN the TaskModal closes, THE main task list SHALL reflect the latest persisted task state.

---

### Requirement 5: Quick Links Panel

**User Story:** As a user, I want to save and manage quick-link buttons so that I can open my frequently visited URLs with a single click.

#### Acceptance Criteria

1. THE LinksModule SHALL render each saved QuickLink as a styled button displaying the link's label.
2. WHEN a user clicks a link button, THE LinksModule SHALL open the link's URL in a new browser tab using `window.open` with `"noopener,noreferrer"`.
3. THE LinksModule SHALL display an "Add Link" button at the end of the links panel.
4. WHEN the user clicks "Add Link", THE LinksModule SHALL display an inline form with a Label field and a URL field.
5. WHEN the user submits the Add Link form with a valid label and valid URL, THE LinksModule SHALL create a new QuickLink, persist it, hide the form, and re-render the link buttons.
6. WHEN the user submits the Add Link form with an empty label, THE LinksModule SHALL display an inline error and keep the form open.
7. WHEN the user submits the Add Link form with a label exceeding 50 characters, THE LinksModule SHALL display an inline error and keep the form open.
8. WHEN the user submits the Add Link form with an invalid or non-http/https URL, THE LinksModule SHALL display an inline error and keep the form open.
9. WHEN the user clicks Cancel on the Add Link form, THE LinksModule SHALL dismiss the form without saving any changes.
10. WHEN the user hovers over a link button, THE LinksModule SHALL reveal an Edit icon and a Delete icon for that link.
11. WHEN the user clicks the Edit icon on a link, THE LinksModule SHALL display an edit form pre-filled with the link's current label and URL.
12. WHEN the user submits the Edit Link form with valid data, THE LinksModule SHALL update the QuickLink, persist the change, hide the form, and re-render the link buttons.
13. WHEN the user submits the Edit Link form with invalid data, THE LinksModule SHALL display an inline error and keep the form open.
14. WHEN the user clicks the Delete icon on a link, THE LinksModule SHALL remove the QuickLink, persist the change, and re-render the link buttons.
15. WHEN the page loads, THE LinksModule SHALL restore the saved links array from StorageService.

---

### Requirement 6: Settings

**User Story:** As a user, I want to configure my display name, color theme, and timer duration so that the dashboard feels personalized and suits my preferences.

#### Acceptance Criteria

1. THE SettingsModule SHALL default the display name to "Friend" when no name has been saved.
2. WHEN the user sets a display name, THE SettingsModule SHALL save the name to StorageService and update the greeting heading immediately.
3. THE SettingsModule SHALL support a light theme and a dark theme.
4. WHEN the user toggles the theme, THE SettingsModule SHALL flip between light and dark, persist the new theme, and apply it by toggling the `dark-mode` CSS class on `document.body`.
5. WHEN the page loads, THE SettingsModule SHALL restore and apply the saved theme from StorageService.
6. WHEN the page loads, THE SettingsModule SHALL restore the saved display name from StorageService.
7. WHEN the user sets a custom timer duration, THE SettingsModule SHALL persist the new duration and notify TimerModule to update its display.
8. THE SettingsModule SHALL apply the theme exclusively by adding or removing the `dark-mode` class on `document.body`, without modifying any other classes.

---

### Requirement 7: localStorage Persistence

**User Story:** As a user, I want my tasks, links, settings, and timer preferences to survive page reloads so that I do not lose my data between sessions.

#### Acceptance Criteria

1. THE StorageService SHALL persist tasks under the namespaced key `"dailybuddy_tasks"`.
2. THE StorageService SHALL persist links under the namespaced key `"dailybuddy_links"`.
3. THE StorageService SHALL persist settings under the namespaced key `"dailybuddy_settings"`.
4. THE StorageService SHALL persist timer history under the namespaced key `"dailybuddy_timer"`.
5. WHEN reading a value, THE StorageService SHALL JSON-parse the stored string and return the result.
6. WHEN writing a value, THE StorageService SHALL JSON-stringify the value before storing it.
7. IF `JSON.parse` throws when reading a stored value, THEN THE StorageService SHALL catch the error and return the caller-supplied fallback value.
8. IF `localStorage` is unavailable or throws during a write, THEN THE StorageService SHALL catch the error and silently no-op, allowing the application to continue operating in-memory.
9. WHEN localStorage is unavailable, THE Dashboard SHALL display a subtle warning informing the user that data will not be persisted.
10. FOR ALL serializable values, reading a key immediately after writing that key SHALL return a value that is deep-equal to the written value.

---

### Requirement 8: Security

**User Story:** As a user, I want the dashboard to be safe from script injection and malicious links so that my browser and data are not compromised.

#### Acceptance Criteria

1. THE Dashboard SHALL insert all user-supplied strings (task text, link labels, display name) exclusively via `element.textContent` or safe DOM attributes, never via `innerHTML`.
2. THE LinksModule SHALL reject any URL whose protocol is not `http:` or `https:`.
3. WHEN opening a link in a new tab, THE LinksModule SHALL pass `"noopener,noreferrer"` as the `window.open` features string.
4. THE Dashboard SHALL not use `eval()`, `new Function()`, or `setTimeout` with a string argument anywhere in the codebase.
5. THE Dashboard HTML file SHALL include a Content Security Policy meta tag restricting scripts to `'self'` and disabling `unsafe-inline` for scripts.

---

### Requirement 9: Browser Compatibility

**User Story:** As a user, I want the dashboard to work correctly in all major modern browsers so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE Dashboard SHALL load and function correctly in the current stable release of Google Chrome.
2. THE Dashboard SHALL load and function correctly in the current stable release of Mozilla Firefox.
3. THE Dashboard SHALL load and function correctly in the current stable release of Microsoft Edge.
4. THE Dashboard SHALL load and function correctly in the current stable release of Apple Safari.
5. THE Dashboard SHALL produce no JavaScript errors in the browser console on initial load in any of the four supported browsers.

---

### Requirement 10: No Backend, No Build Tools

**User Story:** As a developer, I want the dashboard to require no server, no build step, and no external dependencies so that it can be deployed by simply opening the HTML file.

#### Acceptance Criteria

1. THE Dashboard SHALL consist solely of a single `index.html` file, a single `css/style.css` file, and a single `js/app.js` file.
2. THE Dashboard SHALL not require any npm packages, CDN scripts, build tools, or transpilation to run.
3. THE Dashboard SHALL use only native browser APIs available in modern browsers without polyfills.
4. THE Dashboard SHALL make zero network requests after the initial page load.
5. THE Dashboard SHALL function correctly when opened directly as a local file (via `file://` protocol) or served from any static HTTP server.
