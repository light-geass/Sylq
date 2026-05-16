'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getResources } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

/* ──────────────────────────────────────────────────────────
   BOOKMARK HELPERS  (localStorage-based)
   ────────────────────────────────────────────────────────── */
function loadBookmarks() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('sylq_bookmarks') || '[]'); } catch { return []; }
}
function saveBookmarks(arr) {
  localStorage.setItem('sylq_bookmarks', JSON.stringify(arr));
  window.dispatchEvent(new Event('bookmarks_updated'));
}
function toggleBookmark(resource) {
  const all = loadBookmarks();
  const idx = all.findIndex((b) => b.key === resource.key);
  if (idx >= 0) { all.splice(idx, 1); } else { all.push(resource); }
  saveBookmarks(all);
  return idx < 0; // returns true if now saved
}
function isBookmarked(key) { return loadBookmarks().some((b) => b.key === key); }

/* ── Instagram-style bookmark icon ── */
function SaveButton({ resourceKey, resource }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isBookmarked(resourceKey)); }, [resourceKey]);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); const nowSaved = toggleBookmark({ key: resourceKey, ...resource }); setSaved(nowSaved); }}
      className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 hover:bg-white/5"
      title={saved ? 'Remove from saved' : 'Save resource'}
      style={{ lineHeight: 0 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24"
        fill={saved ? '#e2e8f0' : 'none'}
        stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="transition-all duration-200"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────
   TAB DEFINITIONS
   ────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'mindmaps',  label: 'Mindmaps', icon: 'mindmap' },
  { key: 'books',     label: 'Books',    icon: 'book' },
  { key: 'notes',     label: 'Notes',    icon: 'notes' },
  { key: 'formulas',  label: 'Formulas', icon: 'formula' },
  { key: 'pyqs',      label: "PYQ's",    icon: 'pyq' },
];

/* ── Tab icons ── */
function TabIcon({ type, active }) {
  const color = active ? '#45f0f4' : '#6b7280';
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'mindmap':
      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M2 12h7"/><path d="M15 12h7"/></svg>;
    case 'book':
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8"/><path d="M8 11h5"/></svg>;
    case 'notes':
      return <svg {...props}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>;
    case 'formula':
      return <svg {...props}><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M14 14h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M7 7V7"/><path d="M17 17V17"/></svg>;
    case 'pyq':
      return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    default:
      return null;
  }
}

/* ──────────────────────────────────────────────────────────
   PLACEHOLDER DATA
   ────────────────────────────────────────────────────────── */

const MINDMAP_DATA = [
  { id: 1, title: 'Linear Algebra — Complete Mindmap', chapter: 'Linear Algebra', free: true, pages: 8 },
  { id: 2, title: 'Probability & Statistics', chapter: 'Probability', free: true, pages: 12 },
  { id: 3, title: 'Calculus — Differential & Integral', chapter: 'Calculus', free: false, price: '₹49', pages: 15 },
  { id: 4, title: 'Machine Learning Algorithms', chapter: 'ML', free: false, price: '₹79', pages: 20 },
  { id: 5, title: 'Database Management Systems', chapter: 'DBMS', free: true, pages: 10 },
  { id: 6, title: 'Data Structures & Algorithms', chapter: 'DSA', free: false, price: '₹59', pages: 18 },
  { id: 7, title: 'Computer Networks Overview', chapter: 'CN', free: true, pages: 7 },
  { id: 8, title: 'Operating Systems Concepts', chapter: 'OS', free: false, price: '₹69', pages: 14 },
];

