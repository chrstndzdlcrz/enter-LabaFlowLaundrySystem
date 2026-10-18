import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, ensureProfile } from "@/lib/api/profiles";
import type { Profile } from "@/lib/api/types";
import type { UserRole } from "@/lib/constants";
import { AuthContext, type AuthContextValue } from "./auth-context";

/**
 * Session source of truth.
 *
 * The auth listener is registered before the existing session is read, so the
 * initial restore is never missed. The callback stays synchronous and defers its
 * client calls, because awaiting the client inside the callback deadlocks it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingProfileRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (loadingProfileRef.current === userId) return;
    loadingProfileRef.current = userId;
    try {
      // ensureProfile is idempotent and creates the row on the first sign-in.
      const loaded = await ensureProfile().catch(async () => fetchProfile(userId));
      setProfile(loaded);
    } catch (error) {
      console.error("Lab a Day: profile load failed", error);
      setProfile(null);
    } finally {
      loadingProfileRef.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        setTimeout(() => {
          void loadProfile(nextSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      setSession(sessionData.session);
      setUser(sessionData.session?.user ?? null);
      if (sessionData.session?.user) {
        void loadProfile(sessionData.session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const loaded = await ensureProfile().catch(async () => fetchProfile(user.id));
    setProfile(loaded);
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = (profile?.role as UserRole | undefined) ?? null;
    return {
      user,
      session,
      profile,
      role,
      loading,
      isStaff: profile?.is_active === true && (role === "staff" || role === "admin"),
      isAdmin: profile?.is_active === true && role === "admin",
      refreshProfile,
      signOut,
    };
  }, [user, session, profile, loading, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
