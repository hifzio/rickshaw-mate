"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/types";

const KEY = "rs:profile";

/** Name + phone remembered on this device only (never sent anywhere except create/claim). */
export function useProfile() {
  const [profile, setProfileState] = useState<Profile | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfileState(JSON.parse(raw) as Profile);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable */
    }
  }, []);

  return { profile, setProfile };
}
