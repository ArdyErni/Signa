import { describe, it, expect } from "vitest";
import { bound, imageTransform } from "../src/lib/geometry";
import { emptyHistory, historyReducer } from "../src/features/editor/history";
describe("bounded signature rectangles", () => {
  it("clamps movement at every edge", () =>
    expect(
      bound(
        { x: -10, y: 400, width: 100, height: 50 },
        { width: 300, height: 200 },
      ),
    ).toEqual({ x: 0, y: 150, width: 100, height: 50 }));
  it("fits proportionally", () =>
    expect(
      bound(
        { x: 0, y: 0, width: 600, height: 400 },
        { width: 300, height: 300 },
      ),
    ).toEqual({ x: 0, y: 0, width: 300, height: 200 }));
  it.each([0, -1, NaN, Infinity])("rejects invalid width %s", (width) =>
    expect(() =>
      bound({ x: 0, y: 0, width, height: 20 }, { width: 100, height: 100 }),
    ).toThrow(),
  );
});
describe("export transform", () => {
  for (const rotation of [0, 90, 180, 270])
    for (const unit of [1, 2])
      it(`maps all corners at ${rotation} degrees, UserUnit ${unit}`, () => {
        const a = (rotation * Math.PI) / 180,
          c = Math.cos(a),
          s = Math.sin(a);
        const convertToPdfPoint = (x: number, y: number) => [
          20 + (c * x + s * y) / unit,
          30 + (s * x - c * y) / unit,
        ];
        const rect = { x: 21, y: 37, width: 102, height: 41 },
          v = { convertToPdfPoint };
        const t = imageTransform(rect, v);
        const theta = (t.angle * Math.PI) / 180;
        const expected = [
          convertToPdfPoint(rect.x, rect.y + rect.height),
          convertToPdfPoint(rect.x + rect.width, rect.y + rect.height),
          convertToPdfPoint(rect.x, rect.y),
          convertToPdfPoint(rect.x + rect.width, rect.y),
        ];
        const actual = [
          [t.x, t.y],
          [t.x + t.width * Math.cos(theta), t.y + t.width * Math.sin(theta)],
          [t.x - t.height * Math.sin(theta), t.y + t.height * Math.cos(theta)],
          [
            t.x + t.width * Math.cos(theta) - t.height * Math.sin(theta),
            t.y + t.width * Math.sin(theta) + t.height * Math.cos(theta),
          ],
        ];
        actual.forEach((p, i) =>
          p.forEach((value, j) =>
            expect(Math.abs(value - expected[i][j])).toBeLessThan(0.01),
          ),
        );
      });
  it("refuses skewed and reflected transforms", () => {
    expect(() =>
      imageTransform(
        { x: 0, y: 0, width: 10, height: 10 },
        { convertToPdfPoint: (x, y) => [x + y, -y] },
      ),
    ).toThrow();
    expect(() =>
      imageTransform(
        { x: 0, y: 0, width: 10, height: 10 },
        { convertToPdfPoint: (x, y) => [x, y] },
      ),
    ).toThrow();
  });
});
describe("command history", () => {
  const p = {
    id: "p",
    assetId: "a",
    pageIndex: 0,
    x: 1,
    y: 2,
    width: 30,
    height: 10,
  };
  it("undoes and redoes exact snapshots; edits clear redo", () => {
    const added = historyReducer(emptyHistory, {
      type: "commit",
      placements: [p],
    });
    const moved = historyReducer(added, {
      type: "commit",
      placements: [{ ...p, x: 20 }],
    });
    const undone = historyReducer(moved, { type: "undo" });
    expect(undone.present).toEqual([p]);
    expect(historyReducer(undone, { type: "redo" })).toEqual(moved);
    expect(
      historyReducer(undone, { type: "commit", placements: [] }).future,
    ).toEqual([]);
  });
  it("caps history at 100 and ignores unchanged commits", () => {
    let state = emptyHistory;
    for (let i = 0; i < 120; i++)
      state = historyReducer(state, {
        type: "commit",
        placements: [{ ...p, x: i }],
      });
    expect(state.past).toHaveLength(100);
    expect(
      historyReducer(state, { type: "commit", placements: state.present }),
    ).toBe(state);
    expect(historyReducer(state, { type: "reset" })).toEqual(emptyHistory);
  });
});
