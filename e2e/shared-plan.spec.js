import { test, expect } from "@playwright/test";

// Two independent browser contexts sharing a mocked REST store. Real RLS is
// verified separately against Supabase; these fixtures never contact Auth.
test("two phones share a plan, persist login and reject stale writes", async ({
  browser,
  contextOptions,
}, info) => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const session = {
    access_token: "qa-only",
    refresh_token: "qa-only",
    token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: owner,
      email: "qa@example.invalid",
      aud: "authenticated",
      role: "authenticated",
    },
  };
  let row = {
    owner_id: owner,
    sessions: [],
    revision: 0,
    updated_at: new Date().toISOString(),
  };
  let failWrites = false;
  const contexts = await Promise.all([
    browser.newContext({ ...contextOptions, baseURL: "http://127.0.0.1:4173", viewport: info.project.use.viewport }),
    browser.newContext({ ...contextOptions, baseURL: "http://127.0.0.1:4173", viewport: info.project.use.viewport }),
  ]);
  try {
    for (const context of contexts) {
      await context.addInitScript(
        ({ session, key }) => {
          if (!localStorage.getItem(key))
            localStorage.setItem(key, JSON.stringify(session));
        },
        { session, key: "sb-nmeyqjggqagsmxarhuer-auth-token" },
      );
      await context.route("**/api/latest-activity", (route) =>
        route.fulfill({ json: { activity: null } }),
      );
      await context.route(
        "https://nmeyqjggqagsmxarhuer.supabase.co/**",
        async (route) => {
          const request = route.request();
          if (!request.url().includes("/rest/v1/family_plans"))
            return route.fulfill({ json: { user: session.user } });
          if (request.method() === "PATCH") {
            if (failWrites)
              return route.fulfill({
                status: 503,
                json: { message: "QA offline" },
              });
            const expected = new URL(request.url()).searchParams.get(
              "revision",
            );
            if (expected !== `eq.${row.revision}`)
              return route.fulfill({ json: null });
            row = {
              ...row,
              ...request.postDataJSON(),
              updated_at: new Date().toISOString(),
            };
          }
          await route.fulfill({ json: row });
        },
      );
    }
    const [parent, child] = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    await Promise.all([parent.goto("/"), child.goto("/")]);
    for (const page of [parent, child]) {
      await page.getByRole("button", { name: "Træning", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Tilføj", exact: true }),
      ).toBeEnabled();
    }
    await parent.getByRole("button", { name: "Tilføj", exact: true }).click();
    await parent.getByLabel("Titel", { exact: true }).fill("Fælles teknik");
    await parent.getByLabel("Status", { exact: true }).selectOption("planned");
    await parent
      .getByRole("button", { name: "Gem træning", exact: true })
      .click();
    await expect(parent.getByRole("dialog")).toHaveCount(0);
    await child.reload();
    await child.getByRole("button", { name: "Træning", exact: true }).click();
    await expect(
      child.locator(".session-row").filter({ hasText: "Fælles teknik" }),
    ).toBeVisible();
    // Keep a draft open on child while parent commits a newer revision.
    await child
      .locator(".session-row")
      .filter({ hasText: "Fælles teknik" })
      .click();
    await child.getByRole("button", { name: "Rediger", exact: true }).click();
    await child.getByLabel("Titel", { exact: true }).fill("Ældre ændring");
    await parent
      .locator(".session-row")
      .filter({ hasText: "Fælles teknik" })
      .click();
    await parent.getByRole("button", { name: "Rediger", exact: true }).click();
    await parent.getByLabel("Titel", { exact: true }).fill("Nyeste plan");
    await parent
      .getByRole("button", { name: "Gem træning", exact: true })
      .click();
    await expect(parent.getByRole("dialog")).toHaveCount(0);
    await child
      .getByRole("button", { name: "Gem træning", exact: true })
      .click();
    await expect(
      child.getByText(/Planen er ændret på en anden telefon/),
    ).toBeVisible();
    await expect(child.getByRole("dialog")).toBeVisible();
    expect(row.sessions[0].title).toBe("Nyeste plan");
    await child.getByRole("button", { name: "Luk træning" }).click();
    await expect(
      child.locator(".session-row").filter({ hasText: "Nyeste plan" }),
    ).toBeVisible();
    failWrites = true;
    await child
      .locator(".session-row")
      .filter({ hasText: "Nyeste plan" })
      .click();
    await child.getByRole("button", { name: /Markér gennemført/ }).click();
    await expect(child.getByText("Ændringen kunne ikke gemmes.")).toBeVisible();
    expect(row.sessions[0].status).toBe("planned");
    await child.getByRole("button", { name: "Luk træning" }).click();
    await child
      .getByRole("button", { name: "Familiekonto", exact: true })
      .click();
    await expect(
      child.getByText("qa@example.invalid", { exact: true }),
    ).toBeVisible();
    await child.screenshot({
      path: info.outputPath("family-account.png"),
      fullPage: true,
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
