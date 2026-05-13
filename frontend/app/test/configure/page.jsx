'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTest } from '@/lib/api';

// Full GATE DA syllabus — mirrors your database seed data exactly
const SUBJECTS = [
  {
    id: 1, name: 'Probability & Statistics',
    topics: [
      { id: 1,  name: 'Counting, Axioms & Sample Space' },
      { id: 2,  name: 'Marginal, Joint & Conditional Prob (Bayes)' },
      { id: 3,  name: 'Expectation, Variance, Mean, Median & SD' },
      { id: 4,  name: 'Correlation & Covariance' },
      { id: 5,  name: 'Discrete RVs (Uniform, Bernoulli, Binomial)' },
      { id: 6,  name: 'Continuous RVs (Uniform, Exponential, Normal)' },
      { id: 7,  name: 'Standard Normal, t-dist & Chi-squared' },
      { id: 8,  name: 'Central Limit Theorem & Confidence Intervals' },
      { id: 9,  name: 'Hypothesis Testing (z, t, chi-squared)' },
    ],
  },
  {
    id: 2, name: 'Linear Algebra',
    topics: [
      { id: 10, name: 'Vector Spaces, Subspaces & Linear Independence' },
      { id: 11, name: 'Matrices (Projection, Orthogonal, Idempotent)' },
      { id: 12, name: 'Systems of Linear Equations (Gaussian Elim.)' },
      { id: 13, name: 'Eigenvalues, Eigenvectors & Determinants' },
      { id: 14, name: 'Rank, Nullity & Projections' },
      { id: 15, name: 'LU Decomposition & SVD' },
      { id: 16, name: 'Quadratic Forms' },
    ],
  },
  {
    id: 3, name: 'Calculus & Optimization',
    topics: [
      { id: 17, name: 'Limits, Continuity & Differentiability' },
      { id: 18, name: 'Taylor Series' },
      { id: 19, name: 'Maxima, Minima & Single Variable Optimization' },
    ],
  },
  {
    id: 4, name: 'Programming, DS & Algorithms',
    topics: [
      { id: 20, name: 'Programming in Python' },
      { id: 21, name: 'Data Structures (Stacks, Queues, Trees, Hash)' },
      { id: 22, name: 'Search & Basic Sorting (Selection, Bubble)' },
      { id: 23, name: 'Divide & Conquer (Mergesort & Quicksort)' },
      { id: 24, name: 'Graph Theory & Algorithms (BFS, DFS, Dijkstra)' },
    ],
  },
  {
    id: 5, name: 'DBMS & Warehousing',
    topics: [
      { id: 25, name: 'ER-model & Relational Model (Algebra, SQL)' },
      { id: 26, name: 'Integrity Constraints & Normal Forms' },
      { id: 27, name: 'File Organization & Indexing' },
      { id: 28, name: 'Data Transformation (Normalization, Discretization)' },
      { id: 29, name: 'Warehouse Modelling (Schema, Hierarchies)' },
    ],
  },
  {
    id: 6, name: 'Machine Learning',
    topics: [
      { id: 30, name: 'Regression (Simple, Multiple, Ridge, Logistic)' },
      { id: 31, name: 'Classification (K-NN, Naive Bayes, LDA, SVM)' },
      { id: 32, name: 'Neural Networks (MLP & Feed-forward)' },
      { id: 33, name: 'Clustering (K-means, Hierarchical)' },
      { id: 34, name: 'Dimensionality Reduction & PCA' },
      { id: 35, name: 'Bias-Variance Trade-off & Cross-Validation' },
    ],
  },
  {
    id: 7, name: 'Artificial Intelligence',
    topics: [
      { id: 36, name: 'Search (Informed, Uninformed, Adversarial)' },
      { id: 37, name: 'Logic (Propositional & Predicate)' },
      { id: 38, name: 'Reasoning: Conditional Independence & Variable Elim.' },
      { id: 39, name: 'Approximate Inference through Sampling' },
    ],
  },
];

const BRANCHES = [
  { id: 'DA', name: 'Data Science & AI' },
  { id: 'CS', name: 'Computer Science & IT' },
  { id: 'ME', name: 'Mechanical Engineering' },
  { id: 'EC', name: 'Electronics & Comm.' },
];

const LENGTHS = [
  { value: 10, label: 'Sprint',       sublabel: '25 min' },
  { value: 25, label: 'Session',      sublabel: '70 min' },
  { value: 45, label: 'Mini-Mock',    sublabel: '125 min' },
  { value: 65, label: 'Official',     sublabel: '180 min' },
];

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   activeClass: 'bg-[#86db64]/20 text-[#86db64] border-[#86db64]/50' },
  { key: 'medium', label: 'Medium', activeClass: 'bg-secondary/20 text-secondary border-secondary/50' },
  { key: 'hard',   label: 'Hard',   activeClass: 'bg-error/20 text-error border-error/50' },
];



const TOTAL_TOPICS = SUBJECTS.reduce((a, s) => a + s.topics.length, 0);

