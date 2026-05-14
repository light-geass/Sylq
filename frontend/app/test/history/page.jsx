'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';

function ScoreBar({ pct }) {
  const color = pct >= 70 ? '#86db64' : pct >= 50 ? '#45f0f4' : '#ffb4ab';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono', color }}>
        {pct?.toFixed(1)}%
      </span>
    </div>
  );
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user?.profile_exists) {
      getHistory(50)
        .then(setHistory)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

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
        title="Access History" 
        message="Please log in to view your previous test results and performance analysis."
      />
    );
  }

  const avg = history.length
    ? (history.reduce((a, h) => a + (h.percentage ?? 0), 0) / history.length).toFixed(1)
    : null;

  return (
    <div className="relative-z pt-7 pb-16 section-container">
      <div className="pt-6 mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
             style={{ fontFamily: 'JetBrains Mono' }}>
            Records
          </p>
          <h1 className="text-2xl font-bold text-on-surface">Test history</h1>
          {avg && (
            <p className="text-sm text-on-surface-variant mt-1">
              {history.length} tests completed · Average score{' '}
              <span style={{ color: '#45f0f4', fontFamily: 'JetBrains Mono' }}>{avg}%</span>
            </p>
          )}
        </div>
        <Link href="/test/configure" className="cyber-btn-cyan text-xs px-5 py-2.5">
          New test →
        </Link>
      </div>

      {loading && (
        <div className="glass-card rounded-xl p-10 text-center text-on-surface-variant text-sm">
          Loading history...
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 text-sm text-error border border-error/30 bg-error/10"
             style={{ fontFamily: 'JetBrains Mono' }}>
          {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="glass-card rounded-xl p-16 text-center">
          <p className="text-on-surface-variant mb-6">No tests yet. Take your first one!</p>
          <Link href="/test/configure" className="cyber-btn-cyan text-xs px-6 py-3 inline-block">
            Configure a test
          </Link>
        </div>
      )}

      {history.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden border border-white/[0.05]">
          {/* Table header - Hidden on mobile */}
          <div
            className="hidden md:grid gap-4 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-outline"
            style={{
              fontFamily: 'JetBrains Mono',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: '1fr 160px 100px 80px 80px',
            }}
          >
            <span>Date</span>
            <span>Score</span>
            <span>Marks</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {history.map((t, i) => (
            <div
              key={t.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_160px_100px_80px_80px] gap-4 px-5 py-6 md:px-6 md:py-4 hover:bg-white/[0.02] transition-colors items-center"
              style={{
                borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              {/* Row 1 on Mobile: Date and Action */}
              <div className="flex justify-between items-start md:block">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {t.submitted_at
                      ? new Date(t.submitted_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      : new Date(t.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                  </p>
                  <p className="text-[10px] text-outline mt-0.5" style={{ fontFamily: 'JetBrains Mono' }}>
                    {t.submitted_at
                      ? new Date(t.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
                
                {/* Action - Visible on Mobile Right */}
                <div className="md:hidden">
                  {t.status === 'submitted' ? (
                    <Link
                      href={`/test/${t.id}/result`}
                      className="px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-xs font-bold border border-secondary/20"
                      style={{ fontFamily: 'JetBrains Mono' }}
                    >
                      Review →
                    </Link>
                  ) : (
                    <Link
                      href={`/test/${t.id}`}
                      className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20"
                      style={{ fontFamily: 'JetBrains Mono' }}
                    >
                      Resume →
                    </Link>
                  )}
                </div>
              </div>

              {/* Score bar & Marks - Flex on Mobile */}
              <div className="flex items-center justify-between md:contents">
                <div className="md:block">
                  {t.percentage != null ? <ScoreBar pct={t.percentage} /> : <span className="text-xs text-outline">—</span>}
                </div>

                <span className="text-sm font-bold md:block" style={{ fontFamily: 'JetBrains Mono', color: '#c1c6d5' }}>
                  {t.score ?? '—'} <span className="text-outline text-[10px] font-normal mx-0.5">/</span> {t.total_marks}
                </span>
              </div>

              {/* Status chip - Visible on Desktop only or as small badge */}
              <div className="flex justify-between items-center md:contents mt-2 md:mt-0 pt-3 md:pt-0 border-t border-white/[0.03] md:border-t-0">
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border"
                  style={{
                    fontFamily: 'JetBrains Mono',
                    background: t.status === 'submitted' ? 'rgba(134,219,100,0.05)' : 'rgba(69,240,244,0.05)',
                    color:      t.status === 'submitted' ? '#86db64' : '#45f0f4',
                    borderColor: t.status === 'submitted' ? 'rgba(134,219,100,0.2)' : 'rgba(69,240,244,0.2)',
                  }}
                >
                  {t.status === 'submitted' ? 'Done' : 'Active'}
                </span>

                {/* Action - Visible on Desktop Right */}
                <div className="hidden md:block text-right">
                  {t.status === 'submitted' ? (
                    <Link
                      href={`/test/${t.id}/result`}
                      className="text-xs text-secondary hover:underline font-bold"
                      style={{ fontFamily: 'JetBrains Mono' }}
                    >
                      Review →
                    </Link>
                  ) : (
                    <Link
                      href={`/test/${t.id}`}
                      className="text-xs text-primary hover:underline font-bold"
                      style={{ fontFamily: 'JetBrains Mono' }}
                    >
                      Resume →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
