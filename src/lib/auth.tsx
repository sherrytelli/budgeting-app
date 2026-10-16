/**
 * Authentication state. The bearer token from the login route is persisted in
 * secure storage; this provider hydrates it on boot, exposes sign-in/out, and
 * wires the API client's 401 handler so an expired token ends the session.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { login as apiLogin } from '@/lib/api/auth';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { clearToken, getToken, setToken } from '@/lib/api/token';

export interface AuthApi {
  /** True once the persisted token has been read. */
  ready: boolean;
  token: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate the persisted token before the UI decides which screen to show.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await getToken();
      if (!mounted) return;
      setTokenState(stored);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setTokenState(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    await setToken(result.access_token);
    setTokenState(result.access_token);
  }, []);

  const api = useMemo<AuthApi>(() => ({ ready, token, signIn, signOut }), [ready, token, signIn, signOut]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
