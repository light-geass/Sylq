"""
backend/services/study_planner_pipeline.py

A specialized AI pipeline for GATE aspirants using Groq.
- Llama 4 Scout (17B): Vision description & Long-context planning
- Llama 3.3 (70B): Complex academic problem solving
"""

import base64
import time
import logging
from groq import Groq
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Clients
# Client 1: Standard key for 70B model
client_70b = Groq(api_key=settings.groq_api_key)

# Client 2: Secondary key for Llama 4 Scout model
client_scout = Groq(api_key=settings.groq_api_key_2)

# Model IDs
MODEL_SCOUT = "meta-llama/llama-4-scout-17b-16e-instruct"
MODEL_70B   = "llama-3.3-70b-versatile"

def _encode_image(image_path: str) -> str:
    """Encodes a local image to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def _handle_rate_limits(func):
    """Decorator to handle 429 Rate Limit errors with exponential backoff."""
    def wrapper(*args, **kwargs):
        max_retries = 3
        backoff = 2
        for i in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if "429" in str(e) and i < max_retries - 1:
                    sleep_time = backoff ** (i + 1)
                    logger.warning(f"Rate limit hit. Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
                raise e
    return wrapper

@_handle_rate_limits
def describe_exam_image(image_input: str) -> str:
    """
    Phase 1 (The Eye): Detailed technical description of diagrams using Llama 4 Scout.
    Accepts either a local file path OR a public URL.
    """
    logger.info(f"[Phase 1] Describing image: {image_input}")
    
    if image_input.startswith("http"):
        # Use URL directly in Groq message
        image_source = {"url": image_input}
    else:
        # Encode local file
        base64_image = _encode_image(image_input)
        image_source = {"url": f"data:image/jpeg;base64,{base64_image}"}
    
    completion = client_scout.chat.completions.create(
        model=MODEL_SCOUT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": "Provide a highly detailed technical description of this diagram and a full transcription of any text or mathematical equations visible."
                    },
                    {
                        "type": "image_url",
                        "image_url": image_source
                    }
                ]
            }
        ],
        temperature=0.1,
    )
    return completion.choices[0].message.content

@_handle_rate_limits
def solve_gate_question(technical_description: str) -> str:
    """
    Phase 2 (The Brain): Step-by-step academic solution using Llama 3.3 70B.
    """
    logger.info("[Phase 2] Solving question based on description...")
    
    completion = client_70b.chat.completions.create(
        model=MODEL_70B,
        messages=[
            {
                "role": "system",
                "content": "You are an expert GATE examiner. Provide a rigorous, step-by-step academic solution suitable for high-level aspirants."
            },
            {
                "role": "user",
                "content": f"Based on this technical description of a question, provide a complete solution:\n\n{technical_description}"
            }
        ],
        temperature=0.2,
    )
    return completion.choices[0].message.content

@_handle_rate_limits
def generate_study_plan(syllabus_text: str) -> str:
    """
    Phase 3 (The Strategist): 30-day schedule using Llama 4 Scout's 131K context window.
    """
    logger.info("[Phase 3] Generating 30-day strategy...")
    
    completion = client_scout.chat.completions.create(
        model=MODEL_SCOUT,
        messages=[
            {
                "role": "system",
                "content": "You are a lead educational strategist. Organize the provided syllabus into a high-performance 30-day GATE preparation schedule."
            },
            {
                "role": "user",
                "content": f"Create a day-by-day 30-day plan for this syllabus:\n\n{syllabus_text}"
            }
        ],
        max_tokens=4096,
        temperature=0.3,
    )
    return completion.choices[0].message.content

# Example usage (commented out)
# if __name__ == "__main__":
#    desc = describe_exam_image("question.png")
#    sol  = solve_gate_question(desc)
#    plan = generate_study_plan("Math, Data Structures, Algorithms...")
#    print(f"Solution:\n{sol}\n\nPlan:\n{plan}")
