import { test, expect } from "@playwright/test";
import { open } from "node:fs/promises";
import { fixture } from "../fixtures";
import { addTyped, openDocument } from "./helpers";

test("download failure retains edits and retries; replacement resets the editor", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = (...args) => {
      URL.createObjectURL = original;
      void args;
      throw new Error("Injected download failure");
    };
  });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your edits are still here");
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("example-signed.pdf");
  await page.getByLabel("Choose PDF document").setInputFiles({ name: "replacement.pdf", mimeType: "application/pdf", buffer: Buffer.from(await fixture()) });
  await expect(page.locator(".filename-button > span")).toHaveText("replacement.pdf");
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Undo", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Redo", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
  await page.getByLabel("Close document and return home").click();
  await expect(page.getByRole("heading", { name: "Sign your documents." })).toBeVisible();
});

test("rejects oversized PDFs without replacing the current session", async ({ page }, testInfo) => {
  await openDocument(page);
  // Playwright limits in-memory uploads to 50 MB; exercise a real larger file.
  const path = testInfo.outputPath("oversized.pdf");
  const file = await open(path, "w");
  try { await file.truncate(50 * 1024 * 1024 + 1); } finally { await file.close(); }
  await page.getByLabel("Choose PDF document").setInputFiles(path);
  await expect(page.getByRole("alert")).toContainText("50 MiB or smaller");
  await expect(page.locator(".filename-button > span")).toHaveText("example.pdf");
});

test("UI preview and downloaded marks agree at 20%, normal and maximum zoom", async ({ page }) => {
  await openDocument(page);
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 100; c.height = 50;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "red"; ctx.fillRect(0, 0, 15, 50);
    ctx.fillStyle = "blue"; ctx.fillRect(15, 35, 85, 15);
    return c.toDataURL().split(",")[1];
  });
  await page.getByRole("button", { name: "Add signature", exact: true }).click();
  await page.getByRole("tab", { name: "Upload", exact: true }).click();
  await page.getByLabel("Choose signature image", { exact: true }).setInputFiles({ name: "mark.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true }).click();
  const out = page.getByLabel("Zoom out", { exact: true });
  while (await out.isEnabled()) await out.click();
  for (const zoom of [20, 100, 300]) {
    while (Number((await page.locator(".zoom-label").innerText()).replace("%", "")) < zoom)
      await page.getByLabel("Zoom in", { exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const stream = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const comparison = await page.evaluate(async (bytes) => {
      const path = "/src/features/pdf/load.ts";
      const { loadPdf } = await import(/* @vite-ignore */ path);
      const output = await loadPdf(new File([new Uint8Array(bytes)], "signed.pdf"));
      try {
        const pdfPage = await output.pdf.getPage(1), viewport = pdfPage.getViewport({ scale: 2 });
        const actual = document.createElement("canvas");
        actual.width = Math.ceil(viewport.width); actual.height = Math.ceil(viewport.height);
        await pdfPage.render({ canvas: actual, canvasContext: actual.getContext("2d")!, viewport }).promise;
        const expected = document.createElement("canvas"); expected.width = actual.width; expected.height = actual.height;
        const pageBox = document.querySelector(".pdf-page")!.getBoundingClientRect();
        const image = document.querySelector<HTMLImageElement>(".signature-hit img")!;
        const box = image.getBoundingClientRect(), scale = output.pages[0].width / pageBox.width;
        expected.getContext("2d")!.drawImage(image, (box.x - pageBox.x) * scale * 2, (box.y - pageBox.y) * scale * 2, box.width * scale * 2, box.height * scale * 2);
        const bounds = (c: HTMLCanvasElement) => {
          const pixels = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
          let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            if (pixels[i + 3] > 200 && ((pixels[i] > 200 && pixels[i + 1] < 50 && pixels[i + 2] < 50) || (pixels[i] < 50 && pixels[i + 1] < 50 && pixels[i + 2] > 200))) {
              minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            }
          }
          return [minX, minY, maxX, maxY];
        };
        return { actual: bounds(actual), expected: bounds(expected) };
      } finally { await output.pdf.destroy(); }
    }, Array.from(Buffer.concat(chunks)));
    for (let i = 0; i < 4; i++) expect(Math.abs(comparison.actual[i] - comparison.expected[i])).toBeLessThanOrEqual(4);
  }
});
