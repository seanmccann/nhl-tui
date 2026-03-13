import { Box, Text } from "ink";
import type { NormalizedGame } from "../../domain/types.js";
import { GameRow } from "./GameRow.js";

type GameListProps = {
  games: NormalizedGame[];
  selectedGameId?: number;
};

function groupGames(games: NormalizedGame[]) {
  return {
    LIVE: games.filter((game) => game.section === "LIVE"),
    UPCOMING: games.filter((game) => game.section === "UPCOMING"),
    FINAL: games.filter((game) => game.section === "FINAL"),
  };
}

export function GameList({ games, selectedGameId }: GameListProps) {
  const groups = groupGames(games);

  return (
    <Box flexDirection="column">
      {(["LIVE", "UPCOMING", "FINAL"] as const).map((section) => {
        const sectionGames = groups[section];

        if (!sectionGames.length) {
          return null;
        }

        return (
          <Box key={section} flexDirection="column" marginBottom={1}>
            <Text dimColor>{section}</Text>
            {sectionGames.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                selected={game.id === selectedGameId}
              />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
