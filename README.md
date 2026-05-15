# Sylq - AI-Powered Competitive Exam Intelligence

Sylq is a state-of-the-art, AI-driven platform designed to revolutionize how students prepare for highly competitive exams like **GATE, CAT, JEE**, and more. Moving beyond static mock tests, Sylq provides a dynamic, personalized learning ecosystem that adapts to every student's unique performance fingerprint.

## 🚀 Core Features

- **Dynamic Test Generation**: Create custom mock tests filtered by subject, topic, difficulty, and question type (MCQ, MSQ, NAT).
- **AI Post-Test Analysis**: Deep-dive into your performance with automated sincerity scores, behavioral insights, and topic-wise strength/weakness mapping.
- **Sylq AI Chatbot**: An integrated tutor that understands the context of your specific test results to provide instant explanations and guidance.
- **Holistic Study Roadmaps**: AI-generated, multi-phase study plans that evolve based on your test history and personal goals.
- **Multi-Exam Architecture**: Seamlessly switch between different exam domains with specialized scoring rules and curriculum structures.
- **Premium Experience**: Advanced features including PYQ-only modes, unlimited AI generations, and detailed behavioral tracking.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [Tailwind CSS](https://tailwindcss.com/) for a premium glassmorphic UI.
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python) for high-performance AI orchestration.
- **Intelligence**: [Google Gemini 2.0](https://deepmind.google/technologies/gemini/) & [Groq (Llama 3)](https://groq.com/) for real-time analysis and tutoring.
- **Infrastructure**: [Supabase](https://supabase.com/) (PostgreSQL) for reliable data persistence.
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) for secure, multi-method user login.

## 📁 Project Structure

- `frontend/`: Modern React application with glassmorphic design and responsive layouts.
- `backend/`: Robust API server handling AI pipelines, payment orchestration (Razorpay), and complex exam scoring logic.
- `Questions_ingestion/`: Advanced automation tools for processing and importing question banks from PDFs and CSVs.
- `Sylq_exam_details/`: Curated reference materials and syllabi for supported competitive exams.

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Firebase & Supabase Project Keys

### Development Setup

1. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## 📄 License
This project is licensed under the MIT License.
