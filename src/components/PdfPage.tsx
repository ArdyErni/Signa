import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Copy, Trash2, Minus, Plus } from "lucide-react";
import type { Asset, Placement, Session } from "../types";
import { bound } from "../lib/geometry";
export function PdfPage({
  session,
  pageIndex,
  zoom,
  placements,
  assets,
  selected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onError,
}: {
  session: Session;
  pageIndex: number;
  zoom: number;
  placements: Placement[];
  assets: Map<string, Asset>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (p: Placement) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onError: (message: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pageRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true),
    [transient, setTransient] = useState<Placement | null>(null);
  const gesture = useRef<{
    start: Placement;
    x: number;
    y: number;
    mode: string;
    corner: string;
    latest: Placement;
    target: HTMLElement;
    pointerId: number;
  } | null>(null);
  const info = session.pages[pageIndex];
  useEffect(() => {
    let cancelled = false;
    let task:
      | ReturnType<Awaited<ReturnType<typeof session.pdf.getPage>>["render"]>
      | undefined;
    session.pdf
      .getPage(pageIndex + 1)
      .then((page) => {
        if (cancelled) return;
        setRendering(true);
        const c = canvas.current!;
        const logical = page.getViewport({ scale: zoom });
        const ratio = Math.min(
          devicePixelRatio || 1,
          2,
          Math.sqrt(16000000 / (logical.width * logical.height)),
        );
        c.width = Math.ceil(logical.width * ratio);
        c.height = Math.ceil(logical.height * ratio);
        const renderOptions = {
          canvas: c,
          canvasContext: c.getContext("2d")!,
          viewport: logical,
          transform: [ratio, 0, 0, ratio, 0, 0],
        };
        task = page.render(renderOptions);
        return task.promise;
      })
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((e) => {
        if (!cancelled && e.name !== "RenderingCancelledException") {
          onError("Page preview failed. Try another page or reopen the PDF.");
          setRendering(false);
        }
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [session, pageIndex, zoom, onError]);
  function begin(
    e: PointerEvent<HTMLElement>,
    p: Placement,
    mode: string,
    corner = "se",
  ) {
    if (e.button !== 0 || gesture.current) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(p.id);
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      start: p,
      x: e.clientX,
      y: e.clientY,
      mode,
      corner,
      latest: p,
      target: e.currentTarget,
      pointerId: e.pointerId,
    };
  }
  function move(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    const box = pageRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - g.x) * info.width) / box.width,
      dy = ((e.clientY - g.y) * info.height) / box.height;
    let rect;
    if (g.mode === "move")
      rect = bound({ ...g.start, x: g.start.x + dx, y: g.start.y + dy }, info);
    else {
      const west = g.corner.includes("w"),
        north = g.corner.includes("n");
      const anchorX = west ? g.start.x + g.start.width : g.start.x,
        anchorY = north ? g.start.y + g.start.height : g.start.y;
      const change =
        (west ? -dx : dx) +
        ((north ? -dy : dy) * g.start.height) / g.start.width;
      const width = Math.max(
        Math.min(24, g.start.width),
        g.start.width + change / 2,
      );
      const maxWidth = Math.min(
        west ? anchorX : info.width - anchorX,
        ((north ? anchorY : info.height - anchorY) * g.start.width) /
          g.start.height,
      );
      const w = Math.min(width, maxWidth),
        h = (w * g.start.height) / g.start.width;
      rect = {
        x: west ? anchorX - w : anchorX,
        y: north ? anchorY - h : anchorY,
        width: w,
        height: h,
      };
    }
    const next = { ...g.start, ...rect };
    g.latest = next;
    setTransient(next);
  }
  function finish(pointerId: number, cancel = false) {
    const g = gesture.current;
    if (!g || pointerId !== g.pointerId) return;
    gesture.current = null;
    setTransient(null);
    if (g.target.hasPointerCapture(g.pointerId))
      g.target.releasePointerCapture(g.pointerId);
    if (!cancel) onChange(g.latest);
  }
  const resize = (p: Placement, factor: number) =>
    onChange({
      ...p,
      ...bound(
        { ...p, width: p.width * factor, height: p.height * factor },
        info,
      ),
    });
  return (
    <div
      className="pdf-page"
      ref={pageRef}
      style={{ width: info.width * zoom, height: info.height * zoom }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || e.target === canvas.current)
          onSelect(null);
      }}
    >
      <canvas ref={canvas} aria-label={`PDF page ${pageIndex + 1}`} />
      {rendering && (
        <div className="render-status" role="status">
          Rendering page…
        </div>
      )}
      {placements
        .filter((p) => p.pageIndex === pageIndex)
        .map((original) => {
          const p = transient?.id === original.id ? transient : original;
          const active = selected === p.id;
          return (
            <div
              key={p.id}
              className={`placement ${active ? "selected" : ""}`}
              style={{
                left: p.x * zoom,
                top: p.y * zoom,
                width: p.width * zoom,
                height: p.height * zoom,
              }}
            >
              <button
                className="signature-hit"
                aria-label="Signature placement"
                aria-pressed={active}
                onFocus={() => onSelect(p.id)}
                onPointerDown={(e) => begin(e, p, "move")}
                onPointerMove={move}
                onPointerUp={(e) => finish(e.pointerId)}
                onPointerCancel={(e) => finish(e.pointerId, true)}
                onLostPointerCapture={(e) => finish(e.pointerId, true)}
                onKeyDown={(e) => {
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                    const d = e.shiftKey ? 10 : 1;
                    onChange({
                      ...p,
                      ...bound(
                        {
                          ...p,
                          x:
                            p.x +
                            (e.key === "ArrowRight"
                              ? d
                              : e.key === "ArrowLeft"
                                ? -d
                                : 0),
                          y:
                            p.y +
                            (e.key === "ArrowDown"
                              ? d
                              : e.key === "ArrowUp"
                                ? -d
                                : 0),
                        },
                        info,
                      ),
                    });
                  }
                }}
              >
                <img
                  src={assets.get(p.assetId)?.preview}
                  alt=""
                  draggable={false}
                />
              </button>
              {active && (
                <>
                  <div
                    className={`placement-tools ${p.y * zoom < 56 ? "tools-below" : ""}`}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      title="Smaller signature"
                      aria-label="Smaller signature"
                      onClick={() => resize(p, 0.9)}
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      title="Larger signature"
                      aria-label="Larger signature"
                      onClick={() => resize(p, 1.1)}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      title="Duplicate signature"
                      aria-label="Duplicate signature"
                      onClick={onDuplicate}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      title="Delete signature"
                      aria-label="Delete signature"
                      onClick={onDelete}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {["nw", "ne", "sw", "se"].map((c) => (
                    <span
                      key={c}
                      className={`resize-handle ${c}`}
                      onPointerDown={(e) => begin(e, p, "resize", c)}
                      onPointerMove={move}
                      onPointerUp={(e) => finish(e.pointerId)}
                      onPointerCancel={(e) => finish(e.pointerId, true)}
                      onLostPointerCapture={(e) => finish(e.pointerId, true)}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
