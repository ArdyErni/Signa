import { expect, type Page } from "@playwright/test";
import { fixture } from "../fixtures";
export async function openDocument(page: Page, name = "example.pdf") {
  await page.goto("/");
  await page.getByLabel("Choose PDF document").setInputFiles({
    name, mimeType: "application/pdf", buffer: Buffer.from(await fixture()),
  });
  await expect(page.getByText("Page 1 of 4")).toBeVisible();
  await expect(page.locator(".render-status")).toHaveCount(0);
}
export async function addTyped(page: Page) {
  await page.getByRole("button", { name: "Add signature", exact: true }).click();
  await page.getByRole("tab", { name: "Type", exact: true }).click();
  await page.getByLabel("Your name").fill("Alex Example");
  await page.getByRole("dialog").getByRole("button", { name: "Add signature", exact: true }).click();
  await expect(page.getByLabel("Signature placement", { exact: true })).toHaveCount(1);
}