const BOOKS_DATA = [
  { id: 1, title: 'Higher Engineering Mathematics', author: 'B.S. Grewal', platform: 'Amazon', price: '₹640', rating: 4.5, url: 'https://amazon.in', category: 'Mathematics' },
  { id: 2, title: 'Probability & Statistics for Engineers', author: 'Walpole, Myers', platform: 'Amazon', price: '₹850', rating: 4.3, url: 'https://amazon.in', category: 'Statistics' },
  { id: 3, title: 'Introduction to Algorithms', author: 'Cormen (CLRS)', platform: 'Amazon', price: '₹999', rating: 4.8, url: 'https://amazon.in', category: 'Algorithms' },
  { id: 4, title: 'Pattern Recognition & ML', author: 'Bishop', platform: 'Amazon', price: '₹1,200', rating: 4.6, url: 'https://amazon.in', category: 'ML' },
  { id: 5, title: 'Database System Concepts', author: 'Korth, Sudarshan', platform: 'Flipkart', price: '₹720', rating: 4.4, url: 'https://flipkart.com', category: 'DBMS' },
  { id: 6, title: 'Operating System Concepts', author: 'Galvin, Silberschatz', platform: 'Amazon', price: '₹680', rating: 4.5, url: 'https://amazon.in', category: 'OS' },
];

const NOTES_DATA = [
  { id: 1, title: 'Handwritten Notes — Linear Algebra', pages: 42, free: true },
  { id: 2, title: 'Handwritten Notes — Probability', pages: 56, free: true },
  { id: 3, title: 'Typed Notes — ML Complete', pages: 120, free: false, price: '₹99' },
  { id: 4, title: 'Typed Notes — DBMS with SQL', pages: 85, free: true },
];

const FORMULA_DATA = [
  { id: 1, title: 'Mathematics — All Formulas', pages: 18, free: true },
  { id: 2, title: 'Statistics — Key Formulas', pages: 12, free: true },
  { id: 3, title: 'ML — Algorithm Cheatsheet', pages: 8, free: false, price: '₹29' },
];

const PYQ_DATA = [
  { id: 1, title: 'GATE DA 2026 — Question Paper + Key', year: 2026, free: true },
  { id: 2, title: 'GATE CS 2026 — Question Paper + Key', year: 2026, free: true },
  { id: 3, title: 'GATE CS 2025 — Question Paper + Key', year: 2025, free: true },
  { id: 4, title: 'GATE DA 2025 — Question Paper + Key', year: 2025, free: true },
  { id: 5, title: 'GATE DA 2024 — Question Paper + Key', year: 2024, free: true },
  { id: 6, title: 'GATE CS 2024 — Question Paper + Key', year: 2024, free: true },
  { id: 7, title: 'GATE DA 2023 — Question Paper + Key', year: 2023, free: true },
];


/* ──────────────────────────────────────────────────────────
   SECTION RENDERERS
   ────────────────────────────────────────────────────────── */

