# Release candidate verification — 2026-11-17

Signa v1.0.0 stabilization was verified locally on Windows with Node 24.13.0, npm 10.8.3, Vite 7.3.1, PDF.js 5.4.449, pdf-lib 1.17.1, signature_pad 5.1.4 and Playwright 1.59.1. Installed Chrome 157.0.8103.52 ran both desktop and Pixel 7 emulation projects. No deployment or publishing occurred.

The owner reports that their manual functional and UX tests passed, including oversized PDF rejection. The automated results below are separate observations from this stabilization run.

## Refinement 003 security status

The owner subsequently reported nine npm vulnerabilities: one low, seven moderate and one high. The remediation session could not retrieve either the full or production-only audit because registry requests fail with `EACCES`. Compatible targets Vite 7.3.8 and typescript-eslint 8.73.0 were evaluated using upstream metadata, but targeted installation failed. The root manifest, lockfile and application source remain unchanged. Clean `npm ci` in an isolated directory also failed after denied registry requests. These failures do not establish zero vulnerabilities or patched-release readiness.

On the unchanged graph, typecheck, lint, all 30 unit/integration tests, all 16 core checks, all 40 committed browser tests and production build passed again. The browser run used installed Chrome and two workers; Playwright exited zero after its stalled Vite cleanup was completed by stopping that run's server process. All 196 copied PDF.js assets and font licenses matched installed packages by SHA-256. These are baseline results, not patched-build acceptance. Earlier stabilization results below remain historical evidence. See [the dependency security report](DEPENDENCY-SECURITY.md) for dependency paths, version targets, advisory applicability and completion requirements.

## Before and after

| Check | Baseline before stabilization | Stabilized result |
| --- | --- | --- |
| `npm.cmd run typecheck` | Passed | Passed |
| `npm.cmd run lint` | Passed | Passed, zero errors/warnings |
| `npm.cmd test` | 19 tests passed, 2 files | 30 tests passed, 4 files |
| `npm.cmd run check:core` | 16 passed | 16 passed |
| `npm.cmd run build` | Passed; main chunk warning | Passed; no oversized application chunk warning |
| Committed browser suite | All 8 cases failed before assertions: missing managed Chromium | 40 tests passed using installed Chrome, no in-memory rewrites |
| `npm.cmd audit --json --cache .npm-cache` | Endpoint unavailable | Blocked: registry audit endpoint request still fails; no vulnerability verdict |
| Managed Chromium installation | Required executable absent | Blocked: download fails with network `EACCES` |

