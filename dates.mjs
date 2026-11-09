const taipeiFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
});

export function taipeiParts(now = new Date()) {
  const parts = Object.fromEntries(taipeiFormatter.formatToParts(now).map(p => [p.type, p.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day,
    hour: parts.hour, minute: parts.minute, weekday: parts.weekday };
}

