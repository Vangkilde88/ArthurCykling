export default async function handler(req, res) {
  try {
    const apiKey = process.env.intervals_api_key;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing" });
    }

    const activityId = "i183537102";

    const auth = Buffer.from(`API_KEY:${apiKey}`).toString("base64");

    const response = await fetch(
      `https://intervals.icu/api/v1/activity/${activityId}?intervals=true`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Intervals.icu request failed",
        status: response.status,
        detail: (await response.text()).slice(0, 500)
      });
    }

    const activity = await response.json();

    return res.status(200).json(activity);

  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unknown error"
    });
  }
}
