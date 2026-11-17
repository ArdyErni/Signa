import { test, expect } from "@playwright/test";
import { fixture } from "../fixtures";
test("private signing, history, download, dirty guard and failed replacement", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sign your documents." }),
  ).toBeVisible();
  await page.getByLabel("Choose PDF document").setInputFiles({
    name: "example.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture()),
  });
  await expect(page.getByText("Page 1 of 4")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Add signature", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Type", exact: true }).click();
  await page.getByLabel("Your name").fill("Alex Example");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add signature", exact: true })
    .click();
  await expect(page.getByLabel("Signature placement")).toHaveCount(1);
  await page.getByLabel("Duplicate signature", { exact: true }).click();
  await expect(page.getByLabel("Signature placement")).toHaveCount(2);
  await page.getByLabel("Undo", { exact: true }).click();
  await expect(page.getByLabel("Signature placement")).toHaveCount(1);
  await page.getByLabel("Redo", { exact: true }).click();
  await expect(page.getByLabel("Signature placement")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("example-signed.pdf");
  await expect(page.getByRole("status")).toContainText("Download initiated");
  await page.getByLabel("Signature placement").last().focus();
  await page.keyboard.press("ArrowRight");
  await page.getByLabel("Close document and return home").click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Signature placement")).toHaveCount(2);
  await page.getByLabel("Choose PDF document").setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-broken"),
  });
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await expect(page.getByLabel("Signature placement")).toHaveCount(2);
  expect(
    requests.every(
      (url) =>
        url.startsWith("http://127.0.0.1:5173/") ||
        url.startsWith("data:") ||
        url.startsWith("blob:"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: 0, session: 0, cookie: "" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("modal focus and invalid file feedback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Privacy", exact: true }),
  ).toBeFocused();
  await page.getByLabel("Choose PDF document").setInputFiles({
    name: "empty.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(0),
  });
  await expect(page.getByRole("alert")).toContainText("empty");
});
