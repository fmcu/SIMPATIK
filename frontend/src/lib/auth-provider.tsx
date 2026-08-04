"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

export type AppRole =
  | "PIMPINAN"
  | "PRODUCT_OWNER"
  | "PETUGAS_KANWIL"
  | "KOORDINATOR_UPT"
  | "PETUGAS_UPT"
  | "ADMIN_SIMPATIK"
  | "SYSTEM_ADMIN";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  uptId?: string | null;
  active: boolean;
};

type AppSession = {
  session: { id: string; userId: string; expiresAt: Date };
  user: SessionUser;
};

type AuthContextValue = ReturnType<typeof authClient.useSession> & {
  session: AppSession | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionState = authClient.useSession();
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <AuthContext.Provider
      value={{ ...sessionState, session: sessionState.data as AppSession | null, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}

export function useRequireSession() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isPending && !auth.session) {
      const returnTo = pathname === "/" ? "" : `?returnTo=${encodeURIComponent(pathname)}`;
      router.replace(`/login${returnTo}`);
    }
  }, [auth.isPending, auth.session, pathname, router]);

  return auth;
}
