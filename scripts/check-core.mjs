// Dependency-free fallback check. This does not replace the Vitest/export/browser suites.
import assert from "node:assert/strict";
import { bound, imageTransform } from "../src/lib/geometry.ts";
import {
  emptyHistory,
  historyReducer,
} from "../src/features/editor/history.ts";
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log(`PASS ${name}`);
}
check("movement clamps at all edges", () =>
  assert.deepEqual(
    bound(
      { x: -10, y: 400, width: 100, height: 50 },
      { width: 300, height: 200 },
    ),
    { x: 0, y: 150, width: 100, height: 50 },
  ),
);
check("oversized signature fits proportionally", () =>
  assert.deepEqual(
    bound({ x: 0, y: 0, width: 600, height: 400 }, { width: 300, height: 300 }),
    { x: 0, y: 0, width: 300, height: 200 },
  ),
);
for (const width of [0, -1, NaN, Infinity])
  check(`reject invalid width ${width}`, () =>
    assert.throws(() =>
      bound({ x: 0, y: 0, width, height: 20 }, { width: 100, height: 100 }),
    ),
  );
for (const rotation of [0, 90, 180, 270])
  for (const unit of [1, 2])
    check(`four corners at rotation ${rotation}, unit ${unit}`, () => {
      const a = (rotation * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a),
        convertToPdfPoint = (x, y) => [
          20 + (c * x + s * y) / unit,
          30 + (s * x - c * y) / unit,
        ];
      const r = { x: 21, y: 37, width: 102, height: 41 },
        t = imageTransform(r, { convertToPdfPoint }),
        theta = (t.angle * Math.PI) / 180;
      const expected = [
        convertToPdfPoint(r.x, r.y + r.height),
        convertToPdfPoint(r.x + r.width, r.y + r.height),
        convertToPdfPoint(r.x, r.y),
        convertToPdfPoint(r.x + r.width, r.y),
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
          assert.ok(Math.abs(value - expected[i][j]) < 0.01),
        ),
      );
    });
check("unsupported skew is refused", () =>
  assert.throws(() =>
    imageTransform(
      { x: 0, y: 0, width: 10, height: 10 },
      { convertToPdfPoint: (x, y) => [x + y, -y] },
    ),
  ),
);
check("history undo, redo, branch and limit", () => {
  const p = {
    id: "p",
    assetId: "a",
    pageIndex: 0,
    x: 1,
    y: 2,
    width: 30,
    height: 10,
  };
  const added = historyReducer(emptyHistory, {
      type: "commit",
      placements: [p],
    }),
    moved = historyReducer(added, {
      type: "commit",
      placements: [{ ...p, x: 20 }],
    }),
    undone = historyReducer(moved, { type: "undo" });
  assert.deepEqual(undone.present, [p]);
  assert.deepEqual(historyReducer(undone, { type: "redo" }), moved);
  assert.deepEqual(
    historyReducer(undone, { type: "commit", placements: [] }).future,
    [],
  );
  let state = emptyHistory;
  for (let i = 0; i < 120; i++)
    state = historyReducer(state, {
      type: "commit",
      placements: [{ ...p, x: i }],
    });
  assert.equal(state.past.length, 100);
});
console.log(
  `${checks} checks passed. Synthetic transform checks only; no real PDF rendering verified.`,
);
