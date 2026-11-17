import type { Placement } from "../../types";
export type History = {
  past: Placement[][];
  present: Placement[];
  future: Placement[][];
};
export const emptyHistory: History = { past: [], present: [], future: [] };
export type Action =
  | { type: "commit"; placements: Placement[] }
  | { type: "undo" | "redo" | "reset" };
export function historyReducer(state: History, action: Action): History {
  switch (action.type) {
    case "reset":
      return emptyHistory;
    case "commit":
      if (JSON.stringify(state.present) === JSON.stringify(action.placements))
        return state;
      return {
        past: [...state.past, state.present].slice(-100),
        present: action.placements,
        future: [],
      };
    case "undo":
      return state.past.length
        ? {
            past: state.past.slice(0, -1),
            present: state.past.at(-1)!,
            future: [state.present, ...state.future],
          }
        : state;
    case "redo":
      return state.future.length
        ? {
            past: [...state.past, state.present],
            present: state.future[0],
            future: state.future.slice(1),
          }
        : state;
  }
}
