# Acceptance and test plan

All scenarios are proposed tests, not completed results. Use synthetic fixtures, never real sensitive documents or signatures.

| ID | Scenario | Expected result |
|---|---|---|
| A01 | Select/drop valid 1-page and multi-page PDFs | Pages open; source filename shown; original bytes retained. |
| A02 | Wrong file, empty/corrupt file, >50 MiB | Clear error; no crash or unintended session loss. |
| A03 | Encrypted/password-protected or identifiable already-signed PDF | Refused with explanation; no bypass. |
| A04 | Mixed page sizes and rotations; navigate and zoom/fit | Correct page previews; placements stay anchored; no raster/CSS coordinate mixup. |
| A05 | Draw with mouse and touch; clear; try blank | Smooth visible ink; blank cannot confirm; transparent asset. |
| A06 | Type name; select each of three local styles | Distinct previews and matching exported mark; whitespace-only rejected. |
| A07 | Import PNG alpha/JPEG; invalid, oversized or excessive dimensions | Supported images retain appearance; invalid inputs rejected safely. |
| A08 | Add, select, drag, resize at multiple zoom levels | Correct position and aspect ratio; stays within bounds. |
| A09 | Place signatures on different pages | Independent positions and correct page assignment. |
| A10 | Duplicate/delete placement | Correct independent duplicate and deletion. |
| A11 | Undo/redo add, move, resize, duplicate, delete | Exact restored state; new edit clears redo; one drag is one history step. |
| A12 | Export standard multipage fixture | Same page count/order and dimensions; source content retained; marks embedded visibly. |
| A13 | Export 0/90/180/270-degree pages and nonzero crop origins | Marks match preview location/orientation and dimensions. |
| A14 | Export after zoom and at device pixel ratios 1 and 2 | Same logical signature position; no duplication or clipping. |
| A15 | Export twice, then move/delete and re-export | No accumulation from earlier exports; current snapshot only; source unchanged. |
| A16 | Export success and injected export failure | Correct filename/MIME; clear state; failure preserves edits and allows retry. |
| A17 | Inspect browser requests and storage during entire journey | No document/signature transmission or persistence; only local static assets; resources cleaned on close/replacement. |
| A18 | Keyboard-only workflows; dialog focus and Escape; mobile touch | Core actions reachable, visible focus; usable interaction and feedback. |
| A19 | Replace/close dirty document, cancel then confirm; failed replacement | Cancellation preserves state; confirmation cleans resources; failed load does not silently wipe current session. |

| A20 | Upload/editor/modal visual review at desktop and mobile widths | Approved green palette, typography direction, minimal three-state layout, no sidebar/marketing/success screen; no body overflow; primary actions reachable. |
| A21 | Loading, empty, invalid, hover/focus and export states | Real feedback, no artificial delay, disabled invalid actions, accessible status announcements and retry without losing edits. |
| A22 | Keyboard shortcuts, selected mark tools, touch resize, reduced motion | Correct scoped shortcuts, focus restoration, bounded gestures and reduced motion behavior. |

## Geometry and export verification
Unit tests: coordinate round trips at multiple viewport transforms, movement/resize clamps, invalid values and aspect ratios. Target numerical round-trip error at most 0.01 logical viewport units. Integration tests: create PDFs with labeled reference marks and asymmetric transparent signature fixtures to reveal mirroring, rotation and alpha failures. Render resulting PDFs using PDF.js; compare detected signature bounds against intended preview coordinates at scale 2, with tolerance of 2 logical viewport units (4 rendered pixels), allowing antialiasing. Verify orientation using asymmetric marks. Include nonzero crop origin and mixed rotations; add non-default UserUnit fixture or document lack of support explicitly. Assert original source bytes unchanged and page boxes/rotation retained.

## Release gate
Core A01–A22 tests must pass or be explicitly flagged unverified/failed. Any known signature positioning error, corrupted export, or privacy violation blocks release. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and browser E2E when available. A green build alone does not satisfy the definition of done. Report observed results; no fabricated test badges or claims.
