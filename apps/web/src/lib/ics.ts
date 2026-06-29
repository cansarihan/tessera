/** Generate and download an .ics calendar file for an event. */
export function downloadIcs(opts: { title: string; start: number; durationMin?: number; description?: string }) {
  const stamp = (s: number) => `${new Date(s * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const end = opts.start + (opts.durationMin ?? 120) * 60;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tessera//Tickets//EN',
    'BEGIN:VEVENT',
    `UID:tessera-${opts.start}-${Math.round(opts.start)}@tessera`,
    `DTSTAMP:${stamp(opts.start)}`,
    `DTSTART:${stamp(opts.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${opts.title}`,
    opts.description ? `DESCRIPTION:${opts.description}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
