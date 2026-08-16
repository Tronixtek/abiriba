import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAdminAuth } from "./AdminAuthContext";

export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth();
  if (status === "loading") return null;
  if (status === "signedOut") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
