"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const data = await apiFetch<{ user: SessionUser | null }>("/api/auth/me"); setUser(data.user); }
    finally { setLoading(false); }
  }, []);
  const logout = useCallback(async () => { await apiFetch("/api/auth/logout", { method: "POST" }); setUser(null); }, []);
  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const data = await apiFetch<{ user: SessionUser | null }>("/api/auth/me");
        if (data.user || !mounted) { if (mounted) setUser(data.user); return; }
        // Public portfolio/demo mode: create a demo session on the first visit.
        // Logging out still clears the current session and does not re-bootstrap
        // until the page is loaded again.
        await apiFetch("/api/auth/demo", { method: "POST" });
        const demo = await apiFetch<{ user: SessionUser | null }>("/api/auth/me");
        if (mounted) setUser(demo.user);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void bootstrap();
    return () => { mounted = false; };
  }, []);
  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
