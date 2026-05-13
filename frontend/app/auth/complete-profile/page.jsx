"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);

      // Check if profile already exists
      try {
        const response = await axios.get('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (response.data.first_name) {
          // Profile complete, redirect to home
          router.push('/');
        }
      } catch (err) {
        // Profile doesn't exist or incomplete, continue
      }
    };
    checkUser();
  }, [router]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const idToken = session?.access_token;
      if (!idToken) throw new Error('Failed to get auth token');

      await axios.post(
        'http://localhost:8000/auth/register-profile',
        { ...formData, email: user.email },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      router.push('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative-z min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-sm text-[#8b919f]">Just a few more details to get started</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="cyber-btn-cyan w-full py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}