import { cpSync, mkdirSync, existsSync } from "node:fs";
mkdirSync("public/pdf-assets", { recursive: true });
for (const dir of ["cmaps", "standard_fonts", "wasm"])
  cpSync(`node_modules/pdfjs-dist/${dir}`, `public/pdf-assets/${dir}`, {
    recursive: true,
  });
mkdirSync("public/licenses", { recursive: true });
for (const name of ["manrope", "caveat", "dancing-script", "allura"]) {
  const license = `node_modules/@fontsource/${name}/LICENSE`;
  if (!existsSync(license))
    throw new Error(`Font license is missing: ${license}`);
  cpSync(license, `public/licenses/${name}.txt`);
}
