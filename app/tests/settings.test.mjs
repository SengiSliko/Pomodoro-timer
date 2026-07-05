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
