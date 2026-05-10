# Timebox App — Requirements Document

## 1. Overview

Timebox is a native Windows desktop application that helps users plan their day by listing tasks, assigning durations, and dragging them onto a configurable daily timeline. Beyond the daily view, the app supports weekly and monthly planning at a higher level of abstraction, maintains a navigable history of past plans, allows planning into the future, and notifies the user as they transition between timeblocks throughout the day.

### 1.1 Goals

- Provide a fast, low-friction way to plan a day in concrete time blocks.
- Surface higher-level intent through weekly and monthly planning views.
- Keep the user on track during the day via native Windows notifications.
- Allow plans to flex during the day without losing the original structure.
- Preserve a complete history of plans for reflection and review.

### 1.2 Non-Goals

- Multi-user collaboration or shared timeboxes.
- Cross-platform support (mobile, macOS, Linux, web).
- Calendar integration with third-party services (e.g. Outlook, Google Calendar) — this may be considered for a future release but is out of scope for v1.
- Team or organisational account hierarchies.

### 1.3 Target Platform

- Windows 10 (version 1809+) and Windows 11.
- Delivered as a native Windows application (e.g. WinUI 3 / WPF / .NET MAUI for Windows). Specific framework choice is an implementation decision but the app must feel native, support native notifications, and be installable via a standard Windows installer or MSIX package.

---

## 2. User Accounts and Authentication

### 2.1 Sign-Up

- A user can create a new account with a username, email address, and password.
- Passwords must meet a minimum strength policy (e.g. minimum 8 characters, mixed case, at least one number).
- Passwords are stored hashed (e.g. bcrypt or Argon2) — never in plaintext.
- Email addresses must be unique across the system.

### 2.2 Sign-In

- A returning user signs in with username (or email) and password.
- The app supports a "remember me" option that keeps the user signed in across application restarts.
- After a configurable period of inactivity, the session may require re-authentication (default: 30 days).

### 2.3 Account Management

- A signed-in user can change their password from the settings screen (requires entering the current password).
- A signed-in user can sign out.
- A user can delete their account, which also deletes all associated timeboxes, plans, and notes.

### 2.4 Scope

- Authentication is intentionally basic. No SSO, OAuth, or MFA in v1. These may be revisited later.

---

## 3. Daily Timebox View

The daily view is the core of the application.

### 3.1 Task List (Inbox)

- Each day has its own task list. The list does **not** carry over from one day to the next — every day starts with a fresh, empty list.
- The user can add tasks to the day's list, each with:
  - A title (required).
  - An estimated duration (required, in minutes).
  - Optional notes.
- Tasks can be edited or deleted while in the list.
- Tasks in the list are not yet placed on the timeline — they sit in an "unscheduled" pool for that day.

### 3.2 Timeline

- The timeline represents a single day, displayed vertically (or horizontally — implementation choice, but vertical is recommended for readability).
- The timeline covers a configurable visible range (default: 6:00 AM to 10:00 PM), with the ability to scroll to view the full 24 hours.
- The timeline is divided into time increments. The increment is configurable per user (see §3.3).
- The current time is indicated by a clearly visible "now" line that updates in real time.

### 3.3 Configurable Time Increments

- The user can configure the timeline granularity. Supported values:
  - 5 minutes
  - 10 minutes
  - 15 minutes (default)
  - 30 minutes
  - 60 minutes
- Changing the increment affects snapping behaviour during drag-and-drop and the visual gridlines on the timeline.
- A task's duration is preserved when the increment changes; it is not rounded or truncated.

### 3.4 Drag and Drop

- The user can drag a task from the unscheduled task list onto the timeline.
- On drop, the task occupies a block whose length matches its duration.
- The drop position snaps to the nearest configured increment.
- Tasks already placed on the timeline can be:
  - Dragged to a new time slot.
  - Resized at the top or bottom edge to change their duration (also snapping to the configured increment).
  - Returned to the unscheduled list by dragging them off the timeline (or via a context menu action).

### 3.5 Conflict Handling

- If a user attempts to drop a task into a slot that overlaps an existing task, the app should:
  - By default, prevent the drop and visually indicate the conflict.
  - Optionally (via a setting), allow overlapping blocks for users who want to represent parallel activities.
- When resizing a task such that it would overlap another, the same rule applies.

### 3.6 In-Day Modifications

Plans change. The user must be able to mutate the day's plan at any time:

