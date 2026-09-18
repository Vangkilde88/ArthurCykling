import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/latest-activity.js";
const res = () => ({
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  setHeader(k, v) {
    this.headers[k] = v;
  },
});
test("latest-activity preserves normalization, auth stays server-side and missing pulse remains absent", async (t) => {
  const oldKey = process.env.intervals_api_key,
    oldAthlete = process.env.intervals_athlete_id;
  process.env.intervals_api_key = "unit-test-only";
  process.env.intervals_athlete_id = "test-athlete";
  t.after(() => {
    if (oldKey === undefined) delete process.env.intervals_api_key;
    else process.env.intervals_api_key = oldKey;
    if (oldAthlete === undefined) delete process.env.intervals_athlete_id;
    else process.env.intervals_athlete_id = oldAthlete;
  });
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(url);
    assert.equal(
      options.headers.Authorization,
      `Basic ${Buffer.from("API_KEY:unit-test-only").toString("base64")}`,
    );
    return {
      ok: true,
      json: async () =>
        urls.length === 1
          ? [
              { id: "old", start_date_local: "2026-09-01" },
              { id: "new", start_date_local: "2026-09-18" },
            ]
          : {
              id: "new",
              name: "Test activity",
              distance: 13100,
              moving_time: 1509,
              average_speed: 8.6667,
              icu_average_watts: 118,
              icu_weighted_avg_watts: 141,
              p_max: 490,
              race: false,
              icu_intervals: [
                {
                  type: "WORK",
                  moving_time: 15,
                  average_watts: 303,
                  average_cadence: 122,
                },
                { type: "RECOVERY" },
              ],
              icu_zone_times: [{ id: "Z1", secs: 60 }],
            },
    };
  });
  const response = res();
  await handler({}, response);
  assert.equal(response.statusCode, 200);
  assert.ok(urls[1].endsWith("/activity/new?intervals=true"));
  const a = response.body.activity;
  assert.equal(a.distanceKm, 13.1);
  assert.equal(a.power.average, 118);
  assert.equal(a.power.weighted, 141);
  assert.equal(a.power.max, 490);
  assert.equal(a.heartRate.available, false);
  assert.equal(a.heartRate.average, null);
  assert.equal(a.efforts.length, 1);
  assert.equal(a.efforts[0].watts, 303);
  assert.deepEqual(a.zoneTimes, [{ zone: "Z1", seconds: 60 }]);
  assert.ok(!JSON.stringify(response.body).includes("unit-test-only"));
});
