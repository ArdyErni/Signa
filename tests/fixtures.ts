import { PDFDocument, PDFName, degrees, rgb } from "pdf-lib";
export async function fixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const [i, r] of [0, 90, 180, 270].entries()) {
    const p = doc.addPage([400 + i * 20, 500 + i * 20]);
    p.setCropBox(20, 30, 340, 420);
    p.setRotation(degrees(r));
    if (i === 3) p.node.set(PDFName.of("UserUnit"), doc.context.obj(2));
    p.drawText(`Synthetic page ${i + 1}`, {
      x: 40,
      y: 390,
      size: 16,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
  return doc.save();
}
