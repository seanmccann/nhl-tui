import { Box, Text, useStdout } from "ink";
import type {
  ConferenceStandings,
  NormalizedStandings,
  StandingsEntry,
  StandingsSection,
} from "../../domain/types.js";

type StandingsScreenProps = {
  dateLabel: string;
  standings?: NormalizedStandings;
  loading: boolean;
  errorMessage?: string;
};

const SIDE_BY_SIDE_MIN_WIDTH = 100;

function formatRecord(entry: StandingsEntry): string {
  return `${entry.wins}-${entry.losses}-${entry.otLosses}`;
}

function rankForSection(section: StandingsSection, entry: StandingsEntry): number {
  if (section.title === "WILD CARD" || section.title === "UNDER WILD CARD") {
    return entry.wildcardRank;
  }

  return entry.divisionRank;
}

function renderRow(section: StandingsSection, entry: StandingsEntry) {
  const rank = rankForSection(section, entry);

  return (
    <Text key={`${section.title}-${entry.teamAbbrev}`}>
      {String(rank).padStart(2)}  {entry.teamAbbrev.padEnd(3)}  {String(entry.points).padStart(3)}  {String(
        entry.gamesPlayed,
      ).padStart(2)}  {formatRecord(entry).padEnd(8)}  {String(entry.row).padStart(3)}  {(
        entry.streak || "-"
      ).padStart(3)}
      {entry.clinchIndicator ? `  ${entry.clinchIndicator}` : ""}
    </Text>
  );
}

function renderSection(section: StandingsSection) {
  return (
    <Box key={section.title} flexDirection="column" marginBottom={1}>
      <Text bold>{section.title}</Text>
      <Text dimColor> #  TM  PTS  GP  REC       ROW  STK</Text>
      {section.entries.length ? (
        section.entries.map((entry) => renderRow(section, entry))
      ) : (
        <Text dimColor>No teams</Text>
      )}
    </Box>
  );
}

function renderConference(conference: ConferenceStandings) {
  return (
    <Box key={conference.conferenceAbbrev} flexDirection="column" flexGrow={1} paddingRight={2}>
      <Text bold color="cyanBright">{conference.conferenceName.toUpperCase()}</Text>
      {conference.sections.map(renderSection)}
    </Box>
  );
}

export function StandingsScreen({
  dateLabel,
  standings,
  loading,
  errorMessage,
}: StandingsScreenProps) {
  const { stdout } = useStdout();
  const shouldUseColumns = (stdout.columns ?? 0) >= SIDE_BY_SIDE_MIN_WIDTH;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>{`Standings  ${dateLabel}`}</Text>
      </Box>
      {loading ? (
        <Text dimColor>{`Loading standings for ${dateLabel}...`}</Text>
      ) : standings?.conferences.length ? (
        <Box flexDirection={shouldUseColumns ? "row" : "column"}>
          {standings.conferences.map(renderConference)}
        </Box>
      ) : errorMessage ? (
        <Text color="redBright">Unable to load standings: {errorMessage}</Text>
      ) : (
        <Text dimColor>{`No standings available for ${dateLabel}.`}</Text>
      )}
    </Box>
  );
}
