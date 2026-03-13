import { useReducer, type Dispatch } from "react";
import { todayScoreboardDate } from "./dates.js";
import { appReducer, type Action } from "../domain/reducer.js";
import type { AppState, NormalizedGame } from "../domain/types.js";

export const initialState: AppState = {
  screen: {
    type: "scoreboard",
  },
  scoreboardDate: todayScoreboardDate(),
  games: [],
  gameDetails: {},
  selectedGameId: undefined,
  updatedAt: undefined,
  bannerQueue: [],
  activeBanner: undefined,
  recentEvents: [],
  errorMessage: undefined,
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
