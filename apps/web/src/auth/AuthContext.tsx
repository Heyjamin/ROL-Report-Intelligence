import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, errMessage } from '@/api/client';
import type { AuthUser } from './types';
import { ADMIN_ROLES } from './types';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (...perms: string[]) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
      setError(null);
    } catch (e) {
      setUser(null);
      setToken(null);
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<{
      access_token: string;
      user: AuthUser;
    }>('/auth/login', { username, password });
    setToken(data.access_token);
    setUser(data.user);
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) =>
      !!user && roles.some((r) => user.roles.includes(r)),
    [user],
  );

  const hasPermission = useCallback(
    (...perms: string[]) =>
      !!user && perms.some((p) => user.permissions.includes(p)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refresh,
      hasRole,
      hasPermission,
      isAdmin: hasRole(...ADMIN_ROLES),
    }),
    [user, loading, error, login, logout, refresh, hasRole, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