function MindmapSection({ query }) {
  const filtered = MINDMAP_DATA.filter((item) =>
    !query || item.title.toLowerCase().includes(query) || item.chapter.toLowerCase().includes(query)
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {filtered.map((item) => (
        <div
          key={item.id}
          className="group flex cursor-pointer flex-row gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 sm:block sm:p-5"
          style={{
            background: 'rgba(22, 27, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(69, 240, 244, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'; }}
        >
          {/* Visual header */}
          <div className="relative flex h-[92px] w-[92px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl sm:mb-4 sm:h-24 sm:w-full"
            style={{ background: 'linear-gradient(135deg, rgba(69, 240, 244, 0.06), rgba(171, 199, 255, 0.04))' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="1.2" opacity="0.48" className="sm:h-8 sm:w-8">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v7"/><path d="M12 15v7"/>
              <path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/>
              <path d="M2 12h7"/><path d="M15 12h7"/>
            </svg>
            <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2">
              <SaveButton resourceKey={`mindmap-${item.id}`} resource={{ title: item.title, category: 'mindmaps', subtitle: item.chapter }} />
            </div>
          </div>

          <div className="min-w-0 flex-1 py-0.5 sm:py-0">
            <div className="mb-1 flex items-start justify-between gap-2 sm:mb-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#45f0f4] sm:text-[10px] sm:tracking-wider">{item.chapter}</span>
              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider sm:px-2 sm:text-[10px] ${
              item.free
                ? 'text-[#86db64]'
                : 'text-[#abc7ff]'
            }`}
              style={{
                background: item.free ? 'rgba(134, 219, 100, 0.12)' : 'rgba(171, 199, 255, 0.12)',
                border: `1px solid ${item.free ? 'rgba(134, 219, 100, 0.2)' : 'rgba(171, 199, 255, 0.2)'}`,
              }}>
              {item.free ? 'FREE' : item.price}
            </span>
          </div>
            <h3 className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-on-surface transition-colors group-hover:text-[#45f0f4] sm:text-sm">
              {item.title}
            </h3>
            <p className="text-[10px] text-[#6b7280] sm:text-xs">{item.pages} pages</p>
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="col-span-full text-center text-sm text-[#6b7280] py-8">No mindmaps match your search</div>
      )}
    </div>
  );
}

function BooksSection({ query }) {
  const filtered = BOOKS_DATA.filter((book) =>
    !query || book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query) || book.category.toLowerCase().includes(query)
  );
  return (
    <div className="space-y-3">
      {filtered.map((book) => (
        <a
          key={book.id}
          href={book.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-5 rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'rgba(22, 27, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(171, 199, 255, 0.2)';
            e.currentTarget.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {/* Book icon */}
          <div className="w-14 h-18 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(171, 199, 255, 0.1), rgba(69, 240, 244, 0.05))', minHeight: '72px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#abc7ff" strokeWidth="1.5" opacity="0.6">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-[#abc7ff] tracking-wider uppercase">{book.category}</span>
              <span className="text-[10px] text-[#6b7280]">•</span>
              <span className="text-[10px] font-mono text-[#6b7280] tracking-wider">{book.platform}</span>
            </div>
            <h3 className="text-sm font-semibold text-on-surface group-hover:text-[#abc7ff] transition-colors truncate">
              {book.title}
            </h3>
            <p className="text-xs text-[#8b919f] mt-0.5">by {book.author}</p>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-lg font-bold text-[#45f0f4]" style={{ fontFamily: 'JetBrains Mono' }}>{book.price}</span>
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" strokeWidth="1">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-xs text-[#8b919f]" style={{ fontFamily: 'JetBrains Mono' }}>{book.rating}</span>
            </div>
            <span className="text-[9px] text-[#6b7280] font-mono">affiliate</span>
          </div>

          {/* Save */}
          <SaveButton resourceKey={`book-${book.id}`} resource={{ title: book.title, category: 'books', subtitle: `by ${book.author}` }} />

          {/* Arrow */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#414753" strokeWidth="2" strokeLinecap="round"
            className="flex-shrink-0 group-hover:stroke-[#abc7ff] transition-colors">
            <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
          </svg>
        </a>
      ))}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-[#6b7280] py-8">No books match your search</p>
      )}
    </div>
  );
}

function NotesSection({ query }) {
  const filtered = NOTES_DATA.filter((note) =>
    !query || note.title.toLowerCase().includes(query)
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {filtered.map((note) => (
        <div
          key={note.id}
          className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
          style={{
            background: 'rgba(22, 27, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(134, 219, 100, 0.1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86db64" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-[#86db64] transition-colors">
              {note.title}
            </h3>
            <p className="text-xs text-[#6b7280]">{note.pages} pages</p>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
            note.free ? 'text-[#86db64]' : 'text-[#abc7ff]'
          }`}
            style={{
              background: note.free ? 'rgba(134, 219, 100, 0.1)' : 'rgba(171, 199, 255, 0.1)',
              border: `1px solid ${note.free ? 'rgba(134, 219, 100, 0.15)' : 'rgba(171, 199, 255, 0.15)'}`,
            }}>
            {note.free ? 'FREE' : note.price}
          </span>
          <SaveButton resourceKey={`note-${note.id}`} resource={{ title: note.title, category: 'notes', subtitle: `${note.pages} pages` }} />
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="col-span-full text-center text-sm text-[#6b7280] py-8">No notes match your search</div>
      )}
    </div>
  );
}

function FormulaSection({ query }) {
  const filtered = FORMULA_DATA.filter((f) =>
    !query || f.title.toLowerCase().includes(query)
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {filtered.map((f) => (
        <div
          key={f.id}
          className="group rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer hover:-translate-y-1 relative"
          style={{
            background: 'rgba(22, 27, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="absolute top-3 right-3">
            <SaveButton resourceKey={`formula-${f.id}`} resource={{ title: f.title, category: 'formulas', subtitle: `${f.pages} pages` }} />
          </div>
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(69, 240, 244, 0.08)' }}>
            <span className="text-xl" style={{ fontFamily: 'JetBrains Mono', color: '#45f0f4' }}>∑</span>
          </div>
          <h3 className="text-sm font-semibold text-on-surface mb-1 group-hover:text-[#45f0f4] transition-colors">{f.title}</h3>
          <p className="text-xs text-[#6b7280] mb-3">{f.pages} pages</p>
          <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-mono font-bold ${
            f.free ? 'text-[#86db64]' : 'text-[#abc7ff]'
          }`}
            style={{
              background: f.free ? 'rgba(134, 219, 100, 0.1)' : 'rgba(171, 199, 255, 0.1)',
              border: `1px solid ${f.free ? 'rgba(134, 219, 100, 0.15)' : 'rgba(171, 199, 255, 0.15)'}`,
            }}>
            {f.free ? 'Download Free' : f.price}
          </span>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="col-span-full text-center text-sm text-[#6b7280] py-8">No formula sheets match your search</div>
      )}
    </div>
  );
}

function PYQSection({ query }) {
  const filtered = PYQ_DATA.filter((p) =>
    !query || p.title.toLowerCase().includes(query) || String(p.year).includes(query)
  );
  return (
    <div className="space-y-3">
      {filtered.map((p) => (
        <div
          key={p.id}
          className="group flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 cursor-pointer"
          style={{
            background: 'rgba(22, 27, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(69, 240, 244, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'; }}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(69, 240, 244, 0.08)' }}>
            <span className="text-sm font-bold text-[#45f0f4]" style={{ fontFamily: 'JetBrains Mono' }}>{p.year}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-[#45f0f4] transition-colors">{p.title}</h3>
          </div>
          <span className="px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-[#86db64]"
            style={{ background: 'rgba(134, 219, 100, 0.1)', border: '1px solid rgba(134, 219, 100, 0.15)' }}>
            FREE
          </span>
          <SaveButton resourceKey={`pyq-${p.id}`} resource={{ title: p.title, category: 'pyqs', subtitle: `Year ${p.year}` }} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#414753" strokeWidth="2" strokeLinecap="round"
            className="group-hover:stroke-[#45f0f4] transition-colors flex-shrink-0">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-[#6b7280] py-8">No PYQ papers match your search</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────── */

export default function ResourcesPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('mindmaps');
  const [search, setSearch] = useState('');
  const [dbResources, setDbResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const tabBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  useEffect(() => {
    if (user?.exam_id) {
      setLoading(true);
      getResources(user.exam_id)
        .then(setDbResources)
        .catch(err => console.error("Failed to fetch resources:", err))
        .finally(() => setLoading(false));
    }
  }, [user?.exam_id]);

  /* Indicator effect logic (must stay above early returns) */
  useEffect(() => {
    const update = () => {
      if (!tabBarRef.current || !activeTab) return;
      const activeEl = tabBarRef.current.querySelector(`[data-tab="${activeTab}"]`);
      if (activeEl) {
        const barRect = tabBarRef.current.getBoundingClientRect();
        const tabRect = activeEl.getBoundingClientRect();
        setIndicatorStyle({
          left: tabRect.left - barRect.left,
          width: tabRect.width,
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeTab]);

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
        title="Premium Resources" 
        message="Log in to access mindmaps, curated books, handwritten notes, and formula sheets."
      />
    );
  }

  const q = search.toLowerCase().trim();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
           <div className="w-8 h-8 border-2 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
           <p className="text-xs text-[#6b7280] font-mono">Loading resources...</p>
        </div>
      );
    }

    const filteredResources = dbResources.filter(r => r.category === activeTab);

    if (filteredResources.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Resources Coming Soon</h3>
          <p className="text-sm text-on-surface-variant max-w-md">
            We are currently building our repository for {user.exam_name}. Stay tuned for mindmaps, PYQs, and premium notes!
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'mindmaps': return <MindmapSection query={q} />;
      case 'books':    return <BooksSection query={q} />;
      case 'notes':    return <NotesSection query={q} />;
      case 'formulas': return <FormulaSection query={q} />;
      case 'pyqs':     return <PYQSection query={q} />;
      default:         return null;
    }
  };

  return (
    <div className="min-h-screen pb-32">
      {/* ── Hero ── */}
      <div className="section-container pt-8 md:pt-12 mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(171, 199, 255, 0.08)', border: '1px solid rgba(171, 199, 255, 0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#abc7ff" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            <span className="text-xs font-mono font-bold text-[#abc7ff] tracking-wider uppercase">
              Study Resources
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight text-on-surface mb-4">
            Everything you <span className="text-[#abc7ff]">need.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-[17px] text-on-surface-variant max-w-lg mx-auto leading-relaxed">
            A precision-crafted repository of conceptual mindmaps, scholarly guides, and verified academic insights.
          </p>
        </div>
      </div>

      {/* ── Glassmorphic Tab Bar (Google-style, stays visible) ── */}
      <div className="sticky top-4 z-40 flex justify-center mb-8 px-4">
        <div
          ref={tabBarRef}
          className="relative inline-flex items-center gap-0.5 p-1.5 rounded-2xl"
          style={{
            background: 'rgba(16, 20, 28, 0.85)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* Sliding indicator */}
          <div
            className="absolute rounded-xl transition-all duration-300 ease-out"
            style={{
              top: '6px',
              height: 'calc(100% - 12px)',
              left: indicatorStyle.left ?? 0,
              width: indicatorStyle.width ?? 0,
              background: 'rgba(69, 240, 244, 0.1)',
              border: '1px solid rgba(69, 240, 244, 0.2)',
              boxShadow: '0 0 12px rgba(69, 240, 244, 0.08)',
              pointerEvents: 'none',
            }}
          />

          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              data-tab={key}
              onClick={() => setActiveTab(key)}
              className="relative z-10 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-xl transition-all duration-200 whitespace-nowrap min-w-[60px] sm:min-w-0"
              style={{
                color: activeTab === key ? '#45f0f4' : '#6b7280',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <TabIcon type={icon} active={activeTab === key} />
              <span className="text-[9px] sm:text-xs font-bold tracking-tight sm:tracking-normal">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex justify-center mb-8 px-4">
        <div className="relative w-full max-w-md">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
            style={{
              background: 'rgba(16, 20, 28, 0.75)',
              backdropFilter: 'blur(16px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              border: search ? '1px solid rgba(69, 240, 244, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: search ? '0 0 20px rgba(69, 240, 244, 0.06)' : '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={search ? '#45f0f4' : '#6b7280'} strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 transition-colors duration-200">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label ?? 'resources'}...`}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-[#6b7280] focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="flex-shrink-0 p-0.5 rounded-full transition-colors duration-150 hover:bg-white/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b919f" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="section-container">
        <div key={activeTab} className="animate-fade-in">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
