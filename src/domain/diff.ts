import type { AppEvent, NormalizedGame } from "./types.js";

function buildGoalEvents(
  gameId: number,
  team: string,
  delta: number,
  timestamp: number,
): AppEvent[] {
  if (delta <= 0) {
    return [];
  }

  return Array.from({ length: delta }, () => ({
    type: "goal_scored" as const,
    gameId,
    team,
    timestamp,
  }));
}

function diffSingleGame(
  previousGame: NormalizedGame | undefined,
  nextGame: NormalizedGame,
  timestamp: number,
): AppEvent[] {
  if (!previousGame) {
    return [];
  }

  const events: AppEvent[] = [];

  if (previousGame.phase !== "live" && nextGame.phase === "live") {
    events.push({
      type: "game_started",
      gameId: nextGame.id,
      timestamp,
    });
  }

  if (previousGame.phase === "live" && nextGame.phase === "final") {
    events.push({
      type: "game_ended",
      gameId: nextGame.id,
      timestamp,
    });
  }

  if (
    previousGame.phase === "live" &&
    nextGame.phase === "live" &&
    previousGame.periodLabel &&
    nextGame.periodLabel &&
    previousGame.periodLabel !== nextGame.periodLabel
  ) {
    events.push({
      type: "period_changed",
      gameId: nextGame.id,
      period: nextGame.periodLabel,
      timestamp,
    });
  }

  events.push(
    ...buildGoalEvents(
      nextGame.id,
      nextGame.away.abbrev,
      nextGame.away.score - previousGame.away.score,
      timestamp,
    ),
  );

  events.push(
    ...buildGoalEvents(
      nextGame.id,
      nextGame.home.abbrev,
      nextGame.home.score - previousGame.home.score,
      timestamp,
    ),
  );

  return events;
}

export function diffGames(
  previousGames: NormalizedGame[],
  nextGames: NormalizedGame[],
  timestamp: number,
): AppEvent[] {
  const previousById = new Map(previousGames.map((game) => [game.id, game]));
  const events: AppEvent[] = [];

  for (const nextGame of nextGames) {
    events.push(
      ...diffSingleGame(previousById.get(nextGame.id), nextGame, timestamp),
    );
  }

  return events;
}

export function diffGame(
  previousGame: NormalizedGame | undefined,
  nextGame: NormalizedGame,
  timestamp: number,
): AppEvent[] {
  return diffSingleGame(previousGame, nextGame, timestamp);
}
