import { test, expect } from "@playwright/test";
import { guard, open, shot } from "./helpers";

test("T-24 add manually: validation, live hints, duplicate warning, toast, record opens", async ({ page }) => {
  const g = guard(page);
  await open(page, "#/db/add");
  await expect(page.locator(".id-value")).toHaveText("MRD-000041");
  await shot(page, "05-add-empty", true);

  // Submitting empty shows specific inline errors.
  await page.getByRole("button", { name: "Save employee" }).click();
  await expect(page.getByText("Enter the full name exactly as written on the KTP.")).toBeVisible();
  await expect(page.getByText("Choose the regional unit.")).toBeVisible();
  await shot(page, "05-add-errors");

  // Errors clear as soon as the field is fixed.
  await page.locator("#f-name").fill("Agus Setiawan");
  await expect(page.getByText("Enter the full name exactly as written on the KTP.")).toHaveCount(0);

  await page.locator("#f-pob").fill("Boyolali");
  await page.locator("#f-dob").fill("1979-03-12");
  await page.locator("#f-title").fill("Petugas Catat Meter");
  await expect(page.getByText("Maps to")).toContainText("Meter & Customer Field Technician");
  await page.locator("#f-unit").selectOption("RU-2");
  await page.locator("#f-start").fill("1975-01-01");
  await expect(page.getByText("The start date must be after the date of birth (1979-03-12).")).toBeVisible();
  await page.locator("#f-start").fill("2012-03-01");
  await expect(page.getByText("Length of service:")).toContainText("14 yrs 7 mo");

  await page.getByLabel("Skill 1", { exact: true }).fill("Meter installation and wiring");
  await page.getByLabel("Evidence source for skill 1", { exact: true }).selectOption("SKTTK certificate");
  await expect(page.getByText("Counts as inferred until a valid SKTTK certificate is added below.")).toBeVisible();
  await page.getByRole("button", { name: "Add a skill" }).click();
  await page.getByLabel("Skill 2", { exact: true }).fill("Drone piloting");
  await expect(page.getByText("Not in taxonomy: kept")).toBeVisible();
  await shot(page, "05-add-filled", true);

  // Duplicate: first save warns, second save keeps both.
  await page.getByRole("button", { name: "Save employee" }).click();
  await expect(page.getByText("Possible duplicate.")).toBeVisible();
  await shot(page, "05-add-duplicate");
  await page.getByRole("button", { name: "Save employee" }).click();
  await expect(page.locator(".toast")).toContainText("Employee MRD-000041 saved.");
  await expect(page.locator(".id-value")).toHaveText("MRD-000042");

  await page.locator(".toast").getByRole("button", { name: "View record" }).click();
  await expect(page.locator(".drawer")).toBeVisible();
  await expect(page.locator(".pd-name")).toHaveText("Agus Setiawan");
  await expect(page.locator(".pd")).toContainText("Not in hierarchy v1 yet");
  await page.keyboard.press("Escape");
  await expect(page.locator(".drawer")).toHaveCount(0);

  // The new record carries its flags in the table.
  const row = page.locator(".db-row", { hasText: "MRD-000041" });
  await expect(row).toContainText("Possible duplicate");
  await expect(row).toContainText("KTP not on file");
  await expect(row).toContainText("Not in v1: rebuild");
  g.check();
});

test("database and profile: Agus at 81% with breakdown, filters, empty state", async ({ page }) => {
  const g = guard(page);
  await open(page, "#/db/view");
  await expect(page.locator(".db-row")).toHaveCount(40);
  await shot(page, "06-db");

  await page.getByLabel("Family").selectOption("review");
  await expect(page.locator(".db-row")).toHaveCount(1);
  await expect(page.locator(".db-row")).toContainText("Teguh Santoso");
  await page.getByLabel("Search name, ID or job title").fill("zzz");
  await expect(page.getByText("No one matches these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".db-row")).toHaveCount(40);

  const agus = page.locator(".db-row", { hasText: "MRD-000008" });
  await expect(agus).toContainText("L2 Path to B3 Revenue Protection & Loss Investigation · 81% fit");
  await agus.focus();
  await page.keyboard.press("Enter");
  const d = page.locator(".drawer");
  await expect(d).toBeVisible();
  await expect(d).toContainText("Title on SK: Petugas Catat Meter Senior (unchanged)");
  await expect(d).toContainText("Payroll not accessed");
  await expect(d).toContainText("Backed by evidence");
  await expect(d.locator(".fit-btn")).toHaveText(["81%", "76%", "58%"]);
  await expect(d).toContainText("Gap: Loss investigation procedure (P2TL); Alert triage (12 weeks)");
  await expect(d).toContainText("Place now: not yet. Needs Tamper and irregularity detection at Advanced, verified");
  await shot(page, "06-profile");
  await d.locator(".pd-sec", { hasText: "Where this person can go" }).scrollIntoViewIfNeeded();
  await shot(page, "06-profile-paths");

  await d.locator(".fit-btn").first().click();
  await expect(page.locator(".popover")).toContainText("12.1 of 15 weighted points = 81%");
  await shot(page, "06-profile-fit");
  await page.keyboard.press("Escape");
  await expect(page.locator(".popover")).toHaveCount(0);
  await expect(d).toBeVisible();

  // Fransiskus: the downgrade reason is shown in the skills table.
  await page.keyboard.press("Escape");
  await page.locator(".db-row", { hasText: "Fransiskus Nggadas" }).click();
  await expect(d).toContainText("SKTTK certificate expired 2024-07-31");
  await d.locator(".pd-sec", { hasText: "Skills" }).first().scrollIntoViewIfNeeded();
  await shot(page, "06-profile-downgrade");

  // Deep link opens the drawer.
  await page.keyboard.press("Escape");
  await open(page, "#/db/view?p=MRD-000017");
  await expect(page.locator(".pd-name")).toHaveText("Fransiskus Nggadas");
  g.check();
});
