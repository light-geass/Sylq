/**
 * lib/api.js — All calls to the FastAPI backend.
 * Phase 5 update: added generateAnalysis() and getAnalysis()
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
let authToken = null;

/**
 * Set the auth token globally for all API requests.
 * Called from a central component (like Layout) when Supabase auth state changes.
 */
export function setApiToken(token) {
  authToken = token;
}

/**
 * Internal fetch wrapper.
 * Attaches the Firebase JWT as a Bearer token.
 */
async function req(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    const errorMessage = typeof err.detail === 'string' 
      ? err.detail 
      : JSON.stringify(err.detail || err);
    throw new Error(errorMessage || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Question taxonomy ──────────────────────────────────────────────────────
export const getSubjects = ()           => req('GET', '/questions/subjects');
export const getTopics   = (subject_id) => req('GET', `/questions/topics?subject_id=${subject_id}`);

// ── Test lifecycle ─────────────────────────────────────────────────────────
export const createTest = (payload)            => req('POST', '/test', payload);
export const submitTest = (test_id, answers, time_per_question = {}) =>
  req('POST', `/test/${test_id}/submit`, { answers, time_per_question });
export const getResult  = (test_id)            => req('GET',  `/test/${test_id}/result`);
export const getHistory = (limit = 10)         => req('GET',  `/test/history?limit=${limit}`);

// ── Phase 5: AI Analysis ───────────────────────────────────────────────────
/**
 * generateAnalysis — triggers Groq study plan generation.
 * Call once after test submission. Idempotent — safe to call again.
 */
export const generateAnalysis = (test_id) =>
  req('POST', `/analysis/${test_id}/generate`);

/**
 * getAnalysis — returns cached analysis.
 * Use on result page refresh or return visits.
 */
export const getAnalysis = (test_id) =>
  req('GET', `/analysis/${test_id}`);

// ── Helpers ────────────────────────────────────────────────────────────────
const asyncGetAuthHeaders = async () => {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
};

// ── Payments ───────────────────────────────────────────────────────────────
export const createOrder = (planId) => req('POST', '/payments/create-order', { plan_id: planId });
export const verifyPayment = (data) => req('POST', '/payments/verify', data);
export const getPaymentHistory = () => req('GET', '/payments/history');

// ── Health & Auth ──────────────────────────────────────────────────────────
export const checkEmail  = (email)  => req('POST', '/auth/check-email', { email });
export const healthCheck = () => req('GET', '/health');
export const getMe       = () => req('GET', '/auth/me');
export const updateProfile = (data) => req('PATCH', '/auth/profile', data);

// ── Courses ────────────────────────────────────────────────────────────────
export const getCourses   = () => req('GET', '/courses');
export const getMyCourses = () => req('GET', '/courses/my');
export const enrollCourse = (courseId) => req('POST', `/courses/${courseId}/enroll`);


// ---Chatbot----------------------------------------------------------
export async function streamChatbot(payload, onChunk, onDone) {
  const authHeaders = await asyncGetAuthHeaders();
  const res = await fetch(`${BASE}/chatbot/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
  })
  if (!res.ok) { 
    const e = await res.json().catch(() => ({ detail: 'Chat failed' })); 
    throw new Error(e.detail || 'Chat failed'); 
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) { 
      onDone(); 
      break; 
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // The last element is either an empty string (if buffer ended with \n)
    // or a partial line (if it didn't). Keep it in the buffer.
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const text = line.slice(6);
        if (text !== '[DONE]') onChunk(text);
      }
    }
  }
}