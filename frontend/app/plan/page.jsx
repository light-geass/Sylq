"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getGlobalPlan, generateGlobalPlan } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

export default function StudyPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(30);
  const [preferences, setPreferences] = useState('');

  useEffect(() => {
    if (user && user.profile_exists) {
      fetchPlan();
    }
  }, [user]);

  async function fetchPlan(regenerate = false) {
    if (regenerate) setRegenerating(true);
    else setLoading(true);
    
    setError(null);
    try {
      let data;
      if (regenerate) {
        data = await generateGlobalPlan({ duration_days: duration, preferences });
      } else {
        data = await getGlobalPlan();
      }
      setPlan(data);
    } catch (err) {
      console.error('Failed to fetch study plan:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
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
        title="Your Study Plan" 
        message="Log in to generate a personalized 30-day roadmap based on your test performance history."
      />
    );
  }

  const usageCount = plan?.usage_count || 0;
  const usageLimit = plan?.usage_limit || (user.plan === 'premium' ? 10 : 1);
  const hasCredits = usageCount < usageLimit;
  const phases = plan?.phases || plan?.weeks || [];

  return (
    <div className="min-h-screen pb-32 pt-10">
      {/* ── Hero ── */}
      <div className="section-container mb-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 glass-card"
            style={{ background: 'rgba(69, 240, 244, 0.05)', border: '1px solid rgba(69, 240, 244, 0.15)' }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#45f0f4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#45f0f4]"></span>
            </span>
            <span className="text-[10px] font-bold text-[#45f0f4] tracking-widest uppercase" style={{ fontFamily: 'JetBrains Mono' }}>
              AI Study Planner
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {plan?.duration_label ? plan.duration_label : 'Precision Mastery'} <span className="text-[#45f0f4]">{plan?.duration_label ? 'Roadmap' : 'Strategy'}.</span>
          </h1>
          <p className="text-on-surface-variant max-w-xl mx-auto text-sm md:text-base leading-relaxed mb-6">
            A data-driven trajectory that adapts to your unique performance patterns. 
            Tailored for <span className="text-white font-semibold">{user.exam_name || 'Competitive Exams'}</span>.
          </p>

          {/* Usage Stats */}
          <div className="inline-flex items-center gap-4 px-5 py-2 rounded-xl glass-card text-xs font-mono">
            <span className="text-[#8b919f]">Daily Credits:</span>
            <span className={usageCount >= usageLimit ? 'text-red-400' : 'text-[#45f0f4]'}>
              {usageCount} / {usageLimit}
            </span>
            {usageCount >= usageLimit && user.plan !== 'premium' && (
              <Link href="/pricing" className="text-[#abc7ff] hover:underline ml-2">
                Upgrade for 10 plans →
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="section-container max-w-3xl mx-auto px-4 md:px-0">
          <div className="glass-card rounded-3xl p-10 md:p-20 text-center">
            <div className="w-16 h-16 border-4 border-[#45f0f4]/10 border-t-[#45f0f4] rounded-full animate-spin mx-auto mb-6" />
            <p className="text-[#8b919f] font-mono text-sm animate-pulse uppercase tracking-widest">
              Synthesizing performance data & architecting roadmap...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="section-container max-w-3xl mx-auto px-4 md:px-0">
          <div className="glass-card rounded-3xl p-6 md:p-10 text-center border-red-500/20">
            <p className="text-red-400 mb-6 font-mono text-sm">{error}</p>
            {error.includes('limit reached') ? (
              <Link href="/pricing" className="cyber-btn-cyan text-xs px-8 py-3">
                Upgrade Plan
              </Link>
            ) : (
              <button onClick={() => fetchPlan()} className="cyber-btn-cyan text-xs px-8 py-3">
                Try Again
              </button>
            )}
          </div>
        </div>
      ) : plan?.empty_state ? (
        <div className="section-container max-w-3xl mx-auto px-4 md:px-0">
          <div className="glass-card rounded-3xl p-6 md:p-12 text-center relative overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#45f0f4] rounded-full blur-[100px] opacity-5 pointer-events-none" />
             <div className="relative z-10">
                <div className="text-5xl mb-6">🎯</div>
                <h2 className="text-2xl font-bold text-white mb-3">Ready to build your strategy?</h2>
                <p className="text-on-surface-variant max-w-md mx-auto mb-6">
                  Select your plan duration and add optional preferences before generating.
                </p>

                <div className="max-w-sm mx-auto mb-8 text-left">
                  <label className="block text-[10px] font-mono text-[#8b919f] uppercase mb-2">Duration</label>
                  <div className="flex gap-2 mb-4">
                    {[1, 7, 30].map(d => (
                      <button 
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${duration === d ? 'bg-[#45f0f4] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        {d} Day{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>

                  <label className="block text-[10px] font-mono text-[#8b919f] uppercase mb-2">Custom Preferences</label>
                  <textarea 
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="e.g. Focus only on Math, I study 4 hours daily..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#45f0f4]/50 h-24 resize-none mb-2"
                  />
                  <p className="text-[10px] text-on-surface-variant font-mono">
                    If you want to continue without describing, the plan will be based purely on your test performances. Just type 'okay' in the field above.
                  </p>
                </div>

                {hasCredits ? (
                  <button 
                    onClick={() => fetchPlan(true)}
                    disabled={regenerating || !preferences.trim()}
                    className="cyber-btn-cyan text-xs px-6 py-3 md:px-8 md:py-4 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {regenerating ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                    )}
                    {regenerating ? 'GENERATING PLAN...' : 'GENERATE STUDY PLAN'}
                  </button>
                ) : (
                  <Link href="/pricing" className="cyber-btn-cyan text-xs px-8 py-4 inline-block">
                    UPGRADE TO GENERATE
                  </Link>
                )}
             </div>
          </div>
        </div>
      ) : phases.length === 0 ? (
        <div className="section-container max-w-3xl mx-auto px-4 md:px-0">
          <div className="glass-card rounded-3xl p-6 md:p-12 text-center relative overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#45f0f4] rounded-full blur-[100px] opacity-5 pointer-events-none" />
             <div className="relative z-10">
                <div className="text-5xl mb-6">📊</div>
                <h2 className="text-2xl font-bold text-white mb-3">No History Found</h2>
                <p className="text-on-surface-variant max-w-md mx-auto mb-8">
                  {plan?.executive_summary || "We need at least one completed mock test to generate a meaningful roadmap for you."}
                </p>
                <Link href="/test/configure" className="cyber-btn-cyan text-xs px-8 py-4">
                  Take Your First Mock Test →
                </Link>
             </div>
          </div>
        </div>
      ) : (
        <div className="section-container max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          
          {/* Left Column: Summary & Daily Tip */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="1">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                 </svg>
              </div>
              <p className="text-[10px] font-bold text-[#45f0f4] tracking-widest uppercase mb-4" style={{ fontFamily: 'JetBrains Mono' }}>
                Executive Summary
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed italic">
                "{plan.executive_summary}"
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6 border-l-4 border-l-[#45f0f4]">
              <p className="text-[10px] font-bold text-[#8b919f] tracking-widest uppercase mb-3" style={{ fontFamily: 'JetBrains Mono' }}>
                Daily Habit Tip
              </p>
              <div className="flex gap-4">
                <div className="text-2xl mt-1">💡</div>
                <p className="text-sm text-white leading-relaxed">
                  {plan.daily_routine_tip}
                </p>
              </div>
            </div>

             <div className="p-6 rounded-2xl bg-gradient-to-br from-[#45f0f4]/5 to-transparent border border-[#45f0f4]/10">
               <div className="flex justify-between items-center mb-4">
                 <div>
                    <h4 className="text-sm font-bold text-white mb-1">New Performance?</h4>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">Refresh your strategy</p>
                 </div>
               </div>
               
               <div className="mb-4">
                  <div className="flex gap-1 mb-3">
                    {[1, 7, 30].map(d => (
                      <button 
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-colors ${duration === d ? 'bg-[#45f0f4] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        {d}D
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="Describe your plan..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#45f0f4]/50 h-16 resize-none mb-1"
                  />
                  <p className="text-[9px] text-on-surface-variant leading-tight">
                    Type 'okay' to generate based on performance data only.
                  </p>
               </div>

               {hasCredits ? (
                 <button 
                  onClick={() => fetchPlan(true)}
                  disabled={regenerating || !preferences.trim()}
                  className="cyber-btn-cyan w-full text-[10px] py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {regenerating ? (
                     <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M23 4v6h-6M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                   )}
                   {regenerating ? 'GENERATING...' : 'GENERATE NEW PLAN'}
                 </button>
               ) : (
                 <Link href="/pricing" className="cyber-btn-ghost w-full text-[10px] py-3 block text-center">
                   UPGRADE TO REGENERATE
                 </Link>
               )}
               <p className="text-[9px] text-center text-outline mt-3 font-mono">
                 {usageCount < usageLimit 
                  ? `Uses 1 daily credit (${usageLimit - usageCount} remaining today)` 
                  : 'Daily generation limit reached'
                 }
               </p>
            </div>
          </div>

          {/* Right Column: The Roadmap */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-4 mb-2 px-2">
               <h3 className="text-xl font-bold text-white">Your {plan.duration_label || '30-Day'} Sprint</h3>
               <div className="h-px flex-1 bg-white/5" />
               {plan.is_cached && (
                 <span className="text-[9px] font-mono text-[#8b919f] uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                   Cached Version
                 </span>
               )}
            </div>

            <div className="relative border-l-2 border-white/5 ml-8 md:ml-4 pl-6 md:pl-8 space-y-12">
              {phases.map((phase, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-[#0D1117] border-2 border-[#45f0f4] flex items-center justify-center shadow-[0_0_15px_rgba(69,240,244,0.4)]">
                     <span className="text-[8px] font-bold text-[#45f0f4]">{idx + 1}</span>
                  </div>

                  <div className="glass-card rounded-2xl p-6 hover:border-[#45f0f4]/20 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h4 className="text-sm font-bold text-[#8b919f] uppercase tracking-widest mb-1" style={{ fontFamily: 'JetBrains Mono' }}>
                            {phase.title || `Week ${phase.week}`}
                          </h4>
                          <h3 className="text-lg font-bold text-white group-hover:text-[#45f0f4] transition-colors">
                            {phase.focus}
                          </h3>
                       </div>
                       <span className="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-tighter bg-white/5 text-[#8b919f] border border-white/10">
                          Active
                       </span>
                    </div>

                    <ul className="space-y-3">
                      {phase.goals.map((goal, gIdx) => (
                        <li key={gIdx} className="flex gap-3 text-sm text-on-surface-variant leading-relaxed">
                          <span className="text-[#45f0f4] font-mono mt-0.5">0{gIdx + 1}</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
