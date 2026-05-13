"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/app/firebase_SDK';
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { setApiToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'sent' | 'confirmEmail'
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const actionCodeSettings = {
    url: typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : '',
    handleCodeInApp: true,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      const storedEmail = window.localStorage.getItem('emailForSignIn');
      if (storedEmail) {
        signInWithEmailLink(auth, storedEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            router.push('/dashboard');
          })
          .catch((err) => {
            console.error(err);
            setError(err.message || 'Failed to sign in with email link.');
          });
      } else {
        setStep('confirmEmail');
        setInfo('Please enter your email to complete sign in.');
      }
    }
  }, [router]);

  if (authLoading || user) return null;

  const handleSendEmailLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setInfo('A sign-in link has been sent to your email. Open your email and click the link to continue. (Also check your spam folder just in case)');
      setStep('sent');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      await signInWithEmailLink(auth, verificationEmail, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Force fresh token and wait a moment for clock sync
      const idToken = await user.getIdToken(true);
      setApiToken(idToken);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative-z min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-sm glass-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-[#8b919f]">
            {step === 'input' ? 'Sign in to your account' : 'Enter the verification code'}
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {info && (
          <div className="p-3 text-xs bg-surface-container-low border border-white/10 text-white rounded-lg">
            {info}
          </div>
        )}

        {step === 'confirmEmail' ? (
          <form onSubmit={handleConfirmEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Email</label>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cyber-btn-cyan w-full py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Completing sign in...' : 'Complete Sign In'}
            </button>

            <button
              type="button"
              onClick={() => setStep('input')}
              className="w-full text-xs text-[#8b919f] hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleSendEmailLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="cyber-btn-cyan w-full py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Send Sign-In Link'}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0b] px-2 text-[#414753]">Or continue with</span></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          </div>
        )}

        <p className="text-center text-xs text-[#6b7280]">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-[#45f0f4] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