- Add new tasks to the unscheduled list and place them on the timeline mid-day.
- Change the duration of an existing task (via resize or by editing its properties).
- Remove tasks from the timeline (returning them to the unscheduled list) or delete them entirely.
- Modifying past tasks (those whose timebox has already ended) is permitted but should be visually distinct (e.g. a confirmation prompt or a subtle warning), since this affects historical data.

---

## 4. Task Completion

### 4.1 Default Completion Behaviour

- Once a task's assigned timebox is entirely in the past (i.e. its end time has elapsed), it is automatically marked as **complete**.
- This auto-completion happens regardless of whether the app is running at that moment; on next launch, the state is reconciled.

### 4.2 Manual Override

- The user can manually mark a task as **incomplete** if they did not complete it during its allocated time. This is useful for honest tracking and for re-planning.
- The user can manually mark a task as **complete** at any point — including before its scheduled time has elapsed — to indicate the work was finished early.
- Completion state is visually distinct on the timeline (e.g. checkmark, struck-through title, faded colour).

### 4.3 Completion History

- A task's completion state is preserved as part of the day's history. Reviewing a past day shows which tasks were completed and which were not.

---

## 5. Notes

- Each timebox (task placed on the timeline) can have free-form notes attached.
- Notes are added, edited, and viewed from a panel or modal accessible by selecting the timebox.
- Notes support plain text in v1. Rich text or markdown rendering may be considered later.
- Notes are preserved with the timebox in history.

---

## 6. Notifications

### 6.1 Mechanism

- Notifications use native Windows toast notifications (i.e. the standard Windows notification system, surfaced via Action Center).

### 6.2 Triggers

- A notification fires at the start of each timebox, indicating which task is now active.
- Optionally (configurable), a notification fires when transitioning from one timebox into the next, naming both the completed and upcoming tasks.

### 6.3 Notification Settings

- The user can globally enable or disable notifications from settings.
- The user can toggle the transition notification described above.
- Notifications must respect Windows-level Focus Assist / Do Not Disturb settings.

### 6.4 Background Behaviour

- Notifications must continue to fire while the app is minimised or running in the system tray.
- The app should run in the background (system tray) by default, with an option to fully quit.

---

## 7. History and Future Planning

### 7.1 Date Navigation

- The daily view includes a date picker that lets the user navigate to any past or future day.
- Navigation is unbounded in both directions — the user can plan months ahead or review years of history.

### 7.2 Past Days

- A past day's timebox is displayed in read-only-by-default mode. Editing past data is allowed but should require explicit confirmation, since it changes the historical record.
- Completion state is preserved as it was at the end of that day.

### 7.3 Future Days

- The user can fully plan future days: add tasks, place them on the timeline, attach notes.
- Future days are fully editable until they become the current day.

### 7.4 Today

- "Today" is always one click away (e.g. a "Today" button alongside the date picker).

---

## 8. Weekly Planner

The weekly planner provides a higher level of abstraction than the daily view.

### 8.1 Layout

- Displays a single week (Monday–Sunday by default; first day of week is configurable in settings).
- Each day is shown as a column or row (implementation choice) representing a "bucket" rather than a precise timeline.

### 8.2 Task Pool and Drag-and-Drop

- Each week has its own task pool, separate from any daily task list and from other weeks. The pool does **not** carry over from one week to the next.
- Tasks in the weekly pool have a title and optional notes. They do **not** require a duration, since they are not placed on a precise timeline.
- The user drags tasks from the weekly pool onto a specific day to indicate "I plan to do this on this day."
- A task placed on a day in the weekly view stays at the weekly level of abstraction — it does not become a daily timebox automatically, and there is no mechanism to promote it into the daily timeline. The daily and weekly views are intentionally independent: if the user wants the same task represented at both levels, they re-enter it in the daily task list.

### 8.3 Navigation

- The user can navigate to any past or future week.
- A "This Week" shortcut is available.

---

## 9. Monthly Planner

The monthly planner is one further level of abstraction up.

### 9.1 Layout

- Displays a single month in a standard grid (weeks as rows, days as cells), or alternatively as a list of weeks — this is an implementation choice but the grid is recommended for familiarity.
- Each week in the month is itself a "bucket" that can hold tasks.

### 9.2 Task Pool and Drag-and-Drop

