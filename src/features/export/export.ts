import { PDFDocument, degrees, type PDFImage } from "pdf-lib";
import { imageTransform } from "../../lib/geometry";
import type { Asset, Placement, Session } from "../../types";
import { exportFilename } from "./filename";
export async function exportPdf(
  session: Session,
  placements: Placement[],
  assets: Map<string, Asset>,
): Promise<Uint8Array> {
  if (!placements.length)
    throw new Error("Add a signature before downloading.");
  const doc = await PDFDocument.load(session.original.slice(), {
    updateMetadata: false,
  });
  const embedded = new Map<string, PDFImage>();
  for (const p of placements) {
    const asset = assets.get(p.assetId);
    if (!asset || !session.pages[p.pageIndex])
      throw new Error("A signature or page is unavailable. Please retry.");
    let image = embedded.get(p.assetId);
    if (!image) {
      image = await doc.embedPng(asset.png);
      embedded.set(p.assetId, image);
    }
    const { angle, ...position } = imageTransform(
      p,
      session.pages[p.pageIndex].viewport,
    );
    doc
      .getPage(p.pageIndex)
      .drawImage(image, { ...position, rotate: degrees(angle) });
  }
  return doc.save();
}
export function signedFilename(name: string) {
  return exportFilename(name, null);
}
