"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { log, short } from "@/lib/logger";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthValue {
  user: User | null;
  uid: string | null;
  /** True until the stored session (if any) has been read. */
  loading: boolean;
  /** Name from the Google profile, if any. */
  displayName: string;
  signInWithGoogle: () => Promise<AuthResult>;
  sendEmailCode: (email: string) => Promise<AuthResult>;
  verifyEmailCode: (email: string, code: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    let alive = true;

    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
      log.info(
        "auth",
        data.session
          ? `Signed in (user ${short(data.session.user.id)})`
          : "Browsing as guest. Sign-in is only needed to post or share a ride.",
      );
    });

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN") log.success("auth", `Signed in (user ${short(session?.user.id)})`);
      if (event === "SIGNED_OUT") log.info("auth", "Signed out");
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    log.info("auth", "Redirecting to Google…");
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      log.error("auth", `Google sign-in failed: ${error.message}. Is the Google provider enabled in Supabase?`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const sendEmailCode = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    if (error) {
      log.error("auth", `Could not send the email code: ${error.message}`);
      return { ok: false, error: error.message };
    }
    log.success("auth", "Sign-in code emailed");
    return { ok: true };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string): Promise<AuthResult> => {
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      log.warn("auth", `Code rejected: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return {
      user,
      uid: user?.id ?? null,
      loading,
      displayName: meta?.full_name ?? meta?.name ?? "",
      signInWithGoogle,
      sendEmailCode,
      verifyEmailCode,
      signOut,
    };
  }, [user, loading, signInWithGoogle, sendEmailCode, verifyEmailCode, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
