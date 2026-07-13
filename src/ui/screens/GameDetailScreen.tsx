import { Box, Text } from "ink";
import type {
  BoxScore,
  DetailTab,
  GameSummary,
  NormalizedGame,
  NormalizedGameDetail,
  PlayByPlay,
  TeamBoxScore,
} from "../../domain/types.js";

type GameDetailScreenProps = {
  game?: NormalizedGame;
  detail?: NormalizedGameDetail;
  tab: DetailTab;
  pbpPage: number;
};

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value.padEnd(width);
  }

  return `${value.slice(0, Math.max(0, width - 1))}…`;
}

function renderSummary(
  summary: GameSummary | undefined,
  awayAbbrev: string,
  homeAbbrev: string,
) {
  if (!summary) {
    return <Text dimColor>Loading summary...</Text>;
  }

  return (
    <Box flexDirection="column">
      {summary.shotsByPeriod && summary.shotsByPeriod.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Shots on Goal</Text>
          <Text dimColor>
            {"".padEnd(6)}  {awayAbbrev.padEnd(4)} {homeAbbrev.padEnd(4)}
          </Text>
          {summary.shotsByPeriod.map((period) => (
            <Text key={`shots-${period.periodLabel}`}>
              {period.periodLabel.padEnd(6)}  {String(period.away).padStart(3).padEnd(4)}{" "}
              {String(period.home).padStart(3).padEnd(4)}
            </Text>
          ))}
          <Text>
            {"Total".padEnd(6)}  {String(
              summary.shotsByPeriod.reduce((sum, p) => sum + p.away, 0),
            ).padStart(3).padEnd(4)}{" "}
            {String(
              summary.shotsByPeriod.reduce((sum, p) => sum + p.home, 0),
            ).padStart(3).padEnd(4)}
          </Text>
        </Box>
      )}
      <Text bold>Scoring</Text>
      {summary.scoring.length ? (
        summary.scoring.map((period) => (
          <Box key={`scoring-${period.periodLabel}`} flexDirection="column">
            <Text dimColor>{period.periodLabel || "Game"}</Text>
            {period.goals.length ? (
              period.goals.map((goal) => (
                <Text key={goal.eventId}>
                  {goal.timeInPeriod.padStart(5)}  {goal.team.padEnd(3)}  {truncate(goal.scorer, 18)}{" "}
                  {goal.strength.padEnd(3)}  {goal.scoreAfter.padEnd(5)}
                  {goal.assists.length ? `  A: ${goal.assists.join(", ")}` : ""}
                </Text>
              ))
            ) : (
              <Text dimColor>No goals</Text>
            )}
          </Box>
        ))
      ) : (
        <Text dimColor>No scoring data yet.</Text>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Penalties</Text>
        {summary.penalties.length ? (
          summary.penalties.map((period) => (
            <Box key={`penalties-${period.periodLabel}`} flexDirection="column">
              <Text dimColor>{period.periodLabel || "Game"}</Text>
              {period.penalties.length ? (
                period.penalties.map((penalty, index) => (
                  <Text key={`${penalty.player}-${index}`}>
                    {penalty.timeInPeriod.padStart(5)}  {penalty.team.padEnd(3)}  {truncate(
                      penalty.player,
                      22,
                    )}  {truncate(penalty.kind, 18)}  {`${penalty.duration}m`.padStart(3)}
                  </Text>
                ))
              ) : (
                <Text dimColor>No penalties</Text>
              )}
            </Box>
          ))
        ) : (
          <Text dimColor>No penalty summary available.</Text>
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Three Stars</Text>
        {summary.threeStars.length ? (
          summary.threeStars.map((star) => (
            <Text key={`${star.star}-${star.player}`}>
              {String(star.star).padStart(2)}  {star.team.padEnd(3)}  {truncate(star.player, 20)}{" "}
              {star.position.padEnd(2)}  {star.statLine}
            </Text>
          ))
        ) : (
          <Text dimColor>Three stars not posted yet.</Text>
        )}
      </Box>
    </Box>
  );
}

const PBP_PAGE_SIZE = 20;

const PLAY_COLORS: Record<string, string> = {
  goal: "greenBright",
  "shot-on-goal": "cyan",
  "missed-shot": "blue",
  "blocked-shot": "blue",
  penalty: "red",
  hit: "yellow",
  faceoff: "magenta",
  giveaway: "redBright",
  takeaway: "greenBright",
  stoppage: "gray",
  "period-start": "white",
  "period-end": "white",
  "game-end": "white",
};

function colorForPlay(type: string): string | undefined {
  return PLAY_COLORS[type];
}

function renderPlayByPlay(pbp: PlayByPlay | undefined, page: number) {
  if (!pbp) {
    return <Text dimColor>Loading play-by-play...</Text>;
  }

  const reversed = [...pbp.plays].reverse();
  const totalPages = Math.max(1, Math.ceil(reversed.length / PBP_PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * PBP_PAGE_SIZE;
  const plays = reversed.slice(start, start + PBP_PAGE_SIZE);

  return (
    <Box flexDirection="column">
      <Text bold>
        Plays{" "}
        <Text dimColor>
          page {clampedPage + 1}/{totalPages}  j/k to page
        </Text>
      </Text>
      {plays.length ? (
        plays.map((play) => {
          const color = colorForPlay(play.type);
          return (
            <Text key={play.id}>
              <Text dimColor>
                {play.periodLabel.padEnd(4)} {play.timeInPeriod.padStart(5)}{" "}
              </Text>
              <Text>{(play.team ?? "---").padEnd(3)} </Text>
              <Text color={color} bold={play.isGoal}>
                {truncate(play.title, 12)}
              </Text>
              {"  "}
              <Text>{truncate(play.detail ?? "", 32)}</Text>
              {play.score ? <Text dimColor>{`  ${play.score}`}</Text> : null}
            </Text>
          );
        })
      ) : (
        <Text dimColor>No plays yet.</Text>
      )}
    </Box>
  );
}

function renderTeamBox(team: TeamBoxScore) {
  return (
    <Box flexDirection="column" flexGrow={1} paddingRight={1}>
      <Text bold>
        {team.team.abbrev}  {team.team.score}
      </Text>
      <Text dimColor>#  Player           P  G A P +/- S H TOI</Text>
      {team.skaters.map((player) => (
        <Text key={player.playerId}>
          {String(player.sweaterNumber ?? "").padStart(2)}  {truncate(player.name, 15)} {player.position.padEnd(2)}{" "}
          {String(player.goals).padStart(1)} {String(player.assists).padStart(1)}{" "}
          {String(player.points).padStart(1)} {String(player.plusMinus ?? 0).padStart(3)}{" "}
          {String(player.shots).padStart(1)} {String(player.hits).padStart(1)} {player.toi}
        </Text>
      ))}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Goalies</Text>
        {team.goalies.length ? (
          team.goalies.map((goalie) => (
            <Text key={goalie.playerId}>
              {String(goalie.sweaterNumber ?? "").padStart(2)}  {truncate(goalie.name, 15)}  SV{" "}
              {String(goalie.saves).padStart(2)}/{String(goalie.shotsAgainst).padEnd(2)}  SV%{" "}
              {goalie.savePct.toFixed(3)}  TOI {goalie.toi}
            </Text>
          ))
        ) : (
          <Text dimColor>No goalie stats.</Text>
        )}
      </Box>
    </Box>
  );
}

function renderBoxScore(box: BoxScore | undefined) {
  if (!box) {
    return <Text dimColor>Loading box score...</Text>;
  }

  return (
    <Box flexDirection="row">
      {renderTeamBox(box.away)}
      {renderTeamBox(box.home)}
    </Box>
  );
}

export function GameDetailScreen({
  game,
  detail,
  tab,
  pbpPage,
}: GameDetailScreenProps) {
  const snapshot = detail?.game ?? game;

  if (!snapshot) {
    return <Text dimColor>Loading game...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>
        {snapshot.away.abbrev} {snapshot.away.score} @ {snapshot.home.abbrev} {snapshot.home.score}
      </Text>
      <Text dimColor>
        {snapshot.statusLabel}  |  {snapshot.contextLabel}  |  {snapshot.venue || "NHL arena"}
      </Text>
      <Box marginTop={1} marginBottom={1}>
        <Text color={tab === "summary" ? "cyanBright" : undefined}>
          [1] Summary
        </Text>
        <Text>  </Text>
        <Text color={tab === "pbp" ? "cyanBright" : undefined}>[2] Play-by-play</Text>
        <Text>  </Text>
        <Text color={tab === "box" ? "cyanBright" : undefined}>[3] Box score</Text>
      </Box>
      {tab === "summary" && renderSummary(detail?.summary, snapshot.away.abbrev, snapshot.home.abbrev)}
      {tab === "pbp" && renderPlayByPlay(detail?.pbp, pbpPage)}
      {tab === "box" && renderBoxScore(detail?.box)}
    </Box>
  );
}
