import { shiftScoreboardDate } from "../app/dates.js";
import { createGoalBanners } from "./events.js";
import type {
  AppEvent,
  AppScreen,
  AppState,
  Banner,
  DetailTab,
  NormalizedGame,
  NormalizedGameDetail,
} from "./types.js";

export type Action =
  | {
      type: "scoreboard_loaded";
      scoreboardDate: string;
      games: NormalizedGame[];
      receivedAt: number;
      events: AppEvent[];
    }
  | {
      type: "game_detail_loaded";
      gameId: number;
      detail: NormalizedGameDetail;
      receivedAt: number;
      events: AppEvent[];
    }
  | {
      type: "poll_failed";
      error: string;
      scoreboardDate?: string;
      gameId?: number;
    }
  | { type: "change_scoreboard_date"; delta: -1 | 1 }
  | { type: "move_selection"; delta: -1 | 1 }
  | { type: "jump_selection"; target: "top" | "bottom" }
  | { type: "open_selected_game" }
  | { type: "go_back" }
  | { type: "set_tab"; tab: DetailTab }
  | { type: "manual_refresh_requested" }
  | { type: "dismiss_banner" };

function isScoreboardScreen(
  screen: AppScreen,
): screen is Extract<AppScreen, { type: "scoreboard" }> {
  return screen.type === "scoreboard";
}

function resolveSelection(
  games: NormalizedGame[],
  preferredId: number | undefined,
): number | undefined {
  if (!games.length) {
    return undefined;
  }

  if (preferredId && games.some((game) => game.id === preferredId)) {
    return preferredId;
  }

  return games[0]?.id;
}

function enqueueBanners(
  activeBanner: Banner | undefined,
  bannerQueue: Banner[],
  incoming: Banner[],
): Pick<AppState, "activeBanner" | "bannerQueue"> {
  let nextActiveBanner = activeBanner;
  const nextQueue = [...bannerQueue];

  for (const banner of incoming) {
    if (!nextActiveBanner) {
      nextActiveBanner = banner;
    } else {
      nextQueue.push(banner);
    }
  }

  return {
    activeBanner: nextActiveBanner,
    bannerQueue: nextQueue,
  };
}

function mergeDetail(
  previousDetail: NormalizedGameDetail | undefined,
  nextDetail: NormalizedGameDetail,
): NormalizedGameDetail {
  return {
    game: nextDetail.game,
    summary: nextDetail.summary ?? previousDetail?.summary,
    pbp: nextDetail.pbp ?? previousDetail?.pbp,
    box: nextDetail.box ?? previousDetail?.box,
    lastUpdatedAt: nextDetail.lastUpdatedAt,
  };
}

function updateGamesWithDetail(
  games: NormalizedGame[],
  detailGame: NormalizedGame,
): NormalizedGame[] {
  const existing = games.some((game) => game.id === detailGame.id);
  const nextGames = existing
    ? games.map((game) => (game.id === detailGame.id ? detailGame : game))
    : [...games, detailGame];

  return nextGames.slice().sort((left, right) => {
    const sectionOrder = {
      LIVE: 0,
      UPCOMING: 1,
      FINAL: 2,
    };

    return (
      sectionOrder[left.section] - sectionOrder[right.section] ||
      left.startTimeEpochMs - right.startTimeEpochMs ||
      left.id - right.id
    );
  });
}

function withEvents(
  state: AppState,
  games: NormalizedGame[],
  events: AppEvent[],
  receivedAt: number,
): Pick<AppState, "activeBanner" | "bannerQueue" | "recentEvents"> {
  const banners = createGoalBanners(events, games, receivedAt);
  const bannerState = enqueueBanners(state.activeBanner, state.bannerQueue, banners);

  return {
    ...bannerState,
    recentEvents: [...state.recentEvents, ...events].slice(-40),
  };
}

function moveSelection(state: AppState, delta: -1 | 1): AppState {
  if (!isScoreboardScreen(state.screen) || !state.games.length) {
    return state;
  }

  const currentIndex = state.games.findIndex(
    (game) => game.id === state.selectedGameId,
  );
  const nextIndex =
    currentIndex === -1
      ? delta > 0
        ? 0
        : state.games.length - 1
      : Math.max(0, Math.min(state.games.length - 1, currentIndex + delta));

  return {
    ...state,
    selectedGameId: state.games[nextIndex]?.id,
  };
}

function jumpSelection(state: AppState, target: "top" | "bottom"): AppState {
  if (!isScoreboardScreen(state.screen) || !state.games.length) {
    return state;
  }

  return {
    ...state,
    selectedGameId:
      target === "top"
        ? state.games[0]?.id
        : state.games[state.games.length - 1]?.id,
  };
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "scoreboard_loaded": {
      if (action.scoreboardDate !== state.scoreboardDate) {
        return state;
      }

      const nextSelectedGameId = isScoreboardScreen(state.screen)
        ? resolveSelection(action.games, state.selectedGameId)
        : state.selectedGameId;

      return {
        ...state,
        games: action.games,
        selectedGameId: nextSelectedGameId,
        updatedAt: action.receivedAt,
        errorMessage: undefined,
        ...withEvents(state, action.games, action.events, action.receivedAt),
      };
    }

    case "game_detail_loaded": {
      const mergedDetail = mergeDetail(
        state.gameDetails[action.gameId],
        action.detail,
      );
      const nextGames = updateGamesWithDetail(state.games, action.detail.game);

      return {
        ...state,
        games: nextGames,
        gameDetails: {
          ...state.gameDetails,
          [action.gameId]: mergedDetail,
        },
        updatedAt: action.receivedAt,
        errorMessage: undefined,
        ...withEvents(state, nextGames, action.events, action.receivedAt),
      };
    }

    case "poll_failed":
      if (action.scoreboardDate && action.scoreboardDate !== state.scoreboardDate) {
        return state;
      }

      if (
        action.gameId &&
        (state.screen.type !== "game" || state.screen.gameId !== action.gameId)
      ) {
        return state;
      }

      return {
        ...state,
        errorMessage: action.error,
      };

    case "change_scoreboard_date":
      if (!isScoreboardScreen(state.screen)) {
        return state;
      }

      return {
        ...state,
        scoreboardDate: shiftScoreboardDate(state.scoreboardDate, action.delta),
        games: [],
        selectedGameId: undefined,
        updatedAt: undefined,
        errorMessage: undefined,
        activeBanner: undefined,
        bannerQueue: [],
      };

    case "move_selection":
      return moveSelection(state, action.delta);

    case "jump_selection":
      return jumpSelection(state, action.target);

    case "open_selected_game":
      if (!state.selectedGameId) {
        return state;
      }

      return {
        ...state,
        screen: {
          type: "game",
          gameId: state.selectedGameId,
          tab: "summary",
        },
      };

    case "go_back":
      if (!isScoreboardScreen(state.screen)) {
        return {
          ...state,
          screen: {
            type: "scoreboard",
          },
          selectedGameId: resolveSelection(state.games, state.screen.gameId),
        };
      }

      return state;

    case "set_tab":
      if (state.screen.type !== "game") {
        return state;
      }

      return {
        ...state,
        screen: {
          ...state.screen,
          tab: action.tab,
        },
      };

    case "manual_refresh_requested":
      return {
        ...state,
        manualRefreshToken: state.manualRefreshToken + 1,
      };

    case "dismiss_banner":
      return {
        ...state,
        activeBanner: state.bannerQueue[0],
        bannerQueue: state.bannerQueue.slice(1),
      };

    default:
      return state;
  }
}
