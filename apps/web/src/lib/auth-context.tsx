'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from './api';
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CommercialUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (accessToken: string) => {
    try {
      const profile = await apiClient<CommercialUser>('auth/me', { token: accessToken });
      setUser(profile);
      setToken(accessToken);
    } catch {
      setUser(null);
      setToken(null);
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetchProfile(session.access_token);
        }
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await fetchProfile(session.access_token);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session?.access_token) {
        await fetchProfile(data.session.access_token);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setToken(null);
    } finally {
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
