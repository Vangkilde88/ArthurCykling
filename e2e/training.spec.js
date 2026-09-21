import { test, expect } from "@playwright/test";

// Explicit QA fixture: no secrets, external athlete data or live API calls in CI.
const activity = {
  id: "qa-fixture",
  name: "QA TESTDATA · Cykeltur",
  date: "2026-09-21T10:00:00",
  distanceKm: 13.1,
  movingSeconds: 1509,
  speed: { averageKmh: 31.2 },
  power: { average: 118, weighted: 141, max: 490 },
  efforts: [{ durationSeconds: 15, watts: 303, cadence: 122 }],
};
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const dialog = page.getByRole("dialog");
  if (await dialog.count())
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
}
async function screenshot(page, info, name) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
}
async function openRow(page, title) {
  await page.locator(".session-row").filter({ hasText: title }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-21T12:00:00Z") });
  await page.route("**/api/latest-activity", (route) =>
    route.fulfill({ json: { activity } }),
  );
  await page.goto("/");
  await expect(page.getByText("LIVE DATA", { exact: true })).toBeVisible();
});

test("plan, intervals, home, XP, persistence and native dialog", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByText("15 sek · 303 W")).toBeVisible();
  await page.getByRole("button", { name: "Træning", exact: true }).click();
  await noOverflow(page);
  await screenshot(page, info, "empty-week");
  await page.getByRole("button", { name: "Indsæt uge som udkast" }).click();
  await expect(page.locator(".session-row")).toHaveCount(7);
  await page.getByRole("button", { name: "Tilføj", exact: true }).click();
  await page.getByLabel("Titel", { exact: true }).fill("QA · Teknik og tempo");
  await page.getByLabel("Type", { exact: true }).selectOption("interval");
  await page.getByLabel("Status", { exact: true }).selectOption("planned");
  await page
    .getByRole("button", { name: "Tilføj interval", exact: true })
    .click();
  await page.getByLabel("Navn", { exact: true }).fill("Opvarmning");
  await page.getByLabel("Minutter", { exact: true }).fill("10");
  await page.getByLabel("Watt fra").fill("80");
  await page.getByLabel("Watt til").fill("100");
  await page
    .getByRole("button", { name: "Tilføj interval", exact: true })
    .click();
  await page.getByLabel("Navn", { exact: true }).nth(1).fill("Teknik");
  await page.getByLabel("Minutter", { exact: true }).nth(1).fill("5");
  await page.getByLabel("Watt fra").nth(1).fill("110");
  await page.getByLabel("Watt til").nth(1).fill("130");
  await page.getByRole("button", { name: "Brug som varighed" }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "Gem træning", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await screenshot(page, info, "training-week");
  await page.getByRole("button", { name: "Hjem", exact: true }).click();
  await expect(page.locator(".today-card")).toContainText(
    "QA · Teknik og tempo",
  );
  await page.getByRole("button", { name: "Se træningen", exact: true }).click();
  await expect(page.getByText("110–130 W", { exact: true })).toBeVisible();
  await noOverflow(page);
  await screenshot(page, info, "workout-detail");
  // Native modal makes background inert and traps keyboard focus.
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest("dialog")),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openRow(page, "QA · Teknik og tempo");
  await page.getByRole("button", { name: /Markér gennemført/ }).click();
  await expect(page.locator(".week-stats")).toContainText("50 XP");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "50 XP", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Træning", exact: true }).click();
  await openRow(page, "QA · Teknik og tempo");
  await expect(
    page.getByRole("button", { name: /Markér gennemført/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Fortryd gennemførelse" }).click();
  await expect(page.locator(".week-stats")).toContainText("0 XP");
  await page.getByRole("button", { name: "Næste uge", exact: true }).click();
  await expect(page.locator(".session-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Tilbage til denne uge" }).click();
  await expect(page.locator(".session-row")).toHaveCount(8);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("strength, rest and future completion restrictions", async ({ page }) => {
  await page.getByRole("button", { name: "Træning", exact: true }).click();
  await page.getByRole("button", { name: "Tilføj", exact: true }).click();
  await page.getByLabel("Titel", { exact: true }).fill("QA · Styrke");
  await page.getByLabel("Type", { exact: true }).selectOption("strength");
  await page.getByRole("button", { name: "Tilføj øvelse" }).click();
  await page.getByLabel("Øvelse", { exact: true }).fill("Squat");
  await page.getByLabel("Sæt, gentagelser eller tid").fill("2 × 8");
  await page.getByLabel("Status", { exact: true }).selectOption("planned");
  await page.getByRole("button", { name: "Gem træning", exact: true }).click();
  await openRow(page, "QA · Styrke");
  await expect(page.getByText("2 × 8")).toBeVisible();
  await page.getByRole("button", { name: "Rediger", exact: true }).click();
  await page.getByLabel("Dato", { exact: true }).fill("2026-09-22");
  await page.getByRole("button", { name: "Gem træning", exact: true }).click();
  await openRow(page, "QA · Styrke");
  await expect(
    page.getByRole("button", { name: /Markér gennemført/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Luk træning", exact: true }).click();
  await page.getByRole("button", { name: "Tilføj", exact: true }).click();
  await page.getByLabel("Titel", { exact: true }).fill("QA · Hvile");
  await page.getByLabel("Type", { exact: true }).selectOption("rest");
  await page.getByLabel("Status", { exact: true }).selectOption("planned");
  await expect(page.getByLabel("Varighed · minutter")).toHaveValue("0");
  await page.getByRole("button", { name: "Gem træning", exact: true }).click();
  await openRow(page, "QA · Hvile");
  await page.getByRole("button", { name: /Hviledag holdt/ }).click();
  await expect(page.locator(".week-stats")).toContainText("30 XP");
});

test("failed refresh labels retained data honestly", async ({ page }) => {
  await page.unroute("**/api/latest-activity");
  await page.route("**/api/latest-activity", (route) =>
    route.fulfill({ status: 500, json: { error: "QA failure" } }),
  );
  await page.getByRole("button", { name: "Opdater", exact: true }).click();
  await expect(page.getByText("SIDST HENTET", { exact: true })).toBeVisible();
  await expect(page.getByText("118 W", { exact: true })).toBeVisible();
  await expect(page.getByText("LIVE DATA", { exact: true })).toHaveCount(0);
});
