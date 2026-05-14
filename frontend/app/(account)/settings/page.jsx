'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AccessDenied from '@/components/AccessDenied';

/* ── Toggle Switch Component ── */
function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 flex-shrink-0"
      style={{
        background: enabled ? 'rgba(69,240,244,0.8)' : 'rgba(255,255,255,0.1)',
        border: enabled ? '1px solid rgba(69,240,244,0.5)' : '1px solid rgba(255,255,255,0.1)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full transition-all duration-200"
        style={{
          background: enabled ? '#0D1117' : 'rgba(255,255,255,0.5)',
          transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
          boxShadow: enabled ? '0 0 8px rgba(69,240,244,0.4)' : 'none',
        }}
      />
    </button>
  );
}

/* ── Section Card ── */
function SettingsSection({ icon, title, description, children, danger = false }) {
  return (
    <div
      className="glass-card rounded-2xl overflow-hidden mb-5"
      style={{
        border: danger ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: `1px solid ${danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'}` }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(69,240,244,0.1)',
            border: danger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(69,240,244,0.2)',
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: danger ? '#ef4444' : '#e2e8f0' }}>{title}</p>
          {description && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{description}</p>}
        </div>
      </div>
      <div className="px-6 py-4 space-y-0">{children}</div>
    </div>
  );
}

/* ── Row inside a section ── */
function SettingsRow({ label, description, children }) {
  return (
    <div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="pr-4 flex-1">
        <p className="text-sm font-medium" style={{ color: '#c1c6d5', fontFamily: 'Inter, sans-serif' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // ── Notification prefs ──
  const [notifs, setNotifs] = useState({
    test_reminders: true,
    weekly_digest:  true,
    course_updates: false,
    promo_emails:   false,
  });

  // ── Appearance ──
  const [compactMode, setCompactMode]     = useState(false);
  const [animationsOn, setAnimationsOn]   = useState(true);

  // ── Privacy ──
  const [privacy, setPrivacy] = useState({
    analytics: true,
    crash_reports: true,
  });

  // ── Danger zone state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]             = useState('');

  const [saved, setSaved] = useState(false);

  function setNotif(key) {
    return (val) => setNotifs((prev) => ({ ...prev, [key]: val }));
  }

  function handleSavePreferences() {
    // In a real app, POST these to /auth/me or a preferences endpoint
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

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
        title="Settings Unavailable"
        message="You need to be signed in to access account settings."
      />
    );
  }

  const isGoogleUser = user?.providerData?.some?.((p) => p?.providerId === 'google.com') ?? !!user?.photoURL;

  return (
    <div className="relative-z pt-8 pb-32 section-container max-w-2xl">
      {/* ── Page Header ── */}
      <div className="mb-10">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
          Account
        </p>
        <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Manage your notifications, preferences, and privacy controls.
        </p>
      </div>

      {/* ── Notifications ── */}
      <SettingsSection
        title="Notifications"
        description="Control what emails and alerts you receive."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        }
      >
        <SettingsRow label="Test Reminders" description="Get reminded about incomplete tests and study streaks.">
          <Toggle enabled={notifs.test_reminders} onChange={setNotif('test_reminders')} />
        </SettingsRow>
        <SettingsRow label="Weekly Digest" description="A weekly summary of your progress and upcoming goals.">
          <Toggle enabled={notifs.weekly_digest} onChange={setNotif('weekly_digest')} />
        </SettingsRow>
        <SettingsRow label="Course Updates" description="Be notified when new content is added to your courses.">
          <Toggle enabled={notifs.course_updates} onChange={setNotif('course_updates')} />
        </SettingsRow>
        <SettingsRow label="Promotions & Offers" description="Occasional offers on premium plans and new courses.">
          <Toggle enabled={notifs.promo_emails} onChange={setNotif('promo_emails')} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection
        title="Appearance"
        description="Customize how the interface looks and feels."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        }
      >
        <SettingsRow label="Compact Mode" description="Reduce padding and spacing for a denser layout.">
          <Toggle enabled={compactMode} onChange={setCompactMode} />
        </SettingsRow>
        <SettingsRow label="Animations" description="Enable smooth transitions and micro-animations.">
          <Toggle enabled={animationsOn} onChange={setAnimationsOn} />
        </SettingsRow>
        <SettingsRow label="Theme" description="The platform uses a dark cyberpunk theme.">
          <span
            className="px-3 py-1 rounded-lg text-xs font-mono font-bold"
            style={{ background: 'rgba(69,240,244,0.08)', border: '1px solid rgba(69,240,244,0.2)', color: '#45f0f4' }}
          >
            Dark (default)
          </span>
        </SettingsRow>
      </SettingsSection>

      {/* ── Privacy & Security ── */}
      <SettingsSection
        title="Privacy & Security"
        description="Control data sharing and account security."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        }
      >
        <SettingsRow label="Usage Analytics" description="Help us improve by sharing anonymous usage data.">
          <Toggle enabled={privacy.analytics} onChange={(v) => setPrivacy((p) => ({ ...p, analytics: v }))} />
        </SettingsRow>
        <SettingsRow label="Crash Reports" description="Automatically send error reports to help fix bugs.">
          <Toggle enabled={privacy.crash_reports} onChange={(v) => setPrivacy((p) => ({ ...p, crash_reports: v }))} />
        </SettingsRow>
        <SettingsRow
          label="Password"
          description={isGoogleUser ? 'Managed by Google — cannot be changed here.' : 'Change your account password.'}
        >
          {isGoogleUser ? (
            <span
              className="px-3 py-1 rounded-lg text-xs font-mono"
              style={{ background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)', color: '#6da4f8' }}
            >
              Google SSO
            </span>
          ) : (
            <button
              className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105"
              style={{
                fontFamily: 'JetBrains Mono',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#8b919f',
              }}
            >
              Change
            </button>
          )}
        </SettingsRow>
        <SettingsRow label="Active Sessions" description="You are currently signed in on this device.">
          <button
            onClick={async () => { await signOut(); router.push('/'); }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105"
            style={{
              fontFamily: 'JetBrains Mono',
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#f87171',
            }}
          >
            Sign Out All
          </button>
        </SettingsRow>
      </SettingsSection>

      {/* ── Billing & Orders ── */}
      <SettingsSection
        title="Billing & Orders"
        description="View your purchase history and receipts."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        }
      >
        <SettingsRow label="Current Plan" description="Manage your subscription on the Pricing page.">
          <a
            href="/pricing"
            className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105 inline-block text-center"
            style={{
              fontFamily: 'JetBrains Mono',
              background: user?.plan === 'premium'
                ? 'rgba(69,240,244,0.1)'
                : 'rgba(255,255,255,0.05)',
              border: user?.plan === 'premium'
                ? '1px solid rgba(69,240,244,0.25)'
                : '1px solid rgba(255,255,255,0.08)',
              color: user?.plan === 'premium' ? '#45f0f4' : '#8b919f',
            }}
          >
            {user?.plan === 'premium' ? '⚡ Premium' : 'Upgrade'}
          </a>
        </SettingsRow>
        <SettingsRow label="Order History" description="View all your past transactions and invoices.">
          <a
            href="/orders"
            className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105"
            style={{
              fontFamily: 'JetBrains Mono',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#8b919f',
            }}
          >
            View All
          </a>
        </SettingsRow>
      </SettingsSection>

      {/* ── Linked Accounts ── */}
      <SettingsSection
        title="Linked Accounts"
        description="External accounts connected to your profile."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        }
      >
        <SettingsRow
          label="Google"
          description={isGoogleUser ? `Connected as ${user?.email}` : 'Not connected.'}
        >
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
            style={
              isGoogleUser
                ? { background: 'rgba(134,219,100,0.08)', border: '1px solid rgba(134,219,100,0.2)', color: '#86db64' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }
            }
          >
            <span className="w-2 h-2 rounded-full" style={{ background: isGoogleUser ? '#86db64' : '#4b5563' }} />
            {isGoogleUser ? 'Connected' : 'Not linked'}
          </span>
        </SettingsRow>
      </SettingsSection>

      {/* ── Save Preferences button ── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleSavePreferences}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-200 hover:scale-105"
          style={{
            fontFamily: 'JetBrains Mono',
            background: saved
              ? 'rgba(134,219,100,0.12)'
              : 'linear-gradient(135deg, rgba(69,240,244,0.15), rgba(171,199,255,0.08))',
            border: saved ? '1px solid rgba(134,219,100,0.3)' : '1px solid rgba(69,240,244,0.25)',
            color: saved ? '#86db64' : '#45f0f4',
            boxShadow: saved ? '0 0 20px rgba(134,219,100,0.1)' : '0 0 20px rgba(69,240,244,0.08)',
          }}
        >
          {saved ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Save Preferences
            </>
          )}
        </button>
        <a href="/profile" className="text-xs text-[#6b7280] hover:text-[#45f0f4] transition-colors underline underline-offset-2" style={{ fontFamily: 'Inter' }}>
          Edit personal info →
        </a>
      </div>

      {/* ── Danger Zone ── */}
      <SettingsSection
        danger
        title="Danger Zone"
        description="Irreversible actions that affect your entire account."
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      >
        {!showDeleteConfirm ? (
          <SettingsRow
            label="Delete Account"
            description="Permanently delete your account and all associated data. This cannot be undone."
          >
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:scale-105"
              style={{
                fontFamily: 'JetBrains Mono',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
              }}
            >
              Delete
            </button>
          </SettingsRow>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-sm" style={{ color: '#f87171', fontFamily: 'Inter, sans-serif' }}>
              This will permanently delete your account, all test history, course enrollments, and personal data. Type{' '}
              <code
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontFamily: 'JetBrains Mono' }}
              >
                DELETE
              </code>{' '}
              to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="cyber-input"
              style={{ borderColor: deleteInput === 'DELETE' ? 'rgba(239,68,68,0.5)' : undefined }}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                style={{ fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}
              >
                Cancel
              </button>
              <button
                disabled={deleteInput !== 'DELETE'}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30"
                style={{
                  fontFamily: 'JetBrains Mono',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#ef4444',
                }}
                onClick={() => {
                  // Future: call DELETE /auth/me endpoint
                  alert('Account deletion would be processed here.');
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
