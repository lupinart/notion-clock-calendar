export const STORAGE_KEY = 'lupin.todo.v1';

function validate(tasks) {
  if (!Array.isArray(tasks) || tasks.some(task => !task ||
    typeof task.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(task.id) ||
    typeof task.text !== 'string' || !task.text.trim() || task.text.length > 500 ||
    typeof task.completed !== 'boolean') || new Set(tasks.map(task => task.id)).size !== tasks.length) {
    throw new TypeError('Invalid saved tasks');
  }
  return tasks;
}

export function readTasks(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? [] : validate(JSON.parse(raw));
}

export function writeTasks(storage, tasks) {
  storage.setItem(STORAGE_KEY, JSON.stringify(validate(tasks)));
}
