// The rest between sets counts down to a deadline, not by ticks: JS timers stop while the app is in the background,
// so a tick counter would show too much time left when the athlete comes back. Pure, so it can be unit-tested with node.

/** Whole seconds left until the deadline (rounded up, so the display never shows 0:00 before the rest is over), never negative. */
export function remainingSeconds(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function restDeadline(seconds: number, nowMs: number): number {
  return nowMs + Math.max(0, Math.round(seconds)) * 1000;
}

/** Vibration pattern (ms) at the end of a rest: three pulses, easy to feel in a pocket. */
export const REST_END_VIBRATION: number[] = [0, 400, 200, 400, 200, 400];
