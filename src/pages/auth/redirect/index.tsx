import { Navigate } from "react-router-dom";
import { ProfileUnavailable } from "@/components/auth/profile-unavailable";
import { FullPageLoader } from "@/components/common/loading-state";
import { useAuth } from "@/hooks/use-auth";

/** Sends a signed-in user to the area their role belongs to. */
const RoleRedirect = () => {
  const { user, role, loading, profile } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <ProfileUnavailable />;
  if (role === "admin" || role === "staff") return <Navigate to="/manage" replace />;
  return <Navigate to="/app" replace />;
};

export default RoleRedirect;
