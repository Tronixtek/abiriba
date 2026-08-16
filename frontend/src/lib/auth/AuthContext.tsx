import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAccessToken, setOnAuthExpired } from "@/lib/apiClient";
import type { Role } from "@/types";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
}

interface AuthState {
  status: "loading" | "signedOut" | "signedIn";
  user: AuthUser | null;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue extends AuthState {
  tenantId: string | null;
  tenantSlug: string | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpBusiness: (params: {
    email: string;
    phone: string;
    password: string;
    businessName: string;
    ownerName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(() => {
    setOnAuthExpired(() => setState({ status: "signedOut", user: null }));

    // On first load, attempt to restore a session from the refresh cookie.
    (async () => {
      try {
        const data = await api.post<AuthResponse>("/auth/refresh");
        setAccessToken(data.accessToken);
        setState({ status: "signedIn", user: data.user });
      } catch {
        setState({ status: "signedOut", user: null });
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const data = await api.post<AuthResponse>("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setState({ status: "signedIn", user: data.user });
  }

  async function signUpBusiness(params: {
    email: string;
    phone: string;
    password: string;
    businessName: string;
    ownerName: string;
  }) {
    const data = await api.post<AuthResponse>("/auth/signup", params);
    setAccessToken(data.accessToken);
    setState({ status: "signedIn", user: data.user });
  }

  async function signOut() {
    await api.post("/auth/logout").catch(() => undefined);
    setAccessToken(null);
    setState({ status: "signedOut", user: null });
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        tenantId: state.user?.tenantId ?? null,
        tenantSlug: state.user?.tenantSlug ?? null,
        role: state.user?.role ?? null,
        signIn,
        signUpBusiness,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
