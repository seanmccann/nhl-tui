import { useEffect, useEffectEvent } from "react";
import type { Dispatch, MutableRefObject } from "react";
import { NhlApi } from "../api/nhl.js";
import { compareScoreboardDateToToday } from "./dates.js";
import { diffGame, diffGames } from "../domain/diff.js";
import { type Action } from "../domain/reducer.js";
import {
  normalizeDetail,
  normalizeLeaders,
  normalizeScoreboard,
  normalizeStandings,
} from "../domain/normalize.js";
import type { AppState, DetailTab, NormalizedGame } from "../domain/types.js";

type UseAppPollingOptions = {
  client: NhlApi;
  dispatch: Dispatch<Action>;
  stateRef: MutableRefObject<AppState>;
  scoreboardDate: string;
  screenType: AppState["screen"]["type"];
  screenGameId?: number;
  screenTab?: DetailTab;
  manualRefreshToken: number;
};

function getSoonestUpcomingDelta(
  games: NormalizedGame[],
  now: number,
): number | undefined {
  const deltas = games
    .filter((game) => game.phase === "upcoming")
    .map((game) => game.startTimeEpochMs - now)
    .sort((left, right) => left - right);

  return deltas[0];
}

export function getScoreboardPollDelayMs(
  games: NormalizedGame[],
  scoreboardDate: string,
  now = Date.now(),
): number {
  const dateRelation = compareScoreboardDateToToday(scoreboardDate, new Date(now));

  if (dateRelation < 0) {
    return 300000;
  }

  if (dateRelation > 0) {
    return 120000;
  }

  if (!games.length) {
    return 15000;
  }

  if (games.some((game) => game.phase === "live")) {
    return 5000;
  }

  const soonestUpcoming = getSoonestUpcomingDelta(games, now);
  if (soonestUpcoming !== undefined) {
    if (soonestUpcoming <= 5 * 60_000 && soonestUpcoming >= -30 * 60_000) {
      return 3000;
    }

    if (soonestUpcoming <= 30 * 60_000 && soonestUpcoming > 5 * 60_000) {
      return 10000;
    }
  }

  if (games.every((game) => game.phase === "final")) {
    return 180000;
  }

  return 60000;
}

