import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/providers/auth-context";

/** Access the signed-in session, profile and role. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
