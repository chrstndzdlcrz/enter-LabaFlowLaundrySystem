import { Navigate, useLocation } from "react-router-dom";
import { AccountInactive } from "@/components/auth/account-inactive";
import { FullPageLoader } from "@/components/common/loading-state";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/lib/constants";

/**
 * Client-side routing guard. It decides which area of the app a user sees, but it
 * is not the security boundary - row level security and the backend functions
 * enforce every rule on the server.
 */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, profile, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!profile) return <FullPageLoader label="Setting up your account…" />;

  if (!profile.is_active) return <AccountInactive />;

  if (!role || !roles.includes(role)) {
    return <Navigate to={role === "customer" ? "/app" : "/manage"} replace />;
  }

  return <>{children}</>;
}
