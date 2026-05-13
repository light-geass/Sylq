"""
routers/chatbot.py — Phase 6: AI Chatbot with SSE streaming.
Strictly using:
- Sylq AI: gemini-3.1-flash-lite
- Examiq AI: gemma-4-31b-it
"""

import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from google import genai
from google.genai import types

from config import settings
from database import supabase
from routers.auth import get_current_user, get_optional_current_user
from schemas import UserInfo

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# Initialize Clients
gemini_client = genai.Client(api_key=settings.gemini_api_key)
groq_client = Groq(api_key=settings.groq_api_key)

# ── Request schema ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    test_id:     str | None = None
    question_id: str | None = None   # None = general post-test question
    messages:    list[ChatMessage]   # full conversation history
    msg_count:   int = 0             # how many messages used so far
    chat_type:   str = "global"      # "global" (Sylq) | "analysis" (Examiq)


# ── POST /chatbot/stream ───────────────────────────────────────────────────────

@router.post("/stream")
def chat_stream(
    body:         ChatRequest,
    current_user: UserInfo | None = Depends(get_optional_current_user),
):
    """
    Stream an AI response token-by-token using SSE.
    """
    # ── Rate limit free users ──────────────────────────────────────────────
    if current_user and current_user.plan != "premium":
        if body.msg_count >= settings.free_chatbot_msgs_per_test:
            raise HTTPException(
                status_code=429,
                detail=f"Free plan limit reached ({settings.free_chatbot_msgs_per_test} msgs). Upgrade for unlimited."
            )
    elif not current_user:
        if body.msg_count >= 2:
            raise HTTPException(
                status_code=429,
                detail="Guest limit reached. Please log in or sign up."
            )

    # ── Build system prompt ────────────────────────────────────────────────
    system_prompt = _build_system_prompt(body.test_id, body.question_id, body.chat_type)

    # ── Build history ──────────────────────────────────────────────────────
    gemini_history = []
    for m in body.messages:
        role = "model" if m.role == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [{"text": m.content}]})
    
    return StreamingResponse(
        _stream_ai(system_prompt, gemini_history, body.chat_type),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_system_prompt(test_id: str | None, question_id: str | None, chat_type: str) -> str:
    """
    Build the context-rich system prompt.
    """
    if chat_type == "analysis":
        base = (
            "You are Examiq, an expert GATE exam analysis tutor. "
            "You help students understand their mistakes in mock tests. "
            "Be encouraging but rigorous. Use LaTeX for math.\n\n"
        )
    else:
        base = (
            "You are Sylq AI, a highly efficient, global Education & Exam Assistant. "
            "Your knowledge covers all domains of education, school curriculums, international/national exams, and detailed syllabi worldwide.\n\n"
            "CRITICAL OPERATIONAL RULES TO CONSERVE TOKENS:\n"
            "1. Be ultra-concise but highly informative. Use short, punchy bullet points. Avoid conversational fluff, long intros, or polite outros.\n"
            "2. When asked for a syllabus or exam structure, never dump the entire document at once. Provide a high-level summary of major core pillars/modules first.\n"
            "3. At the end of a long breakdown, explicitly prompt the user to specify which section they want expanded (e.g., 'Reply with the section name to view its detailed sub-topics.').\n"
            "4. Prioritize structured text. Use Markdown bolding for visual anchors so users can scan information rapidly.\n\n"
        )

    if not test_id or not question_id:
        return base + "The user is asking a general question about the platform or GATE exam."

    try:
        q = (
            supabase.table("questions")
            .select("question_blocks, question_type, options, correct_answer, explanation, subjects(name), topics(name)")
            .eq("id", question_id)
            .single()
            .execute()
            .data
        )
    except Exception:
        return base + "Context is limited, help as best as you can."

    if not q: return base

    q_text = " ".join(b.get("body", "") for b in (q.get("question_blocks") or []) if b.get("type") in ("text", "latex"))
    subject = (q.get("subjects") or {}).get("name", "")
    topic   = (q.get("topics")   or {}).get("name", "")

    context = (
        f"QUESTION CONTEXT:\n"
        f"Subject: {subject} | Topic: {topic}\n"
        f"Question: {q_text}\n"
        f"Correct Answer: {q['correct_answer']}\n"
        f"Explanation: {q['explanation']}\n"
    )

    return base + context


def _stream_ai(system_prompt: str, history: list[dict], chat_type: str):
    """
    Generator for AI streaming. 
    - Sylq: Groq (llama-3.3-70b-versatile)
    - Examiq: Gemini (fallback or requested model)
    """
    try:
        if chat_type == "analysis":
            # Examiq AI - Keeping Gemini for context-heavy analysis or custom model
            # Note: The user requested gemma-4-31b-it here, but if that fails, 
            # we might need to fallback. For now, following instructions.
            model_name = 'models/gemma-4-31b-it'
            print(f"[Chatbot] Streaming Examiq from Gemini model: {model_name}")
            
            response = gemini_client.models.generate_content_stream(
                model=model_name,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
                contents=history
            )
            for chunk in response:
                if chunk.text:
                    yield f"data: {chunk.text.replace(chr(10), '\\n')}\n\n"
        
        else:
            # Sylq AI - Switching to Groq as requested
            model_name = "llama-3.3-70b-versatile"
            print(f"[Chatbot] Streaming Sylq from Groq model: {model_name}")
            
            # Convert history to OpenAI format for Groq
            groq_messages = [{"role": "system", "content": system_prompt}]
            for h in history:
                role = "assistant" if h["role"] == "model" else "user"
                groq_messages.append({"role": role, "content": h["parts"][0]["text"]})

            response = groq_client.chat.completions.create(
                model=model_name,
                messages=groq_messages,
                temperature=0.3,           # Factual and precise
                max_completion_tokens=600, # Conserve tokens
                stream=True,
            )
            
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {delta.replace(chr(10), '\\n')}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        print(f"[Chatbot Error] {e}")
        yield f"data: [ERROR] {str(e)}\n\n"
        yield "data: [DONE]\n\n"
