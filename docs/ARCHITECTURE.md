# Technical architecture

## Stack and boundaries
React + strict TypeScript + Vite; PDF.js for rendering and viewport transforms; pdf-lib for embedding signature images in original document bytes; signature_pad for stroke capture; Vitest for units/integration and Playwright or equivalent for browser tests. Bundle the PDF worker and any font assets locally. Use standard CSS or existing styling conventions for the approved UI.

Suggested directories (adapt to existing workspace):
```
src/
  app/             session orchestration
  components/      replaceable functional UI
  features/pdf/    loading, inspection, rendering, viewport adapter
  features/signature/ creation and asset preparation
  features/editor/ reducer, commands, history, placement interactions
  features/export/ PDF export service
  lib/             geometry, validation, resource cleanup
  types/           shared domain contracts
 tests/            fixtures, integration and browser scenarios
```

## Domain model
```ts
type SignatureAsset = { id: string; png: Uint8Array; width: number; height: number };
type Placement = { id: string; assetId: string; pageIndex: number;
  x: number; y: number; width: number; height: number };
```
Page index is zero-based. Placement rect uses logical scale-1 PDF.js viewport coordinates, origin at visible top-left, after applying the page's intrinsic rotation and crop box. Dimensions are independent of display zoom and device pixel ratio; do not mix raster pixels with CSS pixels. Page metadata includes the actual scale-1 viewport, dimensions and transform. Asset bytes are immutable and shared by placements. State holds document metadata, placements, selected page/placement, revision and history; keep heavy bytes/render handles out of history snapshots.

## Coordinate contract
- Render each page with a PDF.js viewport using its intrinsic rotation; use CSS dimensions for overlay, high-DPI backing store only for canvas rendering.
- Translate pointer coordinates relative to the page overlay bounding rect into scale-1 viewport coordinates using its actual displayed dimensions. Clamp movement and proportional resizing to visible page bounds; reject zero/nonfinite rects. Use pointer capture and commit history once per gesture.
- Use the scale-1 viewport's inverse transform (`convertToPdfPoint`) to map all four corners of each signature rectangle to PDF user space. For embedding, use mapped bottom-left as anchor, vector from bottom-left to bottom-right as image width/direction, and bottom-left to top-left as height/direction. Compute positive lengths and image rotation with atan2 of the width vector; confirm orthogonality and orientation. Account for crop offsets, page rotation and UserUnit via actual transforms, not assumptions about page boxes. Verify pdf-lib drawing semantics with fixture tests, including angle sign and origin.
- Do not use only `pageHeight - y`; it fails on rotated/cropped pages. Do not mutate original page rotation to simplify export. Unsupported transforms must produce a clear error, not a misplaced signature.

## Export pipeline
Read original bytes into independent copies as needed (PDF.js may transfer its input to a worker). Load fresh pdf-lib document from original bytes for each export. Embed each unique asset once; draw placements on assigned pages in array order; save bytes and create browser Blob/download URL. Export a consistent immutable snapshot. Do not modify source bytes or rasterize source pages. Release URL after download initiation with a safe delay or on cleanup. Return explicit errors for unsupported or unreadable PDFs. Repeated exports must not accumulate previous exports' signatures.

## Signature processing
Use transparent PNG as canonical asset (JPEG is decoded and normalized). Preserve aspect ratio and alpha; trim excess transparent margins on drawn/typed assets with padding; reject blank drawing or whitespace-only typed signature. Render typed signatures only after local font readiness; use licensed bundled fonts and include notices. Limit decoded image resources (proposed: 16 megapixels and 8192 px per edge) and downscale normalized assets when appropriate. JPEG backgrounds remain opaque unless separately implemented and explicitly disclosed.

## Session and resource management
Use a reducer/command history for committed changes; transient drag state does not fill history. Suggested cap: 100 undo steps. Clear history on document replacement; retain referenced assets until no longer needed by current state/history. Cancel stale loading and render tasks, destroy PDF.js documents/workers when safe, release canvas/image resources and URLs. Handle failed loads without silently discarding current session. Render only needed pages at sensible resolution; no thumbnail sidebar is required. Never persist raw data or send it through logs, analytics or network. Runtime static asset fetching is permitted; remote fonts/CDNs are not.

## Security and limitations
Validate size and content parsing, treat PDFs/images as untrusted, never inject document-derived HTML, disable PDF scripting/actions and avoid exposing external document links in viewer. Use maintained dependency versions. Local processing reduces remote disclosure but is not a guarantee against compromised browsers/devices. Detect encrypted PDFs and recognizable existing signature fields; document detection limitations. PDF export may alter metadata, interactive forms or advanced structures; do not imply byte-for-byte preservation. No cryptographic signing or verification implemented.
