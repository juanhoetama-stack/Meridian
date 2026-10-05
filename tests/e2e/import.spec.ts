import { test, expect } from "@playwright/test";
import { guard, open, shot } from "./helpers";

test("import flow: 12 / 40 / 1 → merge → save → 0 / 0 / 52", async ({ page }) => {
  const g = guard(page);
  await open(page, "#/db/import");
  await expect(page.locator(".nav-badge").first()).toHaveText("40");
  await shot(page, "04-import-initial", true);

  for (const name of ["SAP SuccessFactors", "Moodle LMS", "Regional performance tools"]) {
    const row = page.locator(".conn", { hasText: name });
    await row.getByRole("button", { name: "Connect" }).click();
    if (name === "SAP SuccessFactors") await shot(page, "04-import-config");
    await row.getByRole("button", { name: "Test and connect" }).click();
    await expect(row.getByText("Connected", { exact: true })).toBeVisible();
  }
  await page.locator(".conn", { hasText: "SAP SuccessFactors" }).getByRole("button", { name: "Field mapping" }).click();
  await shot(page, "04-import-connected", true);

  await page.getByRole("button", { name: "Pull all connected" }).click();
  await expect(page.locator(".kpi-n").nth(0)).toHaveText("12");
  await expect(page.locator(".kpi-n").nth(1)).toHaveText("40");
  await expect(page.locator(".kpi-n").nth(2)).toHaveText("1");
  await page.locator("#check").scrollIntoViewIfNeeded();
  await shot(page, "04-import-decision");

  await page.getByRole("button", { name: "Same person: merge" }).click();
  await expect(page.locator(".kpi-n").nth(2)).toHaveText("0");
  await page.getByRole("tab", { name: /Updates/ }).click();
  await shot(page, "04-import-updates");
  await page.getByRole("tab", { name: /New people/ }).click();
  await shot(page, "04-import-new");

  await page.getByRole("button", { name: "Save to database: 12 new, 40 updated" }).click();
  await expect(page.locator(".nav-badge").first()).toHaveText("52");
  await expect(page.locator(".toast")).toContainText("12 new, 40 updated");
  await shot(page, "04-import-saved", true);

  await page.getByRole("button", { name: "Pull all connected" }).click();
  await expect(page.locator(".kpi-n").nth(0)).toHaveText("0");
  await expect(page.locator(".kpi-n").nth(1)).toHaveText("0");
  await expect(page.locator(".kpi-n").nth(3)).toHaveText("52");
  await shot(page, "04-import-second-pull");

  // Persistence: reload keeps 52 people and connector state.
  await page.reload();
  await page.locator(".shell").waitFor();
  await expect(page.locator(".nav-badge").first()).toHaveText("52");
  g.check();
});
