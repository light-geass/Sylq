'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getHistory } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/* ────────────────────────────────────────────────────
   1. Animated Counter — numbers count up from 0
   ──────────────────────────────────────────────────── */
function AnimatedCounter({ value, suffix = '', color, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const numericValue = parseFloat(value);
  const isNumber = !isNaN(numericValue);

  useEffect(() => {
    if (!isNumber) return;
    let start = 0;
    const end = numericValue;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [numericValue, isNumber, duration]);

  if (!isNumber) {
    return (
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 700, color }}>
        —
      </span>
    );
  }

  const formatted = suffix === '%' ? display.toFixed(1) : Math.round(display).toString();

  return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
      {formatted}{suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────
   2. Score sparkline tooltip
   ──────────────────────────────────────────────────── */
function SparklineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'rgba(13,17,23,0.95)',
        border: '1px solid rgba(69,240,244,0.2)',
        borderRadius: 8,
        padding: '8px 12px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
        {d.label}
      </p>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#45f0f4' }}>
        {d.score.toFixed(1)}%
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────
   3. Personalized greeting
   ──────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Burning the midnight oil', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning',            emoji: '🌅' };
  if (h < 17) return { text: 'Good afternoon',          emoji: '☀️' };
  if (h < 21) return { text: 'Good evening',            emoji: '🌆' };
  return              { text: 'Night owl mode',          emoji: '🦉' };
}

/* ────────────────────────────────────────────────────
   4. AI Recommendation logic (client-side)
   ──────────────────────────────────────────────────── */
