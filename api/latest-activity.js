export default async function handler(req, res) {
  const debug = {
    intervals_api_key_present: Boolean(process.env.intervals_api_key),
    intervals_athlete_id_present: Boolean(process.env.intervals_athlete_id),
    NODE_ENV: process.env.NODE_ENV || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null
  };

  if (!process.env.intervals_api_key || !process.env.intervals_athlete_id) {
    return res.status(500).json({
      error: "Intervals.icu environment variables are missing.",
      debug
    });
  }

  return res.status(200).json({
    message: "Vercel kan se begge Intervals.icu variabler.",
    debug
  });
}
