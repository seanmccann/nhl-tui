import type { AppEvent, Banner, NormalizedGame } from "./types.js";

export function createGoalBanners(
  events: AppEvent[],
  games: NormalizedGame[],
  createdAt: number,
): Banner[] {
  const gamesById = new Map(games.map((game) => [game.id, game]));

  return events.flatMap((event, index) => {
    if (event.type !== "goal_scored") {
      return [];
    }

    const game = gamesById.get(event.gameId);

    return [
      {
        id: `${event.gameId}:${event.timestamp}:${index}`,
        type: "goal",
        gameId: event.gameId,
        team: event.team,
        title: `${event.team} GOAL`,
        subtitle: game
          ? `${game.away.abbrev} ${game.away.score} - ${game.home.score} ${game.home.abbrev}`
          : undefined,
        createdAt,
      },
    ];
  });
}
