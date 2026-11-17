import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Upload } from "lucide-react";
import { Modal } from "./Modal";
import {
  fromCanvas,
  importAsset,
  styles,
  typedAsset,
} from "../features/signature/assets";
import type { Asset } from "../types";
export function SignatureDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (asset: Asset) => void;
}) {
  const [tab, setTab] = useState("Draw"),
    [color, setColor] = useState("#171b18"),
    [name, setName] = useState(""),
    [font, setFont] = useState(styles[0]),
    [asset, setAsset] = useState<Asset | null>(null),
    [ink, setInk] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    pad = useRef<SignaturePad | null>(null),
    preparation = useRef(0);
  useEffect(() => () => { preparation.current++; }, []);
  const close = () => {
    preparation.current++;
    onClose();
  };
  useEffect(() => {
    if (tab !== "Draw" || !canvas.current) return;
    const c = canvas.current;
    const p = new SignaturePad(c, {
      penColor: color,
      minWidth: 1.1,
      maxWidth: 2.8,
    });
    let width = c.clientWidth, height = c.clientHeight;
    const resize = () => {
      const nextWidth = c.clientWidth, nextHeight = c.clientHeight;
      if (!nextWidth || !nextHeight) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(nextWidth * ratio);
      const pixelHeight = Math.round(nextHeight * ratio);
      if (c.width === pixelWidth && c.height === pixelHeight) return;
      const strokes = p.toData().map((group) => ({
        ...group,
        points: group.points.map((point) => ({ ...point,
          x: point.x * nextWidth / width, y: point.y * nextHeight / height,
        })),
      }));
      c.width = pixelWidth;
      c.height = pixelHeight;
      c.getContext("2d")!.setTransform(ratio, 0, 0, ratio, 0, 0);
      p.fromData(strokes);
      width = nextWidth;
      height = nextHeight;
      setInk(!p.isEmpty());
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    window.addEventListener("resize", resize);
    pad.current = p;
    const end = () => setInk(!p.isEmpty());
    p.addEventListener("endStroke", end);
    setInk(false);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      p.removeEventListener("endStroke", end);
      p.off();
      pad.current = null;
    };
    // Color changes update the existing pad without erasing strokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  useEffect(() => {
    if (pad.current) pad.current.penColor = color;
  }, [color]);
  useEffect(() => {
    if (tab !== "Type") return;
    const request = ++preparation.current;
    setAsset(null);
    setError("");
    setBusy(Boolean(name.trim()));
    if (name.trim())
      typedAsset(name, font, color)
        .then((a) => {
          if (request === preparation.current) setAsset(a);
        })
        .catch((e) => {
          if (request === preparation.current) setError(String(e));
        })
        .finally(() => {
          if (request === preparation.current) setBusy(false);
        });
    return () => {
      // This counter intentionally tracks the latest operation, not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (request === preparation.current) preparation.current++;
    };
  }, [tab, name, font, color]);
  const changeTab = (value: string) => {
    preparation.current++;
    setTab(value);
    setAsset(null);
    setError("");
    setInk(false);
    setBusy(false);
  };
  async function add() {
    try {
      setBusy(true);
      onAdd(tab === "Draw" ? fromCanvas(canvas.current!) : asset!);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Create your signature" onClose={close}>
      <p className="dialog-subtitle">
        A personal touch, ready for your document.
      </p>
      <div className="tabs" role="tablist" aria-label="Signature method">
        {["Draw", "Type", "Upload"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            aria-controls="signature-panel"
            id={`tab-${t}`}
            onClick={() => changeTab(t)}
            onKeyDown={(event) => {
              const tabs = ["Draw", "Type", "Upload"];
              const index = tabs.indexOf(t);
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 3
                  : event.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              changeTab(tabs[next]);
              document.getElementById(`tab-${tabs[next]}`)?.focus();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="signature-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "Draw" && (
          <>
            <div className="signature-surface">
              <canvas
                ref={canvas}
                className="drawing"
                aria-label="Draw your signature with a pointer"
              />
              <span className="baseline" />
              <span className="surface-hint">Sign here</span>
            </div>
            <div className="signature-options">
              <Colors color={color} onChange={setColor} />
              <button
                className="text-button"
                onClick={() => {
                  pad.current?.clear();
                  setInk(false);
                }}
              >
                Clear
              </button>
            </div>
            <p className="small muted">
              Use your mouse, finger or stylus. Prefer the keyboard? Choose
              Type.
            </p>
          </>
        )}
        {tab === "Type" && (
          <>
            <label className="field-label" htmlFor="signature-name">
              Your name
            </label>
            <input
              id="signature-name"
              autoComplete="off"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
            <div className="font-options" aria-label="Handwriting style">
              {styles.map((s, i) => (
                <button
                  key={s}
                  aria-pressed={font === s}
                  style={{ fontFamily: s }}
                  onClick={() => setFont(s)}
                >
                  Style {i + 1}
                </button>
              ))}
            </div>
            <div className="signature-surface type-preview">
              {asset ? (
                <img src={asset.preview} alt="Signature preview" />
              ) : (
                <span className="muted">Your signature will appear here</span>
              )}
            </div>
            <div className="signature-options">
              <Colors color={color} onChange={setColor} />
            </div>
          </>
        )}
        {tab === "Upload" && (
          <>
            <label className="image-upload">
              <Upload size={24} />
              <strong>Choose signature image</strong>
              <span className="small muted">PNG or JPEG · up to 10 MiB</span>
              <input
                aria-label="Choose signature image"
                type="file"
                accept="image/png,image/jpeg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const request = ++preparation.current;
                  setError("");
                  setAsset(null);
                  setBusy(true);
                  try {
                    const next = await importAsset(file);
                    if (request === preparation.current) setAsset(next);
                  } catch (err) {
                    if (request === preparation.current) setError((err as Error).message);
                  } finally {
                    if (request === preparation.current) setBusy(false);
                  }
                }}
              />
            </label>
            {asset && (
              <div className="signature-surface type-preview">
                <img src={asset.preview} alt="Uploaded signature preview" />
              </div>
            )}
            <p className="small muted">
              Maximum 8192 px per edge and 16 megapixels. PNG transparency is
              preserved; JPEG backgrounds stay opaque.
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button onClick={close}>Cancel</button>
        <button
          className="primary"
          disabled={busy || (tab === "Draw" ? !ink : !asset)}
          onClick={add}
        >
          {busy ? "Preparing…" : "Add signature"}
        </button>
      </div>
    </Modal>
  );
}
function Colors({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="colors" aria-label="Ink color">
      {[
        ["Black", "#171b18"],
        ["Blue", "#164ba1"],
        ["Dark gray", "#4b5150"],
      ].map(([name, value]) => (
        <button
          key={value}
          title={name}
          aria-label={`${name} ink`}
          aria-pressed={color === value}
          style={{ background: value }}
          onClick={() => onChange(value)}
        >
          {color === value ? "✓" : ""}
        </button>
      ))}
    </div>
  );
}
