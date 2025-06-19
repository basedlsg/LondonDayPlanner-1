import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Skip auth check in demo mode
    console.log('Skipping auth check - demo mode');
    setUser(null);
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setError('Authentication is disabled in demo mode');
    setIsLoading(false);
    throw new Error('Authentication is disabled in demo mode');
  };

  const loginWithGoogle = async (credential: string) => {
    setError('Authentication is disabled in demo mode');
    setIsLoading(false);
    throw new Error('Authentication is disabled in demo mode');
  };

  const register = async (email: string, password: string, name: string) => {
    setError('Authentication is disabled in demo mode');
    setIsLoading(false);
    throw new Error('Authentication is disabled in demo mode');
  };

  const logout = async () => {
    setUser(null);
    setIsLoading(false);
    setLocation('/');
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};