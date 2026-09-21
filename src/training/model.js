export const STORAGE_KEY = "arthur-cycling.plan.v1";
export const TYPES = {
  club: { label: "Klubtræning", color: "cyan", xp: 50 },
  interval: { label: "Interval", color: "lime", xp: 50 },
  easy: { label: "Rolig tur", color: "blue", xp: 50 },
  recovery: { label: "Restitution", color: "mint", xp: 30 },
  strength: { label: "Styrke", color: "purple", xp: 50 },
  race: { label: "Løb", color: "orange", xp: 50 },
  rest: { label: "Hvile", color: "mint", xp: 30 },
};
export const STATUSES = {
  draft: "Udkast",
  planned: "Planlagt",
  completed: "Gennemført",
  skipped: "Sprunget over",
};
export const INTENSITIES = ["Fri", "Let", "Moderat", "Hård"];
export const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(
    new Date(),
  );
// Calendar arithmetic at UTC noon avoids DST and local-device timezone shifts.
export const dateObject = (key) => new Date(`${key}T12:00:00Z`);
export function addDays(key, days) {
  const d = dateObject(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function mondayOf(key) {
  return addDays(key, -((dateObject(key).getUTCDay() + 6) % 7));
}
export function weekNumber(key) {
  const d = dateObject(key);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(
    ((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 12))) / 86400000 + 1) / 7,
  );
}
export const dateLabel = (key, options = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("da-DK", { ...options, timeZone: "UTC" }).format(
    dateObject(key),
  );
export const isDate = (key) =>
  typeof key === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(key) &&
  Number.isFinite(+dateObject(key)) &&
  dateObject(key).toISOString().slice(0, 10) === key;
export const durationLabel = (min) =>
  min >= 60
    ? `${Math.floor(min / 60)} t${min % 60 ? ` ${min % 60} min` : ""}`
    : `${min} min`;
export const xpFor = (session) => TYPES[session.type].xp;
export const earnedXp = (sessions) =>
  sessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + xpFor(s), 0);
export const levelFor = (xp) => Math.floor(xp / 500) + 1;
export const weekSessions = (sessions, monday) =>
  sessions
    .filter((s) => s.date >= monday && s.date <= addDays(monday, 6))
    .sort((a, b) => a.date.localeCompare(b.date));
export const nextSession = (sessions, today) =>
  sessions
    .filter((s) => s.status === "planned" && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
export const canComplete = (s, today) =>
  s.status === "planned" && s.date <= today;
export const intervalMinutes = (steps) =>
  steps.reduce((sum, s) => sum + Number(s.minutes), 0);
export const wattLabel = (step) =>
  step.wattsMin === "" || step.wattsMin == null
    ? "Efter fornemmelse"
    : `${step.wattsMin}${step.wattsMax !== "" && step.wattsMax != null && step.wattsMax !== step.wattsMin ? `–${step.wattsMax}` : ""} W`;
export function emptySession(date, type = "club") {
  return {
    id: crypto.randomUUID(),
    date,
    type,
    title: "",
    minutes: type === "rest" ? 0 : 45,
    intensity: "Let",
    description: "",
    status: "draft",
    steps: [],
    exercises: [],
  };
}
export function validateSession(s) {
  if (!s || typeof s !== "object") return "Ugyldig træning.";
  if (
    typeof s.id !== "string" ||
    !s.id ||
    !isDate(s.date) ||
    !TYPES[s.type] ||
    !STATUSES[s.status]
  )
    return "Kontrollér dato, type og status.";
  if (typeof s.title !== "string" || !s.title.trim() || s.title.length > 100)
    return "Giv træningen en titel på højst 100 tegn.";
  if (
    !Number.isFinite(s.minutes) ||
    s.minutes < 0 ||
    s.minutes > 1440 ||
    (s.type !== "rest" && s.minutes === 0)
  )
    return "Angiv en varighed mellem 1 og 1440 minutter.";
  if (
    !INTENSITIES.includes(s.intensity) ||
    typeof s.description !== "string" ||
    s.description.length > 3000
  )
    return "Kontrollér intensitet og beskrivelse.";
  if (
    !Array.isArray(s.steps) ||
    !Array.isArray(s.exercises) ||
    s.steps.length > 50 ||
    s.exercises.length > 30
  )
    return "For mange intervaller eller øvelser.";
  for (const step of s.steps) {
    if (
      !step ||
      typeof step.label !== "string" ||
      !step.label.trim() ||
      step.label.length > 100 ||
      !Number.isFinite(step.minutes) ||
      step.minutes <= 0 ||
      step.minutes > 1440
    )
      return "Hvert interval skal have navn og varighed.";
    const a = step.wattsMin,
      b = step.wattsMax;
    if (
      (a !== "" && (!Number.isFinite(a) || a < 0 || a > 3000)) ||
      (b !== "" && (!Number.isFinite(b) || b < 0 || b > 3000)) ||
      (a === "" && b !== "") ||
      (a !== "" && b !== "" && b < a)
    )
      return "Kontrollér intervallets wattmål (fra ≤ til).";
  }
  if (s.steps.length && Math.abs(intervalMinutes(s.steps) - s.minutes) > 0.01)
    return "Intervallernes samlede tid skal svare til varigheden.";
  if (
    s.type === "rest" &&
    (s.minutes !== 0 || s.steps.length || s.exercises.length)
  )
    return "En hviledag har ingen træningsminutter eller øvelser.";
  for (const e of s.exercises)
    if (
      !e ||
      typeof e.name !== "string" ||
      !e.name.trim() ||
      e.name.length > 100 ||
      typeof e.dose !== "string" ||
      !e.dose.trim() ||
      e.dose.length > 100
    )
      return "Hver øvelse skal have navn og antal/tid.";
  return "";
}
export function parsePlan(raw) {
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.sessions) ||
    data.sessions.some((s) => validateSession(s)) ||
    new Set(data.sessions.map((s) => s.id)).size !== data.sessions.length
  )
    throw new Error("Ugyldig gemt plan");
  return data.sessions;
}
export function changeStatus(sessions, id, status, today) {
  return sessions.map((s) => {
    if (s.id !== id) return s;
    if (status === "completed" && !canComplete(s, today)) return s;
    if (
      !["planned", "completed", "skipped"].includes(status) ||
      s.status === "draft"
    )
      return s;
    return { ...s, status };
  });
}
// Explicitly inserted, editable drafts. Never infer a child's approved plan from performance.
export function weekDrafts(monday) {
  const rows = [
    [
      "strength",
      "Stærk på cyklen",
      15,
      "Teknik og rolige bevægelser. Aftal øvelser og antal med en voksen.",
    ],
    [
      "club",
      "Sammen med klubben",
      60,
      "Tilpas tid og fokus til klubbens plan.",
    ],
    ["easy", "En tur i dit tempo", 30, "En rolig tur med plads til at snakke."],
    ["club", "Klubdag", 60, "Følg klubbens træner og dagens program."],
    ["rest", "Lad benene lade op", 0, "Fri fra træning. Hvile tæller også."],
    [
      "interval",
      "Dit intervalpas",
      30,
      "Udkast: aftal intervaller og eventuelle wattmål med din coach.",
    ],
    ["rest", "Søndag med overskud", 0, "Plads til familie og en god pause."],
  ];
  return rows.map(([type, title, minutes, description], i) => ({
    ...emptySession(addDays(monday, i), type),
    title,
    minutes,
    description,
  }));
}
