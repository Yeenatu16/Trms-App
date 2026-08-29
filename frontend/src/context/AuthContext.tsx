"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  facilityId: string | null;
  department?: string | null;
  phone?: string | null;
  profilePicture?: string | null;
  sex?: string;
  age?: number;
   createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string, role: string, authCode?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
  signup: async () => { },
  refreshUser: async () => { },
});

const ROLE_ROUTES: Record<string, string> = {
  ADMINISTRATOR: '/admin/dashboard',
  NURSE: '/nurse',
  LIAISON_OFFICER: '/triage',
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Decode a JWT payload without verifying the signature (safe — backend still validates)
  const decodeJwtPayload = (token: string): any | null => {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  // Helper to get cookie
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
  };

  // Helper to set cookie
  const setCookie = (name: string, value: string, days: number = 7) => {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
  };

  // Helper to remove cookie
  const removeCookie = (name: string) => {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  };

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = getCookie('trms_token');

      // Set axios default header before the session call so the server can
      // pick up the Bearer token even if the HttpOnly cookie has expired.
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }

      try {
        const res = await axios.get('http://localhost:3001/auth/session', {
          withCredentials: true,
        });

        if (res.data && res.data.token) {
          // Server returned a fresh token — use it
          setCookie('trms_token', res.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          setUser(res.data.user);
        } else if (res.data && res.data.id) {
          // Older shape without a returned token
          setUser(res.data);
        } else if (storedToken) {
          // Session endpoint returned null (cookie may have expired) but we
          // still have a cookie token — try to restore user from it locally.
          // The backend will verify the signature on every real API call anyway.
          const payload = decodeJwtPayload(storedToken);
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser({
              id: payload.sub,
              email: payload.email,
              role: payload.role,
              facilityId: payload.facilityId ?? null,
              firstName: '',
              lastName: '',
            });
          } else {
            // Token is genuinely expired — clear everything
            removeCookie('trms_token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        // Network/server error — if we have a token, keep it and try to decode
        if (storedToken) {
          const payload = decodeJwtPayload(storedToken);
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser({
              id: payload.sub,
              email: payload.email,
              role: payload.role,
              facilityId: payload.facilityId ?? null,
              firstName: '',
              lastName: '',
            });
          } else {
            removeCookie('trms_token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const redirectByRole = (role: string) => {
    const route = ROLE_ROUTES[role] ?? '/triage';
    router.push(route);
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post(
      'http://localhost:3001/auth/login',
      { email, password },
      { withCredentials: true }
    );
    const u = res.data.user;
    const t = res.data.token;
    if (t) {
      setCookie('trms_token', t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    }
    setUser(u);
    redirectByRole(u.role);
  };

  const signup = async (name: string, email: string, password: string, role: string, authCode?: string) => {
    const res = await axios.post(
      'http://localhost:3001/auth/signup',
      { name, email, password, role, authCode },
      { withCredentials: true }
    );
    const u = res.data.user;
    const t = res.data.token;
    if (t) {
      setCookie('trms_token', t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    }
    setUser(u);
    redirectByRole(u.role);
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:3001/auth/logout', {}, { withCredentials: true });
    } catch { }
    removeCookie('trms_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users/profile', {
        withCredentials: true,
      });
      setUser(res.data);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, signup, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
