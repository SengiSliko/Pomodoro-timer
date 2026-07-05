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
