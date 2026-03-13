import { Box, Text } from "ink";
import type { NormalizedGame } from "../../domain/types.js";

type GameRowProps = {
  game: NormalizedGame;
  selected: boolean;
};

function pad(value: string, width: number, align: "start" | "end" = "start") {
  if (value.length >= width) {
    return value.slice(0, width);
  }

  return align === "end" ? value.padStart(width) : value.padEnd(width);
}

function scoreValue(score: number, upcoming: boolean) {
  return upcoming ? "-" : String(score);
}

function statusColor(game: NormalizedGame): string | undefined {
  if (game.phase === "live") {
    return "greenBright";
  }

  if (game.phase === "final") {
    return "white";
  }

  return "gray";
}

export function GameRow({ game, selected }: GameRowProps) {
  const rowColor = selected ? "cyanBright" : undefined;
  const upcoming = game.phase === "upcoming";

  return (
    <Box>
      <Text color={selected ? "cyanBright" : "gray"}>{selected ? "›" : " "}</Text>
      <Text> </Text>
      <Text color={rowColor} bold={selected}>
        {pad(game.away.abbrev, 3)}
      </Text>
      <Text> </Text>
      <Text color={rowColor}>{pad(scoreValue(game.away.score, upcoming), 2, "end")}</Text>
      <Text> @ </Text>
      <Text color={rowColor} bold={selected}>
        {pad(game.home.abbrev, 3)}
      </Text>
      <Text> </Text>
      <Text color={rowColor}>{pad(scoreValue(game.home.score, upcoming), 2, "end")}</Text>
      <Text>  </Text>
      <Text color={statusColor(game)} bold>
        {pad(game.statusLabel, 8)}
      </Text>
      <Text> </Text>
      <Text color={rowColor}>{game.contextLabel}</Text>
    </Box>
  );
}
