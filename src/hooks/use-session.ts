"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// The password-reset e-mail link lands here with "type=recovery" in the URL.
// Supabase consumes and clears it while starting up, possibly before any
// listener exists, so it is read once as the page loads.
const openedFromRecoveryLink =
  typeof window !== "undefined" && window.location.hash.includes("type=recovery");

// The signed-in session, kept current as the user signs in or out.
// `recovering` is true while the user still has to choose a new password.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return {
    session,
    loading,
    recovering,
    finishRecovery: () => setRecovering(false),
  };
}
