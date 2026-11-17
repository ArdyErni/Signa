import { expect, it } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { inspectPdf } from "../src/features/pdf/inspect";

for (const shape of ["direct", "indirect", "nested", "inherited", "indirect-type", "byte-range"])
  it(`refuses recognizable ${shape} signature structures`, async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const field = doc.context.obj({ T: PDFString.of("Signature") });
    if (shape === "nested") field.set(PDFName.of("V"), doc.context.obj({ Type: "Sig" }));
    else if (shape === "byte-range") field.set(PDFName.of("V"), doc.context.obj({ ByteRange: [0, 5, 10, 5] }));
    else if (shape === "inherited") {
      const parent = doc.context.obj({ FT: "Sig" });
      const parentRef = doc.context.register(parent);
      field.set(PDFName.of("Parent"), parentRef);
      parent.set(PDFName.of("Kids"), doc.context.obj([doc.context.register(field)]));
    } else field.set(PDFName.of("FT"), shape === "indirect-type"
      ? doc.context.register(PDFName.of("Sig")) : PDFName.of("Sig"));
    doc.catalog.set(PDFName.of("AcroForm"), doc.context.obj({
      Fields: [shape === "indirect" ? doc.context.register(field) : field],
    }));
    await expect(inspectPdf(await doc.save())).rejects.toThrow("signature fields are not supported");
  });

it("terminates on cyclic unsigned fields and preserves source bytes", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const parent = doc.context.obj({ FT: "Tx" });
  const parentRef = doc.context.register(parent);
  const child = doc.context.obj({ Parent: parentRef });
  parent.set(PDFName.of("Kids"), doc.context.obj([doc.context.register(child)]));
  doc.catalog.set(PDFName.of("AcroForm"), doc.context.obj({ Fields: [parentRef] }));
  const source = await doc.save(), before = source.slice();
  await expect(inspectPdf(source)).resolves.toBeUndefined();
  expect(source).toEqual(before);
});

it.each(["XFA", "Collection"])("still refuses %s", async (feature) => {
  const doc = await PDFDocument.create();
  doc.addPage();
  if (feature === "XFA") doc.catalog.set(PDFName.of("AcroForm"), doc.context.obj({ XFA: [] }));
  else doc.catalog.set(PDFName.of("Collection"), doc.context.obj({}));
  await expect(inspectPdf(await doc.save())).rejects.toThrow("not supported");
});
