import { test, expect } from "@playwright/test";
import { fixture } from "../fixtures";

// Pixel assertions exercise actual PDF.js viewports and pdf-lib drawing semantics.
for (const dpr of [1, 2])
  test(`exported marks match rotated, cropped and UserUnit previews at DPR ${dpr}`, async ({
    browser, baseURL,
  }) => {
    const context = await browser.newContext({ deviceScaleFactor: dpr, baseURL });
    const page = await context.newPage();
    try {
      await page.goto("/");
      const result = await page.evaluate(
        async ({ source }) => {
          const loaderPath = "/src/features/pdf/load.ts",
            exportPath = "/src/features/export/export.ts",
            assetPath = "/src/features/signature/assets.ts";
          const { loadPdf } = await import(/* @vite-ignore */ loaderPath);
          const { exportPdf } = await import(/* @vite-ignore */ exportPath);
          const { fromCanvas } = await import(/* @vite-ignore */ assetPath);
          const session = await loadPdf(
            new File([new Uint8Array(source)], "geometry.pdf", {
              type: "application/pdf",
            }),
          );
          const original = Array.from(session.original);
          const mark = document.createElement("canvas");
          mark.width = 100;
          mark.height = 50;
          const ink = mark.getContext("2d")!;
          ink.fillStyle = "#ff0000";
          ink.fillRect(0, 0, 15, 50);
          ink.fillStyle = "#0000ff";
          ink.fillRect(15, 35, 85, 15);
          const asset = fromCanvas(mark, false),
            assets = new Map([[asset.id, asset]]);
          const placements = session.pages.map((_: unknown, i: number) => ({
            id: String(i),
            assetId: asset.id,
            pageIndex: i,
            x: 40,
            y: 60,
            width: asset.width,
            height: asset.height,
          }));
          const first = await exportPdf(session, placements, assets),
            second = await exportPdf(session, placements, assets);
          const output = await loadPdf(
            new File([new Uint8Array(second)], "result.pdf", {
              type: "application/pdf",
            }),
          );
          const firstOutput = await loadPdf(new File([new Uint8Array(first)], "first.pdf", { type: "application/pdf" }));
          const raster = async (pdfSession: typeof session, index: number) => {
            const page = await pdfSession.pdf.getPage(index + 1);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
            return { page, canvas, pixels: canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data };
          };
          const checks = [];
          for (let i = 0; i < output.pages.length; i++) {
            const p = await output.pdf.getPage(i + 1),
              viewport = p.getViewport({ scale: 2 }),
              canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await p.render({
              canvas,
              canvasContext: canvas.getContext("2d")!,
              viewport,
            }).promise;
            const pixels = canvas
              .getContext("2d")!
              .getImageData(0, 0, canvas.width, canvas.height).data;
            const originalPage = await raster(session, i);
            const firstPage = await firstOutput.pdf.getPage(i + 1);
            const [originalText, outputText, firstOps, secondOps] = await Promise.all([
              originalPage.page.getTextContent(), p.getTextContent(), firstPage.getOperatorList(), p.getOperatorList(),
            ]);
            const text = (items: { str?: string; transform?: number[]; width?: number; height?: number; dir?: string; hasEOL?: boolean }[]) =>
              items.map(({ str, transform, width, height, dir, hasEOL }) => ({ str, transform, width, height, dir, hasEOL }));
            let unchangedOutside = true;
            for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
              if (x >= 80 && x < (40 + asset.width) * 2 && y >= 120 && y < (60 + asset.height) * 2) continue;
              const j = (y * canvas.width + x) * 4;
              for (let c = 0; c < 4; c++) if (pixels[j + c] !== originalPage.pixels[j + c]) unchangedOutside = false;
            }
            let minX = Infinity,
              minY = Infinity,
              maxX = -1,
              maxY = -1;
            for (let y = 0; y < canvas.height; y++)
              for (let x = 0; x < canvas.width; x++) {
                const j = (y * canvas.width + x) * 4;
                if (
                  (pixels[j] > 200 &&
                    pixels[j + 1] < 50 &&
                    pixels[j + 2] < 50) ||
                  (pixels[j] < 50 && pixels[j + 1] < 50 && pixels[j + 2] > 200)
                ) {
                  minX = Math.min(x, minX);
                  minY = Math.min(y, minY);
                  maxX = Math.max(x, maxX);
                  maxY = Math.max(y, maxY);
                }
              }
            const sample = (x: number, y: number) => {
              const j =
                (Math.round(y * 2) * canvas.width + Math.round(x * 2)) * 4;
              return Array.from(pixels.slice(j, j + 3));
            };
            checks.push({
              bounds: [minX, minY, maxX + 1, maxY + 1],
              red: sample(53, 73),
              blue: sample(90, 110),
              empty: sample(90, 73),
              dimensions:
                output.pages[i].width === session.pages[i].width &&
                output.pages[i].height === session.pages[i].height,
              geometry: p.rotate === originalPage.page.rotate && p.userUnit === originalPage.page.userUnit && JSON.stringify(p.view) === JSON.stringify(originalPage.page.view),
              // PDF.js font identifiers differ between document instances.
              content: JSON.stringify(text(originalText.items)) === JSON.stringify(text(outputText.items)),
              unchangedOutside,
              repeatOperators: firstOps.fnArray.length === secondOps.fnArray.length,
            });
          }
          const deleted = await exportPdf(
            session,
            [{ ...placements[0], x: 180 }],
            assets,
          );
          const moved = await loadPdf(
            new File([new Uint8Array(deleted)], "moved.pdf", {
              type: "application/pdf",
            }),
          );
          const movement = [];
          for (let i = 0; i < moved.pdf.numPages; i++) {
            const actual = await raster(moved, i), originalPage = await raster(session, i);
            let colored = 0, minX = Infinity, maxX = -1;
            for (let j = 0; j < actual.pixels.length; j += 4) {
              const r = actual.pixels[j], g = actual.pixels[j + 1], b = actual.pixels[j + 2];
              if ((r > 200 && g < 50 && b < 50) || (r < 50 && g < 50 && b > 200)) {
                colored++;
                const x = (j / 4) % actual.canvas.width;
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
              }
            }
            movement.push({ colored, minX, maxX,
              originalOnly: actual.pixels.every((value: number, j: number) => value === originalPage.pixels[j]),
            });
          }
          const summary = {
            checks,
            originalUnchanged:
              JSON.stringify(original) ===
              JSON.stringify(Array.from(session.original)),
            pageCount: output.pdf.numPages,
            repeatLength: first.length === second.length,
            movedCount: moved.pdf.numPages,
            movement,
          };
          await output.pdf.destroy();
          await moved.pdf.destroy();
          await session.pdf.destroy();
          await firstOutput.pdf.destroy();
          return summary;
        },
        { source: Array.from(await fixture()) },
      );
      expect(result.originalUnchanged).toBe(true);
      expect(result.pageCount).toBe(4);
      expect(result.repeatLength).toBe(true);
      expect(result.movedCount).toBe(4);
      expect(result.movement[0].colored).toBeGreaterThan(0);
      expect(Math.abs(result.movement[0].minX - 376)).toBeLessThanOrEqual(4);
      expect(Math.abs(result.movement[0].maxX + 1 - 576)).toBeLessThanOrEqual(4);
      for (const removed of result.movement.slice(1)) {
        expect(removed.colored).toBe(0);
        expect(removed.originalOnly).toBe(true);
      }
      for (const check of result.checks) {
        expect(check.dimensions).toBe(true);
        expect(check.geometry).toBe(true);
        expect(check.content).toBe(true);
        expect(check.unchangedOutside).toBe(true);
        expect(check.repeatOperators).toBe(true);
        check.bounds.forEach((value: number, i: number) =>
          expect(Math.abs(value - [96, 136, 296, 236][i])).toBeLessThanOrEqual(
            4,
          ),
        );
        expect(check.red).toEqual([255, 0, 0]);
        expect(check.blue).toEqual([0, 0, 255]);
        expect(check.empty).toEqual([255, 255, 255]);
      }
    } finally {
      await context.close();
    }
  });
