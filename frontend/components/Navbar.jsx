"use client";

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');
  const isAuthPage = pathname?.startsWith('/auth/');

  // Hide if not logged in, on an active test page, or on auth pages
  if (loading || !user || isAuthPage) return null;
  if (!user?.profile_exists) return null;
  if (pathname.match(/^\/test\/[^/]+$/) && !pathname.includes('configure') && !pathname.includes('history')) return null;

  return (
    <nav
      id="bottom-navbar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      style={{ width: 'min(94vw, 680px)' }}
    >
      {/* ── Glass Background Layer (Surefire Bug Fix) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        height: '68px',
        borderRadius: '28px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }} />

      {/* ── Content Layer ── */}
      <div className="relative flex items-end justify-between px-6" style={{ height: '68px' }}>
        {/* ── Left side items ── */}
        <div className="flex-1 flex justify-around items-center">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-3 group transition-all duration-200 hover:scale-110"
            style={{ minWidth: '60px' }}
          >
            <div
              className={`transition-all duration-200 ${pathname === '/' ? 'text-[#45f0f4] drop-shadow-[0_0_8px_rgba(69,240,244,0.4)]' : 'text-[#6b7280] group-hover:text-[#9ca3af] group-hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.3)]'}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${pathname === '/' ? 'text-[#45f0f4]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Home
            </span>
          </Link>

          <Link
            href="/plan"
            className="flex flex-col items-center gap-1 py-3 group transition-all duration-200 hover:scale-110"
            style={{ minWidth: '60px' }}
          >
            <div
              className={`transition-all duration-200 ${isActive('/plan') ? 'text-[#45f0f4] drop-shadow-[0_0_8px_rgba(69,240,244,0.4)]' : 'text-[#6b7280] group-hover:text-[#9ca3af] group-hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.3)]'}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
                <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
              </svg>
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${isActive('/plan') ? 'text-[#45f0f4]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Planner
            </span>
          </Link>
        </div>

        {/* ── Center spacer for the floating TEST button ── */}
        <div style={{ width: '70px', flexShrink: 0 }} />

        {/* ── Right side items ── */}
        <div className="flex-1 flex justify-around items-center">
          <Link
            href="/resources"
            className="flex flex-col items-center gap-1 py-3 group transition-all duration-200 hover:scale-110"
            style={{ minWidth: '60px' }}
          >
            <div
              className={`transition-all duration-200 ${isActive('/resources') ? 'text-[#45f0f4] drop-shadow-[0_0_8px_rgba(69,240,244,0.4)]' : 'text-[#6b7280] group-hover:text-[#9ca3af] group-hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.3)]'}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                <path d="M12 10v6" />
                <path d="M9 13h6" />
              </svg>
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${isActive('/resources') ? 'text-[#45f0f4]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Resources
            </span>
          </Link>

          <Link
            href="/courses"
            className="flex flex-col items-center gap-1 py-3 group transition-all duration-200 hover:scale-110"
            style={{ minWidth: '60px' }}
          >
            <div
              className={`transition-all duration-200 ${isActive('/courses') ? 'text-[#45f0f4] drop-shadow-[0_0_8px_rgba(69,240,244,0.4)]' : 'text-[#6b7280] group-hover:text-[#9ca3af] group-hover:drop-shadow-[0_0_8px_rgba(156,163,175,0.3)]'}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 8h4" />
                <path d="M7 11h2" />
              </svg>
            </div>
            <span
              className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${isActive('/courses') ? 'text-[#45f0f4]' : 'text-[#6b7280] group-hover:text-[#9ca3af]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Courses
            </span>
          </Link>
        </div>
      </div>

      {/* ── Floating 3D TEST button (center, elevated) ── */}
      <Link
        href="/test/configure"
        id="test-button"
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center group"
        style={{ bottom: '7px' }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: '76px',
            height: '76px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(69, 240, 244, 0.15) 0%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />

        {/* 3D button body */}
        <div
          className="relative flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95"
          style={{
            width: '62px',
            height: '55px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #5ef5f8, #32d8dc)',
            boxShadow: `
              0 6px 0 #1aafb3,
              0 8px 16px rgba(69, 240, 244, 0.35),
              0 0 40px rgba(69, 240, 244, 0.2),
              inset 0 2px 4px rgba(255, 255, 255, 0.3),
              inset 0 -2px 4px rgba(0, 0, 0, 0.1)
            `,
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Rocket icon */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0a2e2f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        </div>

        {/* Label */}
        <span
          className="mt-2.5 text-[10px] font-bold tracking-[0.15em] uppercase"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#45f0f4',
            textShadow: '0 0 8px rgba(69, 240, 244, 0.5)',
          }}
        >
          TEST
        </span>
      </Link>
    </nav>
  );
}
