# Third-party assets

Refinement 003 (2026-11-17) installed no dependency updates because registry access was denied. Existing package licenses and bundled asset notices remain applicable. Vite and typescript-eslint targets are MIT-licensed upstream; no new license files are needed for this blocked investigation. See [dependency security](DEPENDENCY-SECURITY.md) for installed versions and pending remediation.

Application fonts are supplied by the `@fontsource/manrope`, `@fontsource/caveat`, `@fontsource/dancing-script` and `@fontsource/allura` npm packages. These typefaces use the SIL Open Font License. The installation script requires each package's license and copies it to `public/licenses/<font>.txt`; the installed distributions retain their original notices. Fonts are served locally, never from a font CDN. During stabilization on 2026-11-17, all four copied font license files matched the installed package notices by SHA-256; PDF.js static assets also matched the installed package.

Lucide icons use the ISC license. React, Vite, pdf-lib and signature_pad use MIT licenses; PDF.js uses Apache-2.0. Retain the licenses distributed with installed packages and PDF.js static assets. The dependency packages are the authority for full license texts and copyright notices. This file is an attribution index, not a substitute for those license files.
