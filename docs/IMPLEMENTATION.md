# Implementation plan

Execute in one Codex task where feasible. This is sequencing, not a request to pause for review between steps.

1. Inspect repository and environment. Initialize only if needed; select compatible stable dependencies and configure TypeScript, Vite, linting and test runner. Configure a local PDF.js worker. Record actual versions and commands.
2. Establish domain types, validation, PDF loading and rendering. Build synthetic fixtures for ordinary, mixed-size, rotated, cropped and malformed PDFs. Keep original bytes separate from worker-owned buffers.
3. Implement geometry adapter and unit tests before placement UI. Verify viewport/PDF round trips and export transforms for all four orthogonal rotations and nonzero crop origins.
4. Implement signature creation and normalization: drawing, typed font variants and image import. Include locally licensed fonts and attribution.
5. Implement editor reducer, placement commands, bounded gestures, history and page navigation/zoom. Implement the approved UI and UX in UI-DESIGN.md.
6. Implement export and integration tests; render exported PDFs and check visible marks, not only file existence. Handle errors and resource cleanup.
7. Exercise full workflow in browser at desktop and mobile dimensions when available. Verify pointer/touch/keyboard paths, runtime privacy and negative cases.
8. Run typecheck, lint, unit/integration tests, E2E tests if available, and production build. Fix issues and rerun affected checks. Inspect production build worker/font loading.
9. Update README with real commands, architecture notes, test results, known limitations and any deviations. Provide owner a concise handoff.

## Handoff report template
- Implemented features and key files
- Setup/run commands and environment versions
- Actual check results (command, pass/fail, counts when known)
- Browser workflow verification and fixture coverage
- Unverified scenarios and remaining defects
- Deviations from specifications and reasons
- Material deviations from the approved UI

## Phase boundary
Do not deploy or publish. Implement the approved polished minimalist utility only; no marketing, extra screens or custom brand artwork required.
