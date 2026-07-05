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
