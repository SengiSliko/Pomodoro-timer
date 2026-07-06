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
const hourglassSvg = document.getElementById('hourglassSvg');
const reducedMotion = typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (typeof hourglassSvg.pauseAnimations === 'function') {
  hourglassSvg.pauseAnimations();
}
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

  hourglassEl.classList.toggle('running', state.running);
  if (typeof hourglassSvg.pauseAnimations === 'function') {
    const shouldPlay = state.running && !reducedMotion;
    if (shouldPlay) {
      hourglassSvg.unpauseAnimations();
    } else {
      hourglassSvg.pauseAnimations();
    }
  }

  document.title = `${time} — ${sessionLabel()}`;
}

function handleSessionEnd() {
  playChime();
  notify();
  showSessionEndAlert();
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
    // remainingSeconds is derived from a fixed endAt timestamp (see timer.js), so
    // this interval is just a poll — it stays correct even if ticks are throttled
    // or fully suspended (e.g. Safari backgrounding the tab).
    intervalId = setInterval(loop, 1000);
  }
}

// Safari (and other browsers) can suspend setInterval entirely while the tab is
// hidden; force an immediate resync the moment it becomes visible again instead
// of waiting for possibly-stalled interval ticks to catch up.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loop();
  }
});

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
    Notification.requestPermission().catch(() => {});
  }
}

function notify() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  // Keyed by the session type that just ended (notify runs before nextSession reassigns it).
  const messages = {
    work: 'Focus session complete — time for a break!',
    shortBreak: 'Break complete — back to focus!',
    longBreak: 'Break complete — back to focus!',
  };
  new Notification('Pomodoro', { body: messages[state.sessionType] || 'Session complete' });
}

let audioCtx = null;

function playChime() {
  if (!settings.soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    // Browsers auto-suspend an idle AudioContext (e.g. between long focus/break
    // sessions); resume it defensively so the chime is still audible on later
    // transitions, not just the first one. Safe/no-op if already running.
    if (audioCtx.state !== 'running') {
      audioCtx.resume().catch(() => {});
    }
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
  } catch {
    // audio unsupported or blocked — chime is best-effort, must not block session advancement
  }
}

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

const alertOverlay = document.getElementById('alertOverlay');
const alertHeading = document.getElementById('alertHeading');
const alertDismiss = document.getElementById('alertDismiss');

function showSessionEndAlert() {
  // Keyed by the session type that just ended (called before nextSession reassigns state).
  const messages = {
    work: 'Time for a break!',
    shortBreak: 'Back to focus!',
    longBreak: 'Back to focus!',
  };
  alertHeading.textContent = messages[state.sessionType] || 'Session complete!';
  alertOverlay.hidden = false;
}

alertDismiss.addEventListener('click', () => {
  alertOverlay.hidden = true;
});

render();