function getRecommendation(history) {
  if (!history.length) return null;

  const submitted = history.filter(h => h.status === 'submitted' && h.percentage != null);
  if (!submitted.length) return null;

  // Check for declining trend
  const recent3 = submitted.slice(0, 3);
  if (recent3.length >= 3) {
    const isDecline = recent3[0].percentage < recent3[1].percentage &&
                      recent3[1].percentage < recent3[2].percentage;
    if (isDecline) {
      return {
        icon: '📉',
        title: 'Scores are declining',
        text: 'Your last 3 tests show a downward trend. Consider revisiting fundamentals and doing smaller, focused practice sets.',
        action: { label: 'Take a focused test', href: '/test/configure' },
        color: '#ffb4ab',
      };
    }
  }

  // Low average
  const avg = submitted.reduce((a, h) => a + h.percentage, 0) / submitted.length;
  if (avg < 40) {
    return {
      icon: '🎯',
      title: 'Build your foundation',
      text: 'Your average score is below 40%. Focus on one subject at a time with shorter tests to build confidence.',
      action: { label: 'Start small test', href: '/test/configure' },
      color: '#ffb4ab',
    };
  }

  // Improving trend
  if (recent3.length >= 2 && recent3[0].percentage > recent3[1].percentage) {
    return {
      icon: '🚀',
      title: 'You\'re on fire!',
      text: `Your scores are trending upward! Average: ${avg.toFixed(1)}%. Keep the momentum going with a challenging test.`,
      action: { label: 'Take a harder test', href: '/test/configure' },
      color: '#86db64',
    };
  }

  // Default — consistency
  return {
    icon: '💪',
    title: 'Stay consistent',
    text: `You're averaging ${avg.toFixed(1)}%. Regular practice is the key to breaking through. Try a new subject today.`,
    action: { label: 'Explore topics', href: '/test/configure' },
    color: '#45f0f4',
  };
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user?.profile_exists) {
      getHistory(15)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // ── Computed data ──
  const greeting = useMemo(() => getGreeting(), []);

  const firstName = user?.first_name || user?.displayName?.split(' ')[0] || 'there';

  const submitted = useMemo(
    () => history.filter(h => h.status === 'submitted' && h.percentage != null),
    [history]
  );

  const stats = useMemo(() => {
    if (!submitted.length) {
      return [
        { label: 'Tests taken',   numericValue: 0,  suffix: '',  color: '#abc7ff', key: 'total' },
        { label: 'Average score', numericValue: NaN, suffix: '%', color: '#45f0f4', key: 'avg' },
        { label: 'Best score',    numericValue: NaN, suffix: '%', color: '#86db64', key: 'best' },
        { label: 'Streak (days)', numericValue: 0,  suffix: '',  color: '#abc7ff', key: 'streak' },
      ];
    }

    const avg  = submitted.reduce((a, h) => a + h.percentage, 0) / submitted.length;
    const best = Math.max(...submitted.map(h => h.percentage));

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const testDays = new Set(
      submitted.map(h => {
        const d = new Date(h.submitted_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    for (let i = 0; i < 365; i++) {
      const check = new Date(today.getTime() - i * dayMs).getTime();
      if (testDays.has(check)) streak++;
      else if (i > 0) break;
    }

    return [
      { label: 'Tests taken',   numericValue: submitted.length, suffix: '',  color: '#abc7ff', key: 'total' },
      { label: 'Average score', numericValue: avg,              suffix: '%', color: '#45f0f4', key: 'avg' },
      { label: 'Best score',    numericValue: best,             suffix: '%', color: '#86db64', key: 'best' },
      { label: 'Streak (days)', numericValue: streak,           suffix: '',  color: '#abc7ff', key: 'streak' },
    ];
  }, [submitted]);

  const sparklineData = useMemo(() => {
    return [...submitted]
      .slice(0, 10)
      .reverse()
      .map((h, i) => ({
        idx: i,
        score: h.percentage,
        label: h.submitted_at
          ? new Date(h.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
          : `Test ${i + 1}`,
      }));
  }, [submitted]);

  const recommendation = useMemo(() => getRecommendation(history), [history]);

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
        title="Restricted Access" 
        message="The dashboard is only available to registered users. Please join Sylq to track your progress."
      />
    );
  }

  const examName = user?.exam_name || 'your exam';

  return (
    <div className="relative-z pt-10 pb-32 section-container px-4 md:px-6">
      <div className="mb-14">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#45f0f4] mb-3" style={{ fontFamily: 'JetBrains Mono' }}>
          Mission Control Center
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
          {greeting.emoji} {greeting.text}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{firstName}!</span>
        </h1>
        <p className="text-[#8b919f] mt-3 text-base max-w-2xl leading-relaxed">
          Monitor your <span className="text-white font-semibold">{examName}</span> performance metrics and AI-optimized preparation trajectory.
        </p>
      </div>

      <div className="relative mb-14">
        <div className="absolute inset-0 bg-[#45f0f4]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div
              key={s.key}
              className="glass-card rounded-2xl p-6 group hover:border-[rgba(69,240,244,0.25)] transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(69,240,244,0.15)] bg-gradient-to-b from-white/[0.03] to-transparent"
            >
              <p className="text-xs font-bold tracking-widest uppercase text-outline mb-3" style={{ fontFamily: 'JetBrains Mono' }}>
                {s.label}
              </p>
              <AnimatedCounter value={s.numericValue} suffix={s.suffix} color={s.color} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-14">
        <div className="glass-card rounded-2xl p-8">
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-1" style={{ fontFamily: 'JetBrains Mono' }}>
            Score Trend
          </p>
          <p className="text-sm text-on-surface-variant mb-4">
            Last {sparklineData.length || '—'} tests performance
          </p>
          {sparklineData.length >= 2 ? (
            <div style={{ width: '100%', height: 120, position: 'relative' }}>
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <AreaChart data={sparklineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#45f0f4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#45f0f4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <Tooltip content={<SparklineTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#45f0f4"
                      strokeWidth={2.5}
                      fill="url(#sparkGrad)"
                      dot={{ r: 3, fill: '#45f0f4', stroke: '#0D1117', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: '#45f0f4', stroke: '#0D1117', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-on-surface-variant text-sm">
              Take at least 2 tests to see your trend
            </div>
          )}
        </div>

        {recommendation ? (
          <div className="glass-card rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden" style={{ borderLeft: `4px solid ${recommendation.color}` }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl -mr-10 -mt-10" />
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ fontFamily: 'JetBrains Mono', color: recommendation.color }}>
                AI Insight
              </p>
              <h3 className="text-lg font-semibold text-on-surface mb-2">
                {recommendation.icon} {recommendation.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {recommendation.text}
              </p>
            </div>
            <Link href={recommendation.action.href} className="cyber-btn-cyan text-xs px-5 py-3 inline-block text-center mt-4">
              {recommendation.action.label} →
            </Link>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
                AI Insight
              </p>
              <h3 className="text-lg font-semibold text-on-surface mb-1">🧠 Ready to begin?</h3>
              <p className="text-sm text-on-surface-variant">
                Take your first test and I'll analyze your performance to give you personalized study recommendations.
              </p>
            </div>
            <Link href="/test/configure" className="cyber-btn-cyan text-xs px-5 py-3 inline-block text-center">
              Take your first test →
            </Link>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-14">
        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between gap-6 hover:border-white/10 transition-colors">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
              Quick start
            </p>
            <h2 className="text-xl font-semibold text-on-surface mb-1">Custom test</h2>
            <p className="text-sm text-on-surface-variant">Choose subjects, topics, difficulty, and length.</p>
          </div>
          <Link href="/test/configure" className="cyber-btn-cyan text-xs px-5 py-3 inline-block text-center">
            Configure test →
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8 flex flex-col justify-between gap-6 hover:border-white/10 transition-colors">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
              PYQ mode
            </p>
            <h2 className="text-xl font-semibold text-on-surface mb-1">Previous year questions</h2>
            <p className="text-sm text-on-surface-variant">Official {examName} questions from past years. Premium only.</p>
          </div>
          <Link href="/pricing" className="cyber-btn-primary text-xs px-5 py-3 inline-block text-center">
            Upgrade to premium →
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-on-surface">Recent tests</h2>
          {history.length > 0 && (
            <Link href="/test/history" className="text-xs text-secondary hover:underline" style={{ fontFamily: 'JetBrains Mono' }}>
              View all →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant text-sm">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #45f0f4 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <div className="text-5xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🚀</div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Your journey starts here</h3>
              <p className="text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
                Take your first <span className="text-[#45f0f4] font-semibold">{examName}</span> practice test and we'll track your progress.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/test/configure" className="cyber-btn-cyan text-xs px-8 py-3 inline-block text-center">
                  ⚡ Take your first test
                </Link>
                <Link href="/resources" className="text-xs px-6 py-3 inline-block text-center rounded-lg border border-white/10 text-[#8b919f] hover:text-white transition-colors">
                  📚 Browse resources
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Date', 'Score', 'Marks', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-outline" style={{ fontFamily: 'JetBrains Mono' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => t.status === 'submitted' && router.push(`/test/${t.id}/result`)}>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">
                      {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4"><ScoreBadge pct={t.percentage} /></td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono' }}>
                      {t.score ?? '—'} / {t.total_marks}
                    </td>
                    <td className="px-5 py-4"><StatusChip status={t.status} /></td>
                    <td className="px-5 py-4">
                      {t.status === 'submitted' && (
                        <Link href={`/test/${t.id}/result`} className="text-xs text-secondary hover:underline" style={{ fontFamily: 'JetBrains Mono' }} onClick={(e) => e.stopPropagation()}>
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
