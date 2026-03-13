function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseScoreboardDate(scoreboardDate: string): Date {
  const [year, month, day] = scoreboardDate.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayScoreboardDate(now = new Date()): string {
  return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("-");
}

export function shiftScoreboardDate(
  scoreboardDate: string,
  deltaDays: number,
): string {
  const nextDate = parseScoreboardDate(scoreboardDate);
  nextDate.setDate(nextDate.getDate() + deltaDays);
  return todayScoreboardDate(nextDate);
}

export function compareScoreboardDateToToday(
  scoreboardDate: string,
  now = new Date(),
): number {
  const today = todayScoreboardDate(now);

  if (scoreboardDate < today) {
    return -1;
  }

  if (scoreboardDate > today) {
    return 1;
  }

  return 0;
}

export function formatScoreboardDateLabel(
  scoreboardDate: string,
  now = new Date(),
): string {
  const date = parseScoreboardDate(scoreboardDate);
  const isToday = compareScoreboardDateToToday(scoreboardDate, now) === 0;
  const parts = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);

  return isToday ? `Today  ${parts}` : parts;
}
