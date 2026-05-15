'use client';
import { useState, useEffect } from 'react';
import { getExams, updateProfile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ExamSelectModal() {
  const { user, refreshUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Show only if user is logged in but hasn't picked an exam
  const show = user && user.profile_exists && !user.exam_id;

  useEffect(() => {
    if (show) {
      loadExams();
    }
  }, [show]);

  async function loadExams() {
    try {
      const data = await getExams();
      setExams(data.exams || []);
    } catch (e) {
      console.error('Failed to load exams', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateProfile({ exam_id: selectedId });
      await refreshUser(); // This will hide the modal as user.exam_id will now be set
    } catch (e) {
      alert('Failed to save exam preference');
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md">
      <div className="glass-card w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold tracking-widest uppercase mb-4"
               style={{ fontFamily: 'JetBrains Mono' }}>
            Welcome to Sylq
          </div>
          <h2 className="text-3xl font-bold text-on-surface">What are you preparing for?</h2>
          <p className="text-on-surface-variant mt-2 text-sm">
            Select your target exam to personalize your dashboard, courses, and practice tests.
          </p>
        </div>

        {/* Exam Grid */}
        <div className="flex-1 overflow-y-auto p-8 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4" />
              <p className="text-xs text-outline font-mono">Fetching available exams...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedId(exam.id)}
                  className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-200 group ${
                    selectedId === exam.id
                      ? 'bg-secondary/10 border-secondary shadow-[0_0_20px_rgba(69,240,244,0.15)]'
                      : 'bg-surface-container-low border-white/5 hover:border-white/20 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex justify-between w-full items-start mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      selectedId === exam.id ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant group-hover:text-secondary'
                    }`}>
                      {/* Placeholder Icon - could be dynamic later */}
                      <span className="text-lg font-bold">
                        {exam.exam_name.substring(0, 1)}
                      </span>
                    </div>
                    {selectedId === exam.id && (
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center animate-in zoom-in">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className={`font-bold text-lg ${selectedId === exam.id ? 'text-secondary' : 'text-on-surface'}`}>
                    {exam.exam_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {exam.description || 'Access dedicated courses and official practice questions.'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 border-t border-white/5 bg-surface-container-low/50">
          <button
            onClick={handleConfirm}
            disabled={!selectedId || saving}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 ${
              selectedId && !saving
                ? 'bg-secondary text-background hover:shadow-[0_0_30px_rgba(69,240,244,0.3)] hover:scale-[1.01] active:scale-95'
                : 'bg-surface-container-high text-outline cursor-not-allowed'
            }`}
            style={{ fontFamily: 'JetBrains Mono' }}
          >
            {saving ? 'Setting up your profile...' : 'Start Preparing'}
          </button>
          <p className="text-[10px] text-center text-outline mt-4 uppercase tracking-tighter">
            Note: You can change your exam goal anytime in settings.
          </p>
        </div>
      </div>
    </div>
  );
}
