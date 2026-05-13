import Link from 'next/link';

export const metadata = {
  title: 'Study Plan - GATER',
  description: 'Your personalized GATE preparation roadmap.',
};

export default function StudyPlanPage() {
  return (
    <div className="min-h-screen pb-32">
      {/* ── Hero ── */}
      <div className="section-container mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(171, 199, 255, 0.08)', border: '1px solid rgba(171, 199, 255, 0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#abc7ff" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span className="text-xs font-mono font-bold text-[#abc7ff] tracking-wider uppercase">
              Preparation
            </span>
          </div>
          <h1 className="text-display-lg text-on-surface mb-4">
            Your Study <span className="text-[#abc7ff]">Plan.</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Stay on track with a personalized daily roadmap and curated weekly goals.
          </p>
        </div>
      </div>

      {/* ── Coming Soon Content ── */}
      <div className="section-container max-w-3xl mx-auto">
        <div 
          className="rounded-3xl p-10 text-center relative overflow-hidden"
          style={{
            background: 'rgba(16, 20, 28, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          }}
        >
          {/* Subtle glow effect behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#abc7ff] rounded-full blur-[100px] opacity-10 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(171, 199, 255, 0.1)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#abc7ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-on-surface mb-3">AI Study Planner is coming soon</h2>
            <p className="text-on-surface-variant max-w-md mx-auto mb-8">
              We're building an intelligent planner that dynamically adapts to your test performance and sets realistic daily goals.
            </p>
            
            <Link href="/courses" className="cyber-btn-cyan text-sm px-8 py-3">
              Explore Courses Meanwhile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
