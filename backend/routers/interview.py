from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, CVProfile
from services.cv_service import generate_interview_prep
from groq import Groq
import re
import json
import asyncio
from config import get_settings
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()
client = Groq(api_key=settings.groq_api_key)


class PracticeRequest(BaseModel):
    session_id: str
    question: str
    user_answer: str
    role: str = "ML Engineer"


class StartInterviewRequest(BaseModel):
    session_id: str
    role: str
    company: str = ""
    difficulty: str = "medium"  # easy, medium, hard


class InterviewAnswerRequest(BaseModel):
    session_id: str
    interview_id: str
    answer: str


# Store active interview sessions (in production, use Redis)
active_interviews = {}


@router.post("/start-interactive")
async def start_interactive_interview(req: StartInterviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Start an interactive interview session.
    Returns first question and interview_id for tracking.
    """
    # Get CV
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(404, "CV not found. Please upload your CV first.")
    
    # Generate interview ID
    import uuid
    interview_id = str(uuid.uuid4())
    
    # Generate first question
    first_question = await _generate_first_question(profile.raw_text, req.role, req.company, req.difficulty)
    
    # Store interview state
    active_interviews[interview_id] = {
        "session_id": req.session_id,
        "role": req.role,
        "company": req.company,
        "difficulty": req.difficulty,
        "cv_text": profile.raw_text[:2000],
        "conversation": [
            {"type": "question", "content": first_question, "timestamp": asyncio.get_event_loop().time()}
        ],
        "question_count": 1,
        "scores": []
    }
    
    logger.info(f"Started interactive interview {interview_id} for session {req.session_id}")
    
    return {
        "interview_id": interview_id,
        "question": first_question,
        "question_number": 1,
        "total_questions": 8,
        "message": "Interview started! Answer naturally as you would in a real interview."
    }


@router.post("/answer-interactive")
async def answer_interactive_question(req: InterviewAnswerRequest):
    """
    Submit answer to current question and get next question with feedback.
    """
    interview = active_interviews.get(req.interview_id)
    
    if not interview:
        raise HTTPException(404, "Interview session not found or expired.")
    
    # Get current question
    current_question = interview["conversation"][-1]["content"]
    
    # Evaluate answer
    feedback = await _evaluate_answer_realtime(
        question=current_question,
        answer=req.answer,
        cv_text=interview["cv_text"],
        role=interview["role"],
        difficulty=interview["difficulty"]
    )
    
    # Store answer and feedback
    interview["conversation"].append({
        "type": "answer",
        "content": req.answer,
        "feedback": feedback,
        "timestamp": asyncio.get_event_loop().time()
    })
    interview["scores"].append(feedback["score"])
    
    # Check if interview should continue
    if interview["question_count"] >= 8:
        # Interview complete
        final_report = await _generate_final_report(interview)
        del active_interviews[req.interview_id]
        
        return {
            "status": "complete",
            "feedback": feedback,
            "final_report": final_report,
            "message": "Interview complete! Here's your performance report."
        }
    
    # Generate next question based on previous answer
    next_question = await _generate_follow_up_question(
        conversation=interview["conversation"],
        cv_text=interview["cv_text"],
        role=interview["role"],
        difficulty=interview["difficulty"]
    )
    
    interview["conversation"].append({
        "type": "question",
        "content": next_question,
        "timestamp": asyncio.get_event_loop().time()
    })
    interview["question_count"] += 1
    
    return {
        "status": "continue",
        "feedback": feedback,
        "next_question": next_question,
        "question_number": interview["question_count"],
        "total_questions": 8,
        "progress": (interview["question_count"] - 1) / 8 * 100
    }


@router.get("/interview-status/{interview_id}")
async def get_interview_status(interview_id: str):
    """Get current status of an interview session."""
    interview = active_interviews.get(interview_id)
    
    if not interview:
        raise HTTPException(404, "Interview session not found.")
    
    avg_score = sum(interview["scores"]) / len(interview["scores"]) if interview["scores"] else 0
    
    return {
        "interview_id": interview_id,
        "question_count": interview["question_count"],
        "questions_answered": len(interview["scores"]),
        "average_score": round(avg_score, 1),
        "progress": interview["question_count"] / 8 * 100,
        "status": "in_progress"
    }


@router.post("/practice-feedback")
async def practice_feedback(req: PracticeRequest, db: AsyncSession = Depends(get_db)):
    """Give detailed feedback on a practice interview answer."""
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()

    context = f"Candidate CV summary: {profile.raw_text[:800]}" if profile else ""

    prompt = f"""You are a senior interviewer giving feedback on a practice answer.

Role: {req.role}
Question: {req.question}
Candidate's answer: {req.user_answer}
{context}

Give structured feedback as JSON (no markdown):
{{
  "score": 0-10,
  "verdict": "Strong|Good|Needs work|Weak",
  "what_worked": ["point1", "point2"],
  "what_to_improve": ["point1", "point2"],
  "ideal_answer_outline": "3-4 sentence outline of a strong answer",
  "follow_up_question": "a likely follow-up the interviewer would ask"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )
    text = re.sub(r"```json\s*|\s*```", "", response.choices[0].message.content).strip()
    return json.loads(text)


# Helper functions for interactive interview

async def _generate_first_question(cv_text: str, role: str, company: str, difficulty: str) -> str:
    """Generate the opening question for the interview."""
    company_str = f" at {company}" if company else ""
    
    difficulty_guide = {
        "easy": "Start with a warm-up question about their background or a basic concept.",
        "medium": "Ask about a relevant project or technical concept from their CV.",
        "hard": "Challenge them with a complex scenario or system design question."
    }
    
    prompt = f"""You are conducting a {difficulty} difficulty interview for a {role} position{company_str}.

Candidate's CV summary:
{cv_text[:1500]}

{difficulty_guide.get(difficulty, difficulty_guide["medium"])}

Generate ONE opening interview question. Make it:
- Relevant to their CV and the role
- Natural and conversational
- Appropriate for {difficulty} difficulty

Return ONLY the question text, nothing else."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.choices[0].message.content.strip()


async def _evaluate_answer_realtime(question: str, answer: str, cv_text: str, role: str, difficulty: str) -> dict:
    """Evaluate answer and provide immediate feedback."""
    prompt = f"""You are an interviewer evaluating a candidate's answer in real-time.

Role: {role}
Difficulty: {difficulty}
Question: {question}
Candidate's answer: {answer}

CV context: {cv_text[:800]}

Provide quick, actionable feedback as JSON:
{{
  "score": 0-10,
  "verdict": "Excellent|Good|Adequate|Weak",
  "strength": "One sentence on what was good",
  "improvement": "One sentence on what could be better",
  "interviewer_reaction": "Brief natural reaction (e.g., 'Interesting approach!', 'Could you elaborate?')"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=400,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = response.choices[0].message.content.strip()
    return json.loads(text)


async def _generate_follow_up_question(conversation: List[dict], cv_text: str, role: str, difficulty: str) -> str:
    """Generate next question based on conversation flow."""
    # Build conversation context
    recent_qa = []
    for item in conversation[-4:]:  # Last 2 Q&A pairs
        if item["type"] == "question":
            recent_qa.append(f"Q: {item['content']}")
        elif item["type"] == "answer":
            recent_qa.append(f"A: {item['content'][:200]}")
    
    context = "\n".join(recent_qa)
    
    prompt = f"""You are conducting an interview for a {role} position.

Previous conversation:
{context}

Candidate's CV: {cv_text[:800]}

Generate the NEXT interview question that:
- Builds naturally on the conversation
- Explores a different aspect (technical, behavioral, or situational)
- Matches {difficulty} difficulty
- Feels like a real interview flow

Return ONLY the question text."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.choices[0].message.content.strip()


async def _generate_final_report(interview: dict) -> dict:
    """Generate comprehensive interview performance report."""
    # Build full conversation
    qa_pairs = []
    for i, item in enumerate(interview["conversation"]):
        if item["type"] == "question":
            qa_pairs.append(f"Q{(i//2)+1}: {item['content']}")
        elif item["type"] == "answer":
            qa_pairs.append(f"A: {item['content'][:150]}... (Score: {item['feedback']['score']}/10)")
    
    conversation_summary = "\n".join(qa_pairs)
    avg_score = sum(interview["scores"]) / len(interview["scores"])
    
    prompt = f"""Generate a comprehensive interview performance report.

Role: {interview['role']}
Company: {interview['company'] or 'N/A'}
Average Score: {avg_score:.1f}/10

Interview Summary:
{conversation_summary}

Provide detailed report as JSON:
{{
  "overall_score": 0-100,
  "performance_level": "Excellent|Good|Average|Needs Improvement",
  "strengths": ["strength1", "strength2", "strength3"],
  "areas_for_improvement": ["area1", "area2", "area3"],
  "technical_assessment": "2-3 sentences on technical skills",
  "communication_assessment": "2-3 sentences on communication",
  "recommendation": "Strong Hire|Hire|Maybe|No Hire",
  "next_steps": "Advice for the candidate",
  "standout_moment": "One memorable positive moment from the interview"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=1000,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = response.choices[0].message.content.strip()
    report = json.loads(text)
    report["questions_answered"] = len(interview["scores"])
    report["average_score"] = round(avg_score, 1)
    
    return report
