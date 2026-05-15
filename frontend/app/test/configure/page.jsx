'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createTest, getExamBranches, getExamSubjects, getExamTopics } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';

/**
 * Returns exam-specific test length tiers.
 * Official counts per exam:
 *   GATE:         65 q / 180 min (~2.77 min/q)
 *   JEE Main:     75 q / 180 min (~2.4 min/q)
 *   JEE Advanced: 54 q / 180 min (~3.3 min/q)
 *   NEET:        180 q / 200 min (~1.1 min/q)
 */
function getExamLengths(examName) {
  const exam = (examName || '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (exam.includes('jee main') || exam.includes('mains')) {
    return [
      { value: 15, label: 'Sprint',    sublabel: '36 min' },
      { value: 30, label: 'Session',   sublabel: '72 min' },
      { value: 50, label: 'Mini-Mock', sublabel: '120 min' },
      { value: 75, label: 'Official',  sublabel: '180 min' },
    ];
  } else if (exam.includes('mht cet pcm')) {
    return [
      { value: 15,  label: 'Sprint',    sublabel: '18 min' },
      { value: 45,  label: 'Session 1', sublabel: '54 min' },
      { value: 75,  label: 'Session 2', sublabel: '90 min' },
      { value: 100, label: 'Mini-Mock', sublabel: '120 min' },
      { value: 150, label: 'Official',  sublabel: '180 min' },
    ];
  } else if (exam.includes('mht cet pcb')) {
    return [
      { value: 15,  label: 'Sprint',    sublabel: '14 min' },
      { value: 60,  label: 'Session 1', sublabel: '54 min' },
      { value: 100, label: 'Session 2', sublabel: '90 min' },
      { value: 150, label: 'Mini-Mock', sublabel: '135 min' },
      { value: 200, label: 'Official',  sublabel: '180 min' },
    ];
  } else if (exam.includes('jee adv')) {
    return [
      { value: 10, label: 'Sprint',    sublabel: '33 min' },
      { value: 20, label: 'Session',   sublabel: '66 min' },
      { value: 36, label: 'Mini-Mock', sublabel: '120 min' },
      { value: 54, label: 'Official',  sublabel: '180 min' },
    ];
  } else if (exam.includes('neet')) {
    return [
      { value: 30,  label: 'Sprint',    sublabel: '33 min' },
      { value: 60,  label: 'Session',   sublabel: '66 min' },
      { value: 120, label: 'Mini-Mock', sublabel: '132 min' },
      { value: 180, label: 'Official',  sublabel: '200 min' },
    ];
  } else if (exam.includes('cat')) {
    return [
      { value: 15, label: 'Sprint',    sublabel: '27 min' },
      { value: 33, label: 'Session',   sublabel: '60 min' },
      { value: 50, label: 'Mini-Mock', sublabel: '90 min' },
      { value: 66, label: 'Official',  sublabel: '120 min' },
    ];
  } else {
    // Default / GATE
    return [
      { value: 10, label: 'Sprint',    sublabel: '28 min' },
      { value: 25, label: 'Session',   sublabel: '70 min' },
      { value: 45, label: 'Mini-Mock', sublabel: '125 min' },
      { value: 65, label: 'Official',  sublabel: '180 min' },
    ];
  }
}

/**
 * Mirrors the backend's exam_rules.py — getExamTypeCounts()
 * Returns { mcq, nat, msq } counts for the given exam and total.
 */
function getExamDistribution(examName, total) {
  const exam = (examName || '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (exam.includes('jee main') || exam.includes('mains') || exam === 'jee') {
    // JEE Main: ~80% MCQ, ~20% NAT, 0 MSQ
    const nat = Math.floor(total / 5);
    return { mcq: total - nat, nat, msq: 0 };
  } else if (exam.includes('jee adv')) {
    // JEE Advanced: 40% MCQ, 30% MSQ, 30% NAT
    const mcq = Math.round(total * 0.40);
    const msq = Math.round(total * 0.30);
    return { mcq, nat: total - mcq - msq, msq };
  } else if (exam.includes('neet') || exam.includes('mht cet')) {
    // NEET and MHT CET: 100% MCQ
    return { mcq: total, nat: 0, msq: 0 };
  } else if (exam.includes('cat')) {
    // CAT: ~70% MCQ, ~30% NAT (TITA)
    const nat = Math.round(total * 0.30);
    return { mcq: total - nat, nat, msq: 0 };
  } else {
    // Default / GATE: 2:1:1 ratio (50% MCQ, 25% NAT, 25% MSQ)
    const mcq = Math.floor(total / 2);
    const nat = Math.floor(total / 4);
    return { mcq, nat, msq: total - mcq - nat };
  }
}

