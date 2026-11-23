import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
}

interface AuthContextValue {
  user: User | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const verifyAdminSession = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setAdminProfile(null);
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAdminProfile(data.user ?? null);
        setIsAdmin(data.user?.role === 'admin');
        setAuthError(null);
      } else if (res.status === 403) {
        setAdminProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? null,
          role: 'user',
        });
        setIsAdmin(false);
        setAuthError(null);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }
    } catch {
      setAdminProfile(null);
      setIsAdmin(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(true);
      void verifyAdminSession(firebaseUser);
    });
    return () => unsubscribe();
  }, [verifyAdminSession]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      await verifyAdminSession(result.user);
    } catch (error: unknown) {
      const errCode = (error as { code?: string })?.code;
      if (errCode !== 'auth/popup-closed-by-user') {
        setAuthError('Unable to complete Google Sign-In. Please allow popups and try again.');
      }
      setAuthLoading(false);
    }
  }, [verifyAdminSession]);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setUser(null);
    setAdminProfile(null);
    setIsAdmin(false);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        adminProfile,
        isAdmin,
        authLoading,
        authError,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
