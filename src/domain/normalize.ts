import type {
  BoxScore,
  ConferenceStandings,
  DetailTab,
  GameClock,
  GameSummary,
  GoalieStatLine,
  LeaderEntry,
  LeaderTable,
  LeaderTableKey,
  NormalizedGame,
  NormalizedGameDetail,
  NormalizedLeaders,
  NormalizedPlay,
  NormalizedStandings,
  NormalizedTeam,
  PeriodShots,
  PlayByPlay,
  SkaterStatLine,
  StandingsEntry,
  SummaryGoal,
  SummaryPenalty,
  TeamBoxScore,
  ThreeStar,
} from "./types.js";

type RawRecord = Record<string, any>;

/**
 * Thrown when an API payload is structurally unrecognizable (as opposed to
 * legitimately empty). Surfacing this instead of returning empty data lets the
 * polling layer keep the last-known-good view and flag the anomaly, rather than
 * silently rendering "no games" when the API shape has actually changed.
 */
export class NormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizeError";
  }
}

function asRecord(value: unknown, context: string): RawRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NormalizeError(`Unexpected ${context} payload: expected an object`);
  }

  return value as RawRecord;
}

function expectArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new NormalizeError(`Unexpected ${context} payload: expected an array`);
  }

  return value;
}

function readName(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "default" in value) {
    const maybeName = (value as { default?: unknown }).default;
    if (typeof maybeName === "string") {
      return maybeName;
    }
  }

  return "";
}

function shortName(firstName: unknown, lastName: unknown): string {
  const first = readName(firstName);
  const last = readName(lastName);

  if (!first && !last) {
    return "";
  }

  if (!first) {
    return last;
  }

  if (!last) {
    return first;
  }

  return `${first.charAt(0)}. ${last}`;
}

function formatPlayerLabel(name: string, sweaterNumber?: unknown): string {
  if (!name) {
    return "";
  }

  const number = toNumber(sweaterNumber);
  return number ? `${number} ${name}` : name;
}

