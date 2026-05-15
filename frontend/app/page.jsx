"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const FEATURES = [
  {
    icon: '⚙',
    color: '#abc7ff',
    bg: 'rgba(171,199,255,0.08)',
    border: 'rgba(171,199,255,0.2)',
    title: 'Fully Customizable Tests',
    desc: 'Filter by subject, topic, difficulty, and question type. Build the exact test you need — from a 12-question quick drill to a full-length exam simulation.',
  },
  {
    icon: '◈',
    color: '#45f0f4',
    bg: 'rgba(69,240,244,0.08)',
    border: 'rgba(69,240,244,0.2)',
    title: 'AI Post-Test Analysis',
    desc: 'Instantly understand your strengths and weaknesses. Get topic-wise proficiency scores, step-by-step explanations, and a personalized 3-day study plan.',
  },
  {
    icon: '◉',
    color: '#86db64',
    bg: 'rgba(134,219,100,0.08)',
    border: 'rgba(134,219,100,0.2)',
    title: 'Extensive PYQ Bank',
    desc: 'Official competitive exam previous year questions, tagged by topic and difficulty. Premium users get dedicated PYQ-only test modes.',
  },
  {
    icon: '◌',
    color: '#abc7ff',
    bg: 'rgba(171,199,255,0.08)',
    border: 'rgba(171,199,255,0.2)',
    title: 'AI Chatbot Per Question',
    desc: "Can't understand an explanation? Ask the AI chatbot directly about any problem. It knows the question, options, and answer — no context needed from you.",
  },
  {
    icon: '⬡',
    color: '#45f0f4',
    bg: 'rgba(69,240,244,0.08)',
    border: 'rgba(69,240,244,0.2)',
    title: 'Offline Test Mode',
    desc: 'Start a test, go offline, and focus completely. Questions are cached locally. Reconnect after submission for AI analysis.',
  },
  {
    icon: '◈',
    color: '#86db64',
    bg: 'rgba(134,219,100,0.08)',
    border: 'rgba(134,219,100,0.2)',
    title: 'Behavioral Insights',
    desc: "Track time per question, identify where you rush or overthink, and get a 'Sincerity Score' that reveals your real testing habits.",
  },
];



export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.profile_exists) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user?.profile_exists) {
    return null; // Or a loading spinner
  }

  return (
    <div className="relative-z">
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="section-container py-12 md:py-16 text-center">

        <h1
          className="animate-fade-in-delay-1 text-4xl md:text-6xl font-black leading-tight tracking-tight mb-6"
          style={{ color: '#dfe2eb', letterSpacing: '-0.02em' }}
        >
          Command your{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #abc7ff 0%, #45f0f4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            exam prep.
          </span>
        </h1>

        <p className="animate-fade-in-delay-2 text-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
          Master weak areas with AI-driven insights from a 10,000+ question bank. <br />
          Know exactly what to study next—not just your score.
        </p>

        <div className="animate-fade-in-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/test/configure" className="cyber-btn-cyan text-sm px-8 py-4 w-full sm:w-auto text-center">
            Start a free test
          </Link>
          <Link href="/pricing" className="cyber-btn-ghost text-sm px-8 py-4 w-full sm:w-auto text-center">
            View plans
          </Link>
        </div>
      </section>



      {/* ── Features ──────────────────────────────────── */}
      <section className="section-container pb-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
             style={{ fontFamily: 'JetBrains Mono' }}>
            Platform features
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface" style={{ letterSpacing: '-0.01em' }}>
            Everything you need for your exam
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass-card rounded-xl p-6 transition-all duration-200 hover:border-white/15 group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-4"
                style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-on-surface mb-2">{f.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────── */}
      <section className="section-container pb-24">
        <div
          className="glass-card rounded-2xl p-10 md:p-16 text-center"
          style={{ border: '1px solid rgba(69,240,244,0.15)' }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4" style={{ letterSpacing: '-0.01em' }}>
            Ready to start?
          </h2>
          <p className="text-on-surface-variant mb-8 max-w-lg mx-auto">
            Free plan includes 3 AI-generated tests per day. No credit card required.
          </p>
          <Link href="/auth/signup" className="cyber-btn-cyan px-10 py-4 text-sm inline-block">
            Create free account
          </Link>
        </div>
      </section>
    </div>
  );
}
