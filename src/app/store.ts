import { useReducer, type Dispatch } from "react";
import { todayScoreboardDate } from "./dates.js";
import { appReducer, type Action } from "../domain/reducer.js";
import type {
  AppState,
  NormalizedGame,
  NormalizedLeaders,
  NormalizedStandings,
} from "../domain/types.js";

export const initialState: AppState = {
  screen: {
    type: "scoreboard",
  },
  scoreboardDate: todayScoreboardDate(),
  games: [],
  standingsByDate: {},
  standingsErrorByDate: {},
  leaders: undefined,
  leadersErrorMessage: undefined,
  gameDetails: {},
  gameDetailErrors: {},
  scoreboardLoadedDate: undefined,
  scoreboardUpdatedAt: undefined,
  scoreboardErrorMessage: undefined,
  selectedGameId: undefined,
  bannerQueue: [],
  activeBanner: undefined,
  recentEvents: [],
  manualRefreshToken: 0,
};

export function useAppStore(): [AppState, Dispatch<Action>] {
  return useReducer(appReducer, initialState);
}

export function selectVisibleGames(state: AppState): NormalizedGame[] {
  return state.games;
}

export function selectSelectedGame(state: AppState): NormalizedGame | undefined {
  return state.games.find((game) => game.id === state.selectedGameId);
}

export function selectCurrentStandings(
  state: AppState,
): NormalizedStandings | undefined {
  return state.standingsByDate[state.scoreboardDate];
}

export function selectCurrentLeaders(
  state: AppState,
): NormalizedLeaders | undefined {
  return state.leaders;
}
