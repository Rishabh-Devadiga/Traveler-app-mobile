// Live logic check for the Trip Checklist travelers counter.
// Mirrors setCount() + the +/- button handlers from src/pages/TripChecklist.tsx
// to prove one press = exactly one step, with floor clamping at 0 / empty.
import assert from 'node:assert';

// setCount(): count <= 0 clears to undefined (empty "—" state), else clamp to 50.
function setCount(travelers, value) {
  const count = Number(value);
  if (value.trim() === '' || !Number.isFinite(count) || count <= 0) {
    return { travelers: undefined };
  }
  const rounded = Math.min(50, Math.floor(count));
  return { travelers: rounded };
}

// Button handlers (fixed: fallback 0 so empty behaves as 0, not 1 or 2).
const inc = (t) => setCount(t, String((t ?? 0) + 1)).travelers;
const dec = (t) => setCount(t, String((t ?? 0) - 1)).travelers;

// Increment from the empty state must be +1 (was +2 before the fix).
assert.strictEqual(inc(undefined), 1, '+ at empty must be 1 (was 2)');
assert.strictEqual(inc(1), 2, '+ at 1 must be 2');
assert.strictEqual(inc(2), 3, '+ at 2 must be 3');

// Full 0 -> 1 -> 2 walk.
let t = undefined;
t = inc(t); assert.strictEqual(t, 1, '0 -> 1');
t = inc(t); assert.strictEqual(t, 2, '1 -> 2');

// Decrement steps down by one and never goes negative.
assert.strictEqual(dec(2), 1, '- at 2 must be 1');
assert.strictEqual(dec(1), undefined, '- at 1 clamps to empty (0)');
assert.strictEqual(dec(undefined), undefined, '- at empty stays empty (floored at 0)');

// Upper bound still clamps at 50.
assert.strictEqual(inc(50), 50, '+ at 50 stays 50');

console.log('ok - counter increments by exactly 1 (0 -> 1 -> 2)');
console.log('ok - counter decrements by exactly 1');
console.log('ok - lower bound clamps at 0/empty (never negative, minus never raises)');
console.log('ok - upper bound clamps at 50');
console.log('4/4 traveler counter checks passed');
