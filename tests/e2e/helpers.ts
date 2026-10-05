import { expect, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const APP = pathToFileURL(resolve("dist/index.html")).href;

/** Fails the test on any console error or any request that is not file:, data: or blob: (SRS T-19, T-20). */
export function guard(page: Page) {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url()); });
  return { check: () => { expect(errors, "console errors").toEqual([]); expect(requests, "network requests").toEqual([]); } };
}

export async function open(page: Page, hash = "") {
  await page.goto(APP + hash);
  await page.locator(".shell").waitFor();
}

/** Waits for running animations so screenshots never catch a transition mid-way. */
export async function shot(page: Page, name: string, full = false) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  if (full) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: full });
}
