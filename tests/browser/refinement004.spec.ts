import { test, expect, type Download, type Page } from "@playwright/test";
import { addTyped, openDocument } from "./helpers";
import { fixture } from "../fixtures";

async function bytes(download: Download) {
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function pdfDownload(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  return pending;
}
test("filename save, cancel, validation, export and replacement leave placements intact", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  const first = await pdfDownload(page);
  expect(first.suggestedFilename()).toBe("example-signed.pdf");
  const firstBytes = await bytes(first);
  const edit = page.getByRole("button", { name: /^Edit export filename:/ });
  const input = page.getByRole("textbox", { name: "Export filename", exact: true });
  await edit.click();
  await expect(input).toHaveValue("example");
  await input.fill("cancelled");
  await input.press("Escape");
  await expect(edit).toContainText("example.pdf");
  await edit.click();
  for (const invalid of [" ", "bad/name", "CON", "界".repeat(81)]) {
    await input.fill(invalid);
    await input.press("Enter");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#filename-error")).toBeVisible();
  }
  await input.fill("  Approved copy  ");
  await input.press("Enter");
  await expect(edit).toContainText("Approved copy.pdf");
  // Keyboard-accessible pencil is part of the same filename button.
  await edit.locator("svg").click();
  await input.fill("Final copy");
  await page.getByLabel("Fit width", { exact: true }).click();
  await expect(edit).toContainText("Final copy.pdf");
  await edit.click(); await input.fill("example"); await input.press("Enter");
  const custom = await pdfDownload(page);
  expect(custom.suggestedFilename()).toBe("example.pdf");
  expect(await bytes(custom)).toEqual(firstBytes);
  await edit.click(); await input.fill("Direct download");
  expect((await pdfDownload(page)).suggestedFilename()).toBe("Direct download.pdf");
  // Undo still removes the placement in one step; filename adds no history step.
  await page.getByLabel("Undo", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(0);
  await page.getByLabel("Redo", { exact: true }).click();
  await edit.click(); await input.fill("Another name"); await input.press("Enter");
  await page.getByLabel("Close document and return home").click();
  await expect(page.getByRole("heading", { name: "Sign your documents." })).toBeVisible();
  // Closing without a discard prompt proves rename did not mark placements dirty.
  await openDocument(page);
  await edit.click(); await input.fill("Custom"); await input.press("Enter");
  await page.getByLabel("Choose PDF document").setInputFiles({ name: "replacement.pdf", mimeType: "application/pdf", buffer: Buffer.from(await fixture()) });
  await expect(edit).toContainText("replacement.pdf");
  await addTyped(page);
  expect((await pdfDownload(page)).suggestedFilename()).toBe("replacement-signed.pdf");
});

test("selected tools stay within a narrow viewport at page edges and zoom limits", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openDocument(page); await addTyped(page);
  const signature = page.getByLabel("Signature placement", { exact: true });
  await signature.focus();
  for (let i = 0; i < 30; i++) await signature.press("Shift+ArrowLeft");
  const check = async () => {
    const box = (await page.getByRole("group", { name: "Selected signature tools" }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  await check();
  while (await page.getByLabel("Zoom out", { exact: true }).isEnabled())
    await page.getByLabel("Zoom out", { exact: true }).click();
  await check();
  while (await page.getByLabel("Zoom in", { exact: true }).isEnabled())
    await page.getByLabel("Zoom in", { exact: true }).click();
  await check();
  await page.locator(".workspace").evaluate((node) => { node.scrollLeft = 500; node.scrollTop = 300; });
  await expect(page.getByRole("button", { name: "Download signature PNG" })).toBeInViewport();
  await check();
});

for (const source of ["drawn", "typed", "uploaded"] as const) {
  test(`${source} signature downloads canonical transparent PNG without edits`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openDocument(page);
    if (source === "typed") await addTyped(page);
    else {
      await page.getByRole("button", { name: "Add signature", exact: true }).click();
      if (source === "drawn") {
        const box = (await page.locator(".drawing").boundingBox())!;
        await page.mouse.move(box.x + 25, box.y + 30); await page.mouse.down();
        await page.mouse.move(box.x + 130, box.y + 80, { steps: 12 }); await page.mouse.up();
      } else {
        const png = await page.evaluate(() => {
          const c = document.createElement("canvas"); c.width = 120; c.height = 60;
          c.getContext("2d")!.fillRect(20, 20, 70, 15);
          return c.toDataURL().split(",")[1];
        });
        await page.getByRole("tab", { name: "Upload", exact: true }).click();
        await page.getByLabel("Choose signature image", { exact: true }).setInputFiles({ name: "ink.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
      }
      await page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true }).click();
    }
    const canonical = await page.locator(".signature-hit img").getAttribute("src");
    await pdfDownload(page); // Establish a clean placement revision.
    const placement = page.locator(".placement");
    const before = await placement.getAttribute("style");
    const tools = page.getByRole("group", { name: "Selected signature tools" });
    const box = (await tools.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
    for (const button of await tools.getByRole("button").all()) {
      const rect = (await button.boundingBox())!;
      expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => {
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url) => { document.body.dataset.revoked = url; revoke(url); };
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (delay === 30000 && typeof handler === "function")
          window.addEventListener("qa-release-download", () => handler(...args), { once: true });
        return timeout(handler, delay, ...args);
      }) as typeof window.setTimeout;
    });
    const pending = page.waitForEvent("download");
    const button = page.getByRole("button", { name: "Download signature PNG" });
    await expect(button).toHaveAttribute("title", "Download signature PNG");
    await button.click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("signature.png");
    const png = await bytes(download);
    expect(png).toEqual(Buffer.from(canonical!.split(",")[1], "base64"));
    const dimensions = await page.evaluate(async (base64) => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const image = await createImageBitmap(blob);
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      image.close();
      return { width: canvas.width, height: canvas.height, alpha: pixels[3], ink: pixels.some((v, i) => i % 4 === 3 && v > 0) };
    }, png.toString("base64"));
    expect(dimensions.alpha).toBe(0); expect(dimensions.ink).toBe(true);
    expect(dimensions.width).toBe(png.readUInt32BE(16)); expect(dimensions.height).toBe(png.readUInt32BE(20));
    if (source === "uploaded") expect([dimensions.width, dimensions.height]).toEqual([136, 76]);
    await expect(page.getByRole("status").filter({ hasText: "Signature PNG download initiated" })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("qa-release-download")));
    expect(await page.locator("body").getAttribute("data-revoked")).toMatch(/^blob:/);
    await expect(placement).toHaveAttribute("style", before!);
    await expect(page.getByLabel("Redo", { exact: true })).toBeDisabled();
    await page.evaluate(() => {
      URL.createObjectURL = () => { throw new Error("Injected PNG download failure"); };
    });
    await button.click();
    await expect(page.getByRole("alert")).toContainText("Could not download this signature");
    await page.getByLabel("Close document and return home").click();
    await expect(page.getByRole("heading", { name: "Sign your documents." })).toBeVisible();
  });
}