function readPlayerLabel(value: unknown, fallbackNumber?: unknown): string {
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? formatPlayerLabel(value, fallbackNumber) : "";
  }

  const record = value as RawRecord;
  const name = readName(record.name) || shortName(record.firstName, record.lastName);

  return formatPlayerLabel(name, record.sweaterNumber ?? record.sweaterNo ?? fallbackNumber);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function formatLocalTime(startTimeUtc: string): string {
  const date = new Date(startTimeUtc);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ordinal(value: number): string {
  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function formatPeriodLabel(
  periodNumber?: number,
  periodType?: string,
): string {
  if (!periodNumber && !periodType) {
    return "";
  }

  if (periodType === "OT") {
    return "OT";
  }

  if (periodType === "SO") {
    return "SO";
  }

  return ordinal(periodNumber ?? 0);
}

function phaseFromState(state: string): "live" | "upcoming" | "final" {
  if (state === "LIVE" || state === "CRIT") {
    return "live";
  }

  if (state === "OFF" || state === "FINAL") {
    return "final";
  }

  return "upcoming";
}

function sectionFromPhase(phase: "live" | "upcoming" | "final") {
  switch (phase) {
    case "live":
      return "LIVE" as const;
    case "final":
      return "FINAL" as const;
    default:
      return "UPCOMING" as const;
  }
}

function normalizeTeam(rawTeam: RawRecord | undefined): NormalizedTeam {
  const name = rawTeam?.name ?? rawTeam?.commonName;

  return {
    id: toNumber(rawTeam?.id),
    abbrev: readName(rawTeam?.abbrev) || "---",
    location: readName(rawTeam?.placeName),
    shortName: readName(name),
    score: toNumber(rawTeam?.score),
    shotsOnGoal: rawTeam?.sog === undefined ? undefined : toNumber(rawTeam.sog),
    record:
      typeof rawTeam?.record === "string" && rawTeam.record.trim()
        ? rawTeam.record
        : undefined,
  };
}

function normalizeClock(
  rawClock: RawRecord | undefined,
  rawPeriod: RawRecord | undefined,
): GameClock | undefined {
  if (!rawClock || !rawPeriod) {
    return undefined;
  }

  const periodNumber = toNumber(rawPeriod.number);
  const periodType =
    typeof rawPeriod.periodType === "string" ? rawPeriod.periodType : "REG";

  return {
    periodNumber,
    periodType,
    periodLabel: formatPeriodLabel(periodNumber, periodType),
    timeRemaining:
      typeof rawClock.timeRemaining === "string"
        ? rawClock.timeRemaining
        : "--:--",
    running: Boolean(rawClock.running),
    inIntermission: Boolean(rawClock.inIntermission),
  };
}

function finalContext(clock?: GameClock): string {
  if (!clock) {
    return "Final";
  }

  if (clock.periodType === "OT") {
    return "Final/OT";
  }

  if (clock.periodType === "SO") {
    return "Final/SO";
  }

  return "Final";
}

function liveContext(clock?: GameClock): string {
  if (!clock) {
    return "Live";
  }

  if (clock.inIntermission) {
    return `${clock.periodLabel} INT`;
  }

  return `${clock.periodLabel} ${clock.timeRemaining}`;
}

export function normalizeGame(rawGame: unknown): NormalizedGame {
  const game = rawGame as RawRecord;
  const away = normalizeTeam(game.awayTeam);
  const home = normalizeTeam(game.homeTeam);
  const state = typeof game.gameState === "string" ? game.gameState : "FUT";
  const phase = phaseFromState(state);
  const clock = normalizeClock(game.clock, game.periodDescriptor);
  const startTimeUtc =
    typeof game.startTimeUTC === "string" ? game.startTimeUTC : "";
  const startTimeLabel = startTimeUtc ? formatLocalTime(startTimeUtc) : "--:--";

  let statusLabel = "UPCOMING";
  let contextLabel = `Puck Drop ${startTimeLabel}`;

  if (phase === "live") {
    statusLabel = "LIVE";
    contextLabel = liveContext(clock);
  } else if (phase === "final") {
    statusLabel = "FINAL";
    contextLabel = finalContext(clock);
  }

  return {
    id: toNumber(game.id),
    season: toNumber(game.season),
    state,
    phase,
    section: sectionFromPhase(phase),
    startTimeUtc,
    startTimeEpochMs: Number.isNaN(Date.parse(startTimeUtc))
      ? 0
      : Date.parse(startTimeUtc),
    startTimeLabel,
    statusLabel,
    contextLabel,
    periodLabel: clock?.periodLabel,
    venue: readName(game.venue) || readName(game.venueLocation) || "",
    away,
    home,
    clock,
  };
}

function sortGames(left: NormalizedGame, right: NormalizedGame): number {
  const sectionOrder = {
    LIVE: 0,
    UPCOMING: 1,
    FINAL: 2,
  };

  const sectionDelta =
    sectionOrder[left.section] - sectionOrder[right.section];
  if (sectionDelta !== 0) {
    return sectionDelta;
  }

  return left.startTimeEpochMs - right.startTimeEpochMs || left.id - right.id;
}

export function normalizeScoreboard(rawPayload: unknown): NormalizedGame[] {
  const payload = asRecord(rawPayload, "scoreboard");
  const games = expectArray(payload.games, "scoreboard games");

  return games.map(normalizeGame).sort(sortGames);
}

function normalizeGoal(
  rawGoal: RawRecord,
  periodLabel: string,
  playerNumbers?: Map<number, number>,
): SummaryGoal {
  const assists = Array.isArray(rawGoal.assists)
    ? rawGoal.assists
        .map((assist) => {
          const assistRecord = assist as RawRecord;
          return readPlayerLabel(
            assistRecord,
            assistRecord.sweaterNumber ?? playerNumbers?.get(toNumber(assistRecord.playerId)),
          );
        })
        .filter(Boolean)
    : [];

  return {
    eventId: toNumber(rawGoal.eventId),
    team: readName(rawGoal.teamAbbrev),
    scorer: formatPlayerLabel(
      readName(rawGoal.name),
      playerNumbers?.get(toNumber(rawGoal.playerId)),
    ),
    strength:
      typeof rawGoal.strength === "string"
        ? rawGoal.strength.toUpperCase()
        : "EV",
    timeInPeriod:
      typeof rawGoal.timeInPeriod === "string" ? rawGoal.timeInPeriod : "--:--",
    periodLabel,
    scoreAfter: `${toNumber(rawGoal.awayScore)}-${toNumber(rawGoal.homeScore)}`,
    assists,
  };
}

function normalizePenalty(
  rawPenalty: RawRecord,
  periodLabel: string,
): SummaryPenalty {
  return {
    team: readName(rawPenalty.teamAbbrev),
    player: readPlayerLabel(rawPenalty.committedByPlayer),
    drawnBy: readPlayerLabel(rawPenalty.drawnBy) || undefined,
    kind:
      typeof rawPenalty.descKey === "string"
        ? titleCase(rawPenalty.descKey)
        : "",
    duration: toNumber(rawPenalty.duration),
    timeInPeriod:
      typeof rawPenalty.timeInPeriod === "string"
        ? rawPenalty.timeInPeriod
        : "--:--",
    periodLabel,
  };
}

function normalizeThreeStar(
  rawStar: RawRecord,
  playerNumbers?: Map<number, number>,
): ThreeStar {
  const savePct = toNumber(rawStar.savePctg);
  const goals = toNumber(rawStar.goals);
  const assists = toNumber(rawStar.assists);
  const goalieStat = savePct ? `SV% ${savePct.toFixed(3)}` : "";
  const skaterStat =
    goals || assists ? `${goals}G ${assists}A ${goals + assists}P` : "";

  return {
    star: toNumber(rawStar.star),
    player: formatPlayerLabel(
      readName(rawStar.name),
      rawStar.sweaterNo ?? playerNumbers?.get(toNumber(rawStar.playerId)),
    ),
    team: typeof rawStar.teamAbbrev === "string" ? rawStar.teamAbbrev : "",
    position: typeof rawStar.position === "string" ? rawStar.position : "",
    statLine: goalieStat || skaterStat,
  };
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function buildPlayerNumberMap(rawBoxPayload: RawRecord | undefined): Map<number, number> {
  const playerNumbers = new Map<number, number>();
  const playerByGameStats = (rawBoxPayload?.playerByGameStats ?? {}) as RawRecord;

  for (const side of ["awayTeam", "homeTeam"] as const) {
    const teamStats = (playerByGameStats[side] ?? {}) as RawRecord;

    for (const section of ["forwards", "defense", "goalies"] as const) {
      const players = Array.isArray(teamStats[section]) ? teamStats[section] : [];

      for (const player of players) {
        const record = player as RawRecord;
        const playerId = toNumber(record.playerId);
        const sweaterNumber = toNumber(record.sweaterNumber);

        if (playerId && sweaterNumber) {
          playerNumbers.set(playerId, sweaterNumber);
        }
      }
    }
  }

  return playerNumbers;
}

function normalizeSummary(
  rawSummary: RawRecord | undefined,
  playerNumbers?: Map<number, number>,
): GameSummary {
  const scoring = Array.isArray(rawSummary?.scoring) ? rawSummary.scoring : [];
  const penalties = Array.isArray(rawSummary?.penalties)
    ? rawSummary.penalties
    : [];
  const threeStars = Array.isArray(rawSummary?.threeStars)
    ? rawSummary.threeStars
    : [];

  return {
    scoring: scoring.map((period) => {
      const periodRecord = period as RawRecord;
      const descriptor = periodRecord.periodDescriptor as RawRecord | undefined;
      const periodLabel = formatPeriodLabel(
        toNumber(descriptor?.number),
        typeof descriptor?.periodType === "string"
          ? descriptor.periodType
          : undefined,
      );

      return {
        periodLabel,
        goals: Array.isArray(periodRecord.goals)
          ? periodRecord.goals.map((goal) =>
              normalizeGoal(goal as RawRecord, periodLabel, playerNumbers),
            )
          : [],
      };
    }),
    penalties: penalties.map((period) => {
      const periodRecord = period as RawRecord;
      const descriptor = periodRecord.periodDescriptor as RawRecord | undefined;
      const periodLabel = formatPeriodLabel(
        toNumber(descriptor?.number),
        typeof descriptor?.periodType === "string"
          ? descriptor.periodType
          : undefined,
      );

      return {
        periodLabel,
        penalties: Array.isArray(periodRecord.penalties)
          ? periodRecord.penalties.map((penalty) =>
              normalizePenalty(penalty as RawRecord, periodLabel),
            )
          : [],
      };
    }),
    threeStars: threeStars.map((star) =>
      normalizeThreeStar(star as RawRecord, playerNumbers),
    ),
  };
}

function prettyPlayType(type: string): string {
  return type
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function playerName(playerById: Map<number, string>, playerId: unknown): string {
  const id = toNumber(playerId);

  return id ? playerById.get(id) ?? `#${id}` : "";
}

function normalizePlay(
  rawPlay: RawRecord,
  playerById: Map<number, string>,
  teamById: Map<number, string>,
): NormalizedPlay {
  const type = typeof rawPlay.typeDescKey === "string" ? rawPlay.typeDescKey : "";
  const details = (rawPlay.details ?? {}) as RawRecord;
  const periodDescriptor = rawPlay.periodDescriptor as RawRecord | undefined;
  const periodLabel = formatPeriodLabel(
    toNumber(periodDescriptor?.number),
    typeof periodDescriptor?.periodType === "string"
      ? periodDescriptor.periodType
      : undefined,
  );
  const team = teamById.get(toNumber(details.eventOwnerTeamId));
  let title = prettyPlayType(type || "play");
  let detail = "";

  if (type === "goal") {
    title = "Goal";
    const scorer = playerName(playerById, details.scoringPlayerId);
    const assists = [details.assist1PlayerId, details.assist2PlayerId]
      .map((playerId) => playerName(playerById, playerId))
      .filter(Boolean);
    const shotType =
      typeof details.shotType === "string" ? titleCase(details.shotType) : "";

    detail = [scorer, shotType ? `${shotType} shot` : "", assists.length ? `A: ${assists.join(", ")}` : ""]
      .filter(Boolean)
      .join("  ");
  } else if (type === "shot-on-goal") {
    title = "Shot";
    const shooter = playerName(playerById, details.shootingPlayerId);
    const shotType =
      typeof details.shotType === "string" ? `${titleCase(details.shotType)} shot` : "";
    detail = [shooter, shotType].filter(Boolean).join("  ");
  } else if (type === "penalty") {
    title = "Penalty";
    const offender = playerName(playerById, details.committedByPlayerId);
    const reason =
      typeof details.descKey === "string" ? titleCase(details.descKey) : "";
    detail = [offender, reason].filter(Boolean).join("  ");
  } else if (type === "faceoff") {
    title = "Faceoff";
    const winner = playerName(playerById, details.winningPlayerId);
    const loser = playerName(playerById, details.losingPlayerId);
    detail = [winner, loser ? `beat ${loser}` : ""].filter(Boolean).join("  ");
  }

  const awayScore = details.awayScore;
  const homeScore = details.homeScore;

  return {
    id: toNumber(rawPlay.eventId),
    sortOrder: toNumber(rawPlay.sortOrder),
    type,
    team:
      typeof details.teamAbbrev === "string"
        ? details.teamAbbrev
        : typeof details.eventOwnerTeamAbbrev === "string"
          ? details.eventOwnerTeamAbbrev
          : team,
    title,
    detail: detail || undefined,
    score:
      awayScore !== undefined && homeScore !== undefined
        ? `${toNumber(awayScore)}-${toNumber(homeScore)}`
        : undefined,
    isGoal: type === "goal",
    periodLabel,
    timeInPeriod:
      typeof rawPlay.timeInPeriod === "string" ? rawPlay.timeInPeriod : "--:--",
    timeRemaining:
      typeof rawPlay.timeRemaining === "string"
        ? rawPlay.timeRemaining
        : "--:--",
  };
}

function normalizePlayByPlay(rawPayload: RawRecord): PlayByPlay {
  const plays = expectArray(rawPayload.plays, "play-by-play plays");
  const rosterSpots = Array.isArray(rawPayload.rosterSpots)
    ? rawPayload.rosterSpots
    : [];
  const playerById = new Map<number, string>();

  for (const spot of rosterSpots) {
    const player = spot as RawRecord;
    const playerId = toNumber(player.playerId);
    if (!playerId) {
      continue;
    }

    const firstName = readName(player.firstName);
    const lastName = readName(player.lastName);
    const displayName = [firstName, lastName].filter(Boolean).join(" ");
    playerById.set(playerId, displayName || `#${playerId}`);
  }

  const teamById = new Map<number, string>();
  const awayTeam = normalizeTeam(rawPayload.awayTeam as RawRecord | undefined);
  const homeTeam = normalizeTeam(rawPayload.homeTeam as RawRecord | undefined);
  teamById.set(awayTeam.id, awayTeam.abbrev);
  teamById.set(homeTeam.id, homeTeam.abbrev);

  const normalized = plays.map((play) =>
    normalizePlay(play as RawRecord, playerById, teamById),
  );

  return {
    plays: normalized,
    lastEventId: normalized.length ? normalized[normalized.length - 1].id : undefined,
  };
}

function parseSkaters(rawTeam: RawRecord | undefined): SkaterStatLine[] {
  const forwards = Array.isArray(rawTeam?.forwards) ? rawTeam.forwards : [];
  const defense = Array.isArray(rawTeam?.defense) ? rawTeam.defense : [];
  const skaters = [...forwards, ...defense];

  return skaters
    .map((player) => {
      const skater = player as RawRecord;

      return {
        playerId: toNumber(skater.playerId),
        sweaterNumber:
          skater.sweaterNumber === undefined
            ? undefined
            : toNumber(skater.sweaterNumber),
        name: readName(skater.name),
        position: typeof skater.position === "string" ? skater.position : "",
        goals: toNumber(skater.goals),
        assists: toNumber(skater.assists),
        points: toNumber(skater.points),
        plusMinus:
          skater.plusMinus === undefined ? undefined : toNumber(skater.plusMinus),
        shots: toNumber(skater.sog),
        hits: toNumber(skater.hits),
        pim: toNumber(skater.pim),
        toi: typeof skater.toi === "string" ? skater.toi : "00:00",
      };
    })
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.goals - left.goals ||
        right.shots - left.shots ||
        right.hits - left.hits
      );
    });
}

function parseGoalies(rawTeam: RawRecord | undefined): GoalieStatLine[] {
  const goalies = Array.isArray(rawTeam?.goalies) ? rawTeam.goalies : [];

  return goalies.map((player) => {
    const goalie = player as RawRecord;
    const shotsAgainst = toNumber(goalie.shotsAgainst);
    const saves = toNumber(goalie.saves);

    return {
      playerId: toNumber(goalie.playerId),
      sweaterNumber:
        goalie.sweaterNumber === undefined
          ? undefined
          : toNumber(goalie.sweaterNumber),
      name: readName(goalie.name),
      saves,
      shotsAgainst,
      goalsAgainst: toNumber(goalie.goalsAgainst),
      savePct: shotsAgainst ? saves / shotsAgainst : 0,
      toi: typeof goalie.toi === "string" ? goalie.toi : "00:00",
    };
  });
}

function normalizeTeamBoxScore(
  rawGame: RawRecord,
  rawTeamStats: RawRecord | undefined,
  side: "away" | "home",
): TeamBoxScore {
  const team = normalizeTeam(
    side === "away" ? rawGame.awayTeam : rawGame.homeTeam,
  );

  return {
    team,
    skaters: parseSkaters(rawTeamStats),
    goalies: parseGoalies(rawTeamStats),
  };
}

function normalizeBoxScore(rawPayload: RawRecord): BoxScore {
  const playerByGameStats = asRecord(
    rawPayload.playerByGameStats ?? {},
    "boxscore playerByGameStats",
  );

  return {
    away: normalizeTeamBoxScore(
      rawPayload,
      playerByGameStats.awayTeam as RawRecord | undefined,
      "away",
    ),
    home: normalizeTeamBoxScore(
      rawPayload,
      playerByGameStats.homeTeam as RawRecord | undefined,
      "home",
    ),
  };
}

const DIVISION_NAME_BY_ABBREV: Record<string, string> = {
  A: "Atlantic",
  M: "Metropolitan",
  C: "Central",
  P: "Pacific",
};

const CONFERENCE_NAME_BY_ABBREV: Record<string, string> = {
  E: "Eastern",
  W: "Western",
};

function fallbackDivisionName(divisionAbbrev: string): string {
  return DIVISION_NAME_BY_ABBREV[divisionAbbrev] ?? divisionAbbrev;
}

function fallbackConferenceName(conferenceAbbrev: string): string {
  return CONFERENCE_NAME_BY_ABBREV[conferenceAbbrev] ?? conferenceAbbrev;
}

function normalizeStandingsEntry(rawStanding: RawRecord): StandingsEntry {
  const conferenceAbbrev =
    typeof rawStanding.conferenceAbbrev === "string"
      ? rawStanding.conferenceAbbrev
      : "";
  const divisionAbbrev =
    typeof rawStanding.divisionAbbrev === "string"
      ? rawStanding.divisionAbbrev
      : "";
  const streakCode =
    typeof rawStanding.streakCode === "string" ? rawStanding.streakCode : "";
  const streakCount = toNumber(rawStanding.streakCount);

  return {
    teamAbbrev: readName(rawStanding.teamAbbrev) || "---",
    teamName:
      readName(rawStanding.teamCommonName) || readName(rawStanding.teamName),
    conferenceAbbrev,
    conferenceName:
      readName(rawStanding.conferenceName) ||
      fallbackConferenceName(conferenceAbbrev),
    divisionAbbrev,
    divisionName:
      readName(rawStanding.divisionName) || fallbackDivisionName(divisionAbbrev),
    divisionRank: toNumber(rawStanding.divisionSequence),
    conferenceRank: toNumber(rawStanding.conferenceSequence),
    wildcardRank: toNumber(rawStanding.wildcardSequence),
    leagueRank: toNumber(rawStanding.leagueSequence),
    points: toNumber(rawStanding.points),
    gamesPlayed: toNumber(rawStanding.gamesPlayed),
    wins: toNumber(rawStanding.wins),
    losses: toNumber(rawStanding.losses),
    otLosses: toNumber(rawStanding.otLosses),
    row: toNumber(rawStanding.regulationPlusOtWins),
    streak: streakCode && streakCount ? streakCode + String(streakCount) : "-",
    clinchIndicator:
      typeof rawStanding.clinchIndicator === "string" &&
      rawStanding.clinchIndicator.trim()
        ? rawStanding.clinchIndicator
        : undefined,
  };
}

function buildConferenceStandings(
  entries: StandingsEntry[],
  conferenceAbbrev: string,
): ConferenceStandings {
  const conferenceEntries = entries.filter(
    (entry) => entry.conferenceAbbrev === conferenceAbbrev,
  );
  const divisionOrder = conferenceAbbrev === "E" ? ["A", "M"] : ["C", "P"];
  const sections = [];

  for (const divisionAbbrev of divisionOrder) {
    const divisionEntries = conferenceEntries
      .filter(
        (entry) =>
          entry.divisionAbbrev === divisionAbbrev &&
          entry.divisionRank > 0 &&
          entry.divisionRank <= 3,
      )
      .sort((left, right) => {
        return (
          left.divisionRank - right.divisionRank ||
          right.points - left.points ||
          left.teamAbbrev.localeCompare(right.teamAbbrev)
        );
      });

    sections.push({
      title: (divisionEntries[0]?.divisionName || fallbackDivisionName(divisionAbbrev)).toUpperCase(),
      entries: divisionEntries,
    });
  }

  sections.push({
    title: "WILD CARD",
    entries: conferenceEntries
      .filter((entry) => entry.wildcardRank > 0 && entry.wildcardRank <= 2)
      .sort((left, right) => {
        return (
          left.wildcardRank - right.wildcardRank ||
          right.points - left.points ||
          left.teamAbbrev.localeCompare(right.teamAbbrev)
        );
      }),
  });

  sections.push({
    title: "UNDER WILD CARD",
    entries: conferenceEntries
      .filter((entry) => entry.wildcardRank > 2)
      .sort((left, right) => {
        return (
          left.wildcardRank - right.wildcardRank ||
          right.points - left.points ||
          left.teamAbbrev.localeCompare(right.teamAbbrev)
        );
      }),
  });

  return {
    conferenceAbbrev,
    conferenceName:
      conferenceEntries[0]?.conferenceName ||
      fallbackConferenceName(conferenceAbbrev),
    sections,
  };
}

export function normalizeStandings(
  rawPayload: unknown,
  scoreboardDate: string,
  now = Date.now(),
): NormalizedStandings {
  const payload = asRecord(rawPayload, "standings");
  const standings = expectArray(payload.standings, "standings");
  const entries = standings.map((standing) =>
    normalizeStandingsEntry(standing as RawRecord),
  );

  return {
    date: scoreboardDate,
    conferences: ["E", "W"].map((conferenceAbbrev) =>
      buildConferenceStandings(entries, conferenceAbbrev),
    ),
    lastUpdatedAt: now,
  };
}

const SKATER_LEADER_META = [
  { key: "points", title: "Points", valueLabel: "PTS", digits: 0 },
  { key: "goals", title: "Goals", valueLabel: "G", digits: 0 },
  { key: "assists", title: "Assists", valueLabel: "A", digits: 0 },
] as const;

const GOALIE_LEADER_META = [
  {
    key: "goalsAgainstAverage",
    title: "Goals Against Average",
    valueLabel: "GAA",
    digits: 2,
  },
  { key: "savePctg", title: "Save Percentage", valueLabel: "SV%", digits: 3 },
  { key: "shutouts", title: "Shutouts", valueLabel: "SO", digits: 0 },
] as const;

function formatLeaderValue(value: number, digits: number): string {
  return digits === 0 ? String(value) : value.toFixed(digits);
}

function normalizeLeaderEntry(
  rawLeader: RawRecord,
  rank: number,
  digits: number,
): LeaderEntry {
  const value = toNumber(rawLeader.value);

  return {
    rank,
    playerId: toNumber(rawLeader.id),
    player: formatPlayerLabel(
      shortName(rawLeader.firstName, rawLeader.lastName),
      rawLeader.sweaterNumber,
    ),
    teamAbbrev:
      typeof rawLeader.teamAbbrev === "string"
        ? rawLeader.teamAbbrev
        : readName(rawLeader.teamAbbrev) || "---",
    position: typeof rawLeader.position === "string" ? rawLeader.position : "",
    value,
    displayValue: formatLeaderValue(value, digits),
  };
}

function normalizeLeaderTable(
  rawPayload: RawRecord,
  meta: {
    key: LeaderTableKey;
    title: string;
    valueLabel: string;
    digits: number;
  },
): LeaderTable {
  const entries = expectArray(
    rawPayload[meta.key],
    `leaders ${meta.key}`,
  ) as RawRecord[];

  return {
    key: meta.key,
    title: meta.title,
    valueLabel: meta.valueLabel,
    entries: entries
      .slice(0, 10)
      .map((entry: RawRecord, index: number) =>
        normalizeLeaderEntry(entry, index + 1, meta.digits),
      ),
  };
}

export function normalizeLeaders(
  rawSkaterPayload: unknown,
  rawGoaliePayload: unknown,
  now = Date.now(),
): NormalizedLeaders {
  const skaterPayload = asRecord(rawSkaterPayload, "skater leaders");
  const goaliePayload = asRecord(rawGoaliePayload, "goalie leaders");

  return {
    skaterTables: SKATER_LEADER_META.map((meta) =>
      normalizeLeaderTable(skaterPayload, meta),
    ),
    goalieTables: GOALIE_LEADER_META.map((meta) =>
      normalizeLeaderTable(goaliePayload, meta),
    ),
    lastUpdatedAt: now,
  };
}

export function computeShotsByPeriod(
  rawPbpPayload: unknown,
  awayTeamId: number,
  homeTeamId: number,
): PeriodShots[] {
  const payload = rawPbpPayload as RawRecord;
  const plays = Array.isArray(payload.plays) ? payload.plays : [];

  if (!awayTeamId || !homeTeamId) {
    return [];
  }

  const periodMap = new Map<number, { away: number; home: number; periodLabel: string }>();

  for (const play of plays) {
    const p = play as RawRecord;
    const type = p.typeDescKey;
    if (type !== "shot-on-goal" && type !== "goal") {
      continue;
    }

    const periodDescriptor = p.periodDescriptor as RawRecord | undefined;
    const periodNumber = toNumber(periodDescriptor?.number);
    const periodType =
      typeof periodDescriptor?.periodType === "string"
        ? periodDescriptor.periodType
        : "REG";

    if (periodType === "SO") {
      continue;
    }

    const teamId = toNumber((p.details as RawRecord | undefined)?.eventOwnerTeamId);

    if (!teamId) {
      continue;
    }

    if (!periodMap.has(periodNumber)) {
      periodMap.set(periodNumber, {
        away: 0,
        home: 0,
        periodLabel: formatPeriodLabel(periodNumber, periodType),
      });
    }

    const entry = periodMap.get(periodNumber)!;
    if (teamId === awayTeamId) {
      entry.away++;
    } else if (teamId === homeTeamId) {
      entry.home++;
    }
  }

  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => entry);
}