export default function ConfigurePage() {
  const router = useRouter();

  // All topics selected by default
  const [selectedTopics, setSelectedTopics] = useState(
    () => new Set(SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)))
  );
  const [branch,       setBranch]       = useState('DA');
  const [openSubjects, setOpenSubjects] = useState(new Set([1]));
  const [difficulty,   setDifficulty]   = useState(new Set(['easy', 'medium', 'hard']));
  const [length,       setLength]       = useState(25);
  const qtypes                          = ['MCQ', 'NAT', 'MSQ']; // Fixed to all types
  const [pyqOnly,      setPyqOnly]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // Derived
  const selectedSubjectIds = SUBJECTS
    .filter((s) => s.topics.some((t) => selectedTopics.has(t.id)))
    .map((s) => s.id);

  const topicCount = selectedTopics.size;

  // MCQ:NAT:MSQ ≈ 2:1:1 distribution
  const qtOn  = qtypes;
  const mcqN  = qtOn.includes('MCQ') ? Math.round(length * 0.5) : 0;
  const natN  = qtOn.includes('NAT') ? Math.round(length * 0.25) : 0;
  const msqN  = qtOn.includes('MSQ') ? length - mcqN - natN : 0;
  // Accurate Marks & Timing logic based on official GATE scaling
  // 65 questions = 30 (1-mark) + 35 (2-mark) = 100 marks total in 180 mins
  const num1Mark = Math.round(length * (30 / 65));
  const num2Mark = length - num1Mark;
  const totalMarks = (num1Mark * 1) + (num2Mark * 2);
  const durationMins = Math.round(totalMarks * 1.8);

  // Helpers
  const toggleSubject = (subjId) => {
    const subj = SUBJECTS.find((s) => s.id === subjId);
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
    const subj = SUBJECTS.find((s) => s.id === subjId);
    const on   = subj.topics.filter((t) => selectedTopics.has(t.id)).length;
    if (on === 0) return 'none';
    if (on === subj.topics.length) return 'all';
    return 'partial';
  };

  const canStart = topicCount > 0 && difficulty.size > 0;

  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        branch_code:      branch,
        subject_ids:      selectedSubjectIds,
        topic_ids:        [...selectedTopics],
        difficulty:       difficulty.size === 1 ? [...difficulty][0] : null, // Correctly send single value or null
        question_types:   qtypes,
        total_questions:  length,
        pyq_only:         pyqOnly,
      };
      const session = await createTest(payload);
      // Store session so the active test page can read questions without another API call
      sessionStorage.setItem(`test_session_${session.test_id}`, JSON.stringify(session));
      router.push(`/test/${session.test_id}`);
    } catch (e) {
      setError(e.message || 'Failed to create test. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative-z pt-20 pb-16 section-container">
      {/* Header */}
      <div className="pt-6 mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Test configuration
        </p>
        <h1 className="text-2xl font-bold text-on-surface">Configure your test</h1>
        <p className="text-sm text-on-surface-variant mt-1">GATE {branch} · {BRANCHES.find(b => b.id === branch)?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">

          {/* Branch Selection */}
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Select Branch
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BRANCHES.map((b) => (
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
                  <span className="text-xs font-mono font-bold text-outline">{b.id}</span>
                </button>
              ))}
            </div>
            {branch !== 'DA' && (
              <p className="text-xs mt-4" style={{ color: '#BA7517' }}>
                * Note: Currently only DA questions are fully populated in the database. Selecting another branch may yield fewer or no questions.
              </p>
            )}
          </div>

          {/* Source */}
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
              Question source
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Mixed (AI + PYQ)', value: false, badge: 'Free' },
                { label: 'PYQ only (2014–2026)', value: true, badge: 'Premium' },
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

          {/* Subjects & Topics */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest uppercase text-outline"
                 style={{ fontFamily: 'JetBrains Mono' }}>
                Subjects & topics
              </p>
              <button
                onClick={() => setSelectedTopics(new Set())}
                className="text-xs text-secondary hover:underline"
                style={{ fontFamily: 'JetBrains Mono' }}
              >
                Deselect all
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Selecting a subject checks all its topics. Uncheck individually to narrow down.
            </p>

            <div className="flex flex-col gap-1">
              {SUBJECTS.map((subj) => {
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
                        {subj.topics.map((topic) => (
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
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LENGTHS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLength(l.value)}
                  className={`p-4 rounded-lg border text-left transition-all duration-150 ${
                    length === l.value
                      ? 'border-secondary/50 bg-secondary/10'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700,
                               color: length === l.value ? '#45f0f4' : '#dfe2eb' }}>
                    {l.value}
                  </p>
                  <p className="text-xs font-medium mt-0.5"
                     style={{ color: length === l.value ? '#45f0f4' : '#dfe2eb' }}>
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
              { label: 'Branch',       value: branch },
              { label: 'Questions',    value: length },
              { label: 'Duration',     value: LENGTHS.find(l => l.value === length)?.sublabel },
              { label: 'Total marks',  value: totalMarks },
              { label: 'Subjects',     value: `${selectedSubjectIds.length} / ${SUBJECTS.length}` },
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
                { label: 'MSQ', n: msqN, color: '#86db64' },
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
          {!canStart && (
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
