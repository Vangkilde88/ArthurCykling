import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  mondayOf,
  weekNumber,
  emptySession,
  weekDrafts,
  validateSession,
  parsePlan,
  changeStatus,
  earnedXp,
  weekSessions,
  nextSession,
  STORAGE_KEY,
} from "../src/training/model.js";
const workout = (overrides = {}) => ({
  ...emptySession("2026-09-18"),
  title: "Klubtræning",
  status: "planned",
  ...overrides,
});

test("calendar stays Monday–Sunday across DST and year boundaries", () => {
  assert.equal(mondayOf("2026-09-20"), "2026-09-14");
  assert.equal(addDays("2026-03-28", 1), "2026-03-29");
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
  assert.equal(mondayOf("2027-01-01"), "2026-12-28");
  assert.equal(weekNumber("2027-01-01"), 53);
  assert.equal(weekNumber("2027-01-04"), 1);
});
test("draft templates never count as completed or next approved workout", () => {
  const drafts = weekDrafts("2026-09-14");
  assert.equal(drafts.length, 7);
  assert.ok(drafts.every((s) => s.status === "draft" && !validateSession(s)));
  assert.equal(earnedXp(drafts), 0);
  assert.equal(nextSession(drafts, "2026-09-14"), undefined);
  assert.equal(
    earnedXp(changeStatus(drafts, drafts[0].id, "completed", "2026-09-18")),
    0,
  );
});
test("completion is idempotent, reversible and unavailable in the future", () => {
  const s = workout();
  let rows = changeStatus([s], s.id, "completed", s.date);
  assert.equal(earnedXp(rows), 50);
  rows = changeStatus(rows, s.id, "completed", s.date);
  assert.equal(earnedXp(rows), 50);
  assert.equal(earnedXp(changeStatus(rows, s.id, "planned", s.date)), 0);
  assert.equal(earnedXp(changeStatus([s], s.id, "completed", "2026-09-17")), 0);
});
test("rest earns XP and skipped workouts do not", () => {
  const rest = workout({ type: "rest", minutes: 0 });
  assert.equal(
    earnedXp(changeStatus([rest], rest.id, "completed", rest.date)),
    30,
  );
  assert.equal(earnedXp([workout({ status: "skipped" })]), 0);
});
test("week selection and next workout exclude drafts, past and skipped entries", () => {
  const s = workout();
  const rows = [
    s,
    workout({ date: "2026-09-13" }),
    workout({ date: "2026-09-17" }),
    workout({ date: "2026-09-21" }),
  ];
  assert.equal(weekSessions(rows, "2026-09-14").length, 2);
  assert.equal(nextSession(rows, "2026-09-18").id, s.id);
});
test("saved plans reject corruption and duplicate IDs without migration guesswork", () => {
  const s = workout();
  assert.deepEqual(parsePlan(JSON.stringify({ version: 1, sessions: [s] })), [
    s,
  ]);
  for (const value of [
    "{",
    '{"version":2,"sessions":[]}',
    JSON.stringify({ version: 1, sessions: [s, s] }),
    JSON.stringify({ version: 1, sessions: [{ ...s, date: "2026-02-30" }] }),
  ])
    assert.throws(() => parsePlan(value));
  assert.equal(STORAGE_KEY, "arthur-cycling.plan.v1");
});
test("interval total and watt range must be valid; blank targets remain blank", () => {
  const s = workout({
    minutes: 10,
    steps: [{ label: "Rolig", minutes: 10, wattsMin: "", wattsMax: "" }],
  });
  assert.equal(validateSession(s), "");
  assert.ok(validateSession({ ...s, minutes: 20 }));
  assert.ok(
    validateSession({
      ...s,
      steps: [{ ...s.steps[0], wattsMin: 140, wattsMax: 120 }],
    }),
  );
  assert.ok(
    validateSession({
      ...s,
      steps: [{ ...s.steps[0], wattsMin: "", wattsMax: 120 }],
    }),
  );
  assert.ok(validateSession({ ...s, type: "rest", minutes: 0 }));
});
