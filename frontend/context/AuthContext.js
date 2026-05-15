"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../app/firebase_SDK';
import { onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { setApiToken, getMe } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(fbUser) {
    const token = await fbUser.getIdToken(true);
    setApiToken(token);

    let retries = 3;
    let profileData = null;
    while (retries > 0) {
      try {
        profileData = await getMe();
        break;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('Token used too early') && retries > 1) {
          console.warn(`[Auth] Clock skew detected, retrying in 3s... (${retries - 1} left)`);
          await new Promise(r => setTimeout(r, 3000));
          const freshToken = await fbUser.getIdToken(true);
          setApiToken(freshToken);
          retries--;
        } else {
          console.error("Error fetching user profile:", err);
          break;
        }
      }
    }

    if (profileData) {
      setUser({ ...fbUser, ...profileData });
    } else {
      setUser({ ...fbUser, profile_exists: false });
    }
  }

  useEffect(() => {
    let isInitial = true;
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Keep API token fresh
        const token = await fbUser.getIdToken();
        setApiToken(token);
        
        // Fetch profile only on initial load
        if (isInitial) {
          setLoading(true);
          await fetchProfile(fbUser);
          setLoading(false);
          isInitial = false;
        }
      } else {
        setUser(null);
        setApiToken(null);
        setLoading(false);
        isInitial = false;
      }
    });

    return () => unsubscribe();
  }, []);

  /** Re-fetch /auth/me and merge into user state — call after a profile edit. */
  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    try {
      const profileData = await getMe();
      if (profileData) setUser((prev) => ({ ...prev, ...profileData }));
    } catch (err) {
      console.error('[Auth] refreshUser failed:', err);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setApiToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
