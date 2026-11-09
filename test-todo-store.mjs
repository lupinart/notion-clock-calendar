import assert from 'node:assert/strict';
import { readTasks, writeTasks } from './todo-store.mjs';

// Exercise the persistence boundary, including malformed data and denied writes.
let raw = null;
const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
assert.deepEqual(readTasks(storage), []);
const tasks = [{ id: 'test-1', text: '<img src=x onerror=alert(1)>', completed: false }];
writeTasks(storage, tasks);
assert.deepEqual(readTasks(storage), tasks);
writeTasks(storage, [{ ...tasks[0], completed: true }]);
assert.equal(readTasks(storage)[0].completed, true);
writeTasks(storage, []);
assert.deepEqual(readTasks(storage), []);
raw = 'invalid JSON';
assert.throws(() => readTasks(storage));
assert.equal(raw, 'invalid JSON', 'Unreadable data must not be overwritten');
raw = JSON.stringify([{ text: 'missing identity and completion state' }]);
assert.throws(() => readTasks(storage));
assert.throws(() => writeTasks(storage, [tasks[0], tasks[0]]), 'Duplicate identities must be rejected');
const denied = { setItem() { throw new Error('Storage denied'); } };
assert.throws(() => writeTasks(denied, tasks), /Storage denied/);
console.log('Todo persistence, completion state, safe text, malformed data, and denied writes passed.');
