import { Box, Text, useStdout } from "ink";
import type { LeaderEntry, LeaderTable, NormalizedLeaders } from "../../domain/types.js";

type LeadersScreenProps = {
  leaders?: NormalizedLeaders;
  loading: boolean;
  errorMessage?: string;
};

const GRID_MIN_WIDTH = 120;

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

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value.padEnd(width);
  }

  return `${value.slice(0, Math.max(0, width - 1))}…`;
}

function renderLeaderRow(entry: LeaderEntry) {
  return (
    <Text key={`${entry.playerId}-${entry.rank}`}>
      {ordinal(entry.rank).padStart(4)}  {entry.teamAbbrev.padEnd(3)}  {truncate(entry.player, 18)}  {entry.displayValue.padStart(5)}
    </Text>
  );
}

function renderTable(table: LeaderTable) {
  return (
    <Box key={table.key} flexDirection="column" flexGrow={1} paddingRight={2} marginBottom={1}>
      <Text bold>{table.title}</Text>
      <Text dimColor>{` RK   TM  PLAYER              ${table.valueLabel}`}</Text>
      {table.entries.length ? (
        table.entries.map(renderLeaderRow)
      ) : (
        <Text dimColor>No data</Text>
      )}
    </Box>
  );
}

export function LeadersScreen({
  leaders,
  loading,
  errorMessage,
}: LeadersScreenProps) {
  const { stdout } = useStdout();
  const shouldUseGrid = (stdout.columns ?? 0) >= GRID_MIN_WIDTH;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>Leaders</Text>
      </Box>
      {loading ? (
        <Text dimColor>Loading leaders...</Text>
      ) : leaders ? (
        <Box flexDirection="column">
          <Box flexDirection={shouldUseGrid ? "row" : "column"} marginBottom={1}>
            {leaders.skaterTables.map(renderTable)}
          </Box>
          <Box flexDirection={shouldUseGrid ? "row" : "column"}>
            {leaders.goalieTables.map(renderTable)}
          </Box>
        </Box>
      ) : errorMessage ? (
        <Text color="redBright">Unable to load leaders: {errorMessage}</Text>
      ) : (
        <Text dimColor>No leader data available.</Text>
      )}
    </Box>
  );
}
