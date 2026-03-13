import type {
  BoxScore,
  DetailTab,
  GameClock,
  GameSummary,
  GoalieStatLine,
  NormalizedGame,
  NormalizedGameDetail,
  NormalizedPlay,
  NormalizedTeam,
  PlayByPlay,
  SkaterStatLine,
  SummaryGoal,
  SummaryPenalty,
  TeamBoxScore,
  ThreeStar,
} from "./types.js";

type RawRecord = Record<string, any>;

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
  const payload = rawPayload as RawRecord;
  const games = Array.isArray(payload.games) ? payload.games : [];

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
  const gaa = toNumber(rawStar.goalsAgainstAverage);
  const goalieStat = savePct ? `SV% ${savePct.toFixed(3)}` : "";
  const skaterStat = gaa ? `GAA ${gaa.toFixed(2)}` : "";

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
  const plays = Array.isArray(rawPayload.plays) ? rawPayload.plays : [];
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
  const playerByGameStats = (rawPayload.playerByGameStats ?? {}) as RawRecord;

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

export function normalizeDetail(
  tab: DetailTab,
  rawPayload: unknown,
  now = Date.now(),
): NormalizedGameDetail {
  const payload = rawPayload as RawRecord;
  const summaryPayload =
    tab === "summary" && payload.landing ? (payload.landing as RawRecord) : payload;
  const boxPayload =
    tab === "summary" && payload.box ? (payload.box as RawRecord) : undefined;
  const detail: NormalizedGameDetail = {
    game: normalizeGame(summaryPayload),
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
  }

  if (tab === "pbp") {
    detail.pbp = normalizePlayByPlay(payload);
  }

  if (tab === "box") {
    detail.box = normalizeBoxScore(payload);
  }

  return detail;
}
