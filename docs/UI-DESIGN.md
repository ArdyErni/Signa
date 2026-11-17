# UI design — approved launch specification

Build a single-page, light-mode utility, not a marketing site or dashboard. Use the portfolio-derived visual identity and three approved interface states. No thumbnail sidebar, separate success page, navigation menu, testimonials or feature sections.

## Layout
- Upload state: slim header with green `signa.` wordmark left and Privacy action right (opens a short accessible local-processing explanation). Center a compact hero, “Sign your documents.” with green emphasis, “Upload, sign, and download. It's that simple.”, dashed upload area, PDF icon, browse button “Choose document”, and privacy reassurance “Your files never leave your device.” Minimal footer. Keep generous whitespace; use actual limits in helper copy (50 MiB).
- Editor state: replace the upload view. Header contains wordmark/home action, truncated filename and primary Download button. Below, compact toolbar with Add signature, undo/redo, zoom out/in and fit width. Central scrollable neutral canvas with one centered white PDF page and restrained shadow. Bottom navigation with previous/next and “Page X of Y”; no thumbnails. Selected signature has thin green outline, corner resize handles and compact contextual duplicate/delete tools. Clicking outside deselects. Download stays visible and is disabled until a valid placement exists.
- Signature dialog: centered accessible modal with title, close action, Draw/Type/Upload tabs, active underline, white input/preview surface, black/blue/dark gray ink choices for draw/type, Clear where relevant, Cancel and Add signature. Type offers three locally bundled handwriting styles; Upload shows preview and limits. Keep image colors unchanged. Blank input disables Add signature. Insert on active page in an obvious bounded position, select it, then allow adjustment.
- Responsive: use fluid width, max-width upload area around 390–440px, compact wrapping toolbar, accessible touch targets (44 CSS px where practical), and dialog constrained to viewport with internal scrolling. Allow the PDF canvas itself to scroll at high zoom; avoid body-wide overflow. Keep export and page controls reachable. Fit width on initial mobile load. No extra mobile navigation shell.

## Interaction and feedback
- Use 150–200ms color/opacity transitions, subdued hover/pressed/focus states, and respect prefers-reduced-motion. Do not introduce artificial delays or animation that obstructs editing.
- Drag/drop highlight only for relevant file interactions; explicit file picker as alternative. Show real loading state during document parse/render/export, using spinner or simple skeleton; disable duplicate export requests. Preserve old session on failed replacement.
- Provide useful inline actionable errors and concise toasts for signature added, download initiated, and relevant errors. Success copy must not imply disk save verification. Auto-dismiss noncritical success messages; persistent actionable errors remain available. Announce status with appropriate live regions.
- Select, drag, proportionally resize, duplicate and delete with mouse/touch/stylus where applicable. Keep placement inside visible page bounds; use pointer capture and cancel safely. Offer keyboard selection, arrow-key movement, accessible size controls, Delete/Backspace, Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (and Ctrl+Y where appropriate). Do not intercept editing shortcuts in text inputs. Tooltips and accessible names for icon-only controls. Avoid accidental page scrolling while manipulating a signature, but preserve normal scrolling elsewhere.
- Dialogs trap focus, close on Escape when safe, and restore focus. Confirm only dirty document close/replacement; offer Keep editing and Discard changes. Preserve edits after failed export; no persistent recovery storage. Browser unload warning best effort.
- Use real controls, semantic markup, visible focus and non-color-only state cues. No mock functionality. No third-party runtime fonts, trackers or document uploads.

## Approved reference direction: color and typography
Colors sampled from the provided portfolio screenshot (RGB pixels, not original CSS):

| CSS token | Hex | Role |
|---|---|---|
| --color-primary | #08723B | Primary actions, emphasis, focus accents |
| --color-background | #FAFBFA | Main canvas |
| --color-surface | #F9FAF9 | Alternate neutral surface |
| --color-text | #222522 | Headings |
| --color-body | #3B3F3B | Body text |
| --color-muted | #5B625B | Secondary text |
| --color-border | #DEE3DE | Subtle separators |
| --color-primary-soft | #D9F2E3 | Soft green accents |

Typography: the screenshot features a modern sans-serif, bold headings, medium-weight secondary headings and regular body copy. Exact font cannot be established from a raster screenshot. Use locally bundled Manrope as a provisional visual match, with system sans-serif fallback; replace with the actual portfolio font if the owner supplies it. Suggested scale: body 16px/1.6 weight 400, labels 14px weight 600, secondary headings 22px weight 600, primary headings weight 700–800 with tight tracking. Final heading sizes depend on layout. Do not use this typeface to constrain handwritten signature choices.

Centralize tokens in CSS custom properties. Use accessible text contrast, visible keyboard focus and non-color-only status cues. Keep PDF page content white and unthemed. No external runtime font requests. Use the approved layout below; final custom logo artwork is out of scope.

Portfolio screenshot for visual reference: `docs/reference/portfolio.png` (do not reproduce the portfolio layout or include its personal content in the product).
