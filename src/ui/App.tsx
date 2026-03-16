import { Box, Text, useApp, useInput } from "ink";
import { useEffect, useRef } from "react";
import { type NhlApi } from "../api/nhl.js";
import { formatScoreboardDateLabel } from "../app/dates.js";
import {
  getDetailPollDelayMs,
  getScoreboardPollDelayMs,
  useAppPolling,
} from "../app/polling.js";
import {
  selectCurrentLeaders,
  selectCurrentStandings,
  selectSelectedGame,
  selectVisibleGames,
  useAppStore,
} from "../app/store.js";
import { useBannerTimer } from "../app/timers.js";
import { handleAppInput } from "../app/input.js";
import { Banner } from "./components/Banner.js";
import { Footer } from "./components/Footer.js";
import { StatusLine } from "./components/StatusLine.js";
import { GameDetailScreen } from "./screens/GameDetailScreen.js";
import { LeadersScreen } from "./screens/LeadersScreen.js";
import { ScoreboardScreen } from "./screens/ScoreboardScreen.js";
import { StandingsScreen } from "./screens/StandingsScreen.js";

type AppProps = {
  client: NhlApi;
};

export function App({ client }: AppProps) {
  const { exit } = useApp();
  const [state, dispatch] = useAppStore();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useAppPolling({
    client,
    dispatch,
    stateRef,
    scoreboardDate: state.scoreboardDate,
    screenType: state.screen.type,
    screenGameId: state.screen.type === "game" ? state.screen.gameId : undefined,
    screenTab: state.screen.type === "game" ? state.screen.tab : undefined,
    manualRefreshToken: state.manualRefreshToken,
  });

  useBannerTimer(state.activeBanner, () => {
    dispatch({ type: "dismiss_banner" });
  });

  useInput((input, key) => {
    handleAppInput(input, key, stateRef.current, dispatch, exit);
  });

  const screen = state.screen;
  const gameScreen = screen.type === "game" ? screen : undefined;
  const visibleGames = selectVisibleGames(state);
  const selectedGame = selectSelectedGame(state);
  const standings = selectCurrentStandings(state);
  const standingsErrorMessage = state.standingsErrorByDate[state.scoreboardDate];
  const leaders = selectCurrentLeaders(state);
  const detail = gameScreen ? state.gameDetails[gameScreen.gameId] : undefined;
  const detailErrorMessage = gameScreen
    ? state.gameDetailErrors[gameScreen.gameId]
    : undefined;
  let detailGame =
    detail?.game ??
    (gameScreen
      ? state.games.find((game) => game.id === gameScreen.gameId)
      : undefined);
  let pollDelayMs: number | undefined = getScoreboardPollDelayMs(
    state.games,
    state.scoreboardDate,
  );
  let statusUpdatedAt = state.scoreboardUpdatedAt;
  let screenErrorMessage = state.scoreboardErrorMessage;

  if (screen.type === "standings") {
    pollDelayMs = undefined;
    statusUpdatedAt = standings?.lastUpdatedAt;
    screenErrorMessage = standingsErrorMessage;
  }

  if (screen.type === "leaders") {
    pollDelayMs = undefined;
    statusUpdatedAt = leaders?.lastUpdatedAt;
    screenErrorMessage = state.leadersErrorMessage;
  }

  if (gameScreen) {
    detailGame =
      detail?.game ??
      state.games.find((game) => game.id === gameScreen.gameId);
    pollDelayMs = getDetailPollDelayMs(gameScreen.tab, detailGame);
    statusUpdatedAt = detail?.lastUpdatedAt;
    screenErrorMessage = detailErrorMessage;
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">
        nhl-tui
      </Text>
      <Banner banner={state.activeBanner} />
      <Box marginBottom={1}>
        {screen.type === "scoreboard" ? (
          <ScoreboardScreen
            dateLabel={formatScoreboardDateLabel(state.scoreboardDate)}
            games={visibleGames}
            selectedGameId={state.selectedGameId}
            loading={
              state.scoreboardLoadedDate !== state.scoreboardDate &&
              !state.scoreboardErrorMessage
            }
            errorMessage={state.scoreboardErrorMessage}
          />
        ) : screen.type === "standings" ? (
          <StandingsScreen
            dateLabel={formatScoreboardDateLabel(state.scoreboardDate)}
            standings={standings}
            loading={!standings && !standingsErrorMessage}
            errorMessage={standingsErrorMessage}
          />
        ) : screen.type === "leaders" ? (
          <LeadersScreen
            leaders={leaders}
            loading={!leaders && !state.leadersErrorMessage}
            errorMessage={state.leadersErrorMessage}
          />
        ) : (
          <GameDetailScreen
            game={detailGame ?? selectedGame}
            detail={detail}
            tab={gameScreen?.tab ?? "summary"}
            pbpPage={gameScreen?.pbpPage ?? 0}
          />
        )}
      </Box>
      <StatusLine
        updatedAt={statusUpdatedAt}
        pollDelayMs={pollDelayMs}
        errorMessage={screenErrorMessage}
        hideAutoWhenDisabled={screen.type === "standings" || screen.type === "leaders"}
      />
      <Footer mode={screen.type} />
    </Box>
  );
}
