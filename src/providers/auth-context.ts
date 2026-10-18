import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/constants";
import type { Profile } from "@/lib/api/types";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  /** True until the initial session restore and profile load have settled. */
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
