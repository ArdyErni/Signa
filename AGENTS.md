# Signa — repository instructions

## Mission
Build a browser-only tool for applying visual electronic signatures to PDFs. Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md`, and `docs/ACCEPTANCE.md` before changing code. Use `README.md` as the entry point.

## Current phase: complete MVP
The owner approved the minimalist upload screen, editor and signature modal plus basic UX. Implement `docs/UI-DESIGN.md` as the visual and interaction specification. No marketing, sidebar or extra screens.

## Engineering rules
- Inspect the workspace before scaffolding; preserve existing work and conventions if compatible.
- Use React, TypeScript (strict), Vite, PDF.js, pdf-lib and signature_pad; use Vitest and a browser E2E runner when feasible. Prefer a small dependency set. Use stable compatible versions, commit a lockfile, and avoid remote runtime assets. Use standard CSS or Tailwind and a consistent small icon set.
- No backend, accounts, remote document processing, analytics, cookies or persistent document/signature storage in MVP.
- Keep PDF rendering, coordinate transforms, signature input, editor state and export separate from UI components.
- Use original PDF bytes for export, not screenshots of pages. Never claim cryptographic signing or legal compliance.
- Do not silently ignore unsupported PDF features or export errors. Never overwrite the source file.
- Run tests, typecheck, lint and build; fix failures. Report actual results, remaining risks and untested scenarios. Do not claim tests ran if they did not.
- Make routine implementation choices independently; do not expand product scope. For conflicting requirements, privacy and correct exported output take precedence. Document material deviations.
- No destructive workspace operations, secrets, deployment or publishing without owner direction.
