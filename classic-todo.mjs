import { STORAGE_KEY, readTasks, writeTasks } from './todo-store.mjs';

const form = document.querySelector('#add-task');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const status = document.querySelector('#save-status');
const card = document.querySelector('.task-card');
const settings = document.querySelector('#settings');
const backdrop = document.querySelector('#settings-backdrop');
const handle = document.querySelector('#open-settings');
const confirm = document.querySelector('#reset-dialog');
const themeKey = 'lupin.todo.theme.v1';
let tasks = [];
let storage;
let ready = true;

function error(message) { status.textContent = message; status.hidden = false; }
function pauseEditing() {
  ready = false;
  for (const element of form.elements) element.disabled = true;
}
function render() {
  const focus = document.activeElement?.dataset.focus;
  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    const row = document.createElement('li');
    row.className = `task${task.completed ? ' completed' : ''}`;
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check';
    check.dataset.focus = `check-${task.id}`;
    check.setAttribute('aria-label', task.completed ? 'Mark as not done' : 'Mark as done');
    check.setAttribute('aria-pressed', String(task.completed));
    check.disabled = !ready;
    check.addEventListener('click', () => commit(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)));
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.dataset.focus = `delete-${task.id}`;
    remove.setAttribute('aria-label', 'Delete this task');
    remove.title = 'Delete this task';
    remove.disabled = !ready;
    remove.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    remove.addEventListener('click', () => commit(tasks.filter(t => t.id !== task.id)));
    row.append(check, text, remove);
    fragment.append(row);
  }
  list.replaceChildren(fragment);
  if (focus) (list.querySelector(`[data-focus="${focus}"]`) || input).focus();
}
function commit(next) {
  if (!ready) return false;
  try {
    const latest = readTasks(storage);
    if (JSON.stringify(latest) !== JSON.stringify(tasks)) {
      tasks = latest;
      render();
      error('另一個分頁已更新清單，已載入最新內容。輸入仍保留，請再試一次。');
      return false;
    }
    writeTasks(storage, next);
  } catch {
    error('這次變更無法保存，原有待辦及輸入仍保留。請確認瀏覽器允許儲存網站資料。');
    return false;
  }
  tasks = next;
  status.hidden = true;
  render();
  return true;
}
function inertBackground(value) {
  document.querySelector('.title-bar').inert = value;
  document.querySelector('.list-area').inert = value;
}
function closeSettings() {
  settings.hidden = true;
  backdrop.hidden = true;
  handle.setAttribute('aria-expanded', 'false');
  inertBackground(false);
  handle.focus({ preventScroll: true });
}
function openSettings() {
  if (!confirm.hidden) return;
  settings.hidden = false;
  backdrop.hidden = false;
  handle.setAttribute('aria-expanded', 'true');
  inertBackground(true);
  document.querySelector('#close-settings').focus({ preventScroll: true });
}
function closeConfirm() {
  confirm.hidden = true;
  inertBackground(false);
  document.querySelector('#reset').focus({ preventScroll: true });
}
function syncThemeButtons() {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  for (const button of settings.querySelectorAll('[data-theme]')) {
    button.setAttribute('aria-pressed', String((button.dataset.theme === 'dark') === dark));
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (text && commit([...tasks, { id: crypto.randomUUID(), text, completed: false }])) {
    input.value = '';
  }
});
handle.addEventListener('click', () => settings.hidden ? openSettings() : closeSettings());
document.querySelector('#close-settings').addEventListener('click', closeSettings);
backdrop.addEventListener('click', closeSettings);
document.querySelector('#reset').addEventListener('click', () => {
  if (!ready || !tasks.length) return;
  confirm.hidden = false;
  inertBackground(true);
  document.querySelector('#keep-tasks').focus({ preventScroll: true });
});
document.querySelector('#keep-tasks').addEventListener('click', closeConfirm);
document.querySelector('#clear-tasks').addEventListener('click', () => { if (commit([])) closeConfirm(); });
confirm.addEventListener('click', event => { if (event.target === confirm) closeConfirm(); });
for (const button of settings.querySelectorAll('[data-theme]')) {
  button.addEventListener('click', () => {
    document.documentElement.dataset.theme = button.dataset.theme;
    syncThemeButtons();
    try { storage.setItem(themeKey, button.dataset.theme); }
    catch { error('主題已套用，但無法保存到瀏覽器。'); }
  });
}
document.addEventListener('keydown', event => {
  const dialog = !confirm.hidden ? confirm : !settings.hidden ? settings : null;
  if (!dialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    confirm.hidden ? closeSettings() : closeConfirm();
  } else if (event.key === 'Tab') {
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
let swipeStart = null;
card.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || event.target.closest('input,button,.settings,.reset-overlay')) return;
  swipeStart = event.clientY;
});
card.addEventListener('pointermove', event => {
  if (swipeStart !== null && swipeStart - event.clientY > 24) { swipeStart = null; openSettings(); }
});
for (const type of ['pointerup', 'pointercancel']) card.addEventListener(type, () => { swipeStart = null; });

try {
  storage = window.localStorage;
  tasks = readTasks(storage);
  const probe = `${STORAGE_KEY}.probe`;
  storage.setItem(probe, '1');
  storage.removeItem(probe);
} catch {
  pauseEditing();
  error('無法讀取或保存待辦，已暫停編輯，原有資料不會被覆寫。請確認瀏覽器允許網站儲存。');
}
try {
  const saved = storage?.getItem(themeKey);
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeButtons);
syncThemeButtons();
render();
window.addEventListener('storage', event => {
  if (event.storageArea !== storage) return;
  if (event.key === themeKey || event.key === null) {
    const selected = event.newValue;
    if (selected === 'light' || selected === 'dark') document.documentElement.dataset.theme = selected;
    else delete document.documentElement.dataset.theme;
    syncThemeButtons();
  }
  if (!ready || (event.key !== STORAGE_KEY && event.key !== null)) return;
  try { tasks = readTasks(storage); render(); }
  catch {
    pauseEditing(); render();
    error('其他分頁的資料無法讀取，已保留目前畫面並暫停編輯。');
  }
});
