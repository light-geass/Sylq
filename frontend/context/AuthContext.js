"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../app/firebase_SDK';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { setApiToken } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUser(user);
        setApiToken(token); // Set token for API calls
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