export function normalizeDetail(
  tab: DetailTab,
  rawPayload: unknown,
  now = Date.now(),
  gameSource?: unknown,
): NormalizedGameDetail {
  const payload = asRecord(rawPayload, `game ${tab}`);
  const summaryPayload =
    tab === "summary" && payload.landing ? (payload.landing as RawRecord) : payload;
  const boxPayload =
    tab === "summary" && payload.box ? (payload.box as RawRecord) : undefined;
  const detail: NormalizedGameDetail = {
    game: normalizeGame(gameSource ?? summaryPayload),
    lastUpdatedAt: now,
  };

  if (tab === "summary") {
    const playerNumbers = buildPlayerNumberMap(boxPayload);
    detail.summary = normalizeSummary(
      summaryPayload.summary as RawRecord | undefined,
      playerNumbers,
    );
    if (boxPayload) {
      detail.box = normalizeBoxScore(boxPayload);
    }
    if (payload.pbp) {
      const game = detail.game;
      detail.summary.shotsByPeriod = computeShotsByPeriod(
        payload.pbp,
        game.away.id,
        game.home.id,
      );
    }
  }

  if (tab === "pbp") {
    detail.pbp = normalizePlayByPlay(payload);
  }

  if (tab === "box") {
    detail.box = normalizeBoxScore(payload);
  }

  return detail;
}
