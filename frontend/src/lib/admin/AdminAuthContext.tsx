import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi, setAdminAccessToken, setOnAdminAuthExpired } from "@/lib/admin/adminApiClient";

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

interface AdminAuthState {
  status: "loading" | "signedOut" | "signedIn";
  admin: AdminUser | null;
}

interface AdminAuthResponse {
  accessToken: string;
  admin: AdminUser;
}

interface AdminAuthContextValue extends AdminAuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({ status: "loading", admin: null });

  useEffect(() => {
    setOnAdminAuthExpired(() => setState({ status: "signedOut", admin: null }));

    (async () => {
      try {
        const data = await adminApi.post<AdminAuthResponse>("/admin/auth/refresh");
        setAdminAccessToken(data.accessToken);
        setState({ status: "signedIn", admin: data.admin });
      } catch {
        setState({ status: "signedOut", admin: null });
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const data = await adminApi.post<AdminAuthResponse>("/admin/auth/login", { email, password });
    setAdminAccessToken(data.accessToken);
    setState({ status: "signedIn", admin: data.admin });
  }

  async function signOut() {
    await adminApi.post("/admin/auth/logout").catch(() => undefined);
    setAdminAccessToken(null);
    setState({ status: "signedOut", admin: null });
  }

  return (
    <AdminAuthContext.Provider value={{ ...state, signIn, signOut }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
