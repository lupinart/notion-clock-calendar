import assert from 'node:assert/strict';
import { taipeiParts } from './dates.mjs';

// A device's timezone must not change the Taiwan clock or date.
assert.deepEqual(taipeiParts(new Date('2026-12-31T16:00:00Z')),
  { year: 2027, month: 1, day: 1, hour: '00', minute: '00', weekday: 'Fri' });
assert.deepEqual(taipeiParts(new Date('2026-11-09T15:59:00Z')),
  { year: 2026, month: 11, day: 9, hour: '23', minute: '59', weekday: 'Mon' });
console.log('Taiwan midnight and timezone checks passed.');
