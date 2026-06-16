"""
routers/chatbot.py — Phase 6: AI Chatbot with SSE streaming.
Strictly using:
- Sylq AI & Examiq AI: Groq (qwen/qwen3.6-27b)
"""

import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq

from config import settings
from services.study_planner_pipeline import describe_exam_image
from database import supabase
from routers.auth import get_current_user, get_optional_current_user
from schemas import UserInfo

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# Initialize Clients
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
    exam_name = current_user.exam_name if current_user else None
    system_prompt = _build_system_prompt(body.test_id, body.question_id, body.chat_type, exam_name)

    # ── Build history ──────────────────────────────────────────────────────
    chat_history = []
    for m in body.messages:
        role = "model" if m.role == "assistant" else "user"
        chat_history.append({"role": role, "parts": [{"text": m.content}]})
    
    return StreamingResponse(
        _stream_ai(system_prompt, chat_history, body.chat_type),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_system_prompt(test_id: str | None, question_id: str | None, chat_type: str, exam_name: str | None = None) -> str:
    """
    Build the context-rich system prompt.
    """
    exam_context = exam_name or "competitive"
    
    if chat_type == "analysis":
        base = (
            f"You are Examiq, an expert {exam_context} exam analysis tutor. "
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
        return base + f"The user is asking a general question about the platform or {exam_context} exam."

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

    # Extract text and describe images
    q_blocks = q.get("question_blocks") or []
    text_parts = []
    image_descriptions = []

    for block in q_blocks:
        b_type = block.get("type")
        if b_type in ("text", "latex"):
            text_parts.append(block.get("body", ""))
        elif b_type == "image" and block.get("url"):
            # Use Llama 4 Scout to describe the image for the chatbot's context
            try:
                desc = describe_exam_image(block.get("url"))
                image_descriptions.append(f"[Diagram Analysis]: {desc}")
            except Exception as e:
                print(f"[Chatbot] Vision error: {e}")

    q_text = " ".join(text_parts)
    img_context = "\n".join(image_descriptions)
    
    subject = (q.get("subjects") or {}).get("name", "")
    topic   = (q.get("topics")   or {}).get("name", "")

    context = (
        f"QUESTION CONTEXT:\n"
        f"Subject: {subject} | Topic: {topic}\n"
        f"Question Text: {q_text}\n"
        f"Visual Context:\n{img_context if img_context else 'No diagrams available.'}\n"
        f"Correct Answer: {q['correct_answer']}\n"
        f"Explanation: {q['explanation']}\n"
    )

    return base + context


def _stream_ai(system_prompt: str, history: list[dict], chat_type: str):
    """
    Generator for AI streaming. 
    Both Sylq and Examiq now use: Groq (qwen/qwen3.6-27b)
    """
    try:
        model_name = "qwen/qwen3.6-27b"
        print(f"[Chatbot] Streaming {chat_type} from Groq model: {model_name}")
        
        # Convert history to OpenAI format for Groq safely
        groq_messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            role = "assistant" if h["role"] == "model" else "user"
            text_content = ""
            if "parts" in h and h["parts"]:
                text_content = h["parts"][0].get("text", "")
            groq_messages.append({"role": role, "content": text_content})

        # Call Groq completions with retry for 429 rate limits
        max_retries = 3
        backoff = 1.5
        response = None
        for i in range(max_retries):
            try:
                response = groq_client.chat.completions.create(
                    model=model_name,
                    messages=groq_messages,
                    temperature=0.3,
                    max_completion_tokens=1024 if chat_type == "analysis" else 800,
                    stream=True,
                )
                break
            except Exception as e:
                # If 429 rate limit is hit, retry after a short delay
                if "429" in str(e) and i < max_retries - 1:
                    import time
                    sleep_time = backoff ** (i + 1)
                    print(f"[Chatbot] 429 Rate Limit hit. Retrying in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    continue
                raise e
        
        for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {delta.replace(chr(10), '\\n')}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        print(f"[Chatbot Error] {e}")
        yield f"data: [ERROR] {str(e)}\n\n"
        yield "data: [DONE]\n\n"
