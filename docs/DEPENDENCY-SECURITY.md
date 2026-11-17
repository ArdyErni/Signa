# Refinement 003: dependency security investigation — 2026-11-17

**Status: remediation blocked; release security acceptance not met.** The owner reported nine npm findings (one low, seven moderate, one high). This session could not retrieve the audit report or install the proposed patches because npm registry requests fail with `EACCES`. Failed audits do not establish zero vulnerabilities, including for production dependencies.

## Inspected dependency graph

`package.json`, lockfile version 3 and `npm ls --all --json` were inspected. Node is 24.13.0 and npm is 10.8.3. The workspace has no Git repository, so no Git diff or commit was available. No application source, styles, tests, dependency declarations or root lockfile were changed.

| Dependency | Before | After this session | Evaluated target |
| --- | --- | --- | --- |
| Vite (direct development dependency) | 7.3.1 | 7.3.1 | 7.3.8 |
| typescript-eslint (direct development dependency) | 8.59.0 | 8.59.0 | 8.73.0 |
| @typescript-eslint packages (transitive lint tooling) | 8.59.0 | 8.59.0 | Matching 8.73.0 family |
| esbuild (via Vite) | 0.27.7 | 0.27.7 | Patched 0.28.x through Vite's widened range |
| minimatch (via typescript-estree) | 10.2.6 | 10.2.6 | Patched 11.x through updated typescript-eslint |
| minimatch (via ESLint/config-array/eslintrc) | 3.1.5 | 3.1.5 | Retain unless the actual audit identifies an applicable advisory |

Runtime dependencies, React plugin 5.1.2, Vitest 5.1.0, ESLint 9.39.2, TypeScript 5.9.3 and Playwright 1.59.1 remain unchanged. Root manifest and lockfile hashes match the copies taken before the isolated update attempt.

## Compatibility and advisory findings

These findings use upstream source and advisory pages, not a successful npm audit. They cannot enumerate or reconcile all nine reported findings without the owner's JSON report.

