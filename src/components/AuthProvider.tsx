import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Target } from 'lucide-react';
import { LoginScreen } from './LoginScreen';
import { AccessDenied } from './AccessDenied';

const ALLOWED_EMAILS = [
  "launchpadstudioagency@gmail.com",
  "molelekishoez@gmail.com",
  "investors@intentfirsthunter.co.za",
  "visitor@intentfirsthunter.co.za",
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const logLoginAttempt = async (user: User | null) => {
    if (!user) return;
    try {
      const isAuth = ALLOWED_EMAILS.includes(user.email || '');
      await addDoc(collection(db, 'login_attempts'), {
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        isAuthorized: isAuth,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging login attempt:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAuth = user ? ALLOWED_EMAILS.includes(user.email || '') : false;
      setUser(user);
      setIsAuthorized(isAuth);
      setLoading(false);
      
      if (user) {
        logLoginAttempt(user);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthorized, signIn, signInWithEmail, resetPassword, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthorized, logOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <div className="w-12 h-12 rounded-xl bg-[#5a8c12] flex items-center justify-center shadow-lg shadow-[#5a8c12]/20 animate-pulse mb-4">
          <Target className="text-white w-8 h-8" />
        </div>
        <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Preemptly...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isAuthorized) {
    return <AccessDenied onSignOut={logOut} userEmail={user.email} />;
  }

  return <>{children}</>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
