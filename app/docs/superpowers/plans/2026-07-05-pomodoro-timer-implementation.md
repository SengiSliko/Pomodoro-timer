# Pomodoro Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, full-viewport, monochrome Pomodoro timer web app with an animated hourglass, responsive layout, sound + browser notifications, and settings persisted to `localStorage`, deployable to Vercel with zero build step.

**Architecture:** Two pure, unit-tested state modules (`timer.js` for the session/countdown state machine, `settings.js` for settings validation) with zero DOM dependency, wired up by a DOM-glue module (`main.js`) that renders the clock/hourglass/controls and handles browser APIs (`localStorage`, Web Audio, Notifications). Plain HTML/CSS/JS, no framework, no bundler.

**Tech Stack:** Vanilla HTML5, CSS3, ES modules (JavaScript), Node's built-in test runner (`node --test`) for unit tests. No npm dependencies.

---

## File Structure

- `app/package.json` — minimal manifest (`"type": "module"`) so Node treats `.js` files as ES modules for the test runner; no dependencies.
- `app/timer.js` — pure session/countdown state machine (no DOM).
- `app/settings.js` — pure settings defaults + validation (no DOM).
- `app/tests/timer.test.mjs` — unit tests for `timer.js`.
- `app/tests/settings.test.mjs` — unit tests for `settings.js`.
- `app/index.html` — page markup, inline SVG hourglass, settings overlay markup.
- `app/styles.css` — layout, responsive rules, hourglass/trickle animation.
- `app/main.js` — DOM glue: countdown loop, rendering, controls, settings modal, sound, notifications, tab title.
- `app/README.md` — what it is, how to run locally, how to deploy to Vercel.
- `app/vercel.json` — explicit static-site config (no framework, no build command) so Vercel serves the app directory as-is.

---

## Task 1: Project scaffold

**Files:**
- Create: `app/package.json`
- Create: `app/.gitignore`

- [x] **Step 1: Initialize git**

```bash
cd /Users/rtsono/Desktop/webprojects && git init
```

- [x] **Step 2: Create package.json**

```json
{
  "name": "pomodoro-timer",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

Save as `app/package.json`.

- [x] **Step 3: Create .gitignore**

```
.DS_Store
node_modules/
```

Save as `app/.gitignore`.

- [x] **Step 4: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/package.json app/.gitignore docs 2>/dev/null; git add app/package.json app/.gitignore app/docs
git commit -m "chore: scaffold pomodoro-timer project"
```

---

## Task 2: Timer state machine (TDD)

**Files:**
- Create: `app/timer.js`
- Test: `app/tests/timer.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// app/tests/timer.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  durationFor,
  createInitialState,
  start,
  pause,
  resetSession,
  tick,
  nextSession,
} from '../timer.js';

const settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  soundOn: true,
};

test('durationFor returns seconds for each session type', () => {
  assert.equal(durationFor('work', settings), 25 * 60);
  assert.equal(durationFor('shortBreak', settings), 5 * 60);
  assert.equal(durationFor('longBreak', settings), 15 * 60);
});

test('createInitialState starts on work, full duration, not running', () => {
  const state = createInitialState(settings);
  assert.equal(state.sessionType, 'work');
  assert.equal(state.sessionsCompleted, 0);
  assert.equal(state.remainingSeconds, 25 * 60);
  assert.equal(state.totalSeconds, 25 * 60);
  assert.equal(state.running, false);
});

test('start and pause toggle the running flag only', () => {
  const state = createInitialState(settings);
  const running = start(state);
  assert.equal(running.running, true);
  assert.equal(running.remainingSeconds, state.remainingSeconds);
  const paused = pause(running);
  assert.equal(paused.running, false);
});

test('tick decrements remainingSeconds only while running', () => {
  const idle = createInitialState(settings);
  assert.equal(tick(idle).remainingSeconds, idle.remainingSeconds);

  const running = start(idle);
  const ticked = tick(running);
  assert.equal(ticked.remainingSeconds, idle.remainingSeconds - 1);
});

test('tick does not go below zero', () => {
  let state = { ...createInitialState(settings), running: true, remainingSeconds: 0 };
  state = tick(state);
  assert.equal(state.remainingSeconds, 0);
});

test('resetSession restores full duration for the current session type and pauses', () => {
  let state = start(createInitialState(settings));
  state = tick(state);
  state = resetSession(state, settings);
  assert.equal(state.remainingSeconds, 25 * 60);
  assert.equal(state.totalSeconds, 25 * 60);
  assert.equal(state.running, false);
});

test('nextSession cycles work -> shortBreak -> work across a full 4-session set, then longBreak, then resets', () => {
  let state = createInitialState(settings); // work, sessionsCompleted=0

  state = nextSession(state, settings); // after work #1
  assert.equal(state.sessionType, 'shortBreak');
  assert.equal(state.sessionsCompleted, 1);
  assert.equal(state.remainingSeconds, 5 * 60);

  state = nextSession(state, settings); // break -> work
  assert.equal(state.sessionType, 'work');
  assert.equal(state.sessionsCompleted, 1);
  assert.equal(state.remainingSeconds, 25 * 60);

  state = nextSession(state, settings); // after work #2
  assert.equal(state.sessionType, 'shortBreak');
  assert.equal(state.sessionsCompleted, 2);

  state = nextSession(state, settings); // break -> work
  state = nextSession(state, settings); // after work #3
  assert.equal(state.sessionType, 'shortBreak');
  assert.equal(state.sessionsCompleted, 3);

  state = nextSession(state, settings); // break -> work
  state = nextSession(state, settings); // after work #4 -> long break
  assert.equal(state.sessionType, 'longBreak');
  assert.equal(state.sessionsCompleted, 0);
  assert.equal(state.remainingSeconds, 15 * 60);

  state = nextSession(state, settings); // longBreak -> work, fresh cycle
  assert.equal(state.sessionType, 'work');
  assert.equal(state.sessionsCompleted, 0);
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/timer.test.mjs
```

