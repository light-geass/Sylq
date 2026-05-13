"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../app/firebase_SDK';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { setApiToken, getMe } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        // Force a fresh token to avoid clock skew issues
        const token = await fbUser.getIdToken(true);
        setApiToken(token);
        
        // Retry logic for clock skew ("token used too early") errors
        let retries = 3;
        let profileData = null;
        while (retries > 0) {
          try {
            profileData = await getMe();
            break; // Success, exit loop
          } catch (err) {
            const msg = err.message || '';
            if (msg.includes('Token used too early') && retries > 1) {
              console.warn(`[Auth] Clock skew detected, retrying in 3s... (${retries - 1} left)`);
              await new Promise(r => setTimeout(r, 3000));
              // Refresh token again
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
          // If getMe failed or returned no data, profile doesn't exist
          setUser({ ...fbUser, profile_exists: false });
        }
      } else {
        setUser(null);
        setApiToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

    const signOut = async () => {
    await firebaseSignOut(auth);
    setApiToken(null);
    // No need to push, onAuthStateChanged will handle user state
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