- [Vite 7.3.8 metadata](https://github.com/vitejs/vite/blob/v7.3.8/packages/vite/package.json) permits Node 22.12+ and esbuild `^0.27.0 || ^0.28.0`. Installed React plugin 5.1.2 accepts Vite 7; Vitest 5.1.0 also accepts Vite 7. This avoids a Vite major upgrade and React plugin replacement. A parent update may retain the locked esbuild version; explicitly inspect/update the esbuild subtree afterward.
- [typescript-eslint 8.73.0 metadata](https://github.com/typescript-eslint/typescript-eslint/blob/v8.73.0/packages/typescript-eslint/package.json) accepts ESLint 9 and TypeScript 5.9.3. Its [typescript-estree package](https://github.com/typescript-eslint/typescript-eslint/blob/v8.73.0/packages/typescript-estree/package.json) declares minimatch `^11.0.1`. Updating the parent supplies a supported path out of minimatch 10, without a cross-major override under older tooling. Registry peer resolution and runtime verification of these targets remain unperformed.
- [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249): minimatch 10.2.6 glob preprocessing can amplify attacker-controlled patterns; the upstream fix starts at 11.0.1. In Signa this copy belongs to lint tooling; document/signature content is not supplied to lint patterns. This limits the observed application exposure but does not clear the dependency finding.
- [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7): upstream lists Vite 7.0.0–7.3.7 as affected and 7.3.8 as patched for development-server code execution. Upstream rates this critical, which differs from the owner's reported audit totals. Signa's scripts bind to loopback; that reduces network exposure but is not remediation. This is development tooling rather than code executed in the downloaded static application.
- [GHSA-g7r4-m6w7-qqqr](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr): Windows file traversal concerns esbuild's own `servedir` server; upstream identifies 0.28.1+ as patched. Signa uses Vite's server and esbuild transformations, with no application use of esbuild `serve`. The precise npm affected range must still be checked against the actual audit.
- [GHSA-gv7w-rqvm-qjhr](https://github.com/evanw/esbuild/security/advisories/GHSA-gv7w-rqvm-qjhr): binary integrity issue in esbuild's Deno distribution, patched in 0.28.1+. Signa uses Node/npm, not Deno. This is an upstream applicability observation, not proof that this is the high finding in the owner's npm report.

No advisory suppressions, overrides, broad upgrades or `npm audit fix --force` were used. Cached Vite 8 packages were not substituted for the compatible Vite 7 patch. The required Vite 7.3.8 and typescript-eslint 8.73.0 archives were absent from the inspected npm caches; offline metadata lookup also returned `ENOTCACHED`.

## Execution evidence

Both `npm.cmd audit --json` and `npm.cmd audit --omit=dev --json` failed at the registry endpoint. Repeats using workspace-local `.npm-cache`, zero fetch retries and a 15-second timeout also failed. Error responses are retained under `.qa/ref003-audit-*.json`; they are not successful audit reports.

A clean installation was attempted with `npm.cmd ci --prefix .qa/ref003-clean --logs-dir D:/Signa/.npm-logs --fetch-retries=0 --fetch-timeout=15000`, using copies of the original manifest, lockfile and postinstall script in a new directory. It failed after registry requests returned `EACCES`, ending with npm's `Exit handler never called!`. This does not establish reproducible clean installation. The working root `node_modules` was preserved.

A targeted resolution attempt in that isolated directory used `npm.cmd install --prefix .qa/ref003-clean --package-lock-only --save-dev --save-exact vite@7.3.8 typescript-eslint@8.73.0 --cache .npm-cache --fetch-retries=0 --fetch-timeout=15000 --strict-peer-deps`. It failed fetching typescript-eslint with `EACCES`. The peer warnings emitted during that failed resolution are not evidence of incompatibility; the target metadata was unavailable to npm.

## Baseline verification

These checks exercise the unchanged installed graph; they are not post-remediation acceptance.

| Check | Result |
| --- | --- |
| Type checking | Passed |
| Lint | Passed |
| Unit/integration tests | 30/30 passed, four files |
| Dependency-free core checks | 16/16 passed |
| Production build | Passed with Vite 7.3.1 |
| Committed browser suite | 40/40 passed, desktop and Pixel 7 emulation using installed Chrome |
| Full and production-only npm audits | Blocked; no vulnerability verdict |
| Clean npm ci | Failed; registry access denied |

Browser command: `$env:PLAYWRIGHT_CHANNEL = 'chrome'; npm.cmd run test:e2e -- --workers=2 --output=.qa/ref003-e2e --reporter=line`. Playwright reported `40 passed (5.0m)` and exited zero. After browser workers exited, server cleanup stalled; stopping only this run's Vite process with PowerShell allowed normal completion. No test or application changes were made to obtain the result. Physical-device and other-engine limitations remain as documented in VERIFICATION.md.

All 196 copied PDF.js assets and font license files were rechecked against installed packages by SHA-256 and matched. Installed dependency-tree snapshots before and after were identical. The security work changed only documentation outside ignored diagnostic/build outputs.

## Completion requirements

Resume with registry access and the actual audit JSON. Install the evaluated direct updates, update esbuild within the new Vite range if it remains vulnerable, and inspect all minimatch paths. Prefer the smallest patched releases supported by parent dependency ranges; do not assume the latest minimatch release is advisory-free. Review the generated lockfile for unrelated churn, check `npm ls --all`, run both audits, then clean `npm ci` and repeat the entire automated suite/build against the updated installation. Recheck copied licenses and PDF.js/font assets after installation. Existing non-Chromium, physical touch/stylus and advanced-PDF acceptance limitations in VERIFICATION.md still apply.

Zero vulnerabilities, patched-build regression acceptance and release readiness remain unestablished. No deployment or publishing occurred.
