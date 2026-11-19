import { describe, expect, it } from 'vitest';
import { cycleTarget, fieldAria, fieldErrorId, nextTrapTarget } from './drawer';

describe('nextTrapTarget', () => {
  it('wraps Tab from the last element to the first', () => {
    expect(nextTrapTarget(4, 3, false)).toBe(0);
  });
  it('wraps Shift+Tab from the first element to the last', () => {
    expect(nextTrapTarget(4, 0, true)).toBe(3);
  });
  it('pulls focus in when it is on the dialog itself or outside the list', () => {
    expect(nextTrapTarget(4, -1, false)).toBe(0);
    expect(nextTrapTarget(4, -1, true)).toBe(3);
  });
  it('lets the browser move focus inside the dialog', () => {
    expect(nextTrapTarget(4, 1, false)).toBeNull();
    expect(nextTrapTarget(4, 2, true)).toBeNull();
  });
  it('keeps a single focusable element focused', () => {
    expect(nextTrapTarget(1, 0, false)).toBe(0);
    expect(nextTrapTarget(1, 0, true)).toBe(0);
  });
  it('focuses the dialog itself when nothing is focusable', () => {
    expect(nextTrapTarget(0, -1, false)).toBe(-1);
    expect(nextTrapTarget(0, -1, true)).toBe(-1);
  });
});

describe('cycleTarget', () => {
  it('steps forward and backward and wraps at both ends', () => {
    expect(cycleTarget(4, 1, false)).toBe(2);
    expect(cycleTarget(4, 3, false)).toBe(0);
    expect(cycleTarget(4, 2, true)).toBe(1);
    expect(cycleTarget(4, 0, true)).toBe(3);
  });
  it('treats focus outside the list as before the first / after the last', () => {
    expect(cycleTarget(4, -1, false)).toBe(0);
    expect(cycleTarget(4, -1, true)).toBe(3);
  });
  it('stays on a single element', () => {
    expect(cycleTarget(1, 0, false)).toBe(0);
    expect(cycleTarget(1, 0, true)).toBe(0);
  });
});

describe('fieldAria', () => {
  it('ties the input to the error element when an error is shown', () => {
    expect(fieldAria(true, 'username')).toEqual({ 'aria-invalid': true, 'aria-describedby': 'err-username' });
    expect(fieldAria(true, 'username')['aria-describedby']).toBe(fieldErrorId('username'));
  });
  it('adds nothing without an error', () => {
    expect(fieldAria(false, 'username')).toEqual({});
  });
});
