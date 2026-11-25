import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider, isSoleAdminEmail } from '../lib/firebase';

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

  const evaluateAdminSession = useCallback((firebaseUser: User | null) => {
    if (!firebaseUser) {
      setAdminProfile(null);
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    const emailVerified = firebaseUser.emailVerified !== false;
    const authorized = emailVerified && isSoleAdminEmail(firebaseUser.email);

    setAdminProfile({
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? null,
      role: authorized ? 'admin' : 'user',
    });
    setIsAdmin(authorized);
    setAuthError(null);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      evaluateAdminSession(firebaseUser);
    });
    return () => unsubscribe();
  }, [evaluateAdminSession]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      evaluateAdminSession(result.user);
    } catch (error: unknown) {
      const errCode = (error as { code?: string })?.code;
      if (errCode === 'auth/unauthorized-domain') {
        setAuthError(
          'This domain is not yet authorized in Firebase Auth. Add this domain under Firebase Console → Authentication → Settings → Authorized domains.'
        );
      } else if (errCode !== 'auth/popup-closed-by-user') {
        setAuthError('Unable to complete Google Sign-In. Please allow popups and try again.');
      }
      setAuthLoading(false);
    }
  }, [evaluateAdminSession]);

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
