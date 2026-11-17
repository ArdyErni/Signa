import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LockKeyhole,
  Plus,
  Redo2,
  ShieldCheck,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Scan,
  Check,
  X,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { SignatureDialog } from "../components/SignatureDialog";
import { PdfPage } from "../components/PdfPage";
import { emptyEditor, editorReducer } from "../features/editor/state";
import { bound } from "../lib/geometry";
import type { Asset, Placement, Session } from "../types";
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [{ assets, history }, dispatch] = useReducer(editorReducer, emptyEditor),
    [selected, setSelected] = useState<string | null>(null),
    [page, setPage] = useState(0),
    [zoom, setZoom] = useState(1),
    [fit, setFit] = useState(true),
    [available, setAvailable] = useState(800),
    [modal, setModal] = useState<"privacy" | "signature" | "discard" | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [exported, setExported] = useState("[]"),
    [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    workspace = useRef<HTMLDivElement>(null),
    pending = useRef<(() => void) | null>(null),
    sessionRef = useRef<Session | null>(null),
    urls = useRef(new Set<string>()),
    mounted = useRef(true);
  const placements = history.present,
    dirty = JSON.stringify(placements) !== exported;
  const reportError = useCallback((message: string) => setError(message), []);
  useEffect(() => {
    mounted.current = true;
    const activeUrls = urls.current;
    return () => {
      mounted.current = false;
      void sessionRef.current?.pdf.destroy();
      for (const url of activeUrls) URL.revokeObjectURL(url);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const node = workspace.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) =>
      setAvailable(Math.max(100, entries[0].contentRect.width - 48)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [session]);
  const currentZoom =
    session && fit
      ? Math.min(1.5, available / session.pages[page].width)
      : zoom;
  const commit = (items: Placement[]) =>
    dispatch({ type: "commit", placements: items });
  const change = (p: Placement) =>
    commit(placements.map((item) => (item.id === p.id ? p : item)));
  const remove = () => {
    commit(placements.filter((p) => p.id !== selected));
    setSelected(null);
  };
  const duplicate = () => {
    const p = placements.find((p) => p.id === selected);
    if (!p || !session) return;
    const next = {
      ...p,
      ...bound({ ...p, x: p.x + 18, y: p.y + 18 }, session.pages[p.pageIndex]),
      id: crypto.randomUUID(),
    };
    commit([...placements, next]);
    setSelected(next.id);
    setToast("Signature duplicated.");
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        modal ||
        busy ||
        exporting ||
        !session ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;
      if (
        (e.ctrlKey || e.metaKey) &&
        ["z", "y"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        dispatch({
          type: e.key.toLowerCase() === "y" || e.shiftKey ? "redo" : "undo",
        });
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function guard(action: () => void) {
    if (dirty) {
      pending.current = action;
      setModal("discard");
    } else action();
  }
  async function open(file: File) {
    if (busy || exporting) return;
    setBusy(true);
    setError("");
    try {
      const { loadPdf } = await import("../features/pdf/load");
      const next = await loadPdf(file);
      if (!mounted.current) {
        await next.pdf.destroy();
        return;
      }
      const old = sessionRef.current;
      sessionRef.current = next;
      setSession(next);
      dispatch({ type: "reset" });
      setExported("[]");
      setSelected(null);
      setPage(0);
      setFit(true);
      if (old) void old.pdf.destroy();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function close() {
    const old = sessionRef.current;
    sessionRef.current = null;
    setSession(null);
    dispatch({ type: "reset" });
    setExported("[]");
    setSelected(null);
    setError("");
    if (old) void old.pdf.destroy();
  }
  async function download() {
    if (!session || exporting) return;
    setExporting(true);
    setError("");
    const snapshot = placements;
    try {
      const { exportPdf, signedFilename } =
        await import("../features/export/export");
      const bytes = await exportPdf(session, snapshot, assets);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      urls.current.add(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = signedFilename(session.name);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }, 30000);
      setExported(JSON.stringify(snapshot));
      setToast("Download initiated. Your signed copy is ready.");
    } catch (e) {
      setError(
        `Could not export this PDF. ${(e as Error).message} Your edits are still here; you can retry.`,
      );
    } finally {
      setExporting(false);
    }
  }
  function add(asset: Asset) {
    if (!session) return;
    const info = session.pages[page];
    const width = Math.min(190, info.width * 0.45),
      height = (width * asset.height) / asset.width;
    const p = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      pageIndex: page,
      ...bound(
        { x: (info.width - width) / 2, y: info.height * 0.45, width, height },
        info,
      ),
    };
    dispatch({ type: "commit", placements: [...placements, p], asset });
    setSelected(p.id);
    setModal(null);
    setToast("Signature added. Drag to position or use arrow keys.");
  }
  function adjustZoom(delta: number) {
    setZoom(Math.max(0.2, Math.min(3, currentZoom + delta)));
    setFit(false);
  }
  return (
    <div className={`app ${session ? "editor" : ""}`}>
      <input
        ref={picker}
        className="visually-hidden"
        aria-label="Choose PDF document"
        type="file"
        accept="application/pdf,.pdf"
        disabled={busy || exporting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file)
            guard(() => {
              void open(file);
            });
        }}
      />
      <header className="header">
        <button
          className="wordmark"
          aria-label={session ? "Close document and return home" : "Signa home"}
          disabled={busy || exporting}
          onClick={() => {
            if (session) guard(close);
          }}
        >
          signa<span>.</span>
        </button>
        {session ? (
          <>
            <div className="document-name">
              <FileText size={17} />
              <span title={session.name}>{session.name}</span>
              <button
                className="icon-button"
                aria-label="Replace document"
                title="Replace document"
                disabled={busy || exporting}
                onClick={() => picker.current?.click()}
              >
                <Upload size={17} />
              </button>
            </div>
            <button
              className="primary download"
              disabled={!placements.length || busy || exporting}
              onClick={() => void download()}
            >
              <Download size={17} />
              <span>{exporting ? "Preparing…" : "Download"}</span>
            </button>
          </>
        ) : (
          <button
            className="privacy-button"
            onClick={() => setModal("privacy")}
          >
            <ShieldCheck size={17} />
            Privacy
          </button>
        )}
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-bar" role="status">
          <span className="spinner" />
          Opening document…
        </div>
      )}
      {!session ? (
        <>
          <main className="upload-main">
            <div className="intro">
              <div className="eyebrow">
                <span />
                Simple. Private. Yours.
              </div>
              <h1>
                Sign your
                <br />
                <em>documents.</em>
              </h1>
              <p>Upload, sign, and download. It's that simple.</p>
            </div>
            <div
              className={`dropzone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("Files")) {
                  e.preventDefault();
                  setDragging(true);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const files = e.dataTransfer.files;
                if (files.length !== 1) {
                  setError("Choose one PDF at a time.");
                  return;
                }
                if (files[0]) void open(files[0]);
              }}
            >
              <div className="file-symbol">
                <FileText size={30} strokeWidth={1.4} />
                <span>PDF</span>
              </div>
              <h2>Your signature starts here</h2>
              <p>Drop your PDF here, or browse your files.</p>
              <button
                className="primary choose"
                disabled={busy}
                onClick={() => picker.current?.click()}
              >
                Choose document
                <ArrowUpRight size={17} />
              </button>
              <span className="file-limit">PDF documents · up to 50 MiB</span>
            </div>
            <p className="reassurance">
              <LockKeyhole size={14} />
              Your files never leave your device.
            </p>
          </main>
          <footer>
            <span>Made for the moments that need your signature.</span>
            <span>Visual electronic signatures only.</span>
          </footer>
        </>
      ) : (
        <>
          <div className="toolbar" role="toolbar" aria-label="Document tools">
            <button
              className="add-button"
              disabled={busy || exporting}
              onClick={() => setModal("signature")}
            >
              <Plus size={18} />
              Add signature
            </button>
            <div className="toolbar-group">
              <button
                className="icon-button"
                title="Undo (Ctrl/Cmd+Z)"
                aria-label="Undo"
                disabled={!history.past.length || busy || exporting}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 size={19} />
              </button>
              <button
                className="icon-button"
                title="Redo (Ctrl/Cmd+Shift+Z)"
                aria-label="Redo"
                disabled={!history.future.length || busy || exporting}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 size={19} />
              </button>
            </div>
            <div className="toolbar-group zoom-tools">
              <button
                className="icon-button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => adjustZoom(-0.15)}
                disabled={currentZoom <= 0.2}
              >
                <ZoomOut size={18} />
              </button>
              <span className="zoom-label">
                {Math.round(currentZoom * 100)}%
              </span>
              <button
                className="icon-button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => adjustZoom(0.15)}
                disabled={currentZoom >= 3}
              >
                <ZoomIn size={18} />
              </button>
              <button
                className="fit-button"
                aria-label="Fit width"
                title="Fit width"
                aria-pressed={fit}
                onClick={() => setFit(true)}
              >
                <Scan size={16} />
                <span>Fit width</span>
              </button>
            </div>
          </div>
          <main
            className="workspace"
            ref={workspace}
            aria-label="PDF editor"
            onPointerDown={(event) => {
              if (
                event.target instanceof HTMLElement &&
                (event.target === event.currentTarget ||
                  event.target.classList.contains("page-stage"))
              )
                setSelected(null);
            }}
          >
            <div className="page-stage">
              <PdfPage
                key={session.name + session.pdf.fingerprints[0] + ":" + page}
                session={session}
                pageIndex={page}
                zoom={currentZoom}
                placements={placements}
                assets={assets}
                selected={selected}
                onSelect={setSelected}
                onChange={change}
                onDuplicate={duplicate}
                onDelete={remove}
                onError={reportError}
              />
            </div>
          </main>
          <div className="page-navigation">
            <span className="editor-hint">
              {placements.length
                ? `${placements.length} signature${placements.length === 1 ? "" : "s"} · ${dirty ? "Unsaved changes" : "Download initiated"}`
                : "Add a signature to get started"}
            </span>
            <nav aria-label="Page navigation">
              <button
                className="icon-button"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => {
                  setPage(page - 1);
                  setSelected(null);
                }}
              >
                <ChevronLeft size={19} />
              </button>
              <span>
                Page <strong>{page + 1}</strong> of {session.pages.length}
              </span>
              <button
                className="icon-button"
                aria-label="Next page"
                disabled={page === session.pages.length - 1}
                onClick={() => {
                  setPage(page + 1);
                  setSelected(null);
                }}
              >
                <ChevronRight size={19} />
              </button>
            </nav>
            <button
              className="text-button editor-privacy"
              onClick={() => setModal("privacy")}
            >
              <LockKeyhole size={13} />
              Local only
            </button>
          </div>
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal === "signature" && (
        <SignatureDialog onClose={() => setModal(null)} onAdd={add} />
      )}
      {modal === "privacy" && (
        <Modal
          title="Your documents stay yours."
          onClose={() => setModal(null)}
        >
          <div className="privacy-content">
            <p>
              Signa processes your PDF and signature entirely in this browser.
              There are no document uploads, accounts, analytics, cookies or
              saved signature libraries.
            </p>
            <p>
              Closing or refreshing clears your session. Download a copy to keep
              your work. Local processing cannot protect against a compromised
              browser or device.
            </p>
            <p className="small muted">
              Signa adds visual electronic signatures, not certificate-backed
              digital signatures. Encrypted and identifiable digitally signed
              PDFs are refused. Advanced PDF features may change on export;
              review your downloaded copy.
            </p>
          </div>
          <div className="dialog-actions">
            <button className="primary" onClick={() => setModal(null)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
      {modal === "discard" && (
        <Modal
          title="Discard your changes?"
          onClose={() => {
            pending.current = null;
            setModal(null);
          }}
        >
          <p>
            You have changes that haven't been downloaded. Download your signed
            copy first if you want to keep them.
          </p>
          <div className="dialog-actions">
            <button
              onClick={() => {
                pending.current = null;
                setModal(null);
              }}
            >
              Keep editing
            </button>
            <button
              className="danger"
              onClick={() => {
                const action = pending.current;
                pending.current = null;
                setModal(null);
                action?.();
              }}
            >
              Discard changes
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
