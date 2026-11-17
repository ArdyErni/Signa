import { test, expect } from "@playwright/test";
import { openDocument } from "./helpers";

declare global {
  interface Window {
    qaDecode: Record<string, () => void>;
    qaDecoded: string[];
  }
}
async function delayedImages(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 60; canvas.height = 30;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "blue"; ctx.fillRect(0, 0, 60, 30);
    const blue = canvas.toDataURL().split(",")[1];
    ctx.fillStyle = "red"; ctx.fillRect(0, 0, 60, 30);
    const red = canvas.toDataURL().split(",")[1];
    const original = window.createImageBitmap.bind(window);
    window.qaDecode = {}; window.qaDecoded = [];
    window.createImageBitmap = (async (source: ImageBitmapSource) => {
      const name = (source as File).name;
      await new Promise<void>((resolve) => { window.qaDecode[name] = resolve; });
      const bitmap = await original(source);
      window.qaDecoded.push(name);
      return bitmap;
    }) as typeof createImageBitmap;
    return { blue, red };
  });
}
test("stale uploads cannot replace typed input, a newer image, or a reopened dialog", async ({ page }) => {
  await openDocument(page);
  const png = await delayedImages(page);
  const upload = async (name: string) => {
    await page.getByLabel("Choose signature image", { exact: true }).setInputFiles({ name, mimeType: "image/png", buffer: Buffer.from(name === "first.png" ? png.red : png.blue, "base64") });
    await expect.poll(() => page.evaluate((n) => Boolean(window.qaDecode[n]), name)).toBe(true);
  };
  const release = async (name: string) => {
    await page.evaluate((n) => window.qaDecode[n](), name);
    await expect.poll(() => page.evaluate((n) => window.qaDecoded.includes(n), name)).toBe(true);
  };
  await page.getByRole("button", { name: "Add signature", exact: true }).click();
  await page.getByRole("tab", { name: "Upload", exact: true }).click();
  await upload("old.png");
  await page.getByRole("tab", { name: "Type", exact: true }).click();
  await page.getByLabel("Your name").fill("Current Name");
  const preview = page.getByAltText("Signature preview", { exact: true });
  await expect(preview).toBeVisible();
  const typed = await preview.getAttribute("src");
  await release("old.png");
  await expect(preview).toHaveAttribute("src", typed!);
  await page.getByRole("tab", { name: "Upload", exact: true }).click();
  await upload("first.png");
  await upload("second.png");
  await release("second.png");
  const imported = page.getByAltText("Uploaded signature preview");
  await expect(imported).toBeVisible();
  const latest = await imported.getAttribute("src");
  await release("first.png");
  await expect(imported).toHaveAttribute("src", latest!);
  await upload("closing.png");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Add signature", exact: true }).click();
  await release("closing.png");
  await page.getByRole("tab", { name: "Upload", exact: true }).click();
  await expect(page.getByAltText("Uploaded signature preview")).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true })).toBeDisabled();
});

test("drawing survives viewport and orientation changes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocument(page);
  await page.getByRole("button", { name: "Add signature", exact: true }).click();
  const canvas = page.locator(".drawing");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 90, { steps: 12 });
  await page.mouse.up();
  for (const viewport of [{ width: 768, height: 844 }, { width: 320, height: 700 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width === Math.round(c.clientWidth * Math.min(devicePixelRatio, 2)))).toBe(true);
    expect(await canvas.evaluate((c: HTMLCanvasElement) => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0))).toBe(true);
  }
  await page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(1);
});
