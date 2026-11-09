import { taipeiParts, monthCells, shiftMonth } from './dates.mjs';

const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const widget = document.body.dataset.widget;
const initial = taipeiParts();
let shown = { year: initial.year, month: initial.month };
let previousDate = '';
let followingToday = true;

function renderCalendar(now) {
  document.querySelector('#month-title').textContent = `${months[shown.month - 1]} ${shown.year}`;
  const today = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
  const body = document.querySelector('#calendar-days');
  const fragment = document.createDocumentFragment();
  let row;
  monthCells(shown.year, shown.month).forEach((date, i) => {
    if (i % 7 === 0) { row = document.createElement('tr'); fragment.append(row); }
    const cell = document.createElement('td');
    if (!date.inMonth) cell.className = 'outside';
    const time = document.createElement('time');
    time.dateTime = date.iso;
    time.textContent = date.day;
    time.setAttribute('aria-label', date.iso);
    if (date.iso === today) time.setAttribute('aria-current', 'date');
    cell.append(time);
    row.append(cell);
  });
  body.replaceChildren(fragment);
}

function update() {
  const now = taipeiParts();
  const dayKey = `${now.year}-${now.month}-${now.day}`;
  if (widget === 'clock') {
    const time = document.querySelector('#clock-time');
    time.textContent = `${now.hour}:${now.minute}`;
    time.dateTime = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}T${now.hour}:${now.minute}:00+08:00`;
    document.querySelector('#clock-date').textContent = `${now.weekday.toUpperCase()}, ${months[now.month - 1].slice(0, 3)} ${String(now.day).padStart(2, '0')} · UTC+8`;
  } else if (dayKey !== previousDate) {
    if (followingToday) shown = { year: now.year, month: now.month };
    renderCalendar(now);
  }
  previousDate = dayKey;
}

if (widget === 'calendar') {
  for (const [id, delta] of [['previous', -1], ['next', 1]]) {
    document.getElementById(id).addEventListener('click', () => {
      shown = shiftMonth(shown.year, shown.month, delta);
      followingToday = false;
      renderCalendar(taipeiParts());
    });
  }
  document.querySelector('#today').addEventListener('click', () => {
    const now = taipeiParts();
    shown = { year: now.year, month: now.month };
    followingToday = true;
    renderCalendar(now);
  });
}
update();
setInterval(update, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
