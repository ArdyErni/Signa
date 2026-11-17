# Product requirements

Status: approved MVP baseline.

## Purpose
Enable a person to open a PDF, create their own visual signature, place it on one or more pages, and save a new signed copy. No account or upload to a server is required.

## Scope
| ID | Requirement | Acceptance reference |
|---|---|---|
| R01 | Select or drop one PDF, up to 50 MiB (52,428,800 bytes); reject invalid, encrypted or unreadable files with actionable errors. | A01–A03 |
| R02 | Render pages including mixed sizes and rotations; navigate pages, zoom and fit width. | A04 |
| R03 | Draw with mouse, touch or stylus; clear strokes; choose black, blue or dark gray; prevent blank confirmation. | A05 |
| R04 | Type a name with three distinct locally available handwriting styles; preview before confirming. | A06 |
| R05 | Import PNG/JPEG signature images up to 10 MiB; validate decoding, cap decoded dimensions/pixel count, preserve PNG alpha. | A07 |
| R06 | Add multiple independent placements across pages; select, drag, proportionally resize, duplicate and delete; keep inside page bounds. | A08–A10 |
| R07 | Undo/redo committed placement operations; new edits discard redo history. | A11 |
| R08 | Export a new PDF with actual embedded images in the intended positions; retain original page content, order, dimensions and rotation where supported. | A12–A15 |
| R09 | Export as `<original-stem>-signed.pdf`; indicate pending, success (download initiated), or error. | A16 |
| R10 | Keep document and signature bytes local; no tracking or document persistence; release resources when session ends. | A17 |
| R11 | Provide keyboard operability, accessible error/status feedback, touch support, and unsaved-change confirmation when replacing/closing a document. | A18–A19 |

## User journey
Open document → inspect pages → create signature (draw/type/import) → place and adjust → optionally repeat → export → continue editing or close document.

## State and handling
One open document per session; no automatic recovery after reload. An export is a snapshot and does not close the session. On successful export, mark that revision exported; later edits mark it dirty again. Retain edits if export fails. Warn on in-app close/replacement when dirty; browser unload warning is best effort. Explicitly state export initiates a download, not that disk saving succeeded. Allow downloading the unchanged document only if clearly labeled; MVP signing export may require at least one placement.

## Non-goals
DOCX/images as source documents, OCR, text annotation, initials/date fields, PDF form editing, multiple signers, requests for signatures, cloud storage, tamper-evident workflows, certificate-backed signatures, legal/compliance claims, payment and user accounts. Existing digitally signed or encrypted PDFs are not supported for editing in this MVP; detect and refuse when identifiable, and disclose that modifying signed PDFs can invalidate signatures. Do not promise preservation of every advanced PDF feature.

## Success criteria
A user can finish the core journey without instructions, and exported signatures match preview positions within the testing tolerances in ACCEPTANCE.md. No production runtime requests transmit document or signature data. Implement the approved three-state minimalist UI in UI-DESIGN.md.
