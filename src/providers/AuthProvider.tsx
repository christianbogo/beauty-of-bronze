import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase/app";

const ADMIN_EMAILS = new Set<string>([
  "christianbcutter@yahoo.com",
  "beautyofbronzencw@gmail.com",
  "cutter.christian@wenatcheeschools.org",
]);

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: !!user?.email && ADMIN_EMAILS.has(user.email),
      async signInWithGoogle() {
        await signInWithPopup(auth, googleProvider);
      },
      async signOutUser() {
        await signOut(auth);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
