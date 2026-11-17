import { it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { exportPdf, signedFilename } from "../src/features/export/export";
import type { Session } from "../src/types";
it("names signed copies without changing the source name", () => {
  expect(signedFilename("contract.PDF")).toBe("contract-signed.pdf");
  expect(signedFilename("contract.v2.pdf")).toBe("contract.v2-signed.pdf");
});
it("rejects empty export and missing assets without mutating source", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const original = await doc.save();
  const before = original.slice();
  const session = { original, pages: [{}] } as Session;
  await expect(exportPdf(session, [], new Map())).rejects.toThrow(
    "Add a signature",
  );
  await expect(
    exportPdf(
      session,
      [
        {
          id: "p",
          assetId: "missing",
          pageIndex: 0,
          x: 0,
          y: 0,
          width: 100,
          height: 50,
        },
      ],
      new Map(),
    ),
  ).rejects.toThrow("unavailable");
  expect(original).toEqual(before);
});
