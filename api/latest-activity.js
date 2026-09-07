export default async function handler(req, res) {
  try {
    const apiKey = process.env.intervals_api_key;
    const athleteId = process.env.intervals_athlete_id;

    if (!apiKey || !athleteId) {
      return res.status(500).json({ error: "Intervals.icu environment variables are missing." });
    }

    const now = new Date();
    const oldestDate = new Date(now);
    oldestDate.setDate(now.getDate() - 120);

    const oldest = oldestDate.toISOString().slice(0,10);
    const newest = now.toISOString().slice(0,10);

    const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
    const url = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/activities?oldest=${oldest}&newest=${newest}`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Intervals.icu request failed",
        status: response.status,
        detail: text.slice(0, 500)
      });
    }

    const activities = await response.json();
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(404).json({ error: "No activities found in the last 120 days." });
    }

    activities.sort((a,b) => new Date(b.start_date_local || b.start_date || 0) - new Date(a.start_date_local || a.start_date || 0));
    const a = activities[0];

    const activity = {
      id: a.id,
      name: a.name || a.type || "Cykeltur",
      date: a.start_date_local || a.start_date,
      distance: a.distance,
      movingTime: a.moving_time || a.elapsed_time,
      avgSpeed: a.average_speed,
      avgWatts: a.average_watts ?? a.avg_watts,
      weightedWatts: a.icu_weighted_avg_watts ?? a.weighted_average_watts ?? a.normalized_power,
      load: a.icu_training_load ?? a.training_load ?? a.icu_load
    };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ activity });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unknown server error" });
  }
}
