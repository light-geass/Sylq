import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Sylq - the Gater',
  description: 'The story and mission behind Sylq, India\'s most advanced AI-powered GATE prep platform.',
};

const TEAM = [
  { name: 'Core Engine', role: 'AI Analysis', icon: '🤖' },
  { name: 'Data Pipeline', role: '10,000+ PYQs', icon: '📊' },
  { name: 'Infrastructure', role: 'Global Scale', icon: '⚡' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-32">
      {/* ── Hero Section ── */}
      <div className="section-container pt-7 mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#abc7ff] rounded-full blur-[120px] opacity-10 pointer-events-none" />
        
        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(69, 240, 244, 0.08)', border: '1px solid rgba(69, 240, 244, 0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
            <span className="text-xs font-mono font-bold text-[#45f0f4] tracking-wider uppercase">
              Our Mission
            </span>
          </div>
          
          <h1 className="text-display-lg text-on-surface mb-6">
            Sylq - <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#abc7ff] to-[#45f0f4]">the Gater.</span>
          </h1>
          
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            We are redefining GATE preparation. Traditional mock tests tell you what you scored. 
            Sylq tells you exactly <em>why</em> you scored it, and exactly <em>how</em> to improve.
          </p>
        </div>
      </div>

      {/* ── The Vision ── */}
      <div className="section-container max-w-5xl mx-auto mb-24">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#abc7ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h2 className="text-3xl font-bold text-on-surface mb-6">Beyond ordinary prep.</h2>
            <div className="space-y-4 text-on-surface-variant leading-relaxed">
              <p>
                The journey to crack GATE is grueling. Millions of aspirants struggle not because they lack dedication, 
                but because they lack targeted feedback. You can solve 100 questions, but if you don't know the cognitive gaps 
                causing your errors, you'll make the same mistakes on the exam day.
              </p>
              <p>
                That's why we built <strong className="text-[#abc7ff]">Sylq</strong>. By combining advanced AI diagnostics 
                with an exhaustive, highly-curated repository of GATE questions, we provide instant, personalized interventions.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="glass-card rounded-2xl p-6 border-l-2 border-l-[#45f0f4]">
              <h3 className="text-lg font-bold text-on-surface mb-2">Granular Analysis</h3>
              <p className="text-sm text-on-surface-variant">
                We don't just mark questions wrong. We analyze if it was a conceptual error, a calculation mistake, or a time-pressure slip.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 border-l-2 border-l-[#86db64]">
              <h3 className="text-lg font-bold text-on-surface mb-2">Adaptive AI Mentorship</h3>
              <p className="text-sm text-on-surface-variant">
                Our embedded AI chatbot acts as your personal 24/7 tutor, ready to explain complex solutions step-by-step.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 border-l-2 border-l-[#abc7ff]">
              <h3 className="text-lg font-bold text-on-surface mb-2">Precision Control</h3>
              <p className="text-sm text-on-surface-variant">
                Build the exact test you need. Filter by specific topics, difficulty levels, and time constraints.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Customization Showcase ── */}
      <div className="section-container max-w-6xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-on-surface mb-4">Unmatched Customization.</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            Design your perfect practice environment. Take a look at the powerful test configuration options waiting for you.
          </p>
        </div>
        
        <div className="flex flex-col gap-16 max-w-4xl mx-auto">
          {[1, 2, 3].map((num) => (
            <div key={num} className="glass-card rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl transition-transform duration-700 hover:scale-[1.01]">
              <div className="bg-[#0f172a] p-1">
                <img 
                  src={`/customization_screen_0${num}.png`} 
                  alt={`Test Customization Option ${num}`}
                  className="w-full h-auto rounded-[1.8rem] block"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Architecture/Team ── */}
      <div className="section-container max-w-4xl mx-auto text-center mb-24">
        <h2 className="text-3xl font-bold text-on-surface mb-12">Powered by modern tech.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TEAM.map((member) => (
            <div key={member.name} className="glass-card rounded-2xl p-8 hover:-translate-y-2 transition-transform duration-300">
              <div className="text-4xl mb-4">{member.icon}</div>
              <h3 className="text-lg font-bold text-on-surface mb-1">{member.name}</h3>
              <p className="text-sm text-[#45f0f4] font-mono">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="section-container max-w-3xl mx-auto">
        <div className="glass-card rounded-3xl p-10 md:p-16 text-center"
             style={{ border: '1px solid rgba(134, 219, 100, 0.15)' }}>
          <h2 className="text-3xl font-bold text-on-surface mb-4">
            Ready to upgrade your preparation?
          </h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">
            Join thousands of smart aspirants using Sylq to secure top ranks in GATE.
          </p>
          <Link href="/auth/signup" className="cyber-btn-cyan px-10 py-4 text-sm inline-block uppercase tracking-widest font-bold">
            Start a Free Test
          </Link>
        </div>
      </div>
    </div>
  );
}
