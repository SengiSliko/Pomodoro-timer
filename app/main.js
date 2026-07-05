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
    // Plain 1s wall-clock interval; drift under tab-throttling/backgrounding is an
    // accepted tradeoff for this app, not an oversight.
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

render();
