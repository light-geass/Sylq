'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getCourses, enrollCourse } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

/* ── Placeholder course data ── */
const FREE_COURSES = [
  {
    id: 1,
    title: 'GATE DA Complete Preparation',
    channel: 'Knowledge Gate',
    platform: 'YouTube',
    thumbnail: null,
    duration: '42 hours',
    rating: 4.8,
    url: 'https://youtube.com',
    tags: ['Data Science', 'Statistics', 'ML'],
  },
  {
    id: 2,
    title: 'Linear Algebra for GATE',
    channel: 'Neso Academy',
    platform: 'YouTube',
    thumbnail: null,
    duration: '18 hours',
    rating: 4.7,
    url: 'https://youtube.com',
    tags: ['Mathematics', 'Linear Algebra'],
  },
  {
    id: 3,
    title: 'Probability & Statistics — Full Course',
    channel: 'Gate Smashers',
    platform: 'YouTube',
    thumbnail: null,
    duration: '26 hours',
    rating: 4.6,
    url: 'https://youtube.com',
    tags: ['Probability', 'Statistics'],
  },
  {
    id: 4,
    title: 'DBMS for GATE — Complete Playlist',
    channel: 'Gate Smashers',
    platform: 'YouTube',
    thumbnail: null,
    duration: '14 hours',
    rating: 4.5,
    url: 'https://youtube.com',
    tags: ['DBMS', 'SQL'],
  },
  {
    id: 5,
    title: 'Python for Data Analysis',
    channel: 'freeCodeCamp',
    platform: 'YouTube',
    thumbnail: null,
    duration: '12 hours',
    rating: 4.9,
    url: 'https://youtube.com',
    tags: ['Python', 'Data Analysis'],
  },
  {
    id: 6,
    title: 'Machine Learning A-Z',
    channel: 'Krish Naik',
    platform: 'YouTube',
    thumbnail: null,
    duration: '35 hours',
    rating: 4.7,
    url: 'https://youtube.com',
    tags: ['ML', 'AI'],
  },
];

const PAID_COURSES = [
  {
    id: 101,
    title: 'GATE DA 2026 — Complete Course',
    provider: 'Unacademy',
    platform: 'Unacademy',
    thumbnail: null,
    originalPrice: '₹12,999',
    offerPrice: '₹6,499',
    rating: 4.8,
    url: 'https://unacademy.com',
    tags: ['All Subjects', 'Live Classes'],
    badge: 'BESTSELLER',
  },
  {
    id: 102,
    title: 'GATE DA Complete Package',
    provider: 'BYJU\'s Exam Prep',
    platform: 'BYJU\'s',
    thumbnail: null,
    originalPrice: '₹15,999',
    offerPrice: '₹7,999',
    rating: 4.6,
    url: 'https://byjus.com',
    tags: ['Mock Tests', 'Video Lectures'],
    badge: 'POPULAR',
  },
  {
    id: 103,
    title: 'Data Science & ML for GATE',
    provider: 'GeeksforGeeks',
    platform: 'GFG',
    thumbnail: null,
    originalPrice: '₹9,999',
    offerPrice: '₹4,999',
    rating: 4.7,
    url: 'https://geeksforgeeks.org',
    tags: ['DS', 'ML', 'Programming'],
    badge: 'NEW',
  },
  {
    id: 104,
    title: 'GATE Statistics Masterclass',
    provider: 'Udemy',
    platform: 'Udemy',
    thumbnail: null,
    originalPrice: '₹3,999',
    offerPrice: '₹499',
    rating: 4.5,
    url: 'https://udemy.com',
    tags: ['Statistics', 'Probability'],
    badge: null,
  },
];

/* ── Merged course data ── */
const ALL_COURSES = [
  ...FREE_COURSES.map(c => ({ ...c, isPaid: false })),
  ...PAID_COURSES.map(c => ({ ...c, isPaid: true })),
];

/* ── Badge color map ── */
const BADGE_STYLES = {
  BESTSELLER: { bg: 'rgba(69, 240, 244, 0.12)', text: '#45f0f4', border: 'rgba(69, 240, 244, 0.25)' },
  POPULAR:    { bg: 'rgba(171, 199, 255, 0.12)', text: '#abc7ff', border: 'rgba(171, 199, 255, 0.25)' },
  NEW:        { bg: 'rgba(134, 219, 100, 0.12)', text: '#86db64', border: 'rgba(134, 219, 100, 0.25)' },
};

/* ── Star rating component ── */
function Stars({ rating }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < full ? '#facc15' : i === full && partial > 0 ? '#facc15' : 'none'} stroke="#facc15" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-xs text-[#8b919f] ml-1" style={{ fontFamily: 'JetBrains Mono' }}>{rating}</span>
    </div>
  );
}

