import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFStream,
  type PDFObject,
} from "pdf-lib";

// Structural detection only: this neither validates nor verifies digital signatures.
export async function inspectPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes.slice(), { updateMetadata: false });
  const pending: PDFObject[] = [doc.catalog];
  for (const [, object] of doc.context.enumerateIndirectObjects()) pending.push(object);
  const seen = new Set<PDFObject>();
  while (pending.length) {
    const object = pending.pop()!;
    if (seen.has(object)) continue;
    seen.add(object);
    if (object instanceof PDFRef) {
      const resolved = doc.context.lookup(object);
      if (resolved) pending.push(resolved);
    } else if (object instanceof PDFDict) {
      // Walking every value also follows Kids/Parent inheritance and direct fields.
      if (object.lookup(PDFName.of("FT")) === PDFName.of("Sig") ||
          object.lookup(PDFName.of("Type")) === PDFName.of("Sig") ||
          object.has(PDFName.of("ByteRange"))) {
        throw new Error("Digitally signed PDFs and signature fields are not supported. Editing can invalidate existing signatures. Choose an unsigned copy.");
      }
      for (const value of object.values()) pending.push(value);
    } else if (object instanceof PDFArray) {
      for (let i = 0; i < object.size(); i++) pending.push(object.get(i));
    } else if (object instanceof PDFStream) {
      pending.push(object.dict);
    }
  }
  if (doc.catalog.has(PDFName.of("Collection")))
    throw new Error("PDF portfolios are not supported. Open an individual PDF instead.");
  const form = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (form?.has(PDFName.of("XFA")))
    throw new Error("XFA forms are not supported. Choose a standard PDF copy.");
}
