'use client';
/**
 * components/ChatbotFab_Examiq.jsx — Analysis Chatbot
 * Using Gemini / gemma-4-31b-it (as requested)
 */

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { streamChatbot } from '@/lib/api';

const C = {
  bg:      '#0d1117',
  card:    '#161b22',
  border:  '#21262d',
  blue:    '#58a6ff',
  cyan:    '#45f0f4',
  text:    '#e6edf3',
  dim:     '#6e7681',
  muted:   '#8b949e',
};

export default function ChatbotFab_Examiq({ testId = null, activeQuestion = null, msgLimit = 10 }) {
  const pathname = usePathname();
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [streaming,  setStreaming]  = useState(false);
  const [msgCount,   setMsgCount]   = useState(0);
  const [context,    setContext]    = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Show ONLY on result pages
  const isResultPage = pathname.includes('/result');
  const isTestActive = pathname.match(/^\/test\/[^/]+$/) && 
                      !pathname.includes('configure') && 
                      !pathname.includes('history') &&
                      !pathname.includes('result');

  if (!isResultPage || isTestActive) return null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (activeQuestion) {
      setContext(activeQuestion);
      setOpen(true); // Auto-open when user clicks "Ask AI" on a question
      
      // Clear history to prevent hallucinations from previous question context
      setMessages([
        { role: 'assistant', content: `Focusing on: **${activeQuestion.topic_name || 'this question'}**. How can I help?` }
      ]);
    }
  }, [activeQuestion?.id]);

  const hitLimit = msgCount >= msgLimit;

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming || hitLimit) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setMsgCount(c => c + 1);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      await streamChatbot(
        {
          test_id:     testId,
          question_id: context?.id || null,
          messages:    newMessages,
          msg_count:   msgCount,
          chat_type:   "analysis"
        },
        (chunk) => {
          const decoded = chunk.replace(/\\n/g, '\n');
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: updated[updated.length - 1].content + decoded,
            };
            return updated;
          });
        },
        () => setStreaming(false),
      );
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
        return updated;
      });
      setStreaming(false);
      setMsgCount(c => c - 1);
    }
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .examiq-msg { font-size: 13px; line-height: 1.6; }
        .examiq-msg p { margin-bottom: 0.75rem; }
        .examiq-msg p:last-child { margin-bottom: 0; }
        .examiq-msg ul, .examiq-msg ol { margin-left: 1.25rem; margin-bottom: 0.75rem; }
        .examiq-msg li { margin-bottom: 0.25rem; }
        .examiq-msg code { background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        .examiq-msg h1, .examiq-msg h2, .examiq-msg h3 { font-size: 1.1em; font-weight: 700; margin: 1rem 0 0.5rem 0; color: #58a6ff; }
        .examiq-msg table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 12px; display: block; overflow-x: auto; white-space: nowrap; }
        .examiq-msg th, .examiq-msg td { padding: 8px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .examiq-msg th { background: rgba(255,255,255,0.05); color: #45f0f4; }
        .katex-display { margin: 0.5em 0; overflow-x: auto; overflow-y: hidden; }

        @media (max-width: 768px) {
          .examiq-fab { bottom: 100px !important; right: 16px !important; width: 48px !important; height: 48px !important; }
          .examiq-panel { bottom: 160px !important; right: 16px !important; height: min(500px, calc(100vh - 280px)) !important; width: calc(100vw - 32px) !important; }
        }
      `}</style>

      {/* FAB Button - Positioned exactly like Sylq */}
      <button
        onClick={() => setOpen(!open)}
        className="examiq-fab fixed z-[90] flex items-center justify-center transition-all duration-300 group hover:scale-110 active:scale-95"
        style={{
          right: '24px',
          bottom: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: open ? C.border : '#45f0f4',
          boxShadow: open ? 'none' : '0 8px 32px rgba(69, 240, 244, 0.4)',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        {open ? (
          <span className="text-white text-2xl font-light">×</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l4.94-1.38A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="#003738"/>
            <circle cx="8" cy="12" r="1.2" fill="#fff"/>
            <circle cx="12" cy="12" r="1.2" fill="#fff"/>
            <circle cx="16" cy="12" r="1.2" fill="#fff"/>
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="examiq-panel" style={{
          position: 'fixed', bottom: 94, right: 24, zIndex: 80,
          width: 'min(calc(100vw - 40px), 480px)', height: 'min(calc(100vh - 120px), 640px)',
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.2s ease', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#003738' }}>E</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Examiq AI</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{context ? 'Analysis Mode' : 'General Analysis'}</div>
                </div>
             </div>
             <span style={{ fontSize: 10, color: C.dim }}>{msgCount}/{msgLimit}</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 30 }}>
                I'm Examiq AI. Ask me about your test results!
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: msg.role === 'user' ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(88,166,255,0.2)' : C.border}`,
                  color: C.text,
                }}>
                  <div className="examiq-msg">
                    {msg.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Ask about this test..."
              style={{
                flex: 1, background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, resize: 'none', outline: 'none'
              }}
            />
            <button onClick={sendMessage} style={{ background: C.cyan, border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer' }}>
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M9 3l5 5-5 5" stroke="#003738" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
