'use client';
/**
 * app/test/[id]/result/page.jsx — Phase 5 update.
 *
 * New "AI Analysis" tab added alongside overview / topics / review.
 * - Calls POST /analysis/{test_id}/generate on first load (idempotent)
 * - Shows AI 3-day study plan, behavioral/sincerity score, video recommendations
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getResult, generateAnalysis } from '@/lib/api';
import ChatbotFab_Examiq from '@/components/ChatbotFab_Examiq';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

// ── Small reusable components ─────────────────────────────────────────────────

function ScoreRing({ pct, size = 120 }) {
  const r    = 46;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 70 ? '#86db64' : pct >= 50 ? '#45f0f4' : '#ffb4ab';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="50" y="47" textAnchor="middle" fill={color}
            style={{ fontFamily:'JetBrains Mono', fontSize:16, fontWeight:700 }}>
        {pct.toFixed(1)}%
      </text>
      <text x="50" y="61" textAnchor="middle" fill="#8b919f"
            style={{ fontFamily:'JetBrains Mono', fontSize:8 }}>
        SCORE
      </text>
    </svg>
  );
}

function TopicBar({ topic, score, total }) {
  const pct   = total > 0 ? (score / total) * 100 : 0;
  const color = pct >= 70 ? '#86db64' : pct >= 40 ? '#45f0f4' : '#ffb4ab';
  const tag   = pct >= 70 ? 'Strong' : pct >= 40 ? 'Average' : 'Weak';
  return (
    <div className="flex items-center gap-3 py-2"
         style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-on-surface truncate">{topic}</span>
          <span className="text-xs ml-2 flex-shrink-0"
                style={{ fontFamily:'JetBrains Mono', color }}>
            {score}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full rounded-full"
               style={{ width:`${pct}%`, background:color, transition:'width 0.6s ease' }} />
        </div>
      </div>
      <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded"
            style={{ fontFamily:'JetBrains Mono', background:color+'18', color, fontSize:10 }}>
        {tag}
      </span>
    </div>
  );
}

function QuestionReview({ qr, index, onSelect }) {
  const [open, setOpen] = useState(false);

  // Helper to normalize comparison
  const checkMatch = (target, val, text) => {
    if (target === undefined || target === null) return false;
    const normalize = (s) => String(s).trim().toUpperCase();
    
    if (Array.isArray(target)) {
      return target.some(t => {
        const nt = normalize(t);
        return nt === normalize(val) || (text && nt === normalize(text));
      });
    }
    const nt = normalize(target);
    return nt === normalize(val) || (text && nt === normalize(text));
  };

  // Helper to render content with potential math
  const renderWithMath = (content) => {
    if (!content) return null;
    let processed = String(content);
    
    // Replace standard LaTeX delimiters with $ for remark-math
    processed = processed.replace(/\\\(|\\\)/g, '$');
    processed = processed.replace(/\\\[|\\\]/g, '$$$$');

    if (!processed.includes('$')) {
      // Wrap alphanumeric followed by ^ or _ or common stats
      processed = processed.replace(/([a-zA-Z0-9]+[\^_][a-zA-Z0-9]+)/g, '$$$1$$');
      processed = processed.replace(/(E\[[a-zA-Z\s]+\]|Var\([a-zA-Z\s]+\))/g, '$$$1$$');
    }
    return (
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {processed}
      </ReactMarkdown>
    );
  };
  const statusColor = qr.is_correct ? '#86db64' : qr.user_answer == null ? '#8b919f' : '#ffb4ab';
  const statusLabel = qr.is_correct ? 'Correct' : qr.user_answer == null ? 'Skipped' : 'Incorrect';

  return (
    <div className="rounded-xl overflow-hidden"
         style={{ background: '#121418', border:'1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(!open)}
              className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-xs font-bold flex-shrink-0 mt-1"
              style={{ fontFamily:'JetBrains Mono', color:'#8b919f' }}>Q{index+1}</span>
        
        <div className={`flex-1 text-sm text-on-surface leading-relaxed ${!open ? 'truncate' : ''}`}>
          {qr.question_blocks?.map((b, i) => {
            if (b.type === 'image') {
              if (!open) return null; // Don't show images in collapsed preview
              return (
                <div key={i} className="w-full my-3">
                  <img src={b.url} alt={`Question figure ${i}`} className="max-w-full h-auto rounded-lg border border-outline-variant/30 shadow-sm" />
                </div>
              );
            }
            if (b.type === 'latex') {
              return (
                <span key={i} className="inline-block mx-0.5">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {`$${b.body}$`}
                  </ReactMarkdown>
                </span>
              );
            }
            return <span key={i} className="whitespace-pre-wrap">{renderWithMath(b.body)}</span>;
          })}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 mt-1">
          <span className="text-xs font-bold" style={{ fontFamily:'JetBrains Mono', color:statusColor }}>
            {statusLabel}
          </span>
          <span className="text-xs text-outline" style={{ fontFamily:'JetBrains Mono' }}>
            {qr.marks_awarded}/{qr.marks_possible}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-outline"
               style={{ transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div className="mt-4" />
          {qr.options && (
            <div className="flex flex-col gap-2.5 mb-5">
              {qr.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = checkMatch(qr.correct_answer, letter, opt);
                const isUser    = checkMatch(qr.user_answer, letter, null);

                let statusColor = '#262a31';
                let bgColor = '#1c2026';
                let textColor = '#c1c6d5';
                let icon = null;

                if (isCorrect) {
                  statusColor = '#86db64';
                  bgColor = 'rgba(134,219,100,0.08)';
                  textColor = '#86db64';
                  icon = (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 7l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  );
                } else if (isUser) {
                  statusColor = '#ffb4ab';
                  bgColor = 'rgba(255,180,171,0.08)';
                  textColor = '#ffb4ab';
                  icon = (
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 3l8 8M11 3l-8 8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  );
                }

                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl text-sm transition-all relative overflow-hidden"
                       style={{
                         background: bgColor,
                         border: `1.5px solid ${statusColor}${isCorrect || isUser ? '80' : '33'}`,
                       }}>
                    
                    {/* Corner badge for user selection */}
                    {isUser && (
                      <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold uppercase tracking-tighter"
                           style={{ background: isCorrect ? '#86db64' : '#ffb4ab', color: '#000' }}>
                        Your Choice
                      </div>
                    )}

                    <span className="font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ 
                            fontFamily:'JetBrains Mono',
                            background: isCorrect ? '#86db6422' : isUser ? '#ffb4ab22' : 'rgba(255,255,255,0.05)',
                            color: textColor,
                            border: `1px solid ${statusColor}44`
                          }}>
                      {letter}
                    </span>
                    
                    <div className="flex-1" style={{ color: (isCorrect || isUser) ? textColor : '#c1c6d5' }}>
                      {renderWithMath(opt)}
                    </div>

                    {icon && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                           style={{ background: `${statusColor}22`, color: statusColor }}>
                        {icon}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {qr.question_type === 'NAT' && (
            <div className="mb-3 p-3 rounded-lg text-sm"
                 style={{ background:'rgba(134,219,100,0.08)', border:'1px solid rgba(134,219,100,0.3)' }}>
              <span className="text-xs text-tertiary" style={{ fontFamily:'JetBrains Mono' }}>
                Correct: </span>
              <span className="font-bold text-tertiary"
                    style={{ fontFamily:'JetBrains Mono' }}>{String(qr.correct_answer)}</span>
              {qr.user_answer != null && (
                <span className="ml-4 text-xs text-error" style={{ fontFamily:'JetBrains Mono' }}>
                  Your answer: {String(qr.user_answer)}
                </span>
              )}
            </div>
          )}
          {qr.explanation && (
            <div className="p-3 rounded-lg text-sm leading-relaxed"
                 style={{ background:'rgba(171,199,255,0.06)',
                          border:'1px solid rgba(171,199,255,0.15)', color:'#c1c6d5' }}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-primary"
                   style={{ fontFamily:'JetBrains Mono' }}>EXPLANATION</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ 
                      id: qr.question_id, 
                      topic_name: qr.topic_name,
                      subject_name: qr.subject_name 
                    });
                  }}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  style={{ fontFamily: 'JetBrains Mono' }}
                >
                  ✦ ASK EXAMIQ AI
                </button>
              </div>
              <div className="markdown-explanation">
                {renderWithMath(qr.explanation)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Analysis tab ───────────────────────────────────────────────────────────

function SincerityMeter({ score }) {
  if (score == null) return (
    <p className="text-xs text-outline">No timing data for this test.</p>
  );
  const color = score >= 80 ? '#86db64' : score >= 60 ? '#45f0f4' : '#ffb4ab';
  return (
    <div>
      <div className="flex items-end gap-3 mb-2">
        <span style={{ fontFamily:'JetBrains Mono', fontSize:36, fontWeight:700, color }}>
          {score}
        </span>
        <span className="text-sm text-outline mb-1">/ 100</span>
      </div>
      <div className="h-2 bg-surface-container-high rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full" style={{ width:`${score}%`, background:color, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function VideoCard({ video }) {
  const channelColors = {
    '3Blue1Brown': '#abc7ff',
    'StatQuest':   '#86db64',
    'Gate Smashers':'#45f0f4',
    'NPTEL':       '#ffb4ab',
    'Neso Academy':'#e8a0ff',
  };
  const color = channelColors[video.channel] || '#c1c6d5';
  return (
    <a href={video.url} target="_blank" rel="noopener noreferrer"
       className="block glass-card rounded-xl p-4 hover:border-white/15 transition-all group">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
             style={{ background:color+'18', border:`1px solid ${color}33` }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill={color}>
            <path d="M2 2l10 5-10 5V2z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface group-hover:text-secondary transition-colors leading-snug">
            {video.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold" style={{ fontFamily:'JetBrains Mono', color }}>
              {video.channel}
            </span>
            <span className="text-xs text-outline">· {video.duration}</span>
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
             className="text-outline group-hover:text-secondary flex-shrink-0 mt-1 transition-colors">
          <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
    </a>
  );
}

function AIAnalysisTab({ testId, pct }) {
  const [analysis,  setAnalysis]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    // generateAnalysis is idempotent — safe to call on every page load
    generateAnalysis(testId)
      .then(setAnalysis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return (
    <div className="glass-card rounded-xl p-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
        <p className="text-sm text-on-surface-variant">Generating AI analysis...</p>
        <p className="text-xs text-outline">Calling Gemini · takes ~5 seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="glass-card rounded-xl p-6 text-sm text-error border border-error/30"
         style={{ fontFamily:'JetBrains Mono' }}>
      {error}
      <p className="text-outline mt-2 text-xs">Make sure GEMINI_API_KEY is set in your backend .env</p>
    </div>
  );

  const { study_plan, behavioral, videos } = analysis;

  return (
    <div className="flex flex-col gap-6">

      {/* Study plan */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-bold tracking-widest uppercase text-outline"
             style={{ fontFamily:'JetBrains Mono' }}>AI Study Plan</p>
          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                style={{ background:'rgba(69,240,244,0.1)', color:'#45f0f4' }}>
            Gemini · Gemma 4
          </span>
        </div>
        <p className="text-sm text-on-surface-variant mb-5 mt-1 leading-relaxed italic">
          "{study_plan.overall_verdict}"
        </p>

        <div className="space-y-3 mb-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-outline mb-2"
             style={{ fontFamily:'JetBrains Mono' }}>Improvement Roadmap</p>
          {(study_plan.roadmap || []).map((step) => (
            <div key={step.priority} className="rounded-xl p-4 flex items-start gap-4"
                 style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex flex-col items-center justify-center border border-secondary/20"
                   style={{ background:'rgba(69,240,244,0.05)' }}>
                <span className="text-[8px] font-bold uppercase text-outline leading-none mb-0.5">Step</span>
                <span className="text-sm font-bold text-secondary leading-none">{step.priority}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface mb-1">{step.topic}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{step.action_plan}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label:'Strengths', items:study_plan.key_strengths, color:'#86db64' },
            { label:'Weaknesses', items:study_plan.key_weaknesses, color:'#ffb4ab' },
          ].map(({ label, items, color }) => (
            <div key={label} className="rounded-lg p-4"
                 style={{ background:color+'08', border:`1px solid ${color}20` }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3"
                 style={{ fontFamily:'JetBrains Mono', color }}>{label}</p>
              <div className="flex flex-wrap gap-2">
                {(items || []).length === 0
                  ? <span className="text-xs text-outline">—</span>
                  : (items || []).map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded"
                          style={{ background:color+'15', color, fontFamily:'JetBrains Mono' }}>
                      {t}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral insights */}
      <div className="glass-card rounded-xl p-6">
        <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
           style={{ fontFamily:'JetBrains Mono' }}>Behavioral Insights</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-on-surface-variant mb-2">Sincerity Score</p>
            <SincerityMeter score={behavioral.sincerity_score} />
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              {behavioral.verdict || behavioral.message}
            </p>
          </div>

          {behavioral.sincerity_score != null && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label:'Total time',     value:`${behavioral.total_time_mins} min`, color:'#45f0f4' },
                { label:'Avg per question',value:`${behavioral.avg_time_per_question_secs}s`, color:'#abc7ff' },
                { label:'Fast guesses',   value:behavioral.fast_guesses,   color:'#ffb4ab' },
                { label:'Overtime Qs',    value:behavioral.overtime_questions, color:'#BA7517' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3"
                     style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs text-outline mb-1" style={{ fontFamily:'JetBrains Mono' }}>{label}</p>
                  <p className="font-bold" style={{ fontFamily:'JetBrains Mono', color, fontSize:18 }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video recommendations */}
      {videos && videos.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
             style={{ fontFamily:'JetBrains Mono' }}>Recommended Resources</p>
          <p className="text-xs text-on-surface-variant mb-4">
            Curated for your weak topics — no algorithm, hand-picked quality.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {videos.map((v, i) => <VideoCard key={i} video={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main result page ──────────────────────────────────────────────────────────

export default function ResultPage() {
  const { id: testId } = useParams();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('overview');
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    getResult(testId)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <p className="text-on-surface-variant" style={{ fontFamily:'JetBrains Mono' }}>Loading results...</p>
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <p className="text-error" style={{ fontFamily:'JetBrains Mono' }}>{error}</p>
    </div>
  );

  const pct = result.percentage ?? 0;

  const TABS = [
    { key:'overview', label:'Overview' },
    { key:'topics',   label:'Topic breakdown' },
    { key:'ai',       label:'✦ AI Analysis' },
    { key:'review',   label:`Question review (${result.questions.length})` },
  ];

  return (
    <div className="relative-z pt-8 pb-16 section-container">
      <div className="pt-4 mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
           style={{ fontFamily:'JetBrains Mono' }}>Test complete</p>
        <h1 className="text-2xl font-bold text-on-surface">Results & Analysis</h1>
      </div>

      {/* Score header */}
      <div className="glass-card rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center gap-8">
        <ScoreRing pct={pct} size={130} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
          {[
            { label:'Score',     value:`${result.score} / ${result.total_marks}`, color:'#45f0f4' },
            { label:'Correct',   value:result.correct_count,                      color:'#86db64' },
            { label:'Incorrect', value:result.incorrect_count,                    color:'#ffb4ab' },
            { label:'Skipped',   value:result.skipped_count,                      color:'#8b919f' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs font-bold tracking-widest uppercase text-outline mb-1"
                 style={{ fontFamily:'JetBrains Mono' }}>{label}</p>
              <p style={{ fontFamily:'JetBrains Mono', fontSize:24, fontWeight:700, color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: tab === key ? 'rgba(69,240,244,0.1)' : 'rgba(255,255,255,0.03)',
                    color:      tab === key ? '#45f0f4' : '#c1c6d5',
                    border:    `1px solid ${tab === key ? 'rgba(69,240,244,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="glass-card rounded-xl p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily:'JetBrains Mono' }}>Performance summary</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {pct >= 70
                ? "Excellent — strong command across most topics."
                : pct >= 50
                ? 'Good effort. Focus on weak topics to push past 70%.'
                : 'Keep going — targeted practice will make a significant difference.'}
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/test/configure" className="cyber-btn-cyan text-xs px-4 py-2">Retake →</Link>
              <Link href="/dashboard" className="cyber-btn-ghost text-xs px-4 py-2">Dashboard</Link>
            </div>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily:'JetBrains Mono' }}>Weakest topics</p>
            <div className="flex flex-col gap-2">
              {(result.topic_summary || [])
                .filter((t) => t.total > 0)
                .sort((a, b) => (a.score / a.total) - (b.score / b.total))
                .slice(0, 4)
                .map((t) => (
                  <div key={t.topic} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:'#ffb4ab' }} />
                    <span className="text-on-surface-variant flex-1">{t.topic}</span>
                    <span className="text-error" style={{ fontFamily:'JetBrains Mono' }}>
                      {t.score}/{t.total}
                    </span>
                  </div>
                ))}
            </div>
            <button onClick={() => setTab('ai')}
                    className="mt-4 text-xs text-secondary hover:underline"
                    style={{ fontFamily:'JetBrains Mono' }}>
              View full AI analysis →
            </button>
          </div>
        </div>
      )}

      {tab === 'topics' && (
        <div className="glass-card rounded-xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-outline mb-5"
             style={{ fontFamily:'JetBrains Mono' }}>Topic-wise breakdown</p>
          {(result.topic_summary || []).filter((t) => t.total > 0)
            .sort((a, b) => (b.score / b.total) - (a.score / a.total))
            .map((t) => <TopicBar key={t.topic} topic={t.topic} score={t.score} total={t.total} />)}
        </div>
      )}

      {tab === 'ai' && <AIAnalysisTab testId={testId} pct={pct} />}

      {tab === 'review' && (
        <div className="flex flex-col gap-3">
          {result.questions.map((qr, idx) => (
            <QuestionReview 
              key={qr.question_id} 
              qr={qr} 
              index={idx} 
              onSelect={setSelectedQuestion}
            />
          ))}
        </div>
      )}
      <ChatbotFab_Examiq testId={testId} activeQuestion={selectedQuestion} msgLimit={10} />
    </div>
  );
}
