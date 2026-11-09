const taipeiFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
});

export function taipeiParts(now = new Date()) {
  const parts = Object.fromEntries(taipeiFormatter.formatToParts(now).map(p => [p.type, p.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day,
    hour: parts.hour, minute: parts.minute, weekday: parts.weekday };
}

export function shiftMonth(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthCells(year, month) {
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1, 1 - offset + i));
    return { day: date.getUTCDate(), iso: date.toISOString().slice(0, 10),
      inMonth: date.getUTCMonth() === month - 1 };
  });
}
