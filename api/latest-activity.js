export default async function handler(req, res) {
  try {
    const apiKey = process.env.intervals_api_key;
    const athleteId = process.env.intervals_athlete_id;

    if (!apiKey || !athleteId) {
      return res.status(500).json({
        error: "Intervals.icu environment variables are missing."
      });
    }

    const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");

    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json"
    };

    // 1. Find seneste aktivitet
    const now = new Date();
    const oldestDate = new Date(now);
    oldestDate.setDate(now.getDate() - 120);

    const oldest = oldestDate.toISOString().slice(0, 10);
    const newest = now.toISOString().slice(0, 10);

    const listUrl =
      `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}` +
      `/activities?oldest=${oldest}&newest=${newest}`;

    const listResponse = await fetch(listUrl, { headers });

    if (!listResponse.ok) {
      const text = await listResponse.text();

      return res.status(listResponse.status).json({
        error: "Could not fetch Intervals.icu activity list",
        status: listResponse.status,
        detail: text.slice(0, 500)
      });
    }

    const activities = await listResponse.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(404).json({
        error: "No activities found in the last 120 days."
      });
    }

    activities.sort(
      (a, b) =>
        new Date(b.start_date_local || b.start_date || 0) -
        new Date(a.start_date_local || a.start_date || 0)
    );

    const latest = activities[0];

    // 2. Hent detaljer om seneste aktivitet
    const detailUrl =
      `https://intervals.icu/api/v1/activity/${encodeURIComponent(latest.id)}` +
      `?intervals=true`;

    const detailResponse = await fetch(detailUrl, { headers });

    if (!detailResponse.ok) {
      const text = await detailResponse.text();

      return res.status(detailResponse.status).json({
        error: "Could not fetch Intervals.icu activity details",
        status: detailResponse.status,
        detail: text.slice(0, 500)
      });
    }

    const a = await detailResponse.json();

    const distanceKm =
      typeof a.distance === "number"
        ? a.distance / 1000
        : null;

    const movingSeconds =
      a.moving_time ??
      a.icu_recording_time ??
      null;

    const avgSpeedKmh =
      typeof a.average_speed === "number"
        ? a.average_speed * 3.6
        : null;

    const maxSpeedKmh =
      typeof a.max_speed === "number"
        ? a.max_speed * 3.6
        : null;

    const efforts = Array.isArray(a.icu_intervals)
      ? a.icu_intervals
          .filter((interval) => interval.type === "WORK")
          .map((interval) => ({
            id: interval.id,
            durationSeconds:
              interval.moving_time ??
              interval.elapsed_time ??
              null,
            watts:
              interval.average_watts ??
              null,
            weightedWatts:
              interval.weighted_average_watts ??
              null,
            maxWatts:
              interval.max_watts ??
              null,
            wattsPerKg:
              interval.average_watts_kg ??
              null,
            cadence:
              interval.average_cadence ??
              null,
            maxCadence:
              interval.max_cadence ??
              null,
            speedKmh:
              typeof interval.average_speed === "number"
                ? interval.average_speed * 3.6
                : null,
            intensity:
              interval.intensity ??
              null,
            load:
              interval.training_load ??
              null
          }))
      : [];

    const zoneTimes = Array.isArray(a.icu_zone_times)
      ? a.icu_zone_times.map((zone) => ({
          zone: zone.id,
          seconds: zone.secs
        }))
      : [];

    const activity = {
      id: a.id,
      name: a.name || a.type || "Cykeltur",
      type: a.type || null,
      date: a.start_date_local || a.start_date || null,

      source: a.source || null,
      device: a.device_name || null,

      distanceKm,
      movingSeconds,
      elapsedSeconds: a.elapsed_time ?? null,

      speed: {
        averageKmh: avgSpeedKmh,
        maxKmh: maxSpeedKmh
      },

      power: {
        average:
          a.icu_average_watts ??
          a.average_watts ??
          null,

        weighted:
          a.icu_weighted_avg_watts ??
          null,

        max:
          a.p_max ??
          a.icu_pm_p_max ??
          a.icu_rolling_p_max ??
          null,

        ftp:
          a.icu_ftp ??
          a.icu_pm_ftp ??
          null,

        variabilityIndex:
          a.icu_variability_index ??
          null,

        joules:
          a.icu_joules ??
          null,

        joulesAboveFtp:
          a.icu_joules_above_ftp ??
          null
      },

      cadence: {
        average:
          a.average_cadence ??
          null
      },

      elevation: {
        gain:
          a.total_elevation_gain ??
          null,

        loss:
          a.total_elevation_loss ??
          null,

        average:
          a.average_altitude ??
          null,

        min:
          a.min_altitude ??
          null,

        max:
          a.max_altitude ??
          null
      },

      heartRate: {
        available: Boolean(a.has_heartrate),

        average:
          a.average_heartrate ??
          null,

        max:
          a.max_heartrate ??
          null
      },

      training: {
        load:
          a.icu_training_load ??
          a.power_load ??
          null,

        intensity:
          a.icu_intensity ??
          null,

        atl:
          a.icu_atl ??
          null,

        ctl:
          a.icu_ctl ??
          null,

        strainScore:
          a.strain_score ??
          null,

        polarizationIndex:
          a.polarization_index ??
          null
      },

      athlete: {
        weightKg:
          a.icu_weight ??
          null
      },

      temperature: {
        average:
          a.average_temp ??
          null,

        min:
          a.min_temp ??
          null,

        max:
          a.max_temp ??
          null
      },

      raceDetectedByIntervals: Boolean(a.race),

      zoneTimes,

      intervalSummary:
        Array.isArray(a.interval_summary)
          ? a.interval_summary
          : [],

      efforts
    };

    res.setHeader(
      "Cache-Control",
      "s-maxage=60, stale-while-revalidate=300"
    );

    return res.status(200).json({ activity });

  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unknown server error"
    });
  }
}
