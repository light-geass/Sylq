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
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Table header */}
          <div
            className="grid gap-4 px-5 py-3 text-xs font-bold uppercase tracking-widest text-outline"
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
            <span />
          </div>

          {history.map((t, i) => (
            <div
              key={t.id}
              className="grid gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center"
              style={{
                borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                gridTemplateColumns: '1fr 160px 100px 80px 80px',
              }}
            >
              {/* Date */}
              <div>
                <p className="text-sm text-on-surface">
                  {t.submitted_at
                    ? new Date(t.submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                </p>
                <p className="text-xs text-outline mt-0.5" style={{ fontFamily: 'JetBrains Mono' }}>
                  {t.submitted_at
                    ? new Date(t.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>

              {/* Score bar */}
              <div>
                {t.percentage != null ? <ScoreBar pct={t.percentage} /> : <span className="text-xs text-outline">—</span>}
              </div>

              {/* Marks */}
              <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono', color: '#c1c6d5' }}>
                {t.score ?? '—'} / {t.total_marks}
              </span>

              {/* Status chip */}
              <span
                className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded text-center"
                style={{
                  fontFamily: 'JetBrains Mono',
                  background: t.status === 'submitted' ? 'rgba(134,219,100,0.1)' : 'rgba(69,240,244,0.1)',
                  color:      t.status === 'submitted' ? '#86db64' : '#45f0f4',
                }}
              >
                {t.status === 'submitted' ? 'Done' : 'Active'}
              </span>

              {/* Action */}
              <div className="text-right">
                {t.status === 'submitted' ? (
                  <Link
                    href={`/test/${t.id}/result`}
                    className="text-xs text-secondary hover:underline"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    Review →
                  </Link>
                ) : (
                  <Link
                    href={`/test/${t.id}`}
                    className="text-xs text-primary hover:underline"
                    style={{ fontFamily: 'JetBrains Mono' }}
                  >
                    Resume →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