Reproduction commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run check:core
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e -- --workers=2
npm.cmd audit --json --cache .npm-cache
```

The successful browser run used `--output=.qa/rc-e2e --reporter=line --workers=2`. `PLAYWRIGHT_CHANNEL` selects an installed browser through the committed configuration; it does not rewrite tests. For ordinary managed Chromium, unset that variable and run `npx.cmd playwright install chromium` before the suite. Downloading into a workspace-local browser directory was attempted here and denied by network restrictions. A fresh `npm ci` was not performed during stabilization.

## Audit resolution

This table follows the owner's Refinement 002 numbering; QA-08 covers export-test strength, QA-09 asset lifetime, QA-10 pointer isolation and QA-11 background deselection.

| Finding | Resolution and evidence |
| --- | --- |
| QA-01 | Operation counters invalidate stale signature work on tab changes, image replacement and close/unmount. Browser regressions delay decoding, switch to Type, complete replacement images out of order, and close/reopen the dialog. Stale results cannot publish assets or reset the current busy/error state. |
| QA-02 | Iterative inspection traverses direct dictionaries, arrays, indirect references, stream dictionaries and field Parent/Kids relationships with identity-based cycle protection. Unit fixtures reject direct, indirect, inherited and nested signature markers, including an indirect FT value and ByteRange. An unsigned cyclic form terminates and remains accepted. This is structural detection, not cryptographic verification. |
| QA-03 | ResizeObserver and window resize handling resize the drawing bitmap and replay scaled stroke data with the current DPR transform. Browser tests retain visible ink across mobile, tablet and landscape sizes and successfully insert the result. |
| QA-04 | Fit width has permanent aria-label/title. Existing icon-only controls retain their labels. Responsive tests locate the named Fit width action at every requested width. |
| QA-05 | Selection uses an outline rather than a layout-changing border. Browser tests compare image/button bounds and compare downloaded colored mark bounds against the actual DOM preview at 20%, near-normal (110%) and 300% zoom, within 4 rendered pixels at scale 2. |
| QA-06 | Dialog confirmation selectors are scoped to the dialog, avoiding the editor's identically named Add signature button. |
| QA-07 | Manually created export-test contexts receive baseURL explicitly. |
| QA-08 | Export tests render signatures on all four rotations, nonzero crop origins and UserUnit=2 at DPR 1/2. They verify bounds, asymmetric orientation/colors, unchanged source bytes, page count, crop view/rotation/UserUnit, text content and unchanged pixels outside signature regions. Repeated exports retain operator counts. Moved marks have new bounds; deleted-page marks disappear and those pages match the original raster. |
| QA-09 | One editor reducer updates history and the asset map atomically. Assets are pruned only when absent from current, past and future snapshots. Tests create/delete 160 signatures, expire history, walk all available undo/redo steps, abandon redo branches and reset. Browser replacement clears placements and disables undo/redo; failed replacement retains edits. |
| QA-10 | Gesture start refuses a competing active gesture; move/up/cancel/lost-capture events require the active pointer ID. Browser tests inject foreign pointer events during a real mouse gesture, then verify the owning gesture still works and undoes once. Dragging and corner resizing are tested across zoom. |
| QA-11 | Bare workspace/page-stage pointer events deselect; document controls and placements remain independent. Browser tests check both background targets and ensure zoom controls preserve selection. |
| QA-12 | README, this verification record and third-party notice status now describe current results and remaining restrictions. |
| QA-13 | Measurements justified deferring PDF loading/export imports. The initial application chunk decreased from 1,076.40 KB (373.38 KB gzip) to 239.34 KB (75.87 KB gzip). PDF functionality still passes through normal UI and export tests. No broad optimization was performed. |

The mobile layout work from Refinement 001 is retained: <=600px uses primary logo/download and secondary filename/replace rows; <=760px uses an explicit two-row grouped toolbar without vertical dividers. Wider layouts use one toolbar row. Typography, colors and landing-page layout are unchanged.

## Browser and acceptance coverage

| Acceptance area | Verified here | Limits |
| --- | --- | --- |
| A01–A04: open/reject/render/navigate | Generated multipage/mixed-size fixture; all orthogonal rotations, crop origins and UserUnit; empty, corrupt and real >50 MiB files; failed replacement; structural signature rejection; mixed-page navigation | Not every producer/advanced PDF structure; encrypted fixture not exercised automatically; drag/drop selection not covered by the committed suite |
| A05–A07: signatures | Mouse drawing and resize preservation; Type workflow; PNG import and delayed decode races; local font loading in production smoke | Physical finger/stylus and full JPEG/resource-limit matrix not repeated in this run |
| A08–A11: placement/history | Selection, dragging, proportional corner resizing, zoom anchoring, duplicate/delete, independent pages, undo/redo, foreign-pointer isolation and asset expiration | Real multi-touch hardware and every corner/zoom combination are not exhaustively tested |
| A12–A16: export | Rendered pixel bounds/orientation, source geometry/content, original bytes, repeated/moved/deleted signatures, correct download filename; injected download-URL failure preserves edits and retries | Injection covers the browser download boundary; not every internal pdf-lib failure; browser download initiation does not prove disk saving |
| A17: privacy/resources | Request/storage checks in workflow and production smoke: local GET requests only; empty localStorage/sessionStorage/cookies; 196 PDF.js asset/font-license files match installed packages by SHA-256; reducer lifetime/reset checks | No exhaustive network/security proof or physical heap-recovery measurement; dependency advisory audit blocked |
| A18–A22: UX/accessibility/layout | Native-dialog Escape/focus restoration, placement keyboard movement, named controls, responsive groups, dirty guards, background deselection, 44px header/toolbar/navigation targets and no body overflow | Full screen-reader/keyboard-only journey, real touch/stylus, Safari/Firefox and reduced-motion visual acceptance not repeated automatically |

Layouts passed at **320, 360, 375, 390, 430, 768 and 1280 CSS px**, in both configured browser projects. Assertions cover filename truncation, intentional grouping, mobile header rows, removed cross-row dividers, reachable bottom navigation/document space and minimum 44px editor header/toolbar/navigation targets. The production build additionally completed upload → Type → parsed signed download at all seven widths with no page errors, horizontal body overflow, external requests or browser storage. Production screenshots at 390px and 768px were inspected locally.

The corner resize handles and contextual placement controls retain their existing dimensions; the 44px assertion applies to header, main toolbar and page navigation controls. High zoom intentionally permits scrolling inside the document workspace.

## Performance measurement

Run `node scripts/measure-startup.mjs` against a built local preview (default http://127.0.0.1:4175; override with SIGNA_PREVIEW_URL). Set PLAYWRIGHT_CHANNEL as above if using installed Chrome.

Conditions: cold browser contexts/cache, 390x844 viewport, 150 ms simulated network latency, 200,000 bytes/s download and CPU throttling x4 through Chrome DevTools Protocol. This is local synthetic data, not field Core Web Vitals or a production hosting benchmark.

- Before: recorded first-contentful-paint samples 2,808 / 2,808 ms; initial JavaScript resource body 373,382 bytes.
- After: 1,132 / 1,148 / 1,204 ms; initial JavaScript resource body 75,873 bytes. Median 1,148 ms, about 59% lower than the baseline; initial JavaScript body about 80% smaller.
- Deferred chunks are approximately 407.9 KB for loading, 428.7 KB shared PDF code and 0.69 KB export glue, before compression. The local worker remains approximately 1.07 MB. This work shifts PDF cost to document opening; it does not remove that cost. The 50 MiB limit and load/render feedback remain unchanged.

## Remaining release conditions

The earlier functional stabilization does not clear the owner's subsequently reported dependency vulnerabilities. Unrestricted release approval is blocked pending actual dependency remediation, successful full and production-only audits, clean installation and regression verification of the patched graph, plus review of the explicitly untested scenarios above. Do not interpret a failed audit request as zero vulnerabilities.

PDF signature-field recognition cannot prove the absence or validity of digital signatures. Advanced forms, annotations and metadata may change during pdf-lib export; review downloaded copies. Browser-controlled unload warnings, downloads and garbage collection retain their inherent limitations. There is no recovery storage, backend, analytics or deployment in this work.
