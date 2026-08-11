import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "@/types";

/**
 * Route-level convenience only — hides pages a role shouldn't see. The
 * actual security boundary is the `authorize` middleware on the backend.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, role } = useAuth();

  if (status === "loading") return null;
  if (status === "signedOut") return <Navigate to="/login" replace />;
  if (!role || !roles.includes(role)) return <Navigate to="/app" replace />;

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return null;
  if (status === "signedOut") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
