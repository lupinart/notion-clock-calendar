import { taipeiParts } from './dates.mjs';

const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
function update() {
  const now = taipeiParts();
  const time = document.querySelector('#clock-time');
  time.textContent = `${now.hour}:${now.minute}`;
  time.dateTime = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}T${now.hour}:${now.minute}:00+08:00`;
  document.querySelector('#clock-date').textContent = `${now.weekday.toUpperCase()}, ${months[now.month - 1].slice(0, 3)} ${String(now.day).padStart(2, '0')} · UTC+8`;
}
update();
setInterval(update, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
