import type { Key } from "ink";
import type { Dispatch } from "react";
import type { Action } from "../domain/reducer.js";
import type { AppState, DetailTab } from "../domain/types.js";

const gameTabs: DetailTab[] = ["summary", "pbp", "box"];

function cycleGameTab(currentTab: DetailTab, direction: -1 | 1): DetailTab {
  const currentIndex = gameTabs.indexOf(currentTab);
  const nextIndex =
    (currentIndex + direction + gameTabs.length) % gameTabs.length;

  return gameTabs[nextIndex] ?? currentTab;
}

export function handleAppInput(
  input: string,
  key: Key,
  state: AppState,
  dispatch: Dispatch<Action>,
  quit: () => void,
): void {
  if (state.screen.type === "standings" || state.screen.type === "leaders") {
    if (key.escape) {
      dispatch({ type: "go_back" });
      return;
    }
  }

  if (input === "q") {
    quit();
    return;
  }

  if (state.screen.type === "scoreboard" && key.escape) {
    quit();
    return;
  }

  if (input === "r") {
    if (state.screen.type !== "standings" && state.screen.type !== "leaders") {
      dispatch({ type: "manual_refresh_requested" });
    }
    return;
  }

  if (input === "g") {
    dispatch({ type: "jump_selection", target: "top" });
    return;
  }

  if (input === "G") {
    dispatch({ type: "jump_selection", target: "bottom" });
    return;
  }

  if (state.screen.type === "scoreboard" && input === "s") {
    dispatch({ type: "open_standings" });
    return;
  }

  if (state.screen.type === "scoreboard" && input === "l") {
    dispatch({ type: "open_leaders" });
    return;
  }

  if (state.screen.type === "scoreboard") {
    if (key.leftArrow) {
      dispatch({ type: "change_scoreboard_date", delta: -1 });
      return;
    }

    if (key.rightArrow) {
      dispatch({ type: "change_scoreboard_date", delta: 1 });
      return;
    }
  }

  if (state.screen.type === "scoreboard" && key.upArrow) {
    dispatch({ type: "move_selection", delta: -1 });
    return;
  }

  if (state.screen.type === "scoreboard" && key.downArrow) {
    dispatch({ type: "move_selection", delta: 1 });
    return;
  }

  if (key.return && state.screen.type === "scoreboard") {
    dispatch({ type: "open_selected_game" });
    return;
  }

  if (state.screen.type === "game") {
    if (key.escape) {
      dispatch({ type: "go_back" });
      return;
    }

    if (key.leftArrow) {
      dispatch({
        type: "set_tab",
        tab: cycleGameTab(state.screen.tab, -1),
      });
      return;
    }

    if (key.rightArrow) {
      dispatch({
        type: "set_tab",
        tab: cycleGameTab(state.screen.tab, 1),
      });
      return;
    }

    if (input === "1") {
      dispatch({ type: "set_tab", tab: "summary" });
      return;
    }

    if (input === "2") {
      dispatch({ type: "set_tab", tab: "pbp" });
      return;
    }

    if (input === "3") {
      dispatch({ type: "set_tab", tab: "box" });
      return;
    }

    if (input === "j" || key.downArrow) {
      dispatch({ type: "pbp_page", delta: 1 });
      return;
    }

    if (input === "k" || key.upArrow) {
      dispatch({ type: "pbp_page", delta: -1 });
      return;
    }
  }
}
