# Signa

A browser-only utility for applying visual electronic signatures to PDFs. React, strict TypeScript, Vite, PDF.js, pdf-lib and signature_pad. No server, accounts, analytics, cookies, document uploads or persistent document/signature storage.

**Status:** v1.0.0 release candidate stabilized locally on 2026-11-17. The owner subsequently reported nine dependency vulnerabilities (one low, seven moderate, one high). Refinement 003 investigated compatible patches, but registry `EACCES` prevented audit retrieval and dependency updates; security remediation and unrestricted release approval remain pending. See [dependency security](docs/DEPENDENCY-SECURITY.md) and [verification](docs/VERIFICATION.md) for actual results and limitations. Nothing has been deployed or published.

## Local setup

Node 24.13.0 and npm 10.8.3 were available during implementation. Use Node 22.12+ (24 LTS recommended).

```powershell
cd D:\Signa
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). Installation requires access to the npm registry. `postinstall` copies PDF.js character maps, standard fonts, WASM and font license notices into `public/`; the worker and application fonts are bundled by Vite. No CDN assets are used at runtime.

Dependencies and `package-lock.json` are present. Use `npm ci` to retain the locked dependency graph; a fresh clean installation was not repeated during stabilization because registry access is restricted.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run check:core
npm.cmd audit --json
```

`npm.cmd run check:core` runs dependency-free geometry/history checks on Node 22.18+; it does not establish PDF or browser correctness. Playwright starts and stops its own local Vite server. `dist/` is production output only after a successful build. Do not use partial output from failed builds.

If managed Chromium cannot be downloaded and Chrome is installed, the committed suite supports this explicit PowerShell alternative:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e -- --workers=2
```

This was the browser configuration used for the passing stabilization run. No temporary test rewrites are required. Unset `PLAYWRIGHT_CHANNEL` to return to managed Chromium.

## Implemented source

- Minimal upload view, editor and signature dialog with the approved green palette, local Manrope typography, responsive controls and reduced motion support.
- Select/drop PDF validation (50 MiB), PDF.js rendering, page navigation, fit width and zoom; original bytes retained separately from worker buffers.
- Draw, type in three local handwriting styles, or import PNG/JPEG (10 MiB, 8192 px per edge, 16 MP). Transparent canonical PNG assets; typed/drawn whitespace trimmed.
- Independent signatures on multiple pages, selection, pointer capture, proportional corner resizing, duplicate/delete, arrow movement and accessible size controls.
- Undo/redo (100 committed steps); one pointer gesture is one history operation. Keyboard shortcuts, native modal focus containment/restoration and dirty-document guards.
- Signature preparation ignores superseded results; drawing survives canvas resizing. Placement gestures are isolated by pointer ID. Unreferenced assets are pruned after they leave current, undo and redo state.
- Fresh original-byte PDF export for every snapshot, mapped through actual page viewport transforms; new `-signed.pdf` filenames and download-initiation feedback. Errors preserve edits.

## Architecture

`src/app/App.tsx` owns the in-memory session. `features/pdf` owns inspection/loading, `components/PdfPage.tsx` owns rendering and pointer interaction, `lib/geometry.ts` owns bounds and inverse transforms, `features/editor` owns history and asset retention, `features/signature` normalizes assets, and `features/export` embeds images. PDF loading/export modules are loaded on demand. UI never rasterizes source PDF pages for export.

Placement coordinates use the intrinsic-rotation/crop-aware PDF.js scale-1 viewport. Export maps all four corners back to PDF user space, derives image rotation and positive dimensions, and rejects unsupported transforms. Display zoom and device pixel ratio do not enter exported coordinates.

## Limitations and safety boundaries

This creates visual electronic signatures, not cryptographic signatures or legal-compliance guarantees. Encrypted PDFs, identifiable digital signature dictionaries/fields, XFA and PDF portfolios are refused. Detection cannot prove the absence of every digital signature. Advanced metadata, forms, annotations and unusual PDF structures are not guaranteed to survive every pdf-lib rewrite; review the downloaded copy.

No recovery after refresh or close. Browser unload warnings and download completion are browser-controlled. Assets remain only while current state or undo/redo history references them; close/replacement resets that state and destroys the old PDF.js document. Only the active page is rendered. Modern browsers with native `dialog`, Pointer Events, ResizeObserver and image decoding are required.

Chromium-family browser checks cover the signing journey, responsive editor, pointer interaction and rendered PDF exports. Physical touch/stylus devices, Safari/Firefox, full screen-reader acceptance and all advanced PDF features remain unverified here. Signature-field inspection is structural detection, not cryptographic verification. See the acceptance matrix and measured performance in `docs/VERIFICATION.md`.

The authoritative requirements remain [AGENTS.md](AGENTS.md), [PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [implementation](docs/IMPLEMENTATION.md), [acceptance](docs/ACCEPTANCE.md) and [UI design](docs/UI-DESIGN.md). No deployment was performed.
