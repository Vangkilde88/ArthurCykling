import React, { useEffect, useRef, useState } from "react";
import {
  Bike,
  Zap,
  Dumbbell,
  Moon,
  Trophy,
  Wind,
  Leaf,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Pencil,
  Trash2,
  ArrowUpRight,
  Timer,
  Star,
} from "lucide-react";
import {
  TYPES,
  STATUSES,
  INTENSITIES,
  todayKey,
  mondayOf,
  addDays,
  dateLabel,
  dateObject,
  weekNumber,
  weekSessions,
  earnedXp,
  durationLabel,
  validateSession,
  canComplete,
  xpFor,
  intervalMinutes,
  wattLabel,
} from "./model";
import "./training.css";

const ICONS = {
  club: Bike,
  interval: Zap,
  easy: Wind,
  recovery: Leaf,
  strength: Dumbbell,
  race: Trophy,
  rest: Moon,
};
export function TypeIcon({ type, size = 20 }) {
  const Icon = ICONS[type] || Bike;
  return <Icon size={size} aria-hidden="true" />;
}
const statusLabel = (s, today) =>
  s.status === "planned" && s.date < today
    ? "Mangler registrering"
    : STATUSES[s.status];

function WorkoutShape({ session, large = false }) {
  if (session.type === "rest" || session.type === "recovery")
    return (
      <div className={`rest-art ${large ? "large" : ""}`} aria-hidden="true">
        <span />
        <span />
        <Moon size={large ? 42 : 26} />
      </div>
    );
  if (session.type === "strength")
    return (
      <div className="strength-art" aria-hidden="true">
        <Dumbbell size={large ? 64 : 30} />
        <span>STRENGTH</span>
      </div>
    );
  // Only a saved interval's duration and watt targets determine these bars.
  if (!session.steps.length)
    return (
      <div className="ride-art" aria-hidden="true">
        <TypeIcon type={session.type} size={large ? 62 : 32} />
        <span>{session.type === "race" ? "RACE DAY" : "RIDE ON"}</span>
      </div>
    );
  const max = Math.max(
    1,
    ...session.steps.map((s) => Number(s.wattsMax || s.wattsMin) || 0),
  );
  return (
    <div
      className={`workout-shape ${large ? "large" : ""}`}
      aria-label="Intervalprofil. Se varighed og wattmål i listen."
    >
      {session.steps.map((s, i) => (
        <i
          key={i}
          style={{
            flexGrow: s.minutes,
            height: `${s.wattsMin === "" ? 35 : 15 + (85 * Number(s.wattsMax || s.wattsMin)) / max}%`,
          }}
          title={`${s.label}: ${s.minutes} min · ${wattLabel(s)}`}
        />
      ))}
    </div>
  );
}

export function NextWorkout({ session, onOpen }) {
  return (
    <section
      className={`today-card next-plan-card tone-${session ? TYPES[session.type].color : "lime"}`}
    >
      <div className="today-top">
        <div>
          <span className="kicker">
            {session
              ? `${session.date === todayKey() ? "I DAG" : "NÆSTE I PLANEN"} · ${dateLabel(session.date, { weekday: "long", day: "numeric", month: "short" })}`
              : "DIN TRÆNINGSPLAN"}
          </span>
          <h2>{session?.title || "Klar til næste kapitel?"}</h2>
          <p>
            {session?.description ||
              "Saml cykling, styrke og hvile i din egen ugeplan."}
          </p>
        </div>
        <div className="workout-orb">
          <TypeIcon type={session?.type} size={28} />
        </div>
      </div>
      {session && (
        <div className="workout-strip">
          <div>
            <span>VARIGHED</span>
            <strong>
              {session.type === "rest"
                ? "Fri dag"
                : durationLabel(session.minutes)}
            </strong>
          </div>
          <div>
            <span>INTENSITET</span>
            <strong>{session.intensity}</strong>
          </div>
          <div>
            <span>XP</span>
            <strong>+{xpFor(session)}</strong>
          </div>
        </div>
      )}
      <button className="primary-btn" onClick={() => onOpen(session)}>
        {session ? "Se træningen" : "Lav din ugeplan"}
        <ChevronRight size={19} />
      </button>
    </section>
  );
}