/** Marks per question vary by exam. */
function getMarksInfo(examName, total) {
  const exam = (examName || '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (exam.includes('jee') || exam.includes('neet')) {
    // JEE/NEET: all questions are 4 marks
    return { totalMarks: total * 4, marksLabel: '4 marks each' };
  } else if (exam.includes('cat')) {
    // CAT: all questions are 3 marks
    return { totalMarks: total * 3, marksLabel: '3 marks each' };
  } else if (exam.includes('mht cet pcm')) {
    // MHT CET PCM: Math is 2 marks, P/C is 1 mark. Avg ~1.33 marks per question.
    return { totalMarks: Math.round(total * (200 / 150)), marksLabel: 'Math 2m, P/C 1m' };
  } else if (exam.includes('mht cet pcb')) {
    // MHT CET PCB: All questions are 1 mark.
    return { totalMarks: total, marksLabel: '1 mark each' };
  }
  // GATE: 1-mark and 2-mark split (~7:6 ratio)
  const num1Mark = Math.round(total * (30 / 65));
  const num2Mark = total - num1Mark;
  return { totalMarks: num1Mark + num2Mark * 2, marksLabel: '1 & 2 mark mix' };
}

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   activeClass: 'bg-[#86db64]/20 text-[#86db64] border-[#86db64]/50' },
  { key: 'medium', label: 'Medium', activeClass: 'bg-secondary/20 text-secondary border-secondary/50' },
  { key: 'hard',   label: 'Hard',   activeClass: 'bg-error/20 text-error border-error/50' },
];

