import assert from 'node:assert/strict';
import { taipeiParts, monthCells, shiftMonth } from './dates.mjs';

// A device's timezone must not change the Taiwan clock or today's calendar date.
assert.deepEqual(taipeiParts(new Date('2026-12-31T16:00:00Z')),
  { year: 2027, month: 1, day: 1, hour: '00', minute: '00', weekday: 'Fri' });
assert.deepEqual(taipeiParts(new Date('2026-11-09T15:59:00Z')),
  { year: 2026, month: 11, day: 9, hour: '23', minute: '59', weekday: 'Mon' });
assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
const leap = monthCells(2024, 2);
assert.equal(leap.length, 42);
assert.equal(leap[0].iso, '2024-01-28');
assert.equal(leap.filter(d => d.inMonth).length, 29);
assert.ok(leap.some(d => d.iso === '2024-02-29' && d.inMonth));
const november = monthCells(2026, 11);
assert.equal(november[0].iso, '2026-11-01');
assert.equal(november[29].iso, '2026-11-30');
assert.equal(november[30].inMonth, false);
assert.equal(monthCells(2026, 2).filter(d => d.inMonth).length, 28);
console.log('Taiwan midnight, year navigation, leap year, and calendar grid checks passed.');
