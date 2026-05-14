"use client";

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/* ── Menu items for the slide-in account panel ── */
const MENU_ITEMS = [
  {
    group: 'Learning',
    items: [
      {
        label: 'Test History',
        href: '/test/history',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
          </svg>
        ),
      },
      {
        label: 'My Courses',
        href: '/my-courses',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        ),
      },
      {
        label: 'Saved Resources',
        href: '/bookmarks',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        label: 'Personal Info',
        href: '/profile',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
      {
        label: 'Orders & Purchases',
        href: '/orders',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export default function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const menuRef   = useRef(null);
  const buttonRef = useRef(null);
  const pathname  = usePathname();
  const router    = useRouter();

  const isTestRunning = pathname?.startsWith('/test/') && 
                        !pathname?.includes('/history') && 
                        !pathname?.includes('/result') &&
                        !pathname?.includes('/configure');
  const hidden = isTestRunning;
  const isAuthPage = pathname?.startsWith('/auth/');
  const hasProfile = user?.profile_exists === true;

  /* Close panel on outside click — but not when clicking the trigger button */
  useEffect(() => {
    function handleClick(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* Close on route change */
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  /* Lock body scroll when menu open */
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = menuOpen ? 'hidden' : '';
    }
    return () => { 
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''; 
      }
    };
  }, [menuOpen]);

  if (hidden || isAuthPage) return null;

  return (
    <>
      {/* ── TopBar strip ── */}
      <header className="fixed top-0 left-0 right-0 z-[100] h-20 pointer-events-none">
        {/* Background Mask - ensures content doesn't 'collide' with the bar items */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117] via-[#0D1117]/80 to-transparent backdrop-blur-md" />
        
        <div className="relative flex items-center justify-between px-5 pt-2 h-full">
        <Link href="/" className="pointer-events-auto flex items-center gap-2.5 group select-none">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Sylq Logo"
              className="h-12 w-auto object-contain transition-all duration-300 group-hover:scale-105"
              style={{
                filter: 'drop-shadow(0 0 12px rgba(69,240,244,0.3))'
              }}
            />
          </div>
          <span 
            className="text-2xl font-bold tracking-tight text-white transition-all duration-300 group-hover:text-[#45f0f4]"
            style={{ 
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-0.02em',
              textShadow: '0 0 20px rgba(69,240,244,0.1)'
            }}
          >
            Sylq
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="pointer-events-auto text-sm font-medium text-[#8b919f] hover:text-white transition-colors duration-200 px-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            About
          </Link>

          <div className="w-px h-4 bg-white/10" />

          <Link
            href="/pricing"
            className="pointer-events-auto text-sm font-medium text-[#8b919f] hover:text-white transition-colors duration-200 px-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Pricing
          </Link>

          <div className="w-px h-4 bg-white/10" />

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : hasProfile ? (
            <button
              ref={buttonRef}
              onClick={() => setMenuOpen((v) => !v)}
              className="pointer-events-auto relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:ring-2 hover:ring-[#45f0f4]/40"
              style={{
                background: menuOpen
                  ? 'linear-gradient(135deg, rgba(69,240,244,0.15), rgba(171,199,255,0.1))'
                  : 'rgba(255,255,255,0.06)',
                border: menuOpen ? '1px solid rgba(69,240,244,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}
              aria-label="Account menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={menuOpen ? '#45f0f4' : '#c1c6d5'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#86db64] border-2 border-[#0D1117]" />
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="pointer-events-auto cyber-btn-cyan text-[11px] px-4 py-1.5 h-auto uppercase tracking-wider font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Login
            </Link>
          )}
        </div>
        </div>
      </header>

      <div
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: menuOpen ? 'rgba(0,0,0,0.5)' : 'transparent',
          pointerEvents: menuOpen ? 'all' : 'none',
          backdropFilter: menuOpen ? 'blur(4px)' : 'none',
        }}
      />

      <div
        ref={menuRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: '300px',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(13, 17, 23, 0.96)',
          backdropFilter: 'blur(32px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-sm font-semibold text-white">Account</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Manage your Sylq profile</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/08 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b919f" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(69,240,244,0.15), rgba(171,199,255,0.1))', border: '1px solid rgba(69,240,244,0.2)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-[180px]">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-[#6b7280] uppercase tracking-widest font-bold" style={{ fontFamily: 'JetBrains Mono' }}>
                {user?.plan || 'Free'} Plan
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {MENU_ITEMS.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[10px] font-mono font-bold text-[#414753] tracking-widest uppercase px-2 mb-1.5">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(({ label, href, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
                    style={{ color: '#8b919f' }}
                  >
                    <span className="text-[#45f0f4] opacity-70">{icon}</span>
                    {label}
                    <svg className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {user?.plan !== 'premium' ? (
          <div className="px-5 py-4 pb-28 md:pb-4 border-t border-white/05 space-y-2">
            <Link
              href="/pricing"
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, rgba(69,240,244,0.1), rgba(171,199,255,0.06))',
                border: '1px solid rgba(69,240,244,0.15)',
                color: '#45f0f4',
              }}
            >
              <span>Upgrade to Premium</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </Link>
            <button
              onClick={async () => {
                await signOut();
                setMenuOpen(false);
                router.push('/');
              }}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-xs text-[#6b7280] hover:text-[#ef4444] transition-colors duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 pb-28 md:pb-4 border-t border-white/05 space-y-2">
            <button
              onClick={async () => {
                await signOut();
                setMenuOpen(false);
                router.push('/');
              }}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-xs text-[#6b7280] hover:text-[#ef4444] transition-colors duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