export function getDetailPollDelayMs(
  tab: DetailTab,
  game: NormalizedGame | undefined,
  now = Date.now(),
): number | undefined {
  if (!game) {
    return 4000;
  }

  if (game.phase === "live") {
    if (tab === "pbp") {
      return 2500;
    }

    if (tab === "box") {
      return 7000;
    }

    return 5000;
  }

  if (game.phase === "upcoming") {
    return Math.min(
      getScoreboardPollDelayMs([game], game.startTimeUtc.slice(0, 10), now),
      tab === "pbp" ? 5000 : 8000,
    );
  }

  return undefined;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useAppPolling({
  client,
  dispatch,
  stateRef,
  scoreboardDate,
  screenType,
  screenGameId,
  screenTab,
  manualRefreshToken,
}: UseAppPollingOptions): void {
  const fetchScoreboard = useEffectEvent(async () => {
    const currentScoreboardDate = stateRef.current.scoreboardDate;

    try {
      const receivedAt = Date.now();
      const payload = await client.fetchScoreboard(currentScoreboardDate);
      const games = normalizeScoreboard(payload);
      const previousGames = stateRef.current.games;
      const events = diffGames(previousGames, games, receivedAt);

      dispatch({
        type: "scoreboard_loaded",
        scoreboardDate: currentScoreboardDate,
        games,
        receivedAt,
        events,
      });
    } catch (error) {
      dispatch({
        type: "poll_failed",
        resource: "scoreboard",
        error: formatError(error),
        scoreboardDate: currentScoreboardDate,
      });
    }
  });

  const fetchStandings = useEffectEvent(async () => {
    const currentScoreboardDate = stateRef.current.scoreboardDate;

    if (stateRef.current.standingsByDate[currentScoreboardDate]) {
      return;
    }

    try {
      const receivedAt = Date.now();
      const payload = await client.fetchStandings(currentScoreboardDate);
      const standings = normalizeStandings(payload, currentScoreboardDate, receivedAt);

      dispatch({
        type: "standings_loaded",
        scoreboardDate: currentScoreboardDate,
        standings,
        receivedAt,
      });
    } catch (error) {
      dispatch({
        type: "poll_failed",
        resource: "standings",
        error: formatError(error),
        scoreboardDate: currentScoreboardDate,
      });
    }
  });

  const fetchLeaders = useEffectEvent(async () => {
    if (stateRef.current.leaders) {
      return;
    }

    try {
      const receivedAt = Date.now();
      const [skaterPayload, goaliePayload] = await Promise.all([
        client.fetchSkaterLeaders(10),
        client.fetchGoalieLeaders(10),
      ]);
      const leaders = normalizeLeaders(skaterPayload, goaliePayload, receivedAt);

      dispatch({
        type: "leaders_loaded",
        leaders,
        receivedAt,
      });
    } catch (error) {
      if (stateRef.current.screen.type === "leaders") {
        dispatch({
          type: "poll_failed",
          resource: "leaders",
          error: formatError(error),
        });
      }
    }
  });

  const fetchDetail = useEffectEvent(async () => {
    const screen = stateRef.current.screen;
    if (screen.type !== "game") {
      return;
    }

    try {
      const receivedAt = Date.now();
      let payload: unknown;

      if (screen.tab === "pbp") {
        payload = await client.fetchPlayByPlay(screen.gameId);
      } else if (screen.tab === "box") {
        payload = await client.fetchBoxScore(screen.gameId);
      } else {
        const landing = await client.fetchSummary(screen.gameId);
        let box: unknown | undefined;

        try {
          box = await client.fetchBoxScore(screen.gameId);
        } catch {
          box = undefined;
        }

        payload = { landing, box };
      }

      const detail = normalizeDetail(screen.tab, payload, receivedAt);
      const previousGame =
        stateRef.current.gameDetails[screen.gameId]?.game ??
        stateRef.current.games.find((game) => game.id === screen.gameId);
      const events = diffGame(previousGame, detail.game, receivedAt);

      dispatch({
        type: "game_detail_loaded",
        gameId: screen.gameId,
        detail,
        receivedAt,
        events,
      });
    } catch (error) {
      dispatch({
        type: "poll_failed",
        resource: "game",
        error: formatError(error),
        gameId: screen.gameId,
      });
    }
  });

  const fetchCurrentView = useEffectEvent(async () => {
    if (stateRef.current.screen.type === "scoreboard") {
      await fetchScoreboard();
      return;
    }

    if (stateRef.current.screen.type === "standings") {
      await fetchStandings();
      return;
    }

    if (stateRef.current.screen.type === "leaders") {
      await fetchLeaders();
      return;
    }

    await fetchDetail();
  });

  useEffect(() => {
    let disposed = false;
    let timer: NodeJS.Timeout | undefined;

    const loop = async () => {
      await fetchCurrentView();
      if (disposed) {
        return;
      }

      const state = stateRef.current;
      let delay: number | undefined = getScoreboardPollDelayMs(
        state.games,
        state.scoreboardDate,
      );
      const screen = state.screen;

      if (screen.type === "standings" || screen.type === "leaders") {
        delay = undefined;
      }

      if (screen.type === "game") {
        const currentGame =
          state.gameDetails[screen.gameId]?.game ??
          state.games.find((game) => game.id === screen.gameId);
        delay = getDetailPollDelayMs(screen.tab, currentGame);
      }

      if (delay === undefined) {
        return;
      }

      timer = setTimeout(loop, delay);
    };

    timer = setTimeout(loop, 0);

    return () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [fetchCurrentView, scoreboardDate, screenType, screenGameId, screenTab]);

  useEffect(() => {
    if (manualRefreshToken === 0) {
      return;
    }

    void fetchCurrentView();
  }, [fetchCurrentView, manualRefreshToken]);
}
