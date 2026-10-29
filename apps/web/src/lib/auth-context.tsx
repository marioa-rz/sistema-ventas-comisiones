'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { apiClient } from './api';
import { SessionRequestGuard } from './session-request-guard';
import { supabase } from './supabase';

export interface CommercialUser {
  id: string;
  authUserId: string;
  displayName: string;
  role: 'ADMIN' | 'SELLER';
}

interface AuthContextType {
  user: CommercialUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CommercialUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CommercialUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestGuard = useRef(new SessionRequestGuard());

  const clearSession = () => {
    requestGuard.current.clear();
    setUser(null);
    setToken(null);
  };

  const fetchProfile = async (accessToken: string): Promise<CommercialUser> => {
    const profile = await apiClient<CommercialUser>('auth/me', { token: accessToken });
    if (requestGuard.current.isCurrent(accessToken)) {
      setUser(profile);
      setToken(accessToken);
    }
    return profile;
  };

  useEffect(() => {
    const initAuth = async () => {
      let requestedToken: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          requestedToken = session.access_token;
          requestGuard.current.activate(session.access_token);
          await fetchProfile(session.access_token);
        }
      } catch {
        const requestIsCurrent = requestedToken
          ? requestGuard.current.isCurrent(requestedToken)
          : !requestGuard.current.hasActiveSession();
        if (requestIsCurrent) {
          clearSession();
          await supabase.auth.signOut();
        }
      } finally {
        if (
          (requestedToken && requestGuard.current.isCurrent(requestedToken)) ||
          (!requestedToken && !requestGuard.current.hasActiveSession())
        ) {
          setLoading(false);
        }
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        requestGuard.current.activate(session.access_token);
        setLoading(true);
        void fetchProfile(session.access_token)
          .catch(async () => {
            if (requestGuard.current.isCurrent(session.access_token)) {
              clearSession();
              await supabase.auth.signOut();
              setLoading(false);
            }
          })
          .finally(() => {
            if (requestGuard.current.isCurrent(session.access_token)) setLoading(false);
          });
      } else {
        clearSession();
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<CommercialUser> => {
    setLoading(true);
    let attemptedToken: string | null = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session?.access_token) throw new Error('Supabase no devolvió una sesión válida.');
      attemptedToken = data.session.access_token;
      requestGuard.current.activate(attemptedToken);
      const profile = await fetchProfile(attemptedToken);
      return profile;
    } catch (error) {
      const attemptIsCurrent = attemptedToken
        ? requestGuard.current.isCurrent(attemptedToken)
        : !requestGuard.current.hasActiveSession();
      if (attemptIsCurrent) {
        clearSession();
        await supabase.auth.signOut();
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    requestGuard.current.clear();
    try {
      await supabase.auth.signOut();
    } finally {
      clearSession();
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
