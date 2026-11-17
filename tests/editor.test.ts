import { expect, it } from "vitest";
import { editorReducer, emptyEditor } from "../src/features/editor/state";
import type { Asset, Placement } from "../src/types";
const asset = (id: string): Asset => ({ id, png: new Uint8Array([1]), preview: "data:image/png;base64,AQ==", width: 1, height: 1 });
const placement = (id: string): Placement => ({ id, assetId: id, pageIndex: 0, x: 0, y: 0, width: 10, height: 10 });

it("retains assets through deletion, undo and redo, then prunes an abandoned future", () => {
  let state = editorReducer(emptyEditor, { type: "commit", placements: [placement("a")], asset: asset("a") });
  state = editorReducer(state, { type: "commit", placements: [] });
  expect(state.assets.has("a")).toBe(true);
  state = editorReducer(state, { type: "undo" });
  expect(state.history.present[0].assetId).toBe("a");
  expect(state.assets.has("a")).toBe(true);
  state = editorReducer(state, { type: "redo" });
  expect(state.history.present).toEqual([]);
  state = editorReducer(state, { type: "undo" });
  state = editorReducer(state, { type: "undo" });
  state = editorReducer(state, { type: "commit", placements: [placement("b")], asset: asset("b") });
  expect([...state.assets.keys()]).toEqual(["b"]);
  expect(state.history.future).toEqual([]);
});

it("prunes expired assets after repeated creation/deletion and clears everything on reset", () => {
  let state = emptyEditor;
  for (let i = 0; i < 160; i++) {
    const id = String(i);
    state = editorReducer(state, { type: "commit", placements: [placement(id)], asset: asset(id) });
    state = editorReducer(state, { type: "commit", placements: [] });
  }
  expect(state.history.past).toHaveLength(100);
  expect(state.assets.size).toBe(50);
  expect(state.assets.has("0")).toBe(false);
  for (let i = 0; i < 100; i++) {
    state = editorReducer(state, { type: "undo" });
    for (const p of state.history.present) expect(state.assets.has(p.assetId)).toBe(true);
  }
  for (let i = 0; i < 100; i++) {
    state = editorReducer(state, { type: "redo" });
    for (const p of state.history.present) expect(state.assets.has(p.assetId)).toBe(true);
  }
  state = editorReducer(state, { type: "reset" });
  expect(state.assets.size).toBe(0);
  expect(state.history).toEqual(emptyEditor.history);
});
