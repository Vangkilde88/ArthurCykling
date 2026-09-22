import React, { useState } from "react";
import { supabase } from "./client";
import "./account.css";

export function Account({ shared, localSessions, localBlocked, onImport }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const credentials = { email: email.trim(), password };
      const { error } =
        mode === "signup"
          ? await supabase.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo: "https://arthur-cykling.vercel.app/",
              },
            })
          : await supabase.auth.signInWithPassword(credentials);
      if (error) {
        setMessage(
          error.code === "email_not_confirmed"
            ? "Bekræft først din e-mail via beskeden fra Supabase. Vend derefter tilbage og log ind."
            : mode === "signup"
              ? "Kontoen kunne ikke oprettes. Brug din godkendte familie-e-mail. Hvis du allerede har en konto, vælg Log ind. Prøv igen om lidt ved for mange forsøg."
              : "Login mislykkedes. Kontrollér e-mail, adgangskode og internet. Kontoen skal være oprettet og e-mailen bekræftet.",
        );
        return;
      }
      setPassword("");
      if (mode === "signup") {
        setMode("login");
        setMessage(
          "Tjek din indbakke og bekræft e-mailen fra Supabase. Vend derefter tilbage til denne app og log ind på begge telefoner.",
        );
      }
    } catch {
      setMessage("Ingen forbindelse. Prøv igen, når du er online.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-card">
      <span className="kicker">SAMMEN OM PLANEN</span>
      <h1>Én plan. Begge telefoner.</h1>
      {shared.user ? (
        <>
          <p>
            Logget ind som <strong>{shared.user.email}</strong>
          </p>
          <p>
            Træninger og XP deles mellem de telefoner, hvor I er logget ind med
            samme familiekonto. Begge kan redigere og markere gennemført.
          </p>
          <button
            className="primary-btn"
            disabled={shared.busy}
            onClick={shared.refresh}
          >
            Hent fælles plan
          </button>
          {localSessions.length > 0 && (
            <div className="import-panel">
              <h3>Plan fra denne telefon</h3>
              <p>
                Der ligger {localSessions.length} lokale træninger. Du kan
                tilføje dem til den fælles plan. Træninger med samme ID i den
                fælles plan bevares, og den lokale kopi slettes ikke.
              </p>
              <button
                disabled={shared.blocked || localBlocked}
                onClick={async () => {
                  setMessage(
                    (await onImport())
                      ? "Planen er overført til familiekontoen."
                      : "Overførslen kunne ikke gemmes. Se beskeden ovenfor.",
                  );
                }}
              >
                Overfør lokale træninger
              </button>
            </div>
          )}
          <button
            disabled={shared.busy}
            onClick={async () => {
              const { error } = await supabase.auth.signOut({ scope: "local" });
              if (error) setMessage("Kunne ikke logge ud. Prøv igen.");
            }}
          >
            Log ud på denne telefon
          </button>
        </>
      ) : (
        <>
          <p>
            Log ind med samme familiekonto på din og Arthurs telefon. Så kan du
            lægge træninger ind, og han kan se planen og markere dem gennemført.
          </p>
          <p className="form-hint">
            Dit login til selve cykelappen oprettes her. Det er ikke din
            adgangskode til Supabase eller din mail.
          </p>
          <form onSubmit={submit} className="workout-form">
            <label>
              E-mail
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Adgangskode
              <input
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={mode === "signup" ? 10 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {mode === "signup" && (
              <p className="form-hint">
                Vælg mindst 10 tegn. Brug kun den familie-e-mail, som er
                godkendt til appen.
              </p>
            )}
            <button className="primary-btn" disabled={busy || !shared.ready}>
              {busy
                ? "Vent…"
                : mode === "signup"
                  ? "Opret familiekonto"
                  : "Log ind"}
            </button>
          </form>
          <button
            disabled={busy}
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMessage("");
            }}
          >
            {mode === "signup"
              ? "Tilbage til login"
              : "Første gang? Opret familiekonto"}
          </button>
          <p className="form-hint">
            Uden login gemmes planen kun på denne telefon. Efter login kan du
            vælge at overføre den.
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
