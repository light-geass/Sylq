'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';

/* ── Helper: load bookmarks from localStorage ── */
function loadBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('sylq_bookmarks') || '[]');
  } catch { return []; }
}

function removeBookmark(resourceKey) {
  const current = loadBookmarks();
  const updated = current.filter((b) => b.key !== resourceKey);
  localStorage.setItem('sylq_bookmarks', JSON.stringify(updated));
  window.dispatchEvent(new Event('bookmarks_updated'));
  return updated;
}

/* ── Category colour map ── */
const CAT_COLORS = {
  mindmaps: { accent: '#45f0f4', bg: 'rgba(69,240,244,0.08)',  border: 'rgba(69,240,244,0.15)' },
  books:    { accent: '#abc7ff', bg: 'rgba(171,199,255,0.08)', border: 'rgba(171,199,255,0.15)' },
  notes:    { accent: '#86db64', bg: 'rgba(134,219,100,0.08)', border: 'rgba(134,219,100,0.15)' },
  formulas: { accent: '#45f0f4', bg: 'rgba(69,240,244,0.08)',  border: 'rgba(69,240,244,0.15)' },
  pyqs:     { accent: '#45f0f4', bg: 'rgba(69,240,244,0.08)',  border: 'rgba(69,240,244,0.15)' },
};

/* ── Category icon ── */
function CatIcon({ category }) {
  const color = CAT_COLORS[category]?.accent || '#45f0f4';
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (category) {
    case 'mindmaps':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M2 12h7"/><path d="M15 12h7"/></svg>;
    case 'books':
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'notes':
      return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>;
    case 'formulas':
      return <svg {...props}><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M14 14h6v6h-6z"/><path d="M4 14h6v6H4z"/></svg>;
    case 'pyqs':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    default:
      return null;
  }
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [filter, setFilter]       = useState('all');

  useEffect(() => {
    setBookmarks(loadBookmarks());
    const handler = () => setBookmarks(loadBookmarks());
    window.addEventListener('bookmarks_updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('bookmarks_updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

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
        title="Saved Resources"
        message="Sign in to access your saved resources."
      />
    );
  }

  const categories = ['all', ...new Set(bookmarks.map((b) => b.category))];
  const filtered = filter === 'all' ? bookmarks : bookmarks.filter((b) => b.category === filter);

  function handleRemove(key) {
    const updated = removeBookmark(key);
    setBookmarks(updated);
  }

  return (
    <div className="relative-z pt-8 pb-32 section-container max-w-3xl">
      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
          Library
        </p>
        <h1 className="text-3xl font-bold text-on-surface">Saved Resources</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Resources you've bookmarked for quick access.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        /* ── Empty state ── */
        <div
          className="glass-card rounded-2xl p-12 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(69,240,244,0.06)', border: '1px solid rgba(69,240,244,0.12)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2">No saved resources yet</h2>
          <p className="text-sm text-[#6b7280] mb-6 max-w-sm mx-auto">
            Browse the resource library and tap the <span className="text-white">bookmark icon</span> on any item to save it here for quick access.
          </p>
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-200 hover:scale-105"
            style={{
              fontFamily: 'JetBrains Mono',
              background: 'linear-gradient(135deg, rgba(69,240,244,0.12), rgba(171,199,255,0.06))',
              border: '1px solid rgba(69,240,244,0.2)',
              color: '#45f0f4',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
            </svg>
            Browse Resources
          </Link>
        </div>
      ) : (
        <>
          {/* ── Filter chips ── */}
          {categories.length > 2 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-200"
                  style={{
                    fontFamily: 'JetBrains Mono',
                    background: filter === cat ? 'rgba(69,240,244,0.12)' : 'rgba(255,255,255,0.04)',
                    border: filter === cat ? '1px solid rgba(69,240,244,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    color: filter === cat ? '#45f0f4' : '#6b7280',
                  }}
                >
                  {cat === 'all' ? `All (${bookmarks.length})` : `${cat} (${bookmarks.filter((b) => b.category === cat).length})`}
                </button>
              ))}
            </div>
          )}

          {/* ── Cards ── */}
          <div className="space-y-3">
            {filtered.map((item) => {
              const colors = CAT_COLORS[item.category] || CAT_COLORS.mindmaps;
              return (
                <div
                  key={item.key}
                  className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-300"
                  style={{
                    background: 'rgba(22,27,34,0.85)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Category icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                  >
                    <CatIcon category={item.category} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[9px] font-mono tracking-widest uppercase font-bold"
                        style={{ color: colors.accent }}
                      >
                        {item.category}
                      </span>
                      {item.subtitle && (
                        <>
                          <span className="text-[9px] text-[#414753]">•</span>
                          <span className="text-[9px] text-[#6b7280] font-mono">{item.subtitle}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-on-surface truncate">{item.title}</h3>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(item.key)}
                    className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:bg-white/5 group/btn"
                    title="Remove from saved"
                  >
                    <svg
                      width="18" height="18" viewBox="0 0 24 24"
                      fill="#e2e8f0"
                      stroke="#e2e8f0"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className="transition-colors duration-200 group-hover/btn:fill-[#ef4444] group-hover/btn:stroke-[#ef4444]"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-[#6b7280]">
              No saved resources in this category.
            </div>
          )}
        </>
      )}
    </div>
  );
}
