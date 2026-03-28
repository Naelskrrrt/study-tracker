export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // Allow today or yesterday as starting point
  const latest = new Date(sorted[0] + "T00:00:00");
  const diffDays = Math.floor(
    (today.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > 1) return 0;

  if (diffDays === 1) {
    checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (const dateStr of sorted) {
    const expected = checkDate.toISOString().slice(0, 10);
    if (dateStr === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < expected) {
      break;
    }
  }

  return streak;
}

export function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
