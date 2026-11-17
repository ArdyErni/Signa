import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { inspectPdf } from "./inspect";
import type { Session } from "../../types";
GlobalWorkerOptions.workerSrc = worker;
export { inspectPdf } from "./inspect";
export async function loadPdf(file: File): Promise<Session> {
  if (!file.size) throw new Error("This file is empty. Choose a valid PDF.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("PDFs must be 50 MiB or smaller.");
  const original = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(original.slice(0, 1024)).includes("%PDF-"))
    throw new Error(
      "Choose a PDF document. Other file types are not supported.",
    );
  try {
    await inspectPdf(original);
  } catch (error) {
    if (error instanceof Error && /encrypt|password/i.test(error.message))
      throw new Error(
        "Password-protected PDFs are not supported. Choose an unencrypted copy.",
      );
    if (error instanceof Error && /not supported/.test(error.message))
      throw error;
    throw new Error("This PDF could not be read. Try opening a fresh copy.");
  }
  const task = getDocument({
    data: original.slice(),
    isEvalSupported: false,
    useSystemFonts: false,
    cMapUrl: "/pdf-assets/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdf-assets/standard_fonts/",
    wasmUrl: "/pdf-assets/wasm/",
  });
  try {
    const pdf = await task.promise;
    try {
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        if (viewport.width <= 0 || viewport.height <= 0)
          throw new Error("Invalid PDF page dimensions.");
        pages.push({
          width: viewport.width,
          height: viewport.height,
          viewport,
        });
      }
      return { name: file.name, original, pdf, pages };
    } catch (error) {
      await pdf.destroy();
      throw error;
    }
  } catch {
    await task.destroy();
    throw new Error(
      "This PDF could not be rendered. Choose a readable, unencrypted PDF.",
    );
  }
}
