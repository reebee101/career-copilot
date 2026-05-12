from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, CVProfile
from services.cv_service import generate_interview_prep
from groq import Groq
import re
from config import get_settings
from pydantic import BaseModel

router = APIRouter()
settings = get_settings()
client = Groq(api_key=settings.groq_api_key)


class PracticeRequest(BaseModel):
    session_id: str
    question: str
    user_answer: str
    role: str = "ML Engineer"


@router.post("/practice-feedback")
async def practice_feedback(req: PracticeRequest, db: AsyncSession = Depends(get_db)):
    """Give detailed feedback on a practice interview answer."""
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = result.scalar_one_or_none()

    context = f"Candidate CV summary: {profile.raw_text[:800]}" if profile else ""

    prompt = f"""You are a senior ML interviewer giving feedback on a practice answer.

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
    import json
    return json.loads(text)
