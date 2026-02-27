import React, { createContext, useContext, useState, useCallback } from 'react';

interface FakeUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: FakeUser | null;
  session: unknown;
  isAdmin: boolean;
  isLoading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'shashankyadavk12@gmail.com';
const ADMIN_PASSWORD = 'Yadav7900';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FakeUser | null>(() => {
    const saved = localStorage.getItem('uf_demo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem('uf_demo_user');
    if (!saved) return false;
    return JSON.parse(saved).email === ADMIN_EMAIL;
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const admin = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    if (email === ADMIN_EMAIL && password !== ADMIN_PASSWORD) {
      return { error: new Error('Invalid password') };
    }
    const fakeUser = { id: crypto.randomUUID(), email };
    localStorage.setItem('uf_demo_user', JSON.stringify(fakeUser));
    setUser(fakeUser);
    setIsAdmin(admin);
    return { error: null, isAdmin: admin };
  }, []);

  const signUp = useCallback(async (email: string, _password: string) => {
    const fakeUser = { id: crypto.randomUUID(), email };
    localStorage.setItem('uf_demo_user', JSON.stringify(fakeUser));
    setUser(fakeUser);
    setIsAdmin(false);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('uf_demo_user');
    setUser(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session: null, isAdmin, isLoading: false, isOffline: !navigator.onLine, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
