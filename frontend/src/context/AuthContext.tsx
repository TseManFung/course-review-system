import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

export interface User {
  userId: string;
  accessLevel: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setToken: (token: string | null) => void;
  login: (payload: { userId: string; password: string }) => Promise<void>;
  register: (payload: { userId: string; email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = (token: string | null) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/user/profile');
      if (res?.data) setUser(res.data);
    } catch {
      // ignore; profile may require more fields
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const status = await api.get('/auth/status');
      if (status.data?.authenticated) {
        setUser(status.data.user);
        await loadProfile();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login: AuthCtx['login'] = async ({ userId, password }) => {
    const res = await api.post('/auth/login', { userId, password });
    const token = res.data?.token as string;
    if (token) {
      setToken(token);
      await refresh();
    }
  };

  const register: AuthCtx['register'] = async (payload) => {
    await api.post('/auth/register', payload);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, setToken, login, register, logout }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
