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
    endAt: null,
  };
}

export function start(state, now = Date.now()) {
  if (state.running) return state;
  return { ...state, running: true, endAt: now + state.remainingSeconds * 1000 };
}

// endAt (not elapsed-tick count) is the source of truth while running, so the
// countdown reflects real elapsed time even if setInterval ticks are throttled
// or fully suspended by the browser (e.g. Safari backgrounding the tab).
export function pause(state, now = Date.now()) {
  if (!state.running) return state;
  const remainingSeconds = Math.max(0, Math.round((state.endAt - now) / 1000));
  return { ...state, running: false, remainingSeconds, endAt: null };
}

export function resetSession(state, settings) {
  const totalSeconds = durationFor(state.sessionType, settings);
  return { ...state, remainingSeconds: totalSeconds, totalSeconds, running: false, endAt: null };
}

export function tick(state, now = Date.now()) {
  if (!state.running) return state;
  const remainingSeconds = Math.max(0, Math.round((state.endAt - now) / 1000));
  return { ...state, remainingSeconds };
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
    endAt: null,
  };
}
