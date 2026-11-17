import { expect, it } from "vitest";
import { exportFilename, filenameStem, validateFilename } from "../src/features/export/filename";
import { signatureBlob } from "../src/features/export/signature";
import type { Asset } from "../src/types";

it("keeps default and explicitly chosen export names separate", () => {
  expect(filenameStem("agreement.v2.PDF")).toBe("agreement.v2");
  expect(exportFilename("agreement.PDF", null)).toBe("agreement-signed.pdf");
  expect(exportFilename("agreement.PDF", validateFilename(" agreement "))).toBe("agreement.pdf");
  expect(validateFilename("  chosen.PDF  ")).toBe("chosen.pdf");
});
it("rejects empty, unsafe, reserved and excessively long names", () => {
  for (const value of ["", "  ", ".pdf", "a/b", "a\\b", "a:b", 'a"b', "a?b", "a*b", "a<b", "a>b", "a|b", "a\nb", "a\u0000b", "con", "NUL.txt", "name.", "a".repeat(241), "界".repeat(81)]) {
    expect(() => validateFilename(value), value).toThrow();
  }
  expect(validateFilename("a".repeat(240))).toHaveLength(244);
  expect(validateFilename("界".repeat(80))).toBe("界".repeat(80) + ".pdf");
});
it("uses canonical asset bytes without modifying them and rejects missing assets", async () => {
  const png = new Uint8Array([1, 2, 3]);
  const asset = { png, width: 100, height: 40 } as Asset;
  const blob = signatureBlob(asset);
  expect(blob.type).toBe("image/png");
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(png);
  expect(asset.png).toEqual(new Uint8Array([1, 2, 3]));
  expect(() => signatureBlob(undefined)).toThrow("unavailable");
  expect(() => signatureBlob({ ...asset, png: new Uint8Array() })).toThrow("unavailable");
});