export default function ConfigurePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── Dynamic data from API ──────────────────────────────────────
  const [branches,  setBranches]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [hasBranches, setHasBranches] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // ── User selections ────────────────────────────────────────────
  const [branch,       setBranch]       = useState(null);   // branch id (int)
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [openSubjects, setOpenSubjects] = useState(new Set());
  const [difficulty,   setDifficulty]   = useState(new Set(['easy', 'medium', 'hard']));
  const [length,       setLength]       = useState(null);  // null until exam is known
  const qtypes                          = ['MCQ', 'NAT', 'MSQ'];
  const [pyqOnly,      setPyqOnly]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // ── Fetch branches when exam changes ───────────────────────────
  const examId = user?.exam_id;

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    async function loadBranches() {
      setDataLoading(true);
      try {
        const data = await getExamBranches(examId);
        if (cancelled) return;
        const hasBr = data.has_branches && data.branches.length > 0;
        setHasBranches(hasBr);
        setBranches(data.branches || []);

        if (hasBr && data.branches.length > 0) {
          // Auto-select user's branch if they have one, else first
          const defaultBranch = user?.branch_id || data.branches[0].id;
          setBranch(defaultBranch);
        } else {
          setBranch(null);
        }
      } catch (e) {
        console.error('Failed to load branches:', e);
        setHasBranches(false);
        setBranches([]);
        setBranch(null);
      }
    }

    loadBranches();
    return () => { cancelled = true; };
  }, [examId]);

  // ── Fetch subjects + topics when branch changes ────────────────
  useEffect(() => {
    if (!examId) return;
    // For branch-based exams, wait until branch is selected
    if (hasBranches && branch === null) return;

    let cancelled = false;

    async function loadSubjectsAndTopics() {
      setDataLoading(true);
      try {
        const subData = await getExamSubjects(examId, hasBranches ? branch : null);
        if (cancelled) return;

        const subjectsWithTopics = [];
        for (const sub of (subData.subjects || [])) {
          const topicData = await getExamTopics(examId, sub.id);
          if (cancelled) return;
          subjectsWithTopics.push({
            ...sub,
            topics: topicData.topics || [],
          });
        }

        setSubjects(subjectsWithTopics);

        // Auto-select all topics
        const allTopicIds = subjectsWithTopics.flatMap(s => s.topics.map(t => t.id));
        setSelectedTopics(new Set(allTopicIds));
        if (subjectsWithTopics.length > 0) {
          setOpenSubjects(new Set([subjectsWithTopics[0].id]));
        }
      } catch (e) {
        console.error('Failed to load subjects/topics:', e);
        setSubjects([]);
        setSelectedTopics(new Set());
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadSubjectsAndTopics();
    return () => { cancelled = true; };
  }, [examId, branch, hasBranches]);

  // ── Auth guards ────────────────────────────────────────────────
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
        title="Start Your Prep" 
        message="Log in to configure and take your first practice test."
      />
    );
  }

  if (!user.exam_id) {
    return (
      <AccessDenied 
        title="Select Your Exam First" 
        message="Please select your target exam from your profile before configuring a test."
      />
    );
  }

  // ── Derived values ─────────────────────────────────────────────
  const TOTAL_TOPICS = subjects.reduce((a, s) => a + s.topics.length, 0);
  const selectedSubjectIds = subjects
    .filter((s) => s.topics.some((t) => selectedTopics.has(t.id)))
    .map((s) => s.id);
  const topicCount = selectedTopics.size;

  // Exam-specific length tiers (replaces static LENGTHS constant)
  const examLengths = getExamLengths(user?.exam_name);
  // Auto-set length to the Session tier (index 1) when it hasn't been set yet
  const activeLength = length ?? examLengths[1].value;

  // Exam-aware distribution (matches backend exam_rules.py)
  const examNameLower = (user?.exam_name || '').toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const { mcq: mcqN, nat: natN, msq: msqN } = getExamDistribution(user?.exam_name, activeLength);
  const { totalMarks, marksLabel } = getMarksInfo(user?.exam_name, activeLength);
  const durationMins = examNameLower.includes('neet') ? activeLength
    : examNameLower.includes('mht cet pcm') ? Math.round(activeLength * 1.2)
    : examNameLower.includes('mht cet pcb') ? Math.round(activeLength * 0.9)
    : examNameLower.includes('jee') ? Math.round(activeLength * 2.4)
    : examNameLower.includes('cat') ? Math.round(activeLength * 1.82)
    : totalMarks; // GATE: 1 min per mark


  // ── Helpers ────────────────────────────────────────────────────
  const toggleSubject = (subjId) => {
    const subj = subjects.find((s) => s.id === subjId);
    if (!subj) return;
    const allOn = subj.topics.every((t) => selectedTopics.has(t.id));
    const next  = new Set(selectedTopics);
    subj.topics.forEach((t) => allOn ? next.delete(t.id) : next.add(t.id));
    setSelectedTopics(next);
  };

  const toggleTopic = (topicId) => {
    const next = new Set(selectedTopics);
    next.has(topicId) ? next.delete(topicId) : next.add(topicId);
    setSelectedTopics(next);
  };

  const toggleOpen = (subjId) => {
    const next = new Set(openSubjects);
    next.has(subjId) ? next.delete(subjId) : next.add(subjId);
    setOpenSubjects(next);
  };

  const toggleDiff = (key) => {
    const next = new Set(difficulty);
    next.has(key) ? next.delete(key) : next.add(key);
    setDifficulty(next);
  };

  const subjState = (subjId) => {
    const subj = subjects.find((s) => s.id === subjId);
    if (!subj) return 'none';
    const on   = subj.topics.filter((t) => selectedTopics.has(t.id)).length;
    if (on === 0) return 'none';
    if (on === subj.topics.length) return 'all';
    return 'partial';
  };

  const canStart = topicCount > 0 && difficulty.size > 0 && !dataLoading;

  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    setError('');
    try {
      // Find branch code for the selected branch (for backwards compat with test_engine)
      const selectedBranch = branches.find(b => b.id === branch);
      const payload = {
        exam_id:          examId,
        branch_code:      selectedBranch?.code || null,
        subject_ids:      selectedSubjectIds,
        topic_ids:        [...selectedTopics],
        difficulty:       difficulty.size === 1 ? [...difficulty][0] : null,
        question_types:   qtypes,
        total_questions:  activeLength,
        pyq_only:         pyqOnly,
      };
      const session = await createTest(payload);
      sessionStorage.setItem(`test_session_${session.test_id}`, JSON.stringify(session));
      router.push(`/test/${session.test_id}`);
    } catch (e) {
      setError(e.message || 'Failed to create test. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── Branch name for header ─────────────────────────────────────
  const examName = user.exam_name || 'Exam';
  const branchName = branches.find(b => b.id === branch)?.name;
  const branchCode = branches.find(b => b.id === branch)?.code;

  return (
    <div className="relative-z pt-7 pb-16 section-container">
      {/* Header */}
      <div className="pt-6 mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Test configuration
        </p>
        <h1 className="text-2xl font-bold text-on-surface">Configure your test</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {examName}{branchCode ? ` ${branchCode}` : ''}{branchName ? ` · ${branchName}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          {/* Branch Selection — only for branch-based exams */}
          {hasBranches && branches.length > 0 && (
            <div className="glass-card rounded-xl p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
                 style={{ fontFamily: 'JetBrains Mono' }}>
                Select Branch
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBranch(b.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                      branch === b.id
                        ? 'border-secondary/50 bg-secondary/10 text-secondary'
                        : 'border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="text-xs font-mono font-bold text-outline">{b.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source */}
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Question source
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Mixed (AI + PYQ)', value: false, badge: 'Free' },
                { label: 'PYQ only', value: true, badge: 'Premium' },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setPyqOnly(opt.value)}
                  className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                    pyqOnly === opt.value
                      ? 'border-secondary/50 bg-secondary/10 text-secondary'
                      : 'border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    opt.badge === 'Free' ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary'
                  }`}>{opt.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subjects & Topics — dynamic */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest uppercase text-outline"
                 style={{ fontFamily: 'JetBrains Mono' }}>
                Subjects & topics
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allIds = subjects.flatMap(s => s.topics.map(t => t.id));
                    setSelectedTopics(new Set(allIds));
                  }}
                  className="text-xs text-primary hover:underline"
                  style={{ fontFamily: 'JetBrains Mono' }}
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedTopics(new Set())}
                  className="text-xs text-secondary hover:underline"
                  style={{ fontFamily: 'JetBrains Mono' }}
                >
                  Deselect all
                </button>
              </div>
            </div>

            {dataLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin" />
                <p className="text-xs text-outline font-mono">Loading syllabus...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-lg p-6 text-center"
                   style={{ background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.2)' }}>
                <p className="text-sm text-[#BA7517] font-medium">No subjects found for this exam yet.</p>
                <p className="text-xs text-outline mt-2">Content is being added. Check back soon!</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant mb-4">
                  Selecting a subject checks all its topics. Uncheck individually to narrow down.
                </p>

                <div className="flex flex-col gap-1">
                  {subjects.map((subj) => {
                    const state   = subjState(subj.id);
                    const isOpen  = openSubjects.has(subj.id);
                    const onCount = subj.topics.filter((t) => selectedTopics.has(t.id)).length;

                    return (
                      <div key={subj.id} className="rounded-lg overflow-hidden">
                        {/* Subject header */}
                        <div
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            isOpen ? 'bg-primary/10' : 'bg-surface-container hover:bg-surface-container-high'
                          }`}
                          style={isOpen ? { borderRadius: '8px 8px 0 0' } : { borderRadius: 8 }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSubject(subj.id); }}
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
                            style={{
                              background: state === 'none' ? 'transparent' : state === 'all' ? '#abc7ff' : 'rgba(171,199,255,0.3)',
                              borderColor: state === 'none' ? '#414753' : '#abc7ff',
                            }}
                          >
                            {state === 'all' && (
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                <path d="M1 3.5L3.5 6L8 1" stroke="#002f65" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            )}
                            {state === 'partial' && (
                              <div style={{ width: 6, height: 2, background: '#abc7ff', borderRadius: 1 }} />
                            )}
                          </button>

                          <span
                            className={`flex-1 text-sm font-medium ${isOpen ? 'text-primary' : 'text-on-surface'}`}
                            onClick={() => toggleOpen(subj.id)}
                          >
                            {subj.name}
                          </span>

                          <span className="text-xs text-outline" style={{ fontFamily: 'JetBrains Mono' }}>
                            {onCount}/{subj.topics.length}
                          </span>

                          <button onClick={() => toggleOpen(subj.id)} className="text-outline hover:text-on-surface">
                            <svg
                              width="14" height="14" viewBox="0 0 14 14" fill="none"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                            >
                              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>

                        {/* Topics list */}
                        {isOpen && (
                          <div
                            className="px-3 pb-2 pt-1 flex flex-col gap-0.5"
                            style={{ background: 'rgba(13,17,23,0.5)', borderRadius: '0 0 8px 8px' }}
                          >
                            {subj.topics.length === 0 ? (
                              <p className="text-xs text-outline py-2 px-2">No topics yet.</p>
                            ) : (
                              subj.topics.map((topic) => (
                                <button
                                  key={topic.id}
                                  onClick={() => toggleTopic(topic.id)}
                                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 text-left w-full"
                                >
                                  <div
                                    className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                                    style={{
                                      background: selectedTopics.has(topic.id) ? '#abc7ff' : 'transparent',
                                      borderColor: selectedTopics.has(topic.id) ? '#abc7ff' : '#414753',
                                    }}
                                  >
                                    {selectedTopics.has(topic.id) && (
                                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                        <path d="M1 3L3 5L7 1" stroke="#002f65" strokeWidth="1.5" strokeLinecap="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs text-on-surface-variant">{topic.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Difficulty */}
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Difficulty
            </p>
            <div className="flex gap-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => toggleDiff(d.key)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${
                    difficulty.has(d.key)
                      ? d.activeClass
                      : 'border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test length */}
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Test length
            </p>
            <div className="flex flex-wrap gap-3">
              {examLengths.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLength(l.value)}
                  className={`flex-1 min-w-[120px] p-4 rounded-lg border text-left transition-all duration-150 ${
                    activeLength === l.value
                      ? 'border-secondary/50 bg-secondary/10'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700,
                               color: activeLength === l.value ? '#45f0f4' : '#dfe2eb' }}>
                    {l.value}
                  </p>
                  <p className="text-xs font-medium mt-0.5"
                     style={{ color: activeLength === l.value ? '#45f0f4' : '#dfe2eb' }}>
                    {l.label}
                  </p>
                  <p className="text-xs text-outline mt-0.5" style={{ fontFamily: 'JetBrains Mono' }}>
                    {l.sublabel}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right sidebar summary ── */}
        <div className="lg:sticky lg:top-20 flex flex-col gap-4">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-5"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Test summary
            </p>

            {[
              { label: 'Exam',        value: examName },
              ...(hasBranches ? [{ label: 'Branch', value: branchCode || '—' }] : []),
              { label: 'Questions',    value: activeLength },
              { label: 'Duration',     value: `${durationMins} min` },
              { label: 'Total marks',  value: `${totalMarks} (${marksLabel})` },
              { label: 'Subjects',     value: `${selectedSubjectIds.length} / ${subjects.length}` },
              { label: 'Topics',       value: `${topicCount} / ${TOTAL_TOPICS}` },
              { label: 'Difficulty',   value: difficulty.size === 3 ? 'All levels' : [...difficulty].join(', ') || 'None' },
            ].map(({ label, value }) => (
              <div key={label}
                   className="flex justify-between items-center py-2.5"
                   style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-xs text-on-surface-variant">{label}</span>
                <span className="text-xs font-bold text-on-surface" style={{ fontFamily: 'JetBrains Mono' }}>
                  {value}
                </span>
              </div>
            ))}

            {/* Distribution bars */}
            <div className="mt-4">
              <p className="text-xs font-bold tracking-widest uppercase text-outline mb-3"
                 style={{ fontFamily: 'JetBrains Mono' }}>
                Distribution
              </p>
              {[
                { label: 'MCQ', n: mcqN, color: '#abc7ff' },
                { label: 'NAT', n: natN, color: '#45f0f4' },
                ...(msqN > 0 ? [{ label: 'MSQ', n: msqN, color: '#86db64' }] : []),
              ].map(({ label, n, color }) => (
                <div key={label} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-on-surface-variant w-8" style={{ fontFamily: 'JetBrains Mono' }}>{label}</span>
                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${(n / length) * 100}%`, background: color }}
                    />
                  </div>
                  <span className="text-xs w-5 text-right text-outline" style={{ fontFamily: 'JetBrains Mono' }}>{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg p-3 text-xs text-error border border-error/30 bg-error/10"
                 style={{ fontFamily: 'JetBrains Mono' }}>
              {error}
            </div>
          )}

          {/* Validation warning */}
          {!canStart && !dataLoading && (
            <div className="rounded-lg p-3 text-xs border"
                 style={{ background: 'rgba(186,117,23,0.1)', borderColor: 'rgba(186,117,23,0.3)', color: '#BA7517' }}>
              Select at least 1 subject and 1 difficulty level.
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="cyber-btn-cyan w-full py-4 text-center"
            style={{ opacity: (!canStart || loading) ? 0.5 : 1, cursor: (!canStart || loading) ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Starting...' : 'Start test'}
          </button>
        </div>
      </div>
    </div>
  );
}
