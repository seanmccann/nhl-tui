import type { AppEvent, Banner, NormalizedGame } from "./types.js";

function scoreLine(game: NormalizedGame | undefined): string | undefined {
  if (!game) {
    return undefined;
  }

  return `${game.away.abbrev} ${game.away.score} - ${game.home.score} ${game.home.abbrev}`;
}

function finalTitle(game: NormalizedGame | undefined): string {
  if (game?.contextLabel === "Final/OT") {
    return "FINAL (OT)";
  }

  if (game?.contextLabel === "Final/SO") {
    return "FINAL (SO)";
  }

  return "FINAL";
}

/**
 * Turns synthesized game events into the banner queue. Every event type the
 * diff produces surfaces here — goals, puck drop, period changes, and finals —
 * so nothing that's computed is silently dropped.
 */
export function createBanners(
  events: AppEvent[],
  games: NormalizedGame[],
  createdAt: number,
): Banner[] {
  const gamesById = new Map(games.map((game) => [game.id, game]));

  return events.flatMap((event, index): Banner[] => {
    const game = gamesById.get(event.gameId);
    const id = `${event.gameId}:${event.timestamp}:${index}`;

    switch (event.type) {
      case "goal_scored":
        return [
          {
            id,
            kind: "goal" as const,
            gameId: event.gameId,
            team: event.team,
            title: `${event.team} GOAL`,
            subtitle: scoreLine(game),
            createdAt,
          },
        ];

      case "game_started":
        return [
          {
            id,
            kind: "game-start" as const,
            gameId: event.gameId,
            title: game
              ? `${game.away.abbrev} @ ${game.home.abbrev} — puck drop`
              : "Puck drop",
            createdAt,
          },
        ];

      case "period_changed":
        return [
          {
            id,
            kind: "period" as const,
            gameId: event.gameId,
            title: `${event.period} underway`,
            subtitle: scoreLine(game),
            createdAt,
          },
        ];

      case "game_ended":
        return [
          {
            id,
            kind: "game-end" as const,
            gameId: event.gameId,
            title: finalTitle(game),
            subtitle: scoreLine(game),
            createdAt,
          },
        ];

      default:
        return [];
    }
  });
}
