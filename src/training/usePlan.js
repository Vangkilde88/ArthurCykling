import { useEffect, useState } from "react";
import { STORAGE_KEY, parsePlan } from "./model";

export function usePlan() {
  const [initial] = useState(() => {
    try {
      return {
        sessions: parsePlan(localStorage.getItem(STORAGE_KEY)),
        error: "",
      };
    } catch {
      return {
        sessions: [],
        error:
          "Den gemte plan kunne ikke læses. Genindlæs eller prøv den oprindelige browser. Vi overskriver ikke dine data.",
      };
    }
  });
  const [sessions, setSessions] = useState(initial.sessions);
  const [error, setError] = useState(initial.error);
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  // A failed initial read never silently destroys a saved plan.
  const update = (next) => {
    if (blocked) return false;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, sessions: next }),
      );
      setSessions(next);
      setError("");
      return true;
    } catch {
      setError(
        "Kunne ikke gemme. Ændringen er ikke gemt. Kontrollér browserens lagerplads og prøv igen.",
      );
      return false;
    }
  };
  useEffect(() => {
    const receive = (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      try {
        setSessions(parsePlan(event.newValue));
        setError(initial.error);
      } catch {
        setBlocked(true);
        setError(
          "Planen blev ændret i et andet vindue og kunne ikke læses. Genindlæs før du redigerer videre.",
        );
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [initial.error]);
  return { sessions, update, error, blocked };
}
