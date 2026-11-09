import { STORAGE_KEY, readTasks, writeTasks } from './todo-store.mjs';

const form = document.querySelector('#add-task');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const status = document.querySelector('#save-status');
const clear = document.querySelector('#clear-completed');
let tasks = [];
let storage;
let ready = true;

function showError(message) {
  status.textContent = message;
  status.hidden = false;
}

function render() {
  const focusKey = document.activeElement?.dataset.focus;
  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' completed' : ''}`;
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.disabled = !ready;
    checkbox.dataset.focus = `check-${task.id}`;
    checkbox.addEventListener('change', () => {
      if (!commit(tasks.map(t => t.id === task.id ? { ...t, completed: checkbox.checked } : t))) {
        checkbox.checked = task.completed;
      }
    });
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-task';
    remove.dataset.focus = `delete-${task.id}`;
    remove.disabled = !ready;
    remove.setAttribute('aria-label', `刪除：${task.text}`);
    remove.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg>';
    remove.addEventListener('click', () => commit(tasks.filter(t => t.id !== task.id)));
    row.append(label, remove);
    fragment.append(row);
  }
  list.replaceChildren(fragment);
  document.querySelector('#empty-state').hidden = tasks.length > 0 || !ready;
  document.querySelector('#task-count').textContent = `${tasks.filter(t => !t.completed).length} 件待辦`;
  clear.disabled = !ready || !tasks.some(t => t.completed);
  if (focusKey) (list.querySelector(`[data-focus="${focusKey}"]`) || input).focus();
}

function commit(next) {
  if (!ready) return false;
  try {
    const latest = readTasks(storage);
    if (JSON.stringify(latest) !== JSON.stringify(tasks)) {
      tasks = latest;
      render();
      showError('清單剛在另一個分頁更新，已載入最新內容。你的輸入仍保留，請再試一次。');
      return false;
    }
    writeTasks(storage, next);
  }
  catch {
    showError('這次變更未能保存，原本的待辦仍保留。請確認瀏覽器允許網站儲存資料後再試。');
    return false;
  }
  tasks = next;
  status.hidden = true;
  render();
  return true;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  if (commit([...tasks, { id: crypto.randomUUID(), text, completed: false }])) {
    input.value = '';
    input.focus();
  }
});
clear.addEventListener('click', () => commit(tasks.filter(t => !t.completed)));

try {
  storage = window.localStorage;
  tasks = readTasks(storage);
  // Reading may succeed while writing is denied. Probe without touching task data.
  const probe = `${STORAGE_KEY}.probe`;
  storage.setItem(probe, '1');
  storage.removeItem(probe);
} catch {
  ready = false;
  showError('目前無法讀取或保存待辦，已暫停編輯並保留原有資料。請確認瀏覽器允許網站儲存資料。');
  for (const element of form.elements) element.disabled = true;
}
render();

window.addEventListener('storage', event => {
  if (!ready || event.storageArea !== storage || (event.key !== STORAGE_KEY && event.key !== null)) return;
  try {
    tasks = readTasks(storage);
    render();
  } catch {
    ready = false;
    for (const element of form.elements) element.disabled = true;
    render();
    showError('另一個分頁的待辦資料無法讀取，已保留目前畫面並暫停編輯，避免覆蓋資料。');
  }
});
