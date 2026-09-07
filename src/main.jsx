import React, {useEffect, useMemo, useState} from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, Trophy, CalendarDays, Dumbbell, Zap, Gauge, Timer, MapPin,
  ChevronRight, Flame, Star, Bike, TrendingUp, Home, Medal, RefreshCw
} from "lucide-react";
import "./styles.css";

const fmtDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}t ${m}m` : `${m} min`;
};
const fmtDistance = (m) => m ? `${(m/1000).toFixed(1).replace(".", ",")} km` : "—";
const fmtSpeed = (mps) => mps ? `${(mps*3.6).toFixed(1).replace(".", ",")} km/t` : "—";
const fmtDate = (s) => {
  if (!s) return "Seneste aktivitet";
  const d = new Date(s);
  return new Intl.DateTimeFormat("da-DK", {weekday:"long", day:"numeric", month:"long"}).format(d);
};

const demo = {
  id: "demo",
  name: "Klubtræning",
  date: new Date().toISOString(),
  distance: 47200,
  movingTime: 5460,
  avgSpeed: 8.58,
  avgWatts: 103,
  weightedWatts: 127,
  load: 71
};

function Metric({icon:Icon, label, value, accent=false}) {
  return <div className={`metric ${accent ? "accent" : ""}`}>
    <div className="metric-icon"><Icon size={17}/></div>
    <div><span>{label}</span><strong>{value ?? "—"}</strong></div>
  </div>
}

function NavButton({icon:Icon, label, active, onClick}) {
  return <button className={`nav-btn ${active ? "active" : ""}`} onClick={onClick}>
    <Icon size={20}/><span>{label}</span>
  </button>
}

function HomeView({activity, live, refresh, loading}) {
  return <>
    <section className="hero">
      <div>
        <div className="eyebrow"><span className="pulse-dot"/> PERFORMANCE HUB</div>
        <h1>God dag, Arthur.</h1>
        <p className="hero-copy">Næste mål starter med dagens træning.</p>
      </div>
      <div className="level-pill">
        <span>LEVEL</span><b>12</b>
      </div>
    </section>

    <section className="today-card">
      <div className="today-top">
        <div>
          <span className="kicker">NÆSTE TRÆNING · TIRSDAG</span>
          <h2>Klubtræning</h2>
          <p>Fokus: accelerationer efter sving og placering i feltet.</p>
        </div>
        <div className="workout-orb"><Bike size={28}/></div>
      </div>
      <div className="workout-strip">
        <div><span>VARIGHED</span><strong>~90 min</strong></div>
        <div><span>INTENSITET</span><strong>Hård</strong></div>
        <div><span>XP</span><strong>+50</strong></div>
      </div>
      <button className="primary-btn">Se træningen <ChevronRight size={19}/></button>
    </section>

    <div className="section-head">
      <div>
        <span className="kicker">INTERVALS.ICU</span>
        <h3>Seneste aktivitet</h3>
      </div>
      <button className="icon-btn" onClick={refresh} aria-label="Opdater">
        <RefreshCw size={18} className={loading ? "spin" : ""}/>
      </button>
    </div>

    <section className="activity-card">
      <div className="activity-title">
        <div className="ride-badge"><Activity size={20}/></div>
        <div>
          <h2>{activity.name || "Cykeltur"}</h2>
          <p>{fmtDate(activity.date)}</p>
        </div>
        <span className={`source-chip ${live ? "live" : ""}`}>{live ? "LIVE DATA" : "DEMO"}</span>
      </div>

      <div className="metric-grid">
        <Metric icon={MapPin} label="Distance" value={fmtDistance(activity.distance)} />
        <Metric icon={Timer} label="Tid" value={fmtDuration(activity.movingTime)} />
        <Metric icon={Gauge} label="Avg. fart" value={fmtSpeed(activity.avgSpeed)} />
        <Metric icon={Zap} label="Avg. watt" value={activity.avgWatts ? `${Math.round(activity.avgWatts)} W` : "—"} accent />
        <Metric icon={TrendingUp} label="Weighted" value={activity.weightedWatts ? `${Math.round(activity.weightedWatts)} W` : "—"} />
        <Metric icon={Flame} label="Belastning" value={activity.load ? Math.round(activity.load) : "—"} />
      </div>
    </section>

    <section className="split-grid">
      <div className="mini-card race">
        <div className="mini-icon"><Trophy size={20}/></div>
        <span className="kicker">NÆSTE LØB</span>
        <h3>Licensløb</h3>
        <p>12 dage</p>
        <div className="countdown">12<span>DAGE</span></div>
      </div>

      <div className="mini-card xp">
        <div className="mini-icon"><Star size={20}/></div>
        <span className="kicker">DENNE UGE</span>
        <h3>340 XP</h3>
        <p>160 XP til Level 13</p>
        <div className="progress"><i style={{width:"68%"}}/></div>
      </div>
    </section>

    <section className="coach-card">
      <div className="coach-label"><span>COACH NOTE</span><b>01</b></div>
      <h3>Ugens fokus</h3>
      <p>Du har farten. Nu træner vi evnen til hurtigt at lukke hullet efter accelerationer og sving.</p>
      <div className="coach-tags"><span>⚡ Acceleration</span><span>🚴 Feltposition</span></div>
    </section>
  </>
}

function Placeholder({title, copy, icon:Icon}) {
  return <section className="placeholder">
    <div className="placeholder-icon"><Icon size={34}/></div>
    <span className="kicker">KOMMER I NÆSTE BYG</span>
    <h2>{title}</h2>
    <p>{copy}</p>
  </section>
}

function App() {
  const [tab,setTab] = useState("home");
  const [activity,setActivity] = useState(demo);
  const [live,setLive] = useState(false);
  const [loading,setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/latest-activity");
      if (!r.ok) throw new Error("API");
      const data = await r.json();
      if (data?.activity) {
        setActivity(data.activity);
        setLive(true);
      }
    } catch(e) {
      setLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); },[]);

  let content;
  if (tab === "home") content = <HomeView activity={activity} live={live} refresh={load} loading={loading}/>;
  if (tab === "plan") content = <Placeholder title="Ugeplan" copy="Cykling, klubtræning, styrke og restitution samlet i én levende ugeplan." icon={CalendarDays}/>;
  if (tab === "races") content = <Placeholder title="Løb" copy="Race cards med placering, watt, fart, analyse og udvikling fra løb til løb." icon={Trophy}/>;
  if (tab === "progress") content = <Placeholder title="Udvikling" copy="Power curve, personlige rekorder, belastning og de vigtigste trends — uden datastøj." icon={TrendingUp}/>;
  if (tab === "athlete") content = <Placeholder title="Arthur" copy="Levels, XP, badges, streaks og personlige milepæle." icon={Medal}/>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Bike size={22}/></div>
        <div><b>ARTHUR</b><span>CYCLING</span></div>
      </div>
      <div className="avatar">AV</div>
    </header>
    <main>{content}</main>
    <nav className="bottom-nav">
      <NavButton icon={Home} label="Hjem" active={tab==="home"} onClick={()=>setTab("home")}/>
      <NavButton icon={CalendarDays} label="Træning" active={tab==="plan"} onClick={()=>setTab("plan")}/>
      <NavButton icon={Trophy} label="Løb" active={tab==="races"} onClick={()=>setTab("races")}/>
      <NavButton icon={TrendingUp} label="Udvikling" active={tab==="progress"} onClick={()=>setTab("progress")}/>
      <NavButton icon={Medal} label="Arthur" active={tab==="athlete"} onClick={()=>setTab("athlete")}/>
    </nav>
  </div>
}

createRoot(document.getElementById("root")).render(<App/>);
