'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, getExams } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

/* ── Helpers ── */
const GENDER_OPTIONS = ['male', 'female', 'non-binary', 'prefer not to say', 'other'];

function Avatar({ user }) {
  // Firebase Google sign-in stores the photo URL in photoURL
  const photoURL = user?.photoURL || null;
  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || (user?.email?.[0]?.toUpperCase() ?? 'U');

  if (photoURL) {
    return (
      <div className="relative">
        <img
          src={photoURL}
          alt="Profile photo"
          referrerPolicy="no-referrer"
          className="w-28 h-28 rounded-full object-cover"
          style={{
            border: '3px solid rgba(69,240,244,0.35)',
            boxShadow: '0 0 32px rgba(69,240,244,0.15)',
          }}
        />
        <span
          className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#86db64] border-2 border-[#0D1117]"
          title="Online"
        />
      </div>
    );
  }

  return (
    <div
      className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold select-none"
      style={{
        background: 'linear-gradient(135deg, rgba(69,240,244,0.18), rgba(171,199,255,0.12))',
        border: '3px solid rgba(69,240,244,0.35)',
        boxShadow: '0 0 32px rgba(69,240,244,0.15)',
        color: '#45f0f4',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {initials}
    </div>
  );
}

function Field({ label, value, editValue, editing, onChange, type = 'text', readOnly = false, children }) {
  return (
    <div className="group">
      <label
        className="block text-[10px] font-bold tracking-widest uppercase mb-1.5"
        style={{ fontFamily: 'JetBrains Mono', color: '#414753' }}
      >
        {label}
        {readOnly && (
          <span
            className="ml-2 px-1.5 py-0.5 rounded text-[9px] align-middle"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#4b5563', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            read-only
          </span>
        )}
      </label>
      {children ? (
        children
      ) : readOnly ? (
        <p
          className="w-full px-4 py-3 rounded-xl text-sm"
          style={{
            background: 'rgba(22,27,34,0.4)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: '#6b7280',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {value || '—'}
        </p>
      ) : editing ? (
        <input
          type={type}
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="cyber-input"
          autoComplete="off"
          min={type === 'number' ? 1 : undefined}
          max={type === 'number' ? 120 : undefined}
        />
      ) : (
        <p
          className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
          style={{
            background: 'rgba(22,27,34,0.55)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: value ? '#e2e8f0' : '#4b5563',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {value || <span style={{ color: '#4b5563' }}>Not set</span>}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error,   setError]     = useState('');
  const [exams,   setExams]     = useState([]); // For the dropdown when editing

  const loadExams = async () => {
    try {
      const data = await getExams();
      if (data && data.exams) {
        setExams(data.exams);
      }
    } catch (e) {
      console.error('Failed to load exams', e);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Editable field state — pulled from AuthContext user (which mirrors /auth/me)
  const [form, setForm] = useState({
    first_name: '',
    last_name:  '',
    age:        '',
    gender:     '',
    exam_id:    '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        age:        user.age        != null ? String(user.age) : '',
        gender:     user.gender     || '',
        exam_id:    user.exam_id    != null ? String(user.exam_id) : '',
      });
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.profile_exists) {
    return (
      <AccessDenied
        title="Profile Unavailable"
        message="You need to be signed in with a registered account to view your profile."
      />
    );
  }

  function set(key) {
    return (val) => setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleCancel() {
    setEditing(false);
    setError('');
    setForm({
      first_name: user.first_name || '',
      last_name:  user.last_name  || '',
      age:        user.age != null ? String(user.age) : '',
      gender:     user.gender     || '',
      exam_id:    user.exam_id != null ? String(user.exam_id) : '',
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {
        first_name: form.first_name.trim() || null,
        last_name:  form.last_name.trim()  || null,
        age:        form.age ? parseInt(form.age, 10) : null,
        gender:     form.gender || null,
        exam_id:    form.exam_id ? parseInt(form.exam_id, 10) : null,
      };
      await updateProfile(payload);
      // Sync the AuthContext user with fresh DB data
      await refreshUser();
      setSuccess(true);

      setEditing(false);
      // Update the local form state to reflect saved values
      setForm({
        first_name: payload.first_name || '',
        last_name:  payload.last_name  || '',
        age:        payload.age != null ? String(payload.age) : '',
        gender:     payload.gender     || '',
        exam_id:    payload.exam_id != null ? String(payload.exam_id) : '',
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'User';

  const isGoogleUser = user?.providerData?.some?.(
    (p) => p?.providerId === 'google.com'
  ) ?? !!user?.photoURL;

  return (
    <div className="relative-z pt-8 pb-28 section-container max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-10">
        <p
          className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
          style={{ fontFamily: 'JetBrains Mono' }}
        >
          Account
        </p>
        <h1 className="text-3xl font-bold text-on-surface">My Profile</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Your personal information and account details.
        </p>
      </div>

      {/* ── Avatar + identity card ── */}
      <div
        className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-6"
        style={{ border: '1px solid rgba(69,240,244,0.1)' }}
      >
        <Avatar user={{ ...user, ...form }} />
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-white truncate">{displayName}</p>
          <p
            className="text-xs text-[#6b7280] mt-0.5 uppercase tracking-widest font-bold"
            style={{ fontFamily: 'JetBrains Mono' }}
          >
            {user?.plan || 'free'} Plan
          </p>
          {isGoogleUser && (
            <span
              className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'rgba(66,133,244,0.12)',
                border: '1px solid rgba(66,133,244,0.25)',
                color: '#6da4f8',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {/* Google colour-circle favicon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Signed in with Google
            </span>
          )}
        </div>
      </div>

      {/* ── Info fields card ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Card header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Personal Information</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {editing ? 'Make your changes and hit Save.' : 'Click Edit to update your details.'}
            </p>
          </div>
          {!editing ? (
            <button
              onClick={() => {
                setEditing(true);
                loadExams(); // Refetch to be sure
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105"
              style={{
                fontFamily: 'JetBrains Mono',
                background: 'rgba(69,240,244,0.08)',
                border: '1px solid rgba(69,240,244,0.2)',
                color: '#45f0f4',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150"
                style={{
                  fontFamily: 'JetBrains Mono',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#6b7280',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105 disabled:opacity-50"
                style={{
                  fontFamily: 'JetBrains Mono',
                  background: saving
                    ? 'rgba(69,240,244,0.05)'
                    : 'linear-gradient(135deg, rgba(69,240,244,0.18), rgba(171,199,255,0.1))',
                  border: '1px solid rgba(69,240,244,0.3)',
                  color: '#45f0f4',
                }}
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Fields grid */}
        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="First Name"
            value={form.first_name}
            editValue={form.first_name}
            editing={editing}
            onChange={set('first_name')}
          />
          <Field
            label="Last Name"
            value={form.last_name}
            editValue={form.last_name}
            editing={editing}
            onChange={set('last_name')}
          />
          
          <div className="sm:col-span-2">
            <Field
              label="Preparing For"
              value={user?.exam_name}
              editing={editing}
            >
              {editing ? (
                <div className="relative">
                  <select
                    value={form.exam_id}
                    onChange={(e) => set('exam_id')(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#161b22] border border-white/10 text-[#e2e8f0] text-sm appearance-none cursor-pointer focus:border-[#45f0f4] outline-none"
                    style={{ WebkitAppearance: 'none' }}
                  >
                    <option value="" className="bg-[#0D1117] text-[#6b7280]">Select an exam</option>
                    {exams.length > 0 ? (
                      exams.map(e => (
                        <option key={e.id} value={String(e.id)} className="bg-[#0D1117] text-[#e2e8f0]">
                          {e.exam_name}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-[#0D1117] text-[#6b7280]">Loading exams...</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b7280]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-white/5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-sm text-on-surface font-semibold">{user?.exam_name || 'Not selected'}</span>
                </div>
              )}
            </Field>
          </div>
          <Field
            label="Age"
            value={form.age ? `${form.age} years` : ''}
            editValue={form.age}
            editing={editing}
            onChange={set('age')}
            type="number"
          />

          {/* Gender — dropdown in edit mode */}
          <Field
            label="Gender"
            value={form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : ''}
            editValue={form.gender}
            editing={editing}
            onChange={set('gender')}
          >
            {editing ? (
              <select
                value={form.gender}
                onChange={(e) => set('gender')(e.target.value)}
                className="cyber-input"
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— Select —</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            ) : null}
          </Field>

          {/* Email — always read-only, spans full row */}
          <div className="sm:col-span-2">
            <Field
              label="Email Address"
              value={user.email}
              readOnly
            />
          </div>
        </div>

        {/* Status banner */}
        {(success || error) && (
          <div
            className="mx-6 mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
            style={{
              background: success
                ? 'rgba(134,219,100,0.08)'
                : 'rgba(239,68,68,0.08)',
              border: `1px solid ${success ? 'rgba(134,219,100,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: success ? '#86db64' : '#ef4444',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {success ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Profile updated successfully!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Account meta info ── */}
      <div className="glass-card rounded-2xl px-6 py-5 mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ fontFamily: 'JetBrains Mono', color: '#414753' }}>
            Account Type
          </p>
          <p className="text-sm font-semibold" style={{ color: user?.plan === 'premium' ? '#45f0f4' : '#e2e8f0' }}>
            {user?.plan === 'premium' ? '⚡ Premium' : '✦ Free'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ fontFamily: 'JetBrains Mono', color: '#414753' }}>
            Auth Provider
          </p>
          <p className="text-sm font-semibold text-[#e2e8f0]">
            {isGoogleUser ? 'Google' : 'Email / Password'}
          </p>
        </div>
      </div>
    </div>
  );
}
