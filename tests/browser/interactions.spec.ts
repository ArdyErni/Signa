import { test, expect } from "@playwright/test";
import { addTyped, openDocument } from "./helpers";

for (const width of [320, 360, 375, 390, 430, 768, 1280])
  test(`editor fits ${width}px with grouped controls and named touch targets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openDocument(page, "A very long filename for responsive editor verification ".repeat(3) + ".pdf");
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
      };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        logo: rect(".wordmark"), download: rect(".download"), filename: rect(".document-name"),
        add: rect(".add-button"), history: rect(".toolbar-group"), zoom: rect(".zoom-tools"),
        workspace: rect(".workspace"), nav: rect(".page-navigation"),
        zoomBorder: getComputedStyle(document.querySelector(".zoom-tools")!).borderLeftWidth,
        truncated: (() => { const n = document.querySelector(".filename-button > span")!; return n.scrollWidth > n.clientWidth; })(),
        targets: [...document.querySelectorAll(".header button, .toolbar button, .page-navigation nav button")].map((b) => ({
          width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height,
        })),
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.workspace.height).toBeGreaterThan(300);
    expect(layout.nav.bottom).toBeLessThanOrEqual(844);
    for (const target of layout.targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    if (width <= 600) {
      expect(layout.logo.y).toBeCloseTo(layout.download.y);
      expect(layout.filename.y).toBeGreaterThanOrEqual(layout.logo.bottom);
      expect(layout.truncated).toBe(true);
    }
    if (width <= 760) {
      expect(layout.add.y).toBeCloseTo(layout.history.y);
      expect(layout.zoom.y).toBeGreaterThanOrEqual(layout.add.bottom);
      expect(layout.zoomBorder).toBe("0px");
    }
    await expect(page.getByRole("button", { name: "Fit width", exact: true })).toBeVisible();
    // Every icon-only button keeps a name regardless of CSS visibility.
    for (const button of await page.locator(".header button, .toolbar button, .page-navigation nav button").all())
      await expect(button).not.toHaveAccessibleName("");
  });

test("foreign pointers cannot alter or end a gesture; background selection and controls stay independent", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  const hit = page.getByLabel("Signature placement", { exact: true });
  const placement = page.locator(".placement");
  const initial = await placement.getAttribute("style");
  const box = (await hit.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"])
    await hit.dispatchEvent(type, { pointerId: 999, button: 0, clientX: box.x + 100, clientY: box.y + 100 });
  await expect(placement).toHaveAttribute("style", initial!);
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 8, { steps: 5 });
  await page.mouse.up();
  await expect(placement).not.toHaveAttribute("style", initial!);
  await page.getByLabel("Undo", { exact: true }).click();
  await expect(placement).toHaveAttribute("style", initial!);
  await expect(hit).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Zoom in", { exact: true }).click();
  await expect(hit).toHaveAttribute("aria-pressed", "true");
  await page.locator(".page-stage").click({ position: { x: 3, y: 3 } });
  await expect(hit).toHaveAttribute("aria-pressed", "false");
  await hit.focus();
  await expect(hit).toHaveAttribute("aria-pressed", "true");
  await page.locator(".workspace").dispatchEvent("pointerdown", { pointerId: 1000, button: 0 });
  await expect(hit).toHaveAttribute("aria-pressed", "false");
});

test("selection decoration does not change preview bounds at minimum, normal or maximum zoom", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  const zoomOut = page.getByLabel("Zoom out", { exact: true });
  while (await zoomOut.isEnabled()) await zoomOut.click();
  for (const target of [20, 100, 300]) {
    while (Number((await page.locator(".zoom-label").innerText()).replace("%", "")) < target)
      await page.getByLabel("Zoom in", { exact: true }).click();
    const bounds = await page.locator(".signature-hit").evaluate((button) => {
      const a = button.getBoundingClientRect(), b = button.querySelector("img")!.getBoundingClientRect();
      return [a.x - b.x, a.y - b.y, a.width - b.width, a.height - b.height];
    });
    for (const difference of bounds) expect(Math.abs(difference)).toBeLessThan(0.01);
  }
});

test("mixed-page navigation preserves independent placements and fit-width geometry", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  const original = await page.locator(".placement").getAttribute("style");
  await page.getByLabel("Next page", { exact: true }).click();
  await expect(page.getByText("Page 2 of 4")).toBeVisible();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(0);
  await addTyped(page);
  await page.getByLabel("Previous page", { exact: true }).click();
  await expect(page.getByText("Page 1 of 4")).toBeVisible();
  await expect(page.locator(".placement")).toHaveAttribute("style", original!);
  await page.getByLabel("Signature placement", { exact: true }).focus();
  await page.getByLabel("Duplicate signature", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(2);
  await page.getByLabel("Next page", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(1);
  await page.getByLabel("Signature placement", { exact: true }).focus();
  await page.getByLabel("Delete signature", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(0);
  await page.getByLabel("Undo", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(1);
  await page.getByLabel("Previous page", { exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(2);
});

test("dragging and corner resizing stay bounded, proportional and undoable across zoom", async ({ page }) => {
  await openDocument(page);
  await addTyped(page);
  const logical = () => page.locator(".placement").evaluate((element: HTMLElement) => {
    const page = element.parentElement!;
    const scale = parseFloat(page.style.width) / 340;
    return { x: parseFloat(element.style.left) / scale, y: parseFloat(element.style.top) / scale,
      width: parseFloat(element.style.width) / scale, height: parseFloat(element.style.height) / scale, scale };
  });
  const out = page.getByLabel("Zoom out", { exact: true });
  while (await out.isEnabled()) await out.click();
  for (const zoom of [20, 100, 300]) {
    while (Number((await page.locator(".zoom-label").innerText()).replace("%", "")) < zoom)
      await page.getByLabel("Zoom in", { exact: true }).click();
    const hit = page.getByLabel("Signature placement", { exact: true });
    await hit.scrollIntoViewIfNeeded();
    const before = await logical(), box = (await hit.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4, { steps: 4 });
    await page.mouse.up();
    const moved = await logical();
    expect(Math.abs(moved.x - before.x - 4 / before.scale)).toBeLessThan(0.05);
    expect(Math.abs(moved.y - before.y - 4 / before.scale)).toBeLessThan(0.05);
    await page.getByLabel("Undo", { exact: true }).click();
    const undone = await logical();
    expect(Math.abs(undone.x - before.x)).toBeLessThan(0.05);
    expect(Math.abs(undone.y - before.y)).toBeLessThan(0.05);
    await page.getByLabel("Redo", { exact: true }).click();
    const handle = page.locator(".resize-handle.se");
    await handle.scrollIntoViewIfNeeded();
    const corner = (await handle.boundingBox())!;
    await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
    await page.mouse.down();
    await page.mouse.move(corner.x + corner.width / 2 + 5, corner.y + corner.height / 2 + 5, { steps: 5 });
    await page.mouse.up();
    const resized = await logical();
    expect(resized.width).toBeGreaterThan(moved.width);
    expect(Math.abs(resized.width / resized.height - moved.width / moved.height)).toBeLessThan(0.001);
    expect(resized.x + resized.width).toBeLessThanOrEqual(340.01);
    expect(resized.y + resized.height).toBeLessThanOrEqual(420.01);
    await page.getByLabel("Undo", { exact: true }).click();
    expect(Math.abs((await logical()).width - moved.width)).toBeLessThan(0.05);
  }
});
