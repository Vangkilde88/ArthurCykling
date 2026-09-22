import { before, beforeEach, after, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import React from "react";
import { STORAGE_KEY, todayKey, emptySession } from "../src/training/model.js";

let App, render, screen, fireEvent, cleanup, waitFor, within, dom;
const fixture = {
  activity: {
    id: "fixture",
    name: "TEST · Cykeltur",
    date: "2026-09-18T10:00:00",
    distanceKm: 13.1,
    movingSeconds: 1509,
    speed: { averageKmh: 31.2 },
    power: { average: 118, weighted: 141, max: 490 },
    efforts: [{ durationSeconds: 15, watts: 303, cadence: 122 }],
  },
};
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  });
const click = (name) =>
  fireEvent.click(screen.getByRole("button", { name, exact: true }));
const planned = (overrides) => ({
  ...emptySession(todayKey()),
  title: "Teknik med klubben",
  status: "planned",
  ...overrides,
});
const seed = (sessions) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions }));
const mount = async () => {
  const view = render(React.createElement(App));
  await screen.findByText("LIVE DATA");
  return view;
};

const nativeBroadcastChannel = globalThis.BroadcastChannel;
before(async () => {
  // JSDOM has no browser tabs; do not open Node broadcast ports.
  globalThis.BroadcastChannel = undefined;
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  for (const key of [
    "window",
    "document",
    "localStorage",
    "HTMLElement",
    "HTMLDialogElement",
    "Event",
    "StorageEvent",
  ])
    globalThis[key] = dom.window[key];
  // JSDOM does not implement native modal layout/focus; these tests verify React flows, not visual browser behavior.
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  dom.window.scrollTo = () => {};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  ({ render, screen, fireEvent, cleanup, waitFor, within } =
    await import("@testing-library/react"));
  await mkdir(".test-build", { recursive: true });
  await build({
    entryPoints: ["src/App.jsx"],
    outfile: ".test-build/App.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    loader: { ".css": "empty" },
  });
  ({ default: App } = await import("../.test-build/App.mjs"));
});
beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = async () => ({ ok: true, json: async () => fixture });
});
afterEach(() => cleanup());
after(async () => {
  dom.window.close();
  globalThis.BroadcastChannel = nativeBroadcastChannel;
  await rm(".test-build", { recursive: true, force: true });
});

test("create interval workout → Home → complete → reload → undo; XP stays consistent", async () => {
  let view = await mount();
  click("Træning");
  click("Tilføj");
  change("Titel", "Tempo-test");
  change("Type", "interval");
  change("Status", "planned");
  click("Tilføj interval");
  change("Navn", "Opvarmning");
  change("Minutter", "10");
  change("Watt fra", "80");
  change("Watt til", "100");
  click("Brug som varighed");
  click("Gem træning");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  assert.equal(screen.queryByRole("dialog"), null);
  click("Hjem");
  assert.ok(screen.getByRole("heading", { name: "Tempo-test" }));
  click("Se træningen");
  assert.ok(screen.getByText("80–100 W"));
  click("Markér gennemført · +50 XP");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  assert.match(document.querySelector(".week-stats").textContent, /50 XP/);
  view.unmount();
  view = await mount();
  assert.ok(screen.getByRole("heading", { name: "50 XP" }));
  click("Træning");
  fireEvent.click(
    screen.getByRole("button", { name: /Interval.*Gennemført.*Tempo-test/ }),
  );
  click("Fortryd gennemførelse");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  assert.match(document.querySelector(".week-stats").textContent, /0 XP/);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(saved.sessions[0].status, "planned");
});

test("strength exercises survive edit; skipped workout can be restored and deleted", async () => {
  await mount();
  click("Træning");
  click("Tilføj");
  change("Titel", "Styrketest");
  change("Type", "strength");
  click("Tilføj øvelse");
  change("Øvelse", "Squat");
  change("Sæt, gentagelser eller tid", "2 × 8");
  change("Status", "planned");
  click("Gem træning");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Styrke.*Planlagt.*Styrketest/ }),
  );
  assert.ok(screen.getByText("2 × 8"));
  click("Rediger");
  change("Titel", "Styrketest ændret");
  click("Gem træning");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Styrke.*Planlagt.*Styrketest ændret/ }),
  );
  click("Spring over");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: /Styrke.*Sprunget over.*Styrketest ændret/,
    }),
  );
  click("Fortryd spring over");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Styrke.*Planlagt.*Styrketest ændret/ }),
  );
  click("Slet træning");
  click("Ja, slet");
  await waitFor(() =>
    assert.equal(Boolean(screen.queryByRole("dialog")), false),
  );
  assert.equal(
    JSON.parse(localStorage.getItem(STORAGE_KEY)).sessions.length,
    0,
  );
});

test("draft template does not earn XP; changing week shows empty days", async () => {
  await mount();
  click("Træning");
  click("Indsæt uge som udkast");
  assert.equal(document.querySelectorAll(".session-row").length, 7);
  fireEvent.click(document.querySelector(".session-row"));
  assert.equal(
    screen.queryByRole("button", { name: /Markér gennemført/ }),
    null,
  );
  click("Luk træning");
  click("Næste uge");
  assert.equal(document.querySelectorAll(".session-row").length, 0);
  click("Tilbage til denne uge");
  assert.equal(document.querySelectorAll(".session-row").length, 7);
  assert.match(document.querySelector(".week-stats").textContent, /0 XP/);
});

test("failed API refresh preserves real data with stale label; first failure fabricates nothing", async () => {
  const view = await mount();
  assert.ok(screen.getByText("15 sek · 303 W"));
  globalThis.fetch = async () => ({ ok: false });
  click("Opdater");
  await screen.findByText("SIDST HENTET");
  assert.ok(screen.getByText("118 W"));
  assert.equal(screen.queryByText("LIVE DATA"), null);
  view.unmount();
  render(React.createElement(App));
  await screen.findByText(/Ingen aktivitet at vise/);
  assert.equal(screen.queryByText("118 W"), null);
  assert.equal(screen.queryByText("DEMO"), null);
});

test("corrupt saved plan blocks edits and preserves original bytes", async () => {
  localStorage.setItem(STORAGE_KEY, "broken");
  await mount();
  click("Træning");
  assert.equal(
    screen.getByRole("button", { name: "Tilføj", exact: true }).disabled,
    true,
  );
  assert.equal(localStorage.getItem(STORAGE_KEY), "broken");
});

test("failed write keeps workout dialog open and does not claim completion", async (t) => {
  seed([planned()]);
  await mount();
  click("Se træningen");
  t.mock.method(dom.window.Storage.prototype, "setItem", () => {
    throw new Error("quota");
  });
  click("Markér gennemført · +50 XP");
  assert.ok(screen.getByRole("dialog"));
  await screen.findByText(/Ændringen kunne ikke gemmes/);
  assert.equal(
    JSON.parse(localStorage.getItem(STORAGE_KEY)).sessions[0].status,
    "planned",
  );
});
