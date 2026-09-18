import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Trophy,
  CalendarDays,
  Zap,
  Gauge,
  Timer,
  MapPin,
  ChevronRight,
  Star,
  Bike,
  TrendingUp,
  Home,
  Medal,
  RefreshCw,
} from "lucide-react";
import "./styles.css";
import { TrainingView, WorkoutDialog, NextWorkout } from "./training/Training";
import { usePlan } from "./training/usePlan";
import {
  todayKey,
  mondayOf,
  weekSessions,
  earnedXp,
  levelFor,
  nextSession,
  emptySession,
  weekDrafts,
  changeStatus,
  dateLabel,
} from "./training/model";

const fmtDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return "—";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  return h ? `${h}t ${m}m` : `${m} min`;
};

const fmtDistance = (km) => {
  if (km === null || km === undefined) return "—";
  return `${km.toFixed(1).replace(".", ",")} km`;
};

const fmtSpeed = (kmh) => {
  if (kmh === null || kmh === undefined) return "—";
  return `${kmh.toFixed(1).replace(".", ",")} km/t`;
};

const fmtDate = (s) => {
  if (!s) return "Seneste aktivitet";

  const d = new Date(s);

  return new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
};

function Metric({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <div className="metric-icon">
        <Icon size={17} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value ?? "—"}</strong>
      </div>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      className={`nav-btn ${active ? "active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

function HomeView({
  activity,
  live,
  refresh,
  loading,
  loadError,
  sessions,
  today,
  openWorkout,
}) {
  const upcoming = nextSession(sessions, today);
  const totalXp = earnedXp(sessions);
  const weekXp = earnedXp(weekSessions(sessions, mondayOf(today)));
  const nextRace = sessions
    .filter(
      (s) => s.type === "race" && s.status === "planned" && s.date >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const avgWatts = activity?.power?.average;
  const weightedWatts = activity?.power?.weighted;
  const maxWatts = activity?.power?.max;

  const hardestEffort =
    Array.isArray(activity?.efforts) && activity.efforts.length
      ? [...activity.efforts].sort((a, b) => (b.watts || 0) - (a.watts || 0))[0]
      : null;

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="pulse-dot" />
            PERFORMANCE HUB
          </div>

          <h1>God dag, Arthur.</h1>

          <p className="hero-copy">Næste mål starter med dagens træning.</p>
        </div>

        <div className="level-pill">
          <span>LEVEL</span>
          <b>{levelFor(totalXp)}</b>
        </div>
      </section>

      <NextWorkout session={upcoming} onOpen={openWorkout} />

      <div className="section-head">
        <div>
          <span className="kicker">INTERVALS.ICU</span>
          <h3>Seneste aktivitet</h3>
        </div>

        <button className="icon-btn" onClick={refresh} aria-label="Opdater">
          <RefreshCw size={18} className={loading ? "spin" : ""} />
        </button>
      </div>

      {loadError && (
        <p className="load-error" role="alert">
          {loadError}
        </p>
      )}
      {!activity ? (
        <section className="activity-card">
          <p className="form-hint">
            {loading
              ? "Henter din seneste aktivitet…"
              : "Ingen aktivitet at vise. Tryk Opdater for at prøve igen."}
          </p>
        </section>
      ) : (
        <section className="activity-card">
          <div className="activity-title">
            <div className="ride-badge">
              <Activity size={20} />
            </div>

            <div>
              <h2>{activity.name || "Cykeltur"}</h2>
              <p>{fmtDate(activity.date)}</p>
            </div>

            <span className={`source-chip ${live ? "live" : ""}`}>
              {live ? "LIVE DATA" : "SIDST HENTET"}
            </span>
          </div>

          <div className="metric-grid">
            <Metric
              icon={MapPin}
              label="Distance"
              value={fmtDistance(activity.distanceKm)}
            />

            <Metric
              icon={Timer}
              label="Tid"
              value={fmtDuration(activity.movingSeconds)}
            />

            <Metric
              icon={Gauge}
              label="Avg. fart"
              value={fmtSpeed(activity?.speed?.averageKmh)}
            />

            <Metric
              icon={Zap}
              label="Avg. watt"
              value={
                avgWatts !== null && avgWatts !== undefined
                  ? `${Math.round(avgWatts)} W`
                  : "—"
              }
              accent
            />

            <Metric
              icon={TrendingUp}
              label="Weighted"
              value={
                weightedWatts !== null && weightedWatts !== undefined
                  ? `${Math.round(weightedWatts)} W`
                  : "—"
              }
            />

            <Metric
              icon={Zap}
              label="Max watt"
              value={
                maxWatts !== null && maxWatts !== undefined
                  ? `${Math.round(maxWatts)} W`
                  : "—"
              }
            />
          </div>

          {hardestEffort && (
            <div className="effort-highlight">
              <div className="effort-icon">
                <Zap size={20} />
              </div>

              <div>
                <span className="kicker">HÅRDT RYK</span>

                <h3>
                  {hardestEffort.durationSeconds} sek ·{" "}
                  {Math.round(hardestEffort.watts)} W
                </h3>

                <p>
                  {hardestEffort.cadence
                    ? `${Math.round(hardestEffort.cadence)} rpm`
                    : "Automatisk fundet af Intervals.icu"}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="split-grid">
        <div className="mini-card race">
          <div className="mini-icon">
            <Trophy size={20} />
          </div>

          <span className="kicker">NÆSTE LØB</span>

          <h3>{nextRace?.title || "Næste start?"}</h3>
          <p>
            {nextRace
              ? dateLabel(nextRace.date, { day: "numeric", month: "long" })
              : "Tilføj et løb i din ugeplan."}
          </p>
        </div>

        <div className="mini-card xp">
          <div className="mini-icon">
            <Star size={20} />
          </div>

          <span className="kicker">DENNE UGE</span>

          <h3>{weekXp} XP</h3>

          <p>
            {500 - (totalXp % 500)} XP til Level {levelFor(totalXp) + 1}
          </p>

          <div className="progress">
            <i style={{ width: `${(totalXp % 500) / 5}%` }} />
          </div>
        </div>
      </section>

      <section className="coach-card">
        <div className="coach-label">
          <span>COACH NOTE</span>
          <b>01</b>
        </div>

        <h3>En god rytme slår en perfekt dag.</h3>

        <p>
          Planlæg sammen med din coach. Både træning og pauser tæller, og planen
          må gerne tilpasses, når benene eller hverdagen kalder på det.
        </p>

        <div className="coach-tags">
          <span>Træning</span>
          <span>Restitution</span>
        </div>
      </section>
    </>
  );
}

function Placeholder({ title, copy, icon: Icon }) {
  return (
    <section className="placeholder">
      <div className="placeholder-icon">
        <Icon size={34} />
      </div>

      <span className="kicker">KOMMER I NÆSTE BYG</span>

      <h2>{title}</h2>

      <p>{copy}</p>
    </section>
  );
}

function App() {
  const [tab, setTab] = useState("home");
  const [activity, setActivity] = useState(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { sessions, update, error: planError, blocked } = usePlan();
  const [today, setToday] = useState(todayKey);
  const [opened, setOpened] = useState(null);
  const [newWorkout, setNewWorkout] = useState(null);
  const loadingRef = React.useRef(false);
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const timer = setInterval(tick, 60000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  const closeWorkout = () => {
    setOpened(null);
    setNewWorkout(null);
  };
  const selectedWorkout = newWorkout || sessions.find((s) => s.id === opened);
  const openWorkout = (s) => {
    setTab("plan");
    if (s) setOpened(s.id);
    window.scrollTo({ top: 0 });
  };

  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError("");

    try {
      const r = await fetch("/api/latest-activity", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!r.ok) {
        throw new Error("API");
      }

      const data = await r.json();

      if (!data?.activity?.id) throw new Error("Invalid activity");
      if (data?.activity) {
        setActivity(data.activity);
        setLive(true);
      }
    } catch (e) {
      console.error("Kunne ikke hente aktivitet", e);
      setLive(false);
      setLoadError(
        "Kunne ikke opdatere fra Intervals.icu. Prøv igen om lidt. Eventuelle viste tal er fra seneste hentning.",
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  let content;

  if (tab === "home") {
    content = (
      <HomeView
        activity={activity}
        live={live}
        refresh={load}
        loading={loading}
        loadError={loadError}
        sessions={sessions}
        today={today}
        openWorkout={openWorkout}
      />
    );
  }

  if (tab === "plan") {
    content = (
      <TrainingView
        sessions={sessions}
        today={today}
        blocked={blocked}
        onOpen={(s) => setOpened(s.id)}
        onCreate={(date) => setNewWorkout(emptySession(date))}
        onDrafts={(monday) => {
          if (!weekSessions(sessions, monday).length)
            update([...sessions, ...weekDrafts(monday)]);
        }}
      />
    );
  }

  if (tab === "races") {
    content = (
      <Placeholder
        title="Løb"
        copy="Race cards med placering, watt, fart, analyse og udvikling fra løb til løb."
        icon={Trophy}
      />
    );
  }

  if (tab === "progress") {
    content = (
      <Placeholder
        title="Udvikling"
        copy="Power curve, personlige rekorder, belastning og de vigtigste trends — uden datastøj."
        icon={TrendingUp}
      />
    );
  }

  if (tab === "athlete") {
    content = (
      <Placeholder
        title="Arthur"
        copy="Levels, XP, badges, streaks og personlige milepæle."
        icon={Medal}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Bike size={22} />
          </div>

          <div>
            <b>ARTHUR</b>
            <span>CYCLING</span>
          </div>
        </div>

        <div className="avatar">AV</div>
      </header>

      <main>
        {planError && (
          <p className="form-error" role="alert">
            {planError}
          </p>
        )}
        {content}
      </main>
      {selectedWorkout && (
        <WorkoutDialog
          key={selectedWorkout.id}
          session={selectedWorkout}
          isNew={Boolean(newWorkout)}
          today={today}
          blocked={blocked}
          onClose={closeWorkout}
          onSave={(s) =>
            update(
              sessions.some((x) => x.id === s.id)
                ? sessions.map((x) => (x.id === s.id ? s : x))
                : [...sessions, s],
            )
          }
          onDelete={(id) => update(sessions.filter((s) => s.id !== id))}
          onStatus={(id, status) =>
            update(changeStatus(sessions, id, status, today))
          }
        />
      )}

      <nav className="bottom-nav">
        <NavButton
          icon={Home}
          label="Hjem"
          active={tab === "home"}
          onClick={() => setTab("home")}
        />

        <NavButton
          icon={CalendarDays}
          label="Træning"
          active={tab === "plan"}
          onClick={() => setTab("plan")}
        />

        <NavButton
          icon={Trophy}
          label="Løb"
          active={tab === "races"}
          onClick={() => setTab("races")}
        />

        <NavButton
          icon={TrendingUp}
          label="Udvikling"
          active={tab === "progress"}
          onClick={() => setTab("progress")}
        />

        <NavButton
          icon={Medal}
          label="Arthur"
          active={tab === "athlete"}
          onClick={() => setTab("athlete")}
        />
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
