import type { Placement } from "../types";
export type Rect = Pick<Placement, "x" | "y" | "width" | "height">;
export function bound(
  rect: Rect,
  page: { width: number; height: number },
): Rect {
  if (
    ![rect.x, rect.y, rect.width, rect.height, page.width, page.height].every(
      Number.isFinite,
    ) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    page.width <= 0 ||
    page.height <= 0
  )
    throw new Error("Invalid signature dimensions.");
  const ratio = Math.min(1, page.width / rect.width, page.height / rect.height);
  const width = rect.width * ratio,
    height = rect.height * ratio;
  return {
    x: Math.max(0, Math.min(rect.x, page.width - width)),
    y: Math.max(0, Math.min(rect.y, page.height - height)),
    width,
    height,
  };
}
export function imageTransform(
  rect: Rect,
  viewport: { convertToPdfPoint: (x: number, y: number) => number[] },
) {
  const bl = viewport.convertToPdfPoint(rect.x, rect.y + rect.height);
  const br = viewport.convertToPdfPoint(
    rect.x + rect.width,
    rect.y + rect.height,
  );
  const tl = viewport.convertToPdfPoint(rect.x, rect.y);
  const tr = viewport.convertToPdfPoint(rect.x + rect.width, rect.y);
  const ux = br[0] - bl[0],
    uy = br[1] - bl[1],
    vx = tl[0] - bl[0],
    vy = tl[1] - bl[1];
  const width = Math.hypot(ux, uy),
    height = Math.hypot(vx, vy);
  if (
    ![...bl, ...br, ...tl, ...tr, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    Math.abs(ux * vx + uy * vy) > width * height * 1e-6 ||
    ux * vy - uy * vx <= 0 ||
    Math.hypot(tr[0] - br[0] - vx, tr[1] - br[1] - vy) > 0.01
  )
    throw new Error("This PDF has an unsupported page transform.");
  return {
    x: bl[0],
    y: bl[1],
    width,
    height,
    angle: (Math.atan2(uy, ux) * 180) / Math.PI,
  };
}