- Each month has its own task pool, separate from any daily or weekly task list and from other months. The pool does **not** carry over from one month to the next.
- The user drags tasks onto a specific week (not a specific day) to indicate "I plan to do this in this week."
- As with the weekly planner, monthly tasks have a title and optional notes but no duration.
- A task placed on a week stays at the monthly level of abstraction — there is no mechanism to promote it into the weekly planner. The three views (daily, weekly, monthly) are intentionally independent.

### 9.3 Navigation

- The user can navigate to any past or future month.
- A "This Month" shortcut is available.

---

## 10. Settings

The settings screen is accessible from the main application chrome (e.g. a gear icon in the title bar or sidebar).

### 10.1 Appearance

- **Theme selection** — the user can choose from several colour themes (e.g. Light, Dark, Solarised, Sepia, plus 1–2 accent colour variants). At least 4 distinct themes should ship in v1.
- Theme changes apply immediately without requiring an app restart.

### 10.2 Timeline

- Default time increment (see §3.3).
- Default visible time range (start and end hour).
- Allow overlapping timeboxes (see §3.5).

### 10.3 Notifications

- Master enable/disable.
- Toggle for transition notifications (see §6.2).

### 10.4 Week and Calendar

- First day of week (Monday default; Sunday option).

### 10.5 Account

- Change password.
- Sign out.
- Delete account.

---

## 11. Data and Storage

### 11.1 Local Storage

- All user data (tasks, timeboxes, notes, plans, settings) is stored locally on the user's device.
- A local database (e.g. SQLite) is the recommended storage backend.

### 11.2 Cloud Sync

- Out of scope for v1. The architecture should not preclude adding sync later (i.e. data models should carry stable IDs and timestamps suitable for future sync), but no cloud component is built.

### 11.3 Data Retention

- History is retained indefinitely unless the user deletes their account.
- The user can optionally export their data (e.g. as JSON) from settings — nice-to-have for v1.

---

## 12. Non-Functional Requirements

### 12.1 Performance

- The daily timeline view must render and become interactive within 1 second on a typical mid-range Windows laptop.
- Drag-and-drop interactions must feel immediate (target: < 16ms frame time, i.e. 60fps).
- Navigating between days, weeks, or months should complete in under 500ms.

### 12.2 Reliability

- The app must not lose user data on unexpected shutdown. All edits are persisted to local storage immediately or within a short flush window (e.g. 1 second).
- The app must handle the system clock changing (timezone changes, daylight saving) without corrupting historical data — store all times as UTC internally and render in the user's local timezone.

### 12.3 Accessibility

- The app should follow Windows accessibility guidelines: keyboard navigation for all primary actions, screen reader labels on interactive elements, sufficient colour contrast in all themes.
- Drag-and-drop interactions must have a keyboard equivalent.

### 12.4 Security

- Passwords hashed with a modern algorithm (bcrypt or Argon2).
- Local database file should be protected by OS-level user permissions; full-disk-style encryption is not required for v1 but should be considered if cloud sync is added later.

---

## 13. Out of Scope (v1)

For clarity, the following are explicitly **not** part of v1:

- Cloud sync across devices.
- Mobile or web companion apps.
- Sharing timeboxes with other users.
- Integration with external calendars (Outlook, Google Calendar, iCal).
- Recurring tasks / templates (may be a fast-follow).
- Time tracking analytics and reports (may be a fast-follow).
- Tags, categories, or projects for tasks.
- Multi-factor authentication, SSO, or third-party identity providers.

---

## 14. Resolved Design Decisions

The following decisions have been confirmed and are reflected in the requirements above:

1. **Task lists are strictly per-view and per-period.** Each day has its own task list, each week its own, each month its own. Lists do not carry over from one period to the next. The user starts fresh each day, week, or month.
2. **No promotion between views.** Tasks in the weekly view stay at the weekly level; tasks in the monthly view stay at the monthly level. There is no mechanism to promote a weekly task into the daily timeline, or a monthly task into the weekly view. The three views are intentionally independent.
3. **No end-of-timebox warning.** Notifications fire at the start of a timebox, with an optional transition notification. There is no separate "wrap up" warning.
4. **No carry-forward of incomplete tasks.** Adding tasks is fast enough that re-adding them the next day is not a meaningful friction point.
5. **No prompt for offline auto-completion.** When the app reconciles state on launch and finds elapsed timeboxes, it auto-completes them silently per §4.1, without prompting the user.
