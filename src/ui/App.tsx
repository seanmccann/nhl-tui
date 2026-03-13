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
import { ScoreboardScreen } from "./screens/ScoreboardScreen.js";

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
  const detail = gameScreen ? state.gameDetails[gameScreen.gameId] : undefined;
  let detailGame =
    detail?.game ??
    (gameScreen
      ? state.games.find((game) => game.id === gameScreen.gameId)
      : undefined);
  let pollDelayMs: number | undefined = getScoreboardPollDelayMs(
    state.games,
    state.scoreboardDate,
  );

  if (gameScreen) {
    detailGame =
      detail?.game ??
      state.games.find((game) => game.id === gameScreen.gameId);
    pollDelayMs = getDetailPollDelayMs(gameScreen.tab, detailGame);
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
            loading={!state.updatedAt && !state.games.length && !state.errorMessage}
            errorMessage={state.errorMessage}
          />
        ) : (
          <GameDetailScreen
            game={detailGame ?? selectedGame}
            detail={detail}
            tab={gameScreen?.tab ?? "summary"}
          />
        )}
      </Box>
      <StatusLine
        updatedAt={state.updatedAt}
        pollDelayMs={pollDelayMs}
        errorMessage={state.errorMessage}
      />
      <Footer mode={gameScreen ? "game" : "scoreboard"} />
    </Box>
  );
}
