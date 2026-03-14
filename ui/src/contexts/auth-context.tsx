/**
 * Auth Context - Dashboard authentication state management
 * Provides auth status and login/logout functions globally.
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  checkAuth,
  login as apiLogin,
  logout as apiLogout,
  startGoogleLogin as apiStartGoogleLogin,
} from '@/lib/auth-api';

interface AuthContextValue {
  /** Whether authentication is required for this dashboard */
  authRequired: boolean;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Username of authenticated user */
  username: string | null;
  /** Display name of authenticated user */
  displayName: string | null;
  /** Auth provider used by current session */
  authProvider: 'google' | 'password' | null;
  /** Role granted to current session */
  role: 'admin' | null;
  /** Whether Google login is available */
  googleLoginEnabled: boolean;
  /** Whether auth check is in progress */
  loading: boolean;
  /** Login with credentials */
  login: (username: string, password: string) => Promise<void>;
  /** Start Google OAuth login */
  startGoogleLogin: () => void;
  /** Logout current session */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authRequired, setAuthRequired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<'google' | 'password' | null>(null);
  const [role, setRole] = useState<'admin' | null>(null);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
      .then((res) => {
        setAuthRequired(res.authRequired);
        setIsAuthenticated(res.authenticated);
        setUsername(res.username);
        setDisplayName(res.displayName ?? res.username);
        setAuthProvider(res.authProvider ?? null);
        setRole(res.role ?? null);
        setGoogleLoginEnabled(Boolean(res.googleLoginEnabled));
      })
      .catch(() => {
        // If check fails, assume no auth required (backward compat)
        setAuthRequired(false);
        setIsAuthenticated(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const res = await apiLogin(user, password);
    setIsAuthenticated(true);
    setUsername(res.username);
    setDisplayName(res.username);
    setAuthProvider('password');
    setRole(null);
  }, []);

  const startGoogleLogin = useCallback(() => {
    apiStartGoogleLogin();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setUsername(null);
    setDisplayName(null);
    setAuthProvider(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({
      authRequired,
      isAuthenticated,
      username,
      displayName,
      authProvider,
      role,
      googleLoginEnabled,
      loading,
      login,
      startGoogleLogin,
      logout,
    }),
    [
      authRequired,
      isAuthenticated,
      username,
      displayName,
      authProvider,
      role,
      googleLoginEnabled,
      loading,
      login,
      startGoogleLogin,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