export function TrainingView({
  sessions,
  today,
  onOpen,
  onCreate,
  onDrafts,
  blocked,
}) {
  const [monday, setMonday] = useState(mondayOf(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const current = mondayOf(today);
  const list = weekSessions(sessions, monday);
  const done = list.filter((s) => s.status === "completed");
  const approved = list.filter(
    (s) => s.status !== "draft" && s.status !== "skipped",
  );
  const minutes = approved.reduce((sum, s) => sum + s.minutes, 0);
  const selected = list.filter((s) => s.date === selectedDay);
  const spotlight = selected.find((s) => s.status === "planned") || selected[0];
  const moveWeek = (n) => {
    const next = addDays(monday, n * 7);
    setMonday(next);
    setSelectedDay(n === 0 ? today : next);
  };
  return (
    <div className="training-page">
      <header className="training-heading">
        <div>
          <div className="eyebrow">
            <span className="pulse-dot" /> DIN VEJ FREM
          </div>
          <h1>
            Små skridt.
            <br />
            <em>Stærkere rytter.</em>
          </h1>
          <p>Træning, pauser og alt det, der flytter dig.</p>
        </div>
        <span className="week-watermark" aria-hidden="true">
          {String(weekNumber(monday)).padStart(2, "0")}
        </span>
      </header>
      <section className="week-panel" aria-label="Ugeoversigt">
        <div className="week-toolbar">
          <div>
            <span className="kicker">
              {monday === current ? "DENNE UGE" : "UGEPLAN"}
            </span>
            <h2>
              Uge {weekNumber(monday)}{" "}
              <span>
                · {dateLabel(monday)} –{" "}
                {dateLabel(addDays(monday, 6), {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </h2>
          </div>
          <div className="week-arrows">
            <button
              className="icon-btn"
              aria-label="Forrige uge"
              onClick={() => moveWeek(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="icon-btn"
              aria-label="Næste uge"
              onClick={() => moveWeek(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        {monday !== current && (
          <button
            className="text-button"
            onClick={() => {
              setMonday(current);
              setSelectedDay(today);
            }}
          >
            Tilbage til denne uge
          </button>
        )}
        <div className="week-days">
          {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map(
            (date) => {
              const items = list.filter((s) => s.date === date);
              const complete =
                items.length > 0 &&
                items.every((s) => s.status === "completed");
              return (
                <button
                  key={date}
                  className={`day-button ${selectedDay === date ? "selected" : ""} ${date === today ? "is-today" : ""}`}
                  onClick={() => setSelectedDay(date)}
                  aria-pressed={date === selectedDay}
                  aria-label={dateLabel(date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                >
                  <span>
                    {dateLabel(date, { weekday: "short" }).slice(0, 3)}
                  </span>
                  <b>{dateObject(date).getUTCDate()}</b>
                  <span className="day-dots">
                    {complete ? (
                      <Check size={12} />
                    ) : (
                      items
                        .slice(0, 3)
                        .map((s) => (
                          <i
                            className={`tone-${TYPES[s.type].color}`}
                            key={s.id}
                          />
                        ))
                    )}
                  </span>
                </button>
              );
            },
          )}
        </div>
        <div className="week-stats">
          <div>
            <strong>
              {done.length}
              <small> / {approved.length}</small>
            </strong>
            <span>gennemført</span>
          </div>
          <div>
            <strong>{durationLabel(minutes)}</strong>
            <span>i din plan</span>
          </div>
          <div>
            <strong className="lime-text">
              {earnedXp(list)}
              <small> XP</small>
            </strong>
            <span>optjent i ugen</span>
          </div>
        </div>
        <div
          className="week-progress"
          role="progressbar"
          aria-label="Ugens gennemførte træninger"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, approved.length)}
          aria-valuenow={done.length}
        >
          <i
            style={{
              width: `${approved.length ? (done.length / approved.length) * 100 : 0}%`,
            }}
          />
        </div>
      </section>
      <section
        className={`day-spotlight tone-${spotlight ? TYPES[spotlight.type].color : "lime"}`}
      >
        <div className="spotlight-topline">
          <span className="kicker">
            {selectedDay === today
              ? "DAGENS FOKUS"
              : dateLabel(selectedDay, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
          </span>
          {spotlight && (
            <span className="workout-status">
              {statusLabel(spotlight, today)}
            </span>
          )}
        </div>
        <div className="spotlight-content">
          <div>
            <div className="spotlight-type">
              {spotlight ? TYPES[spotlight.type].label : "PLADS TIL DIN PLAN"}
            </div>
            <h2>{spotlight?.title || "Hvad skal dagen byde på?"}</h2>
            <p>
              {spotlight?.description ||
                "En tur med klubben, lidt styrke eller en velfortjent pause. Du og din coach bestemmer."}
            </p>
          </div>
          {spotlight ? (
            <WorkoutShape session={spotlight} large />
          ) : (
            <div className="empty-orbit" aria-hidden="true">
              <Bike size={46} />
            </div>
          )}
        </div>
        <div className="spotlight-footer">
          {spotlight ? (
            <>
              <span>
                <Timer size={15} />
                {spotlight.type === "rest"
                  ? "Fri dag"
                  : durationLabel(spotlight.minutes)}
              </span>
              <span>
                <Star size={15} />
                {spotlight.status === "completed" ? "+" : ""}
                {xpFor(spotlight)} XP
                {spotlight.status === "draft" ? " muligt" : ""}
              </span>
              <button onClick={() => onOpen(spotlight)}>
                Se detaljer
                <ArrowUpRight size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => onCreate(selectedDay)} disabled={blocked}>
              <Plus size={18} />
              Tilføj til dagen
            </button>
          )}
        </div>
      </section>
      <div className="timeline-heading">
        <div>
          <span className="kicker">HELE UGEN</span>
          <h2>Din rytme</h2>
        </div>
        <button
          className="secondary-btn"
          onClick={() => onCreate(selectedDay)}
          disabled={blocked}
        >
          <Plus size={17} />
          Tilføj
        </button>
      </div>
      {!list.length && (
        <div className="plan-onboarding">
          <span className="kicker">EN GOD START</span>
          <h3>Byg en uge, der passer til dig.</h3>
          <p>
            Start fra bunden eller indsæt en redigerbar skabelon med klubdage,
            styrke og hvile. Alle forslag starter som udkast.
          </p>
          <button
            className="text-button"
            onClick={() => onDrafts(monday)}
            disabled={blocked}
          >
            Indsæt uge som udkast <ChevronRight size={17} />
          </button>
        </div>
      )}
      <ol className="week-timeline">
        {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((date) => {
          const entries = list.filter((s) => s.date === date);
          return (
            <li
              key={date}
              className={`timeline-day ${date === today ? "today" : ""}`}
            >
              <div className="timeline-date">
                <span>{dateLabel(date, { weekday: "short" })}</span>
                <b>{dateObject(date).getUTCDate()}</b>
                {date === today && <small>I DAG</small>}
              </div>
              <div className="timeline-entries">
                {entries.length ? (
                  entries.map((s) => (
                    <button
                      key={s.id}
                      className={`session-row tone-${TYPES[s.type].color} ${s.type === "rest" ? "rest-row" : ""} ${s.status === "completed" ? "is-complete" : ""}`}
                      onClick={() => onOpen(s)}
                    >
                      <div className="session-type-icon">
                        {s.status === "completed" ? (
                          <Check size={20} />
                        ) : (
                          <TypeIcon type={s.type} />
                        )}
                      </div>
                      <div className="session-copy">
                        <span className="session-type-label">
                          {TYPES[s.type].label}{" "}
                          <span>· {statusLabel(s, today)}</span>
                        </span>
                        <h3>{s.title}</h3>
                        <p>
                          {s.type === "rest"
                            ? "Restitution er også en del af planen"
                            : `${durationLabel(s.minutes)} · ${s.intensity}`}
                        </p>
                      </div>
                      <div className="session-end">
                        <span>
                          {s.status === "skipped" ? "—" : `+${xpFor(s)} XP`}
                        </span>
                        <ChevronRight size={16} />
                      </div>
                      {s.steps.length > 0 && (
                        <div className="row-profile">
                          <WorkoutShape session={s} />
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <button
                    className="empty-day"
                    onClick={() => onCreate(date)}
                    disabled={blocked}
                  >
                    <span>Åben dag</span>
                    <Plus size={17} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="recovery-note">
        <Moon size={22} />
        <div>
          <strong>Pauser tæller også.</strong>
          <p>
            XP belønner din indsats og restitution. Flere watt giver ikke flere
            point.
          </p>
        </div>
      </div>
      <p className="storage-note">
        Planen gemmes på denne enhed · synkronisering mellem enheder kommer
        senere.
      </p>
    </div>
  );
}

export function WorkoutDialog({
  session,
  isNew,
  onClose,
  onSave,
  onDelete,
  onStatus,
  today,
  blocked,
}) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState(session);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const patch = (fields) => setDraft((d) => ({ ...d, ...fields }));
  const submit = (event) => {
    event.preventDefault();
    const clean = { ...draft, title: draft.title.trim() };
    const message = validateSession(clean);
    if (message) {
      setError(message);
      return;
    }
    if (onSave(clean)) onClose();
    else
      setError(
        "Kunne ikke gemme. Prøv igen, når browserens lager er tilgængeligt.",
      );
  };
  const updateStep = (i, field, value) =>
    patch({
      steps: draft.steps.map((s, j) =>
        i === j ? { ...s, [field]: value } : s,
      ),
    });
  const numeric = (value) => (value === "" ? "" : Number(value));
  const status = (value) => {
    if (onStatus(session.id, value)) onClose();
    else setError("Ændringen kunne ikke gemmes.");
  };
  return (
    <dialog
      ref={ref}
      className={`workout-dialog tone-${TYPES[session.type].color}`}
      onCancel={onClose}
      aria-labelledby="workout-dialog-title"
    >
      <div className="dialog-top">
        <span className="kicker">
          {editing
            ? isNew
              ? "NY I PLANEN"
              : "REDIGER TRÆNING"
            : TYPES[session.type].label}
        </span>
        <button className="icon-btn" onClick={onClose} aria-label="Luk træning">
          <X size={21} />
        </button>
      </div>
      {editing ? (
        <form onSubmit={submit} className="workout-form">
          <h2 id="workout-dialog-title">
            {isNew ? "Gør plads i planen." : "Tilpas din træning."}
          </h2>
          <p className="form-hint">
            Aftal indhold og wattmål med din coach. Udkast giver først XP, når
            de er planlagt og gennemført.
          </p>
          <label>
            Titel
            <input
              value={draft.title}
              maxLength={100}
              required
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Fx teknik med klubben"
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label>
              Dato
              <input
                type="date"
                required
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={draft.type}
                onChange={(e) => {
                  const type = e.target.value;
                  patch({
                    type,
                    ...(type === "rest"
                      ? {
                          minutes: 0,
                          intensity: "Fri",
                          steps: [],
                          exercises: [],
                        }
                      : draft.type === "rest"
                        ? { minutes: 30, intensity: "Let" }
                        : {}),
                  });
                }}
              >
                {Object.entries(TYPES).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              Varighed · minutter
              <input
                type="number"
                min={draft.type === "rest" ? 0 : 1}
                max={1440}
                step="0.1"
                required
                disabled={draft.type === "rest"}
                value={draft.minutes}
                onChange={(e) => patch({ minutes: numeric(e.target.value) })}
              />
            </label>
            <label>
              Intensitet
              <select
                value={draft.intensity}
                onChange={(e) => patch({ intensity: e.target.value })}
              >
                {INTENSITIES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Beskrivelse
            <textarea
              rows={3}
              value={draft.description}
              maxLength={3000}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Dagens fokus, mødested eller en besked fra coach…"
            />
          </label>
          {draft.type !== "rest" && (
            <fieldset>
              <legend>Intervaller & wattmål</legend>
              <p className="form-hint">
                Tilføj opvarmning, arbejde, pauser og afrulning i rækkefølge.
                Lad wattfelter stå tomme, hvis de ikke er aftalt.
              </p>
              {draft.steps.map((s, i) => (
                <div className="step-editor" key={i}>
                  <div className="step-editor-title">
                    <b>DEL {i + 1}</b>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Fjern interval ${i + 1}`}
                      onClick={() =>
                        patch({ steps: draft.steps.filter((_, j) => j !== i) })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label>
                    Navn
                    <input
                      required
                      maxLength={100}
                      value={s.label}
                      onChange={(e) => updateStep(i, "label", e.target.value)}
                    />
                  </label>
                  <div className="step-fields">
                    <label>
                      Minutter
                      <input
                        required
                        type="number"
                        min="0.1"
                        max="1440"
                        step="0.1"
                        value={s.minutes}
                        onChange={(e) =>
                          updateStep(i, "minutes", numeric(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Watt fra
                      <input
                        type="number"
                        min="0"
                        max="3000"
                        value={s.wattsMin}
                        onChange={(e) =>
                          updateStep(i, "wattsMin", numeric(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Watt til
                      <input
                        type="number"
                        min="0"
                        max="3000"
                        value={s.wattsMax}
                        onChange={(e) =>
                          updateStep(i, "wattsMax", numeric(e.target.value))
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="secondary-btn"
                disabled={draft.steps.length >= 50}
                onClick={() =>
                  patch({
                    steps: [
                      ...draft.steps,
                      { label: "", minutes: 5, wattsMin: "", wattsMax: "" },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Tilføj interval
              </button>
              {draft.steps.length > 0 && (
                <p className="form-hint">
                  Samlet intervaltid: {intervalMinutes(draft.steps)} min.{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      patch({ minutes: intervalMinutes(draft.steps) })
                    }
                  >
                    Brug som varighed
                  </button>
                </p>
              )}
            </fieldset>
          )}
          {draft.type === "strength" && (
            <fieldset>
              <legend>Styrkeøvelser</legend>
              {draft.exercises.map((e, i) => (
                <div className="exercise-editor" key={i}>
                  <label>
                    Øvelse
                    <input
                      required
                      maxLength={100}
                      value={e.name}
                      onChange={(event) =>
                        patch({
                          exercises: draft.exercises.map((x, j) =>
                            j === i ? { ...x, name: event.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Sæt, gentagelser eller tid
                    <input
                      required
                      maxLength={100}
                      value={e.dose}
                      placeholder="Fx 2 × 8 rolige gentagelser"
                      onChange={(event) =>
                        patch({
                          exercises: draft.exercises.map((x, j) =>
                            j === i ? { ...x, dose: event.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      patch({
                        exercises: draft.exercises.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Fjern øvelse {i + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-btn"
                disabled={draft.exercises.length >= 30}
                onClick={() =>
                  patch({
                    exercises: [...draft.exercises, { name: "", dose: "" }],
                  })
                }
              >
                <Plus size={16} />
                Tilføj øvelse
              </button>
            </fieldset>
          )}
          <label>
            Status
            <select
              value={draft.status}
              disabled={["completed", "skipped"].includes(session.status)}
              onChange={(e) => patch({ status: e.target.value })}
            >
              {Object.entries(STATUSES)
                .filter(([v]) =>
                  ["draft", "planned", session.status].includes(v),
                )
                .map(([v, label]) => (
                  <option value={v} key={v}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <p className="form-hint">
            {xpFor(draft)} XP ved gennemførelse · samme point uanset intensitet.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-btn" disabled={blocked}>
            Gem {draft.status === "draft" ? "udkast" : "træning"}
            <Check size={18} />
          </button>
        </form>
      ) : (
        <div className="workout-detail">
          <span className="detail-date">
            {dateLabel(session.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <h2 id="workout-dialog-title">{session.title}</h2>
          <div className="detail-tags">
            <span>{statusLabel(session, today)}</span>
            <span>{session.intensity}</span>
          </div>
          <WorkoutShape session={session} large />
          <div className="detail-metrics">
            <div>
              <Timer size={18} />
              <strong>
                {session.type === "rest"
                  ? "Fri dag"
                  : durationLabel(session.minutes)}
              </strong>
            </div>
            <div>
              <Star size={18} />
              <strong>+{xpFor(session)} XP</strong>
            </div>
          </div>
          <p className="detail-description">
            {session.description || "Ingen beskrivelse endnu."}
          </p>
          {session.status === "draft" && (
            <div className="draft-notice">
              Dette er et udkast. Tilpas det med din coach, og vælg “Planlagt”
              under Rediger.
            </div>
          )}
          {session.steps.length > 0 && (
            <section>
              <h3>Dit pas, trin for trin</h3>
              <ol className="interval-list">
                {session.steps.map((s, i) => (
                  <li key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{s.label}</strong>
                      <p>{s.minutes} min</p>
                    </div>
                    <b>{wattLabel(s)}</b>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {session.exercises.length > 0 && (
            <section>
              <h3>Styrke & teknik</h3>
              <ol className="exercise-list">
                {session.exercises.map((e, i) => (
                  <li key={i}>
                    <Dumbbell size={20} />
                    <div>
                      <strong>{e.name}</strong>
                      <p>{e.dose}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {session.status === "completed" && (
            <div className="completion-banner">
              <Check size={22} />
              <div>
                <strong>Godt gået, Arthur!</strong>
                <p>+{xpFor(session)} XP er registreret én gang.</p>
              </div>
            </div>
          )}
          {canComplete(session, today) && (
            <button
              className="primary-btn"
              disabled={blocked}
              onClick={() => status("completed")}
            >
              <Check size={18} />
              {session.type === "rest"
                ? "Hviledag holdt"
                : "Markér gennemført"}{" "}
              · +{xpFor(session)} XP
            </button>
          )}
          {session.status === "planned" && session.date > today && (
            <p className="form-hint">
              Du kan markere gennemført på dagen eller senere.
            </p>
          )}
          <div className="detail-actions">
            <button
              className="secondary-btn"
              disabled={blocked || session.status === "completed"}
              onClick={() => {
                setDraft(session);
                setEditing(true);
              }}
            >
              <Pencil size={16} />
              Rediger
            </button>
            {session.status === "planned" && (
              <button
                className="text-button"
                disabled={blocked}
                onClick={() => status("skipped")}
              >
                Spring over
              </button>
            )}
            {["completed", "skipped"].includes(session.status) && (
              <button
                className="text-button"
                disabled={blocked}
                onClick={() => status("planned")}
              >
                Fortryd{" "}
                {session.status === "completed"
                  ? "gennemførelse"
                  : "spring over"}
              </button>
            )}
            <button
              className="icon-btn delete-button"
              disabled={blocked}
              aria-label="Slet træning"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          {deleting && (
            <div className="delete-confirm" role="alert">
              <p>
                Slet denne træning
                {session.status === "completed" ? " og dens XP" : ""}?
              </p>
              <button
                className="secondary-btn"
                onClick={() => {
                  if (onDelete(session.id)) onClose();
                  else setError("Kunne ikke slette træningen.");
                }}
              >
                Ja, slet
              </button>
              <button
                className="text-button"
                onClick={() => setDeleting(false)}
              >
                Behold
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
