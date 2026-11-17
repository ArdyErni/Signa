// Run against a freshly built local preview; synthetic lab data, not field metrics.
/* global document, performance */
import process from "node:process";
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
try {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 100000,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(process.env.SIGNA_PREVIEW_URL || "http://127.0.0.1:4175/");
    await page.getByRole("button", { name: "Choose document", exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    samples.push(await page.evaluate(() => ({
      fcpMs: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
      resourcesBytes: performance.getEntriesByType("resource").reduce((sum, entry) => sum + entry.toJSON().encodedBodySize, 0),
      jsBytes: performance.getEntriesByType("resource").filter((entry) => /\.(m?js)(\?|$)/.test(entry.name)).reduce((sum, entry) => sum + entry.toJSON().encodedBodySize, 0),
    })));
    await context.close();
  }
  console.log(JSON.stringify({ browser: browser.version(), conditions: "cold cache, 390x844, 150ms latency, 200KB/s download, CPU x4; local Vite production preview", samples }, null, 2));
} finally { await browser.close(); }
