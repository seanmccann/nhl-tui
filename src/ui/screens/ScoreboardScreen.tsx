import { Box, Text } from "ink";
import type { NormalizedGame } from "../../domain/types.js";
import { GameList } from "../components/GameList.js";

type ScoreboardScreenProps = {
  dateLabel: string;
  games: NormalizedGame[];
  selectedGameId?: number;
  loading: boolean;
  errorMessage?: string;
};

export function ScoreboardScreen({
  dateLabel,
  games,
  selectedGameId,
  loading,
  errorMessage,
}: ScoreboardScreenProps) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>{`<-  ${dateLabel}  ->`}</Text>
      </Box>
      {loading ? (
        <Text dimColor>{`Loading ${dateLabel}...`}</Text>
      ) : games.length ? (
        <GameList games={games} selectedGameId={selectedGameId} />
      ) : errorMessage ? (
        <Text color="redBright">Unable to load scoreboard: {errorMessage}</Text>
      ) : (
        <Text dimColor>{`No games on ${dateLabel}.`}</Text>
      )}
    </Box>
  );
}
