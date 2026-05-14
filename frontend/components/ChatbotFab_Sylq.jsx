'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { streamChatbot } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';


const C = {
  bg:      '#0f172a',
  card:    '#1e293b',
  border:  '#334155',
  blue:    '#38bdf8',
  cyan:    '#67e8f9',
  text:    '#f1f5f9',
  dim:     '#94a3b8',
  muted:   '#64748b',
};

export default function ChatbotFab_Sylq({ msgLimit = 50 }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open,       setOpen]       = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [streaming,  setStreaming]  = useState(false);
  const [msgCount,   setMsgCount]   = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const isAuth = user?.profile_exists;

  // Hide on active test OR specific result pages
  const isTestActive = pathname.match(/^\/test\/[^/]+$/) && 
                      !pathname.includes('configure') && 
                      !pathname.includes('history') &&
                      !pathname.includes('result');
  const isResultPage = pathname.includes('/result');

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    if (!isAuth && msgCount >= 2) {
      const userMsg = { role: 'user', content: text };
      const assistantMsg = { 
        role: 'assistant', 
        content: "Please [Sign Up](/auth/signup) or [Log In](/auth/login) for unlimited chats and full access to Sylq AI." 
      };
      setMessages([...messages, userMsg, assistantMsg]);
      setInput('');
      return;
    }

    if (isAuth && msgCount >= msgLimit) {
      const userMsg = { role: 'user', content: text };
      const assistantMsg = { role: 'assistant', content: "Message limit reached for this session." };
      setMessages([...messages, userMsg, assistantMsg]);
      setInput('');
      return;
    }

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
          messages:    newMessages,
          msg_count:   msgCount,
          chat_type:   "global"
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

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const isAuthPage = pathname?.startsWith('/auth/');

  // Rule of hooks: No early returns before all hooks are called
  if (isTestActive || isResultPage || isAuthPage) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .sylq-msg { font-size: 13px; line-height: 1.6; }
        .sylq-msg p { margin-bottom: 0.75rem; }
        .sylq-msg p:last-child { margin-bottom: 0; }
        .sylq-msg ul, .sylq-msg ol { margin-left: 1.25rem; margin-bottom: 0.75rem; }
        .sylq-msg li { margin-bottom: 0.25rem; }
        .sylq-msg strong { color: #67e8f9; font-weight: 700; }
        .sylq-msg code { background: rgba(0,0,0,0.3); padding: 2px 4px; borderRadius: 4px; font-family: monospace; }
        .sylq-msg h1, .sylq-msg h2, .sylq-msg h3 { font-size: 1.1em; font-weight: 700; margin: 1rem 0 0.5rem 0; color: #38bdf8; }
        .sylq-msg blockquote { border-left: 3px solid #38bdf8; padding-left: 10px; color: #94a3b8; font-style: italic; }
        .sylq-msg table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 12px; display: block; overflow-x: auto; white-space: nowrap; }
        .sylq-msg th, .sylq-msg td { padding: 8px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .sylq-msg th { background: rgba(255,255,255,0.05); color: #67e8f9; }
        .katex-display { margin: 0.5em 0; overflow-x: auto; overflow-y: hidden; }

        @media (max-width: 768px) {
          .sylq-fab { bottom: 100px !important; right: 16px !important; width: 48px !important; height: 48px !important; }
          .sylq-panel { bottom: 160px !important; right: 16px !important; height: min(500px, calc(100vh - 280px)) !important; width: calc(100vw - 32px) !important; }
        }
      `}</style>

      {/* FAB Button - Sylq Design */}
      <button
        onClick={() => setOpen(!open)}
        className="sylq-fab fixed z-[90] flex items-center justify-center transition-all duration-300 group hover:scale-110 active:scale-95"
        style={{
          right: '24px',
          bottom: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: open ? C.border : 'linear-gradient(135deg, #e0f2fe 0%, #a5f3fc 50%, #67e8f9 100%)',
          boxShadow: open ? 'none' : '0 8px 32px rgba(103, 232, 249, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.8)',
          cursor: 'pointer',
        }}
      >
        {open ? (
          <span className="text-white text-2xl font-light">×</span>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0f172a" className="transition-transform group-hover:-translate-y-0.5">
            <path d="M12 2a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2z" />
            <path d="M6 6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H6zM9 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-6 5h6v2H9v-2z" />
            <path d="M1 10a2 2 0 0 1 2-2v8a2 2 0 0 1-2-2v-4z" />
            <path d="M23 10a2 2 0 0 0-2-2v8a2 2 0 0 0 2-2v-4z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="sylq-panel" style={{
          position: 'fixed', bottom: 94, right: 24, zIndex: 80,
          width: 'min(calc(100vw - 48px), 360px)', height: '500px',
          background: C.card, borderRadius: '20px', border: `1px solid ${C.border}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideIn 0.3s ease-out',
        }}>
          {/* Header */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e0f2fe, #67e8f9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>S</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Sylq AI</div>
              <div style={{ fontSize: 10, color: C.dim }}>Platform Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 40 }}>
                Hello! I'm Sylq. How can I help you today?
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  background: msg.role === 'user' ? '#0ea5e9' : 'rgba(255,255,255,0.05)',
                  color: msg.role === 'user' ? '#fff' : C.text,
                  fontSize: 13, border: msg.role === 'user' ? 'none' : `1px solid ${C.border}`
                }}>
                  <div className="sylq-msg">
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
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything..."
              style={{
                flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
                borderRadius: '10px', padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none'
              }}
            />
            <button onClick={sendMessage} style={{ background: C.cyan, color: '#0f172a', border: 'none', borderRadius: '10px', padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
