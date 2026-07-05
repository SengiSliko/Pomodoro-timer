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
