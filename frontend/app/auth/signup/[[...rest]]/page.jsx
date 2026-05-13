"use client";

import { useState, useEffect } from 'react';
import { auth } from '@/app/firebase_SDK';
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    email: '',
  });
  const [verificationEmail, setVerificationEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'sent' | 'confirmEmail'
  const router = useRouter();

  const actionCodeSettings = {
    url: typeof window !== 'undefined' ? `${window.location.origin}/auth/signup` : '',
    handleCodeInApp: true,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      const storedEmail = window.localStorage.getItem('emailForSignUp');
      if (storedEmail) {
        const signupData = JSON.parse(window.localStorage.getItem('signupData') || '{}');
        signInWithEmailLink(auth, storedEmail, window.location.href)
          .then(async (result) => {
            const user = result.user;
            await updateProfile(user, {
              displayName: `${signupData.firstName || ''} ${signupData.lastName || ''}`.trim(),
            });
            
            // Force token refresh to ensure fresh token
            const idToken = await user.getIdToken(true);
            
            try {
              const response = await axios.post(
                'http://localhost:8000/auth/register-profile',
                {
                  firstName: signupData.firstName,
                  lastName: signupData.lastName,
                  age: signupData.age,
                  gender: signupData.gender,
                  email: storedEmail,
                },
                { headers: { Authorization: `Bearer ${idToken}` } }
              );
              
              window.localStorage.removeItem('emailForSignUp');
              window.localStorage.removeItem('signupData');
              router.push('/dashboard');
            } catch (apiErr) {
              console.error('Profile registration error:', apiErr.response?.data || apiErr.message);
              setError(apiErr.response?.data?.detail || apiErr.message || 'Failed to register profile.');
            }
          })
          .catch((err) => {
            console.error('Email link sign-in error:', err);
            setError(err.message || 'Failed to complete sign up with email link.');
          });
      } else {
        setStep('confirmEmail');
        setInfo('Please enter the email used to sign up to complete registration.');
      }
    }
  }, [router]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`,
      });
      const idToken = await user.getIdToken();
      await axios.post(
        'http://localhost:8000/auth/register-profile',
        {
          ...formData,
          email: user.email,
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      await sendSignInLinkToEmail(auth, formData.email, actionCodeSettings);
      window.localStorage.setItem('emailForSignUp', formData.email);
      window.localStorage.setItem('signupData', JSON.stringify(formData));
      setInfo('A sign-up link has been sent to your email. Open your email and click the link to complete registration.');
      setStep('sent');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send sign-up link.');
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
      window.localStorage.removeItem('emailForSignUp');
      window.localStorage.removeItem('signupData');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete sign up.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="relative-z min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Join GATER</h1>
          <p className="text-sm text-[#8b919f]">
            {step === 'input' ? 'Start your journey to success' : 'Enter the verification code'}
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
              {loading ? 'Completing sign up...' : 'Complete Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => setStep('input')}
              className="w-full text-xs text-[#8b919f] hover:text-white transition-colors"
            >
              Back to registration
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0b] px-2 text-[#414753]">Or sign up with email</span></div>
            </div>

            <form onSubmit={handleSendEmailLink} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">First Name</label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Last Name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Age</label>
                  <input
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                    placeholder="21"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="cyber-input w-full px-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-on-surface focus:border-[#45f0f4] transition-all"
                    required
                  >
                    <option value="" disabled>Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-[#414753]">Email</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
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
                {loading ? 'Sending link...' : 'Send Sign-Up Link'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-[#6b7280]">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#45f0f4] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
