// The NHL groups games by their Eastern-time calendar date: the API's
// `currentDate` / per-game `gameDate` fields are the US Eastern date of the
// game's start (games effectively never start after midnight ET). Deriving
// "today" in this zone — rather than the viewer's local zone — is what keeps
// the scoreboard aligned with the league's own day boundary for viewers
// outside North America or awake in the small hours.
const HOCKEY_TIME_ZONE = "America/New_York";

// en-CA formats as YYYY-MM-DD, matching the scoreboard date format exactly.
const hockeyDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: HOCKEY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseScoreboardDate(scoreboardDate: string): Date {
  const [year, month, day] = scoreboardDate.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayScoreboardDate(now = new Date()): string {
  return hockeyDayFormatter.format(now);
}

export function shiftScoreboardDate(
  scoreboardDate: string,
  deltaDays: number,
): string {
  // Pure calendar arithmetic on the date components (via UTC to sidestep DST
  // and the viewer's local zone) — shifting a game day must not depend on
  // where the viewer is.
  const [year, month, day] = scoreboardDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);

  return [
    shifted.getUTCFullYear(),
    pad(shifted.getUTCMonth() + 1),
    pad(shifted.getUTCDate()),
  ].join("-");
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