Expected: FAIL — `Cannot find module '../timer.js'` (file doesn't exist yet).

- [x] **Step 3: Write the implementation**

```javascript
// app/timer.js

export function durationFor(sessionType, settings) {
  const minutes = sessionType === 'work'
    ? settings.workMinutes
    : sessionType === 'shortBreak'
      ? settings.shortBreakMinutes
      : settings.longBreakMinutes;
  return minutes * 60;
}

export function createInitialState(settings) {
  const totalSeconds = durationFor('work', settings);
  return {
    sessionType: 'work',
    sessionsCompleted: 0,
    remainingSeconds: totalSeconds,
    totalSeconds,
    running: false,
  };
}

export function start(state) {
  return { ...state, running: true };
}

export function pause(state) {
  return { ...state, running: false };
}

export function resetSession(state, settings) {
  const totalSeconds = durationFor(state.sessionType, settings);
  return { ...state, remainingSeconds: totalSeconds, totalSeconds, running: false };
}

export function tick(state) {
  if (!state.running || state.remainingSeconds <= 0) return state;
  return { ...state, remainingSeconds: state.remainingSeconds - 1 };
}

export function nextSession(state, settings) {
  let sessionType;
  let sessionsCompleted;

  if (state.sessionType === 'work') {
    const completed = state.sessionsCompleted + 1;
    if (completed >= settings.sessionsBeforeLongBreak) {
      sessionType = 'longBreak';
      sessionsCompleted = 0;
    } else {
      sessionType = 'shortBreak';
      sessionsCompleted = completed;
    }
  } else {
    sessionType = 'work';
    sessionsCompleted = state.sessionsCompleted;
  }

  const totalSeconds = durationFor(sessionType, settings);
  return {
    sessionType,
    sessionsCompleted,
    remainingSeconds: totalSeconds,
    totalSeconds,
    running: false,
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/timer.test.mjs
```

Expected: PASS — all 7 tests green.

- [x] **Step 5: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/timer.js app/tests/timer.test.mjs
git commit -m "feat: add pomodoro session state machine"
```

---

## Task 3: Settings module (TDD)

**Files:**
- Create: `app/settings.js`
- Test: `app/tests/settings.test.mjs`

- [x] **Step 1: Write the failing tests**

```javascript
// app/tests/settings.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from '../settings.js';

test('normalizeSettings with no input returns defaults', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);
});

test('normalizeSettings passes through valid values', () => {
  const result = normalizeSettings({
    workMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 2,
    soundOn: false,
  });
  assert.deepEqual(result, {
    workMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 2,
    soundOn: false,
  });
});