function CourseCard({ course, onEnroll }) {
  const badgeStyle = course.badge ? BADGE_STYLES[course.badge] : null;
  const accentColor = course.isPaid ? '#f8fafc' : '#cbd5e1';
  const accentBg = course.isPaid ? 'rgba(248, 250, 252, 0.08)' : 'rgba(203, 213, 225, 0.08)';
  const [enrolling, setEnrolling] = useState(false);

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 glass-card flex flex-col h-full"
      style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-full h-32 flex items-center justify-center relative shrink-0"
        style={{
          background: `linear-gradient(135deg, ${accentBg}, rgba(69, 240, 244, 0.05))`,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.3">
          {course.isPaid ? (
            <>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </>
          ) : (
            <polygon points="5 3 19 12 5 21 5 3" />
          )}
        </svg>
        {course.isPaid && badgeStyle && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider"
            style={{ background: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}` }}>
            {course.badge}
          </span>
        )}
        {!course.isPaid && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider"
            style={{ background: 'rgba(203, 213, 225, 0.15)', color: '#cbd5e1', border: '1px solid rgba(203, 213, 225, 0.25)' }}>
            FREE
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] font-mono mb-1 tracking-wider uppercase" style={{ color: accentColor }}>
          {course.platform} • {course.isPaid ? course.provider : course.channel}
        </p>
        <h3 className="text-sm font-semibold text-on-surface mb-2 line-clamp-2 group-hover:text-[#45f0f4] transition-colors">
          {course.title}
        </h3>
        <div className="flex items-center justify-between">
          <Stars rating={course.rating} />
          {!course.isPaid && <span className="text-[10px] text-[#8b919f]">{course.duration}</span>}
        </div>
        
        {course.isPaid && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-lg font-bold text-[#45f0f4]" style={{ fontFamily: 'JetBrains Mono' }}>{course.offerPrice}</span>
            <span className="text-xs text-[#6b7280] line-through">{course.originalPrice}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
          {course.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[#8b919f]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2">
            {course.isPaid ? (
                <button
                    onClick={() => {
                        setEnrolling(true);
                        onEnroll(course.id).finally(() => setEnrolling(false));
                    }}
                    disabled={enrolling}
                    className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cyber-btn-cyan disabled:opacity-50"
                >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
            ) : (
                <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-center block transition-all duration-200 cyber-btn-ghost"
                >
                    Watch Now →
                </a>
            )}
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); 
  const [search, setSearch] = useState('');
  const [dbCourses, setDbCourses] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (user?.profile_exists) {
      setLoadingCourses(true);
      getCourses(user.exam_id)
        .then(data => {
            if (data) setDbCourses(data);
        })
        .catch(err => console.error("Failed to fetch courses from DB:", err))
        .finally(() => setLoadingCourses(false));
    }
  }, [user]);

  // If DB returned nothing, and user is GATE, fall back to hardcoded. If not GATE, it stays empty.
  const isGate = user?.exam_name && user.exam_name.toLowerCase().includes('gate');
  const displayCourses = dbCourses.length > 0 ? dbCourses : (isGate ? ALL_COURSES : []);

  const handleEnroll = async (courseId) => {
    try {
        await enrollCourse(courseId);
        alert("Enrolled successfully! Check 'My Courses' to resume.");
    } catch (err) {
        alert("Enrollment failed: " + err.message);
    }
  };

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
        title="Curated Learning" 
        message="Log in to access expert-vetted learning paths and premium preparation programs."
      />
    );
  }

  const q = search.toLowerCase().trim();
  const filtered = displayCourses.filter((c) => {
    const matchesSearch = !q || 
      c.title.toLowerCase().includes(q) || 
      (c.isPaid ? (c.provider || '').toLowerCase().includes(q) : (c.channel || '').toLowerCase().includes(q)) || 
      c.tags?.some((t) => t.toLowerCase().includes(q));
    
    if (activeTab === 'free') return matchesSearch && !c.isPaid;
    if (activeTab === 'paid') return matchesSearch && c.isPaid;
    return matchesSearch;
  });

  const tabs = [
    { key: 'all',  label: 'All Courses' },
    { key: 'free', label: 'Free' },
    { key: 'paid', label: 'Paid' },
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* ── Hero Section ── */}
      <div className="section-container mb-10 pt-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-display-lg text-on-surface mb-4">
            Learn from the <span className="text-[#45f0f4]">best.</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Expert-vetted learning paths and premium comprehensive programs designed to fast-track your exam success.
          </p>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex justify-center mb-10">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: 'rgba(16, 20, 28, 0.8)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{
                color: activeTab === key ? '#0D1117' : '#8b919f',
                background: activeTab === key ? '#45f0f4' : 'transparent',
                boxShadow: activeTab === key ? '0 0 16px rgba(69, 240, 244, 0.3)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex justify-center mb-10 px-4">
        <div
          className="relative w-full max-w-md"
        >
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
              placeholder="Search courses by name, topic, or platform..."
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-[#6b7280] focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>
      </div>

      {/* ── Courses Grid ── */}
      <section className="section-container animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(69, 240, 244, 0.1)', border: '1px solid rgba(69, 240, 244, 0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="2" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-headline-md text-on-surface">
              {activeTab === 'all' ? 'All Learning Paths' : activeTab === 'free' ? 'Open Learning Paths' : 'Premium Courses'}
            </h2>
            <p className="text-sm text-[#8b919f]">
              {activeTab === 'paid' ? 'Affiliate programs • Commission may be earned' : 'Expert-vetted for syllabus accuracy'}
            </p>
          </div>
        </div>

        {loadingCourses ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <div className="w-8 h-8 border-2 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
             <p className="text-xs text-outline font-mono">Loading courses...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} onEnroll={handleEnroll} />
            ))}
          </div>
        ) : search ? (
          <div className="text-center py-20">
            <p className="text-on-surface-variant text-body-lg mb-2">No matches found for &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch('')} className="text-[#45f0f4] text-sm hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                 <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                 <path d="M8 7h8"/><path d="M8 11h5"/>
               </svg>
             </div>
             <h3 className="text-lg font-bold text-on-surface mb-2">Courses Coming Soon</h3>
             <p className="text-sm text-on-surface-variant max-w-md">
               We are currently curating top-tier courses for {user?.exam_name || 'your exam'}. Check back later!
             </p>
          </div>
        )}
      </section>
    </div>
  );
}
