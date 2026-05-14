'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getMyCourses } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

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

function CourseCard({ course }) {
  const accentColor = '#f8fafc';
  const accentBg = 'rgba(248, 250, 252, 0.08)';

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 glass-card"
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-full h-32 flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${accentBg}, rgba(69, 240, 244, 0.05))`,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.3">
            <>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </>
        </svg>
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider"
          style={{ background: 'rgba(69, 240, 244, 0.12)', color: '#45f0f4', border: '1px solid rgba(69, 240, 244, 0.25)' }}>
          ENROLLED
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[10px] font-mono mb-1 tracking-wider uppercase" style={{ color: accentColor }}>
          {course.platform} • {course.provider || course.channel}
        </p>
        <h3 className="text-sm font-semibold text-on-surface mb-2 line-clamp-2 group-hover:text-[#45f0f4] transition-colors">
          {course.title}
        </h3>
        <div className="flex items-center justify-between">
          <Stars rating={course.rating} />
        </div>
        
        <div className="flex flex-wrap gap-1.5 mt-4">
          {course.tags?.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[#8b919f]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {tag}
            </span>
          ))}
        </div>

        <button className="w-full mt-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200"
          style={{
            background: 'rgba(69, 240, 244, 0.08)',
            border: '1px solid rgba(69, 240, 244, 0.2)',
            color: '#45f0f4',
            fontFamily: 'JetBrains Mono',
          }}>
          Continue Learning →
        </button>
      </div>
    </a>
  );
}

export default function MyCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.profile_exists) {
      getMyCourses()
        .then(setCourses)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.profile_exists) {
    return (
      <AccessDenied 
        title="My Learning" 
        message="Please log in to view and manage your enrolled courses."
      />
    );
  }

  return (
    <div className="min-h-screen pb-32 pt-8">
      <div className="section-container">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2"
             style={{ fontFamily: 'JetBrains Mono' }}>
            Personal Library
          </p>
          <h1 className="text-3xl font-bold text-on-surface">My Courses</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Resume where you left off in your premium preparation paths.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center max-w-xl mx-auto border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No active courses</h2>
            <p className="text-[#8b919f] text-sm mb-8">
              You haven&apos;t enrolled in any premium courses yet. Start your journey by exploring our curated catalog.
            </p>
            <Link href="/courses" className="cyber-btn-cyan inline-block">
              Explore Courses →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
