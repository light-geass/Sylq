'use client';
/**
 * app/test/[id]/page.jsx — Active test interface.
 * Phase 5 update: added per-question time tracking.
 *
 * How it works:
 *   - `questionStartTime` ref stores the timestamp when the student
 *     navigated to the current question.
 *   - On every question change (next / prev / palette click), elapsed
 *     seconds are accumulated into `timePerQuestion` state.
 *   - On submit, `timePerQuestion` is sent alongside answers.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { submitTest } from '@/lib/api';

const STATUS = { unanswered: 'default', answered: 'answered', flagged: 'flagged' };

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function ActiveTestPage() {
  const { id: testId } = useParams();
  const router = useRouter();

  const [session,      setSession]      = useState(null);
  const [questions,    setQuestions]    = useState([]);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState({});
  const [flags,        setFlags]        = useState(new Set());
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);

  // ── Phase 5: time tracking ───────────────────────────────────────────────
  // timePerQuestion: { [question_id]: total_seconds_spent }
  const [timePerQuestion, setTimePerQuestion] = useState({});
  // When the student arrived on the current question
  const questionStartTime = useRef(Date.now());

  // Call this whenever the user navigates away from a question
  const flushCurrentQuestionTime = useCallback(() => {
    if (!questions[current]) return;
    const qid     = questions[current].id;
    const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
    setTimePerQuestion((prev) => ({
      ...prev,
      [qid]: (prev[qid] || 0) + elapsed,
    }));
    questionStartTime.current = Date.now();
  }, [current, questions]);

  const timerRef = useRef(null);

  // Load session from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(`test_session_${testId}`);
    if (!raw) { router.replace('/test/configure'); return; }
    const data = JSON.parse(raw);
    setSession(data);
    setQuestions(data.questions || []);
    setTimeLeft(data.duration_mins * 60);
    setLoading(false);
  }, [testId, router]);

  // Countdown timer
  useEffect(() => {
    if (!timeLeft || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const q            = questions[current];
  const timeCritical = timeLeft < 300;

  const setAnswer = (qid, value) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const toggleFlag = (qid) =>
    setFlags((prev) => {
      const next = new Set(prev);
      next.has(qid) ? next.delete(qid) : next.add(qid);
      return next;
    });

  // ── Navigate between questions (flush timing on every move) ───────────
  const goTo = useCallback((idx) => {
    flushCurrentQuestionTime();
    setCurrent(idx);
    questionStartTime.current = Date.now();
    setPaletteOpen(false);
  }, [flushCurrentQuestionTime]);

  const getQStatus = (qid) => {
    if (flags.has(qid))                                           return 'flagged';
    if (answers[qid] !== undefined && answers[qid] !== '')        return 'answered';
    return 'default';
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    // Flush time for the current (last) question
    flushCurrentQuestionTime();

    // Wait one tick so state flush is included
    await new Promise((r) => setTimeout(r, 50));

    try {
      // Send answers + timing data together
      await submitTest(testId, answers, timePerQuestion);
      sessionStorage.removeItem(`test_session_${testId}`);
      router.push(`/test/${testId}/result`);
    } catch (e) {
      alert('Submission failed: ' + e.message);
      setSubmitting(false);
    }
  }, [answers, timePerQuestion, testId, router, submitting, flushCurrentQuestionTime]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono' }}>
        Loading test...
      </p>
    </div>
  );

  if (!q) return null;

  return (
    <div style={{ background: '#0D1117', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
        style={{
          background:    'rgba(13,17,23,0.9)',
          backdropFilter:'blur(12px)',
          borderBottom:  '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-outline" style={{ fontFamily: 'JetBrains Mono' }}>
            GATER
          </span>
          <span className="hidden md:block text-xs text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono' }}>
            Q {current + 1} / {questions.length}
          </span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               style={{ color: timeCritical ? '#ffb4ab' : '#45f0f4' }}>
            <circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 6v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M5.5 1.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700, minWidth: 72,
            color: timeCritical ? '#ffb4ab' : '#45f0f4',
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="md:hidden text-xs border border-outline-variant text-on-surface-variant px-3 py-1.5 rounded-lg"
            style={{ fontFamily: 'JetBrains Mono' }}
          >
            Palette
          </button>
          <button
            onClick={() => { if (window.confirm('Submit the test? This cannot be undone.')) handleSubmit(); }}
            disabled={submitting}
            className="cyber-btn-cyan text-xs px-4 py-2"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 pt-14">

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto">

            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="badge-primary">Q {current + 1}</span>
              <span className="text-xs uppercase tracking-widest text-outline" style={{ fontFamily: 'JetBrains Mono' }}>
                {q.question_type === 'MCQ' ? 'Multiple choice'
                 : q.question_type === 'NAT' ? 'Numerical answer'
                 : 'Multiple select'}
              </span>
              <span className="ml-auto text-xs text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono' }}>
                +{q.marks}{q.question_type !== 'NAT' ? ` / -${(q.marks / 3).toFixed(2)}` : ''}
              </span>
            </div>

            <p className="text-base text-on-surface leading-relaxed mb-8">
              {q.question_blocks
                ? q.question_blocks.map((b, i) => <span key={i}>{b.body}</span>)
                : q.question_text}
            </p>

            {/* NAT input */}
            {q.question_type === 'NAT' ? (
              <div>
                <label className="block text-xs text-outline mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
                  Enter your numerical answer
                </label>
                <input
                  type="number" step="any"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Type your answer..."
                  className="cyber-input max-w-xs"
                  style={{ fontFamily: 'JetBrains Mono', fontSize: 18 }}
                />
              </div>
            ) : (
              /* MCQ / MSQ options */
              <div className="flex flex-col gap-3">
                {(q.options || []).map((opt, idx) => {
                  const letter     = String.fromCharCode(65 + idx);
                  const isSelected = q.question_type === 'MSQ'
                    ? (answers[q.id] || []).includes(letter)
                    : answers[q.id] === letter;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (q.question_type === 'MSQ') {
                          const prev = answers[q.id] || [];
                          const next = prev.includes(letter)
                            ? prev.filter((x) => x !== letter)
                            : [...prev, letter];
                          setAnswer(q.id, next);
                        } else {
                          setAnswer(q.id, letter);
                        }
                      }}
                      className="flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-150"
                      style={{
                        background:  isSelected ? 'rgba(69,240,244,0.08)' : '#1c2026',
                        borderColor: isSelected ? 'rgba(69,240,244,0.5)' : '#414753',
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border"
                        style={{
                          fontFamily:  'JetBrains Mono',
                          background:  isSelected ? '#45f0f4' : 'transparent',
                          borderColor: isSelected ? '#45f0f4' : '#414753',
                          color:       isSelected ? '#003738' : '#c1c6d5',
                        }}
                      >
                        {letter}
                      </span>
                      <span className="text-sm text-on-surface">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Flag + navigation */}
            <div className="flex items-center justify-between mt-8 pt-6"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => toggleFlag(q.id)}
                className="flex items-center gap-2 text-xs transition-colors"
                style={{ fontFamily: 'JetBrains Mono', color: flags.has(q.id) ? '#45f0f4' : '#8b919f' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill={flags.has(q.id) ? '#45f0f4' : 'none'}
                     stroke="currentColor" strokeWidth="1.2">
                  <path d="M3 2v10M3 2h7l-2 3 2 3H3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {flags.has(q.id) ? 'Flagged' : 'Flag for review'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(Math.max(0, current - 1))}
                  disabled={current === 0}
                  className="cyber-btn-ghost text-xs px-4 py-2"
                  style={{ opacity: current === 0 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => {
                    if (current < questions.length - 1) goTo(current + 1);
                    else if (window.confirm('Last question — submit now?')) handleSubmit();
                  }}
                  className="cyber-btn-cyan text-xs px-4 py-2"
                >
                  {current < questions.length - 1 ? 'Next →' : 'Finish →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Palette sidebar ── */}
        <aside
          className={`fixed md:sticky top-14 right-0 h-[calc(100vh-56px)] w-64 overflow-y-auto p-4 z-40
            transition-transform duration-300
            ${paletteOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
          style={{
            background:    'rgba(13,17,23,0.95)',
            borderLeft:    '1px solid rgba(255,255,255,0.07)',
            backdropFilter:'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold tracking-widest uppercase text-outline"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Question palette
            </p>
            <button onClick={() => setPaletteOpen(false)} className="md:hidden text-outline hover:text-on-surface">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 mb-4 p-3 rounded-lg" style={{ background:'rgba(255,255,255,0.03)' }}>
            {[
              { color:'#86db64', label:'Answered' },
              { color:'#ffb4ab', label:'Not answered' },
              { color:'#45f0f4', label:'Flagged' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background:color+'33', border:`1px solid ${color}` }} />
                <span className="text-xs text-on-surface-variant" style={{ fontFamily:'JetBrains Mono' }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {questions.map((qq, idx) => {
              const st = getQStatus(qq.id);
              const cls = { answered:'q-chip-answered', flagged:'q-chip-flagged', default:'q-chip-default' }[st];
              return (
                <button
                  key={qq.id}
                  onClick={() => goTo(idx)}
                  className={`${cls} ${idx === current ? 'ring-1 ring-white/40' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label:'Answered', value:Object.keys(answers).filter(k=>answers[k]!==undefined&&answers[k]!=='').length, color:'#86db64' },
              { label:'Flagged',  value:flags.size,                color:'#45f0f4' },
              { label:'Pending',  value:questions.length-Object.keys(answers).length, color:'#8b919f' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-1.5">
                <span className="text-xs text-on-surface-variant">{label}</span>
                <span className="text-xs font-bold" style={{ fontFamily:'JetBrains Mono', color }}>{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
