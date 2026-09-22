import { useEffect, useRef, useState } from "react";
import { supabase } from "./client";
import { parsePlan } from "../training/model";

export function useSharedPlan(paused = false) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(null),
    current = useRef(null),
    writing = useRef(false);
  const pause = useRef(paused);
  pause.current = paused;
  const sequence = useRef(0);
  const accept = (value) => {
    parsePlan(JSON.stringify({ version: 1, sessions: value.sessions }));
    current.current = value;
    setRow(value);
  };
  useEffect(() => {
    let alive = true;
    const receive = (session) => {
      if (!alive) return;
      const next = session?.user ?? null;
      if (active.current?.id !== next?.id) {
        sequence.current++;
        active.current = next;
        current.current = null;
        setRow(null);
        setError("");
      }
      setUser(next);
      setReady(true);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => receive(session));
    supabase.auth
      .getSession()
      .then(({ data, error: issue }) => {
        if (!alive) return;
        if (issue) {
          setError("Kunne ikke læse dit login. Genindlæs og prøv igen.");
          return;
        }
        receive(data.session);
      })
      .catch(() => {
        if (alive)
          setError("Kunne ikke læse dit login. Genindlæs og prøv igen.");
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const refresh = async (force = false) => {
    const account = active.current;
    if (!account || writing.current || (!force && pause.current)) return;
    const request = ++sequence.current;
    try {
      let { data, error: issue } = await supabase
        .from("family_plans")
        .select("*")
        .eq("owner_id", account.id)
        .maybeSingle();
      if (issue) throw issue;
      if (!data) {
        const created = await supabase
          .from("family_plans")
          .insert({ owner_id: account.id, sessions: [], revision: 0 })
          .select()
          .single();
        if (created.error?.code === "23505") return refresh(force);
        if (created.error) throw created.error;
        data = created.data;
      }
      if (
        request !== sequence.current ||
        active.current?.id !== account.id ||
        (!force && pause.current)
      )
        return;
      accept(data);
      setError("");
    } catch {
      if (request === sequence.current)
        setError(
          "Kunne ikke hente den fælles plan. Kontrollér internet og at du bruger familiekontoen. Viste træninger er fra seneste hentning.",
        );
    }
  };
  useEffect(() => {
    if (!user) return;
    refresh();
    const tick = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const timer = setInterval(tick, 10000);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
      document.removeEventListener("visibilitychange", tick);
      sequence.current++;
    };
  }, [user?.id, paused]);

  const update = async (sessions) => {
    const previous = current.current,
      account = active.current;
    if (!previous || !account || writing.current) return false;
    writing.current = true;
    sequence.current++;
    setBusy(true);
    setError("");
    try {
      parsePlan(JSON.stringify({ version: 1, sessions }));
      const { data, error: issue } = await supabase
        .from("family_plans")
        .update({ sessions, revision: previous.revision + 1 })
        .eq("owner_id", account.id)
        .eq("revision", previous.revision)
        .select()
        .maybeSingle();
      if (active.current?.id !== account.id) return false;
      if (issue) throw issue;
      if (!data) {
        setError(
          "Planen er ændret på en anden telefon. Din ændring blev ikke gemt. Luk træningen, hent planen og prøv igen.",
        );
        return false;
      }
      accept(data);
      return true;
    } catch {
      setError(
        "Ændringen kunne ikke bekræftes gemt. Kontrollér internet, luk træningen og hent planen igen før du prøver på ny.",
      );
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  return {
    user,
    ready,
    sessions: row?.sessions ?? [],
    revision: row?.revision,
    updatedAt: row?.updated_at,
    error,
    busy,
    blocked: !ready || (Boolean(user) && !row) || busy,
    update,
    refresh: () => refresh(true),
  };
}
