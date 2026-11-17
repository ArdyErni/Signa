import type { Asset } from "../../types";
import { emptyHistory, historyReducer, type Action, type History } from "./history";

export type EditorState = { history: History; assets: Map<string, Asset> };
export const emptyEditor: EditorState = { history: emptyHistory, assets: new Map() };
type EditorAction = Action | (Extract<Action, { type: "commit" }> & { asset?: Asset });

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "reset") return emptyEditor;
  const history = historyReducer(state.history, action);
  const referenced = new Set(
    [...history.past, history.present, ...history.future].flatMap(
      (snapshot) => snapshot.map((p) => p.assetId),
    ),
  );
  const added = action.type === "commit" && "asset" in action ? action.asset : undefined;
  const assets = new Map(state.assets);
  if (added) assets.set(added.id, added);
  for (const id of assets.keys()) if (!referenced.has(id)) assets.delete(id);
  return { history, assets };
}