test('normalizeSettings falls back to defaults for invalid numeric fields', () => {
  const result = normalizeSettings({
    workMinutes: -5,
    shortBreakMinutes: 'abc',
    longBreakMinutes: 0,
    sessionsBeforeLongBreak: NaN,
  });
  assert.equal(result.workMinutes, DEFAULT_SETTINGS.workMinutes);
  assert.equal(result.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes);
  assert.equal(result.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes);
  assert.equal(result.sessionsBeforeLongBreak, DEFAULT_SETTINGS.sessionsBeforeLongBreak);
});

test('normalizeSettings falls back to default for non-boolean soundOn', () => {
  assert.equal(normalizeSettings({ soundOn: 'yes' }).soundOn, DEFAULT_SETTINGS.soundOn);
  assert.equal(normalizeSettings({ soundOn: false }).soundOn, false);
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/settings.test.mjs
```

Expected: FAIL — `Cannot find module '../settings.js'`.

- [x] **Step 3: Write the implementation**

```javascript
// app/settings.js

export const DEFAULT_SETTINGS = Object.freeze({
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  soundOn: true,
});

function clampPositiveInt(value, fallback) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function normalizeSettings(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    workMinutes: clampPositiveInt(input.workMinutes, DEFAULT_SETTINGS.workMinutes),
    shortBreakMinutes: clampPositiveInt(input.shortBreakMinutes, DEFAULT_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampPositiveInt(input.longBreakMinutes, DEFAULT_SETTINGS.longBreakMinutes),
    sessionsBeforeLongBreak: clampPositiveInt(input.sessionsBeforeLongBreak, DEFAULT_SETTINGS.sessionsBeforeLongBreak),
    soundOn: typeof input.soundOn === 'boolean' ? input.soundOn : DEFAULT_SETTINGS.soundOn,
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/settings.test.mjs
```

Expected: PASS — all 4 tests green.

- [x] **Step 5: Run the full test suite**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/
```

Expected: PASS — 11 tests total, 0 failures.

- [x] **Step 6: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/settings.js app/tests/settings.test.mjs
git commit -m "feat: add settings validation module"
```

---

## Task 4: HTML skeleton + hourglass markup

**Files:**
- Create: `app/index.html`

- [x] **Step 1: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Pomodoro</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="app">
    <div class="hourglass" id="hourglass" style="--progress: 1">
      <svg viewBox="0 0 60 90" aria-hidden="true">
        <path class="glass" d="M8,4 L52,4 L52,10 L30,45 L52,80 L52,86 L8,86 L8,80 L30,45 L8,10 Z" fill="none" stroke="currentColor" stroke-width="2"/>
        <path class="sand-top" d="M14,10 L46,10 L30,42 Z" fill="currentColor"/>
        <path class="sand-bottom" d="M30,48 L46,80 L14,80 Z" fill="currentColor"/>
        <rect class="sand-stream" x="29" y="42" width="2" height="8" fill="currentColor"/>
      </svg>
    </div>

    <div class="clock" id="clock">25:00</div>
    <div class="caption" id="caption">FOCUS · 1 OF 4</div>

    <div class="controls">
      <button class="btn" id="resetBtn" aria-label="Reset session">↺</button>
      <button class="btn primary" id="playPauseBtn" aria-label="Play">▶</button>
      <button class="btn" id="settingsBtn" aria-label="Open settings">⚙</button>
    </div>
  </main>

  <div class="settings-overlay" id="settingsOverlay" hidden>
    <form class="settings-panel" id="settingsForm">
      <h2>Settings</h2>

      <label class="field">
        Work (minutes)
        <input type="number" id="workMinutes" min="1" required>
      </label>
      <label class="field">
        Short break (minutes)
        <input type="number" id="shortBreakMinutes" min="1" required>
      </label>
      <label class="field">
        Long break (minutes)
        <input type="number" id="longBreakMinutes" min="1" required>
      </label>
      <label class="field">
        Sessions before long break
        <input type="number" id="sessionsBeforeLongBreak" min="1" required>
      </label>
      <label class="field checkbox">
        <input type="checkbox" id="soundOn">
        Sound on
      </label>

      <div class="settings-actions">
        <button type="button" class="btn-text" id="settingsCancel">Cancel</button>
        <button type="submit" class="btn-text primary" id="settingsSave">Save</button>
      </div>
    </form>
  </div>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [x] **Step 2: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/index.html
git commit -m "feat: add pomodoro page markup"
```

---

## Task 5: Base + responsive CSS, hourglass animation

**Files:**
- Create: `app/styles.css`

- [x] **Step 1: Write styles.css**

```css
* {
  box-sizing: border-box;
}

html, body {
  height: 100%;
  margin: 0;
}

body {
  background: #ececec;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 3vh, 24px);
  padding: 24px;
}

.hourglass {
  width: clamp(60px, 14vw, 110px);
  color: #1a1a1a;
}

.hourglass svg {
  width: 100%;
  height: auto;
  display: block;
}

.sand-top {
  transform-box: fill-box;
  transform-origin: bottom center;
  transform: scaleY(var(--progress));
  transition: transform 0.9s linear;
}

.sand-bottom {
  transform-box: fill-box;
  transform-origin: bottom center;
  transform: scaleY(calc(1 - var(--progress)));
  transition: transform 0.9s linear;
}

.sand-stream {
  opacity: 0.3;
}

.hourglass.running .sand-stream {
  animation: trickle 0.4s linear infinite;
}

@keyframes trickle {
  0% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(2px); }
  100% { opacity: 0.25; transform: translateY(0); }
}

.clock {
  font-weight: 200;
  font-size: clamp(48px, 12vw, 96px);
  letter-spacing: 2px;
  line-height: 1;
}

.caption {
  font-size: clamp(11px, 2vw, 13px);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #999;
}

.controls {
  display: flex;
  align-items: center;
  gap: clamp(16px, 4vw, 24px);
  margin-top: 8px;
}

.btn {
  width: clamp(44px, 10vw, 52px);
  height: clamp(44px, 10vw, 52px);
  border-radius: 50%;
  border: 1px solid #ccc;
  background: transparent;
  color: #333;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn.primary {
  width: clamp(56px, 13vw, 64px);
  height: clamp(56px, 13vw, 64px);
  background: #1a1a1a;
  color: #fff;
  border: none;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.settings-overlay[hidden] {
  display: none;
}

.settings-panel {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: min(380px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-panel h2 {
  margin: 0 0 4px;
  font-weight: 500;
}

.field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #444;
}

.field input[type="number"] {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.field.checkbox {
  justify-content: flex-start;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;
}

.btn-text {
  background: none;
  border: none;
  font-size: 14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #666;
  cursor: pointer;
}

.btn-text.primary {
  color: #1a1a1a;
  font-weight: 600;
}

@media (max-width: 480px) {
  .settings-overlay {
    padding: 0;
  }

  .settings-panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    justify-content: center;
  }
}
```

- [x] **Step 2: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/styles.css
git commit -m "feat: add responsive layout and hourglass animation styles"
```

---

## Task 6: Countdown engine + rendering (main.js core loop)

**Files:**
- Create: `app/main.js`

- [x] **Step 1: Write the core state wiring, rendering, and tab title logic**

```javascript
// app/main.js
import { createInitialState, start, pause, resetSession, tick, nextSession } from './timer.js';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings.js';

const SETTINGS_KEY = 'pomodoro-settings';

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let settings = loadSettings();
let state = createInitialState(settings);
let notificationRequested = false;

const hourglassEl = document.getElementById('hourglass');
const clockEl = document.getElementById('clock');
const captionEl = document.getElementById('caption');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function captionText() {
  if (state.sessionType === 'work') {
    return `FOCUS · ${state.sessionsCompleted + 1} OF ${settings.sessionsBeforeLongBreak}`;
  }
  if (state.sessionType === 'shortBreak') return 'SHORT BREAK';
  return 'LONG BREAK';
}

function sessionLabel() {
  if (state.sessionType === 'work') return 'Focus';
  if (state.sessionType === 'shortBreak') return 'Short Break';
  return 'Long Break';
}

function render() {
  const time = formatTime(state.remainingSeconds);
  clockEl.textContent = time;
  captionEl.textContent = captionText();
  playPauseBtn.textContent = state.running ? '❚❚' : '▶';
  playPauseBtn.setAttribute('aria-label', state.running ? 'Pause' : 'Play');

  const progress = state.totalSeconds > 0 ? state.remainingSeconds / state.totalSeconds : 0;
  hourglassEl.style.setProperty('--progress', progress.toFixed(4));
  hourglassEl.classList.toggle('running', state.running);

  document.title = `${time} — ${sessionLabel()}`;
}

function handleSessionEnd() {
  playChime();
  notify();
  state = nextSession(state, settings);
  render();
}

let intervalId = null;

function loop() {
  if (!state.running) return;
  state = tick(state);
  if (state.remainingSeconds <= 0) {
    handleSessionEnd();
  } else {
    render();
  }
}

function ensureInterval() {
  if (intervalId === null) {
    intervalId = setInterval(loop, 1000);
  }
}

playPauseBtn.addEventListener('click', () => {
  requestNotificationPermissionOnce();
  state = state.running ? pause(state) : start(state);
  ensureInterval();
  render();
});

resetBtn.addEventListener('click', () => {
  state = resetSession(state, settings);
  render();
});

function requestNotificationPermissionOnce() {
  if (notificationRequested) return;
  notificationRequested = true;
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notify() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const messages = {
    work: 'Break complete — back to focus!',
    shortBreak: 'Focus session complete — time for a short break!',
    longBreak: 'Focus session complete — time for a long break!',
  };
  new Notification('Pomodoro', { body: messages[state.sessionType] || 'Session complete' });
}

let audioCtx = null;

function playChime() {
  if (!settings.soundOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
}

render();
```

- [x] **Step 2: Manual check — countdown runs**

Start a static server and open the page:

```bash
cd /Users/rtsono/Desktop/webprojects/app && python3 -m http.server 8000
```

Open `http://localhost:8000/` in a browser. Click the play button (▶). Confirm:
- The clock counts down from `25:00` once per second.
- The hourglass sand visually shifts (top shrinks, bottom grows) as time passes.
- The browser tab title updates to show the remaining time.

Stop the server with Ctrl+C when done.

- [x] **Step 3: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/main.js
git commit -m "feat: wire countdown engine, rendering, chime, and notifications"
```

---

## Task 7: Settings modal wiring

**Files:**
- Modify: `app/main.js`

- [x] **Step 1: Add settings modal open/save/cancel logic**

In `app/main.js`, move the final `render();` call down so it becomes the last line of the file, and insert this block immediately above it:

```javascript
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsForm = document.getElementById('settingsForm');
const settingsCancel = document.getElementById('settingsCancel');

const workMinutesInput = document.getElementById('workMinutes');
const shortBreakMinutesInput = document.getElementById('shortBreakMinutes');
const longBreakMinutesInput = document.getElementById('longBreakMinutes');
const sessionsBeforeLongBreakInput = document.getElementById('sessionsBeforeLongBreak');
const soundOnInput = document.getElementById('soundOn');

function openSettings() {
  workMinutesInput.value = settings.workMinutes;
  shortBreakMinutesInput.value = settings.shortBreakMinutes;
  longBreakMinutesInput.value = settings.longBreakMinutes;
  sessionsBeforeLongBreakInput.value = settings.sessionsBeforeLongBreak;
  soundOnInput.checked = settings.soundOn;
  settingsOverlay.hidden = false;
}

function closeSettings() {
  settingsOverlay.hidden = true;
}

settingsBtn.addEventListener('click', openSettings);
settingsCancel.addEventListener('click', closeSettings);

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  settings = normalizeSettings({
    workMinutes: workMinutesInput.value,
    shortBreakMinutes: shortBreakMinutesInput.value,
    longBreakMinutes: longBreakMinutesInput.value,
    sessionsBeforeLongBreak: sessionsBeforeLongBreakInput.value,
    soundOn: soundOnInput.checked,
  });
  saveSettings(settings);
  state = resetSession(state, settings);
  closeSettings();
  render();
});
```

- [x] **Step 2: Manual check — settings persist**

```bash
cd /Users/rtsono/Desktop/webprojects/app && python3 -m http.server 8000
```

Open `http://localhost:8000/`. Click the gear icon. Confirm:
- The modal opens as a centered card on desktop width, and as a full-screen sheet when the browser window is narrowed below ~480px.
- Change "Work (minutes)" to `1`, click Save. Confirm the clock immediately shows `01:00`.
- Reload the page. Confirm the clock still shows `01:00` (setting persisted via `localStorage`).

- [x] **Step 3: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/main.js
git commit -m "feat: wire settings modal with localStorage persistence"
```

---

## Task 8: README

**Files:**
- Create: `app/README.md`

- [x] **Step 1: Write README.md**

```markdown
# Pomodoro Timer

A minimalist, full-page Pomodoro timer with an animated hourglass. Plain HTML/CSS/JS — no build step, no dependencies.

## Features

- Full-viewport, monochrome design with a live-animating hourglass that doubles as a progress indicator
- Work / short break / long break cycle, with a configurable number of sessions before a long break
- Adjustable durations and sound toggle via the settings panel (persisted in `localStorage`)
- Soft chime + native browser notification on session transitions
- Responsive layout, from phone to desktop

## Running locally

No install step required. From the `app/` directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Running tests

Pure logic (`timer.js`, `settings.js`) is unit tested with Node's built-in test runner:

```bash
node --test tests/
```

## Deploying to Vercel

This is a static site — no build command needed.

1. Push this repository to GitHub (or another git provider Vercel supports).
2. In Vercel, "Add New Project" and import the repo.
3. Set the **Root Directory** to `app` (if the repo contains more than just this project).
4. Leave Build Command and Output Directory blank/default — Vercel will serve the static files directly.
5. Deploy.

Alternatively, using the Vercel CLI from the `app/` directory:

```bash
npx vercel --prod
```
```

- [x] **Step 2: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/README.md
git commit -m "docs: add README with run, test, and deploy instructions"
```

---

## Task 8b: Vercel configuration

**Files:**
- Create: `app/vercel.json`

- [x] **Step 1: Write vercel.json**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "outputDirectory": ".",
  "cleanUrls": true
}
```

This tells Vercel there is no framework and no build step — it serves the contents of `app/` (set as the project's Root Directory) directly as static files, with clean URLs (so `/` serves `index.html`).

- [x] **Step 2: Manual check**

```bash
cd /Users/rtsono/Desktop/webprojects/app && python3 -c "import json; json.load(open('vercel.json'))" && echo "valid JSON"
```

Expected: `valid JSON`.

- [x] **Step 3: Commit**

```bash
cd /Users/rtsono/Desktop/webprojects && git add app/vercel.json
git commit -m "chore: add explicit Vercel static-site config"
```

---

## Task 9: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

```bash
cd /Users/rtsono/Desktop/webprojects/app && node --test tests/
```

Expected: PASS, 0 failures.

- [ ] **Step 2: Full cycle walkthrough**

```bash
cd /Users/rtsono/Desktop/webprojects/app && python3 -m http.server 8000
```

Open `http://localhost:8000/`. Using the settings panel, temporarily set Work = 1 min, Short break = 1 min, Long break = 1 min, Sessions before long break = 2. Save, then:
- Press Play. Let a full work session finish. Confirm: chime plays (if sound on), a browser notification appears (after granting permission), the caption switches to `SHORT BREAK`, and the hourglass resets to full.
- Press Play again, let the break finish. Confirm it returns to `FOCUS · 2 OF 2`.
- Let the second work session finish. Confirm it advances to `LONG BREAK`.
- Let the long break finish. Confirm it returns to `FOCUS · 1 OF 2`.

- [ ] **Step 3: Responsive check**

With the browser dev tools, check the layout at ~375px (phone), ~768px (tablet), and full desktop width. Confirm the clock/hourglass scale down without overflowing, control buttons stay easily tappable, and the settings panel becomes a full-screen sheet under ~480px.

- [ ] **Step 4: Reset settings back to defaults**

Reopen settings, restore Work=25, Short break=5, Long break=15, Sessions before long break=4, Save.

- [ ] **Step 5: Commit any fixes found during verification**

If manual verification surfaced bugs, fix them, re-run `node --test tests/`, and commit:

```bash
cd /Users/rtsono/Desktop/webprojects && git add -A
git commit -m "fix: address issues found in end-to-end verification"
```

(Skip this step if no issues were found.)

---

## Plan Self-Review Notes

- **Spec coverage:** layout (Task 4/5), hourglass drain + trickle animation (Task 5/6), controls (Task 4/6), settings panel + persistence (Task 4/7), sound + notifications (Task 6), tab title (Task 6), responsive design (Task 5/9), README (Task 8), testing approach (Task 2/3/9). All spec sections have a corresponding task.
- **No placeholders:** every step has complete, runnable code.
- **Type/name consistency:** `state` shape (`sessionType`, `sessionsCompleted`, `remainingSeconds`, `totalSeconds`, `running`) is identical across `timer.js`, its tests, and `main.js`. `settings` shape (`workMinutes`, `shortBreakMinutes`, `longBreakMinutes`, `sessionsBeforeLongBreak`, `soundOn`) is identical across `settings.js`, its tests, and `main.js`.
