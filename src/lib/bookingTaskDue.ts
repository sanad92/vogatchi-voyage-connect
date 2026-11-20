const cairoDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo' });

export function bookingTaskDueBucket(dueAt: string | null, now: number) {
  if (!dueAt) return 'upcoming';
  const deadline = Date.parse(dueAt);
  if (!Number.isFinite(deadline)) return 'upcoming';
  if (deadline < now) return 'overdue';
  return cairoDay.format(deadline) === cairoDay.format(now) ? 'today' : 'upcoming';
}
