import { createClient } from "@supabase/supabase-js";
// Public identifiers only. Database RLS enforces access; no service key in the app.
export const supabase = createClient(
  "https://nmeyqjggqagsmxarhuer.supabase.co",
  "sb_publishable_N8lqQR4EgPAOPMQIA1n0fA_Lf08rLfT",
  {
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          signal: options?.signal
            ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        }),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
