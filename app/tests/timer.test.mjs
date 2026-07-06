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
  const running = start(state, 1_000);
  assert.equal(running.running, true);
  assert.equal(running.remainingSeconds, state.remainingSeconds);
  const paused = pause(running, 1_000);
  assert.equal(paused.running, false);
});

test('tick derives remainingSeconds from elapsed wall-clock time, not call count', () => {
  const idle = createInitialState(settings);
  assert.equal(tick(idle, 1_000).remainingSeconds, idle.remainingSeconds);

  const running = start(idle, 1_000); // endAt = 1_000 + totalSeconds*1000
  const ticked = tick(running, 1_000 + 30_000); // 30 real seconds later
  assert.equal(ticked.remainingSeconds, idle.remainingSeconds - 30);

  // Calling tick again with the SAME timestamp must not decrement further.
  const tickedAgain = tick(ticked, 1_000 + 30_000);
  assert.equal(tickedAgain.remainingSeconds, ticked.remainingSeconds);
});

test('tick catches up in one step after a large gap (e.g. a suspended background tab)', () => {
  const idle = { ...createInitialState(settings), remainingSeconds: 100, totalSeconds: 100 };
  const running = start(idle, 1_000);
  // Tab was backgrounded/suspended for far longer than the remaining time.
  const ticked = tick(running, 1_000 + 500_000);
  assert.equal(ticked.remainingSeconds, 0);
});

test('tick does not go below zero', () => {
  let state = { ...createInitialState(settings), running: true, endAt: 1_000, remainingSeconds: 0 };
  state = tick(state, 5_000);
  assert.equal(state.remainingSeconds, 0);
});

test('pause captures remaining time based on elapsed wall-clock time', () => {
  let state = start(createInitialState(settings), 1_000);
  state = pause(state, 1_000 + 10_000); // 10 real seconds elapsed
  assert.equal(state.remainingSeconds, 25 * 60 - 10);
  assert.equal(state.running, false);
});

test('resetSession restores full duration for the current session type and pauses', () => {
  let state = start(createInitialState(settings), 1_000);
  state = tick(state, 1_000 + 1_000);
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
