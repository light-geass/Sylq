'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const MOCK_STATS = [
  { label: 'Tests taken',   value: '—', color: '#abc7ff', key: 'total' },
  { label: 'Average score', value: '—', color: '#45f0f4', key: 'avg' },
  { label: 'Best score',    value: '—', color: '#86db64', key: 'best' },
  { label: 'Streak (days)', value: '0', color: '#abc7ff', key: 'streak' },
];

function ScoreBadge({ pct }) {
  const color = pct >= 70 ? '#86db64' : pct >= 50 ? '#45f0f4' : '#ffb4ab';
  return (
    <span style={{ fontFamily: 'JetBrains Mono', color, fontSize: 13, fontWeight: 700 }}>
      {pct?.toFixed(1) ?? '—'}%
    </span>
  );
}

function StatusChip({ status }) {
  const map = {
    submitted: { label: 'Done',   bg: 'rgba(134,219,100,0.1)', color: '#86db64' },
    active:    { label: 'Active', bg: 'rgba(69,240,244,0.1)',  color: '#45f0f4' },
  };
  const s = map[status] || { label: status, bg: 'rgba(255,255,255,0.05)', color: '#c1c6d5' };
  return (
    <span
      className="text-xs font-bold tracking-widest uppercase px-2 py-1 rounded"
      style={{ fontFamily: 'JetBrains Mono', background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      getHistory(10)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const stats = MOCK_STATS.map((s) => {
    if (!history.length) return s;
    if (s.key === 'total') return { ...s, value: history.length.toString() };
    if (s.key === 'avg') {
      const avg = history.reduce((a, h) => a + (h.percentage ?? 0), 0) / history.length;
      return { ...s, value: avg.toFixed(1) + '%' };
    }
    if (s.key === 'best') {
      const best = Math.max(...history.map((h) => h.percentage ?? 0));
      return { ...s, value: best.toFixed(1) + '%' };
    }
    return s;
  });

  return (
    <div className="relative-z pt-24 pb-20 section-container">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Mission Control
        </p>
        <h1 className="text-3xl font-bold text-on-surface">Dashboard</h1>
        <p className="text-on-surface-variant mt-1">Track your GATE preparation progress.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.key} className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-3"
               style={{ fontFamily: 'JetBrains Mono' }}>
              {s.label}
            </p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: 26, fontWeight: 700, color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Quick start
            </p>
            <h2 className="text-xl font-semibold text-on-surface mb-1">Custom test</h2>
            <p className="text-sm text-on-surface-variant">Choose subjects, topics, difficulty, and length.</p>
          </div>
          <Link href="/test/configure" className="cyber-btn-cyan text-xs px-5 py-3 inline-block text-center">
            Configure test →
          </Link>
        </div>

        <div className="glass-card rounded-xl p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2"
               style={{ fontFamily: 'JetBrains Mono' }}>
              PYQ mode
            </p>
            <h2 className="text-xl font-semibold text-on-surface mb-1">Previous year questions</h2>
            <p className="text-sm text-on-surface-variant">Official GATE questions from 2014–2026. Premium only.</p>
          </div>
          <Link href="/pricing" className="cyber-btn-primary text-xs px-5 py-3 inline-block text-center">
            Upgrade to premium →
          </Link>
        </div>
      </div>

      {/* Test history */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-on-surface">Recent tests</h2>
          <Link href="/test/history" className="text-xs text-secondary hover:underline"
                style={{ fontFamily: 'JetBrains Mono' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant text-sm">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <p className="text-on-surface-variant mb-4">No tests yet. Start your first one!</p>
            <Link href="/test/configure" className="cyber-btn-cyan text-xs px-6 py-3 inline-block">
              Take a test
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Date', 'Score', 'Marks', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-outline"
                      style={{ fontFamily: 'JetBrains Mono' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {t.submitted_at
                        ? new Date(t.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-4"><ScoreBadge pct={t.percentage} /></td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant"
                        style={{ fontFamily: 'JetBrains Mono' }}>
                      {t.score ?? '—'} / {t.total_marks}
                    </td>
                    <td className="px-5 py-4"><StatusChip status={t.status} /></td>
                    <td className="px-5 py-4">
                      {t.status === 'submitted' && (
                        <Link
                          href={`/test/${t.id}/result`}
                          className="text-xs text-secondary hover:underline"
                          style={{ fontFamily: 'JetBrains Mono' }}
                        >
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
