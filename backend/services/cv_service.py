"""cv_service.py — All Groq-powered CV operations."""
import json, io
from groq import Groq
from config import get_settings

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"


def _chat_json(messages: list, max_tokens: int = 2000) -> dict:
    response = client.chat.completions.create(
        model=MODEL, max_tokens=max_tokens,
        response_format={"type": "json_object"},
        messages=messages,
    )
    return json.loads(response.choices[0].message.content)


def _chat_text(prompt: str, max_tokens: int = 800) -> str:
    response = client.chat.completions.create(
        model=MODEL, max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def extract_cv_text(content: bytes, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        import fitz
        doc = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    if lower.endswith((".docx", ".doc")):
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    return content.decode("utf-8", errors="ignore")


async def analyze_cv(cv_text: str) -> dict:
    system = """You are a senior career coach and ATS expert. Analyze the CV thoroughly.
Return a JSON object with EXACTLY these keys — no extras, no omissions:

name (string)
email (string, or empty)
phone (string, or empty)
summary (string, 2 sentences based on the actual CV content)
ats_score (integer 0-100, based on keyword density, formatting clarity, measurable achievements, section structure)
score_breakdown (object): { "keywords": int, "formatting": int, "experience": int, "education": int, "skills": int } — all 0-100
skills (array of strings, extracted from CV)
experience_years (integer)
education (string)
strengths (array of exactly 3 strings, specific to this person's actual CV — not generic)
critical_gaps (array of exactly 4 objects): each object MUST have { "skill": string, "severity": "critical"|"moderate"|"minor", "reason": string explaining why this gap hurts job prospects }
rewritten_bullets (array of 5 objects): each MUST have { "original": string (exact bullet from CV), "rewritten": string (action verb + specific metric + business impact), "improvement": string (one sentence what changed) }
recommended_certs (array of 3 objects): each has { "priority": 1|2|3, "name": string, "provider": string, "reason": string tailored to this person's gaps, "score_impact": string like "+8 ATS points" }
recommended_projects (array of 3 objects): each has { "title": string, "difficulty": "beginner"|"intermediate"|"advanced", "description": string 2 sentences, "skills_added": array of strings }

IMPORTANT: critical_gaps MUST always have exactly 4 items. Even strong CVs have gaps. Be specific and honest."""

    return _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"Analyze this CV:\n\n{cv_text[:4000]}"},
    ], max_tokens=3000)


async def score_cv_against_jd(cv_text: str, jd_text: str) -> dict:
    system = """You are a recruitment expert. Analyze the CV against the job description.
Return a JSON object with EXACTLY these keys:

match_score (integer 0-100)
verdict (string, one of: "Strong Match", "Good Match", "Partial Match", "Weak Match")
application_strategy (string, 2-3 sentences of specific advice for THIS candidate applying to THIS role)
matched_keywords (array of strings)
missing_keywords (array of strings)
tailored_bullets (array of 3 strings, CV bullets rewritten specifically for this JD)
rewritten_cv_sections (object): {
  "summary": string (rewritten professional summary targeting this exact role),
  "skills_to_highlight": array of strings (from their CV that match this JD),
  "skills_to_add": array of strings (they should learn/add before applying)
}
recommendation (string, 2-3 concrete actionable sentences)"""

    return _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"CV:\n{cv_text[:2500]}\n\nJob Description:\n{jd_text[:2000]}"},
    ], max_tokens=1500)


async def generate_full_cover_letter(cv_text: str, jd_text: str, company: str, role: str) -> str:
    prompt = f"""Write a professional, personalized cover letter for a candidate applying to {role} at {company}.
3-4 paragraphs. No placeholder text. Reference specific projects and skills from their CV.
Return only the letter text, nothing else.

CV:
{cv_text[:2500]}

Job Description:
{jd_text[:1500]}"""
    return _chat_text(prompt, max_tokens=900)


async def generate_interview_prep(cv_text: str, role: str, company: str = "") -> list:
    company_str = f" at {company}" if company else ""
    system = f"""You are a senior interviewer for {role} roles{company_str}.
Return a JSON object with key "questions" containing an array of 8 objects.
Each object: {{ "question": string, "category": string (one of: technical, behavioural, project, system-design), "tip": string }}
Base questions specifically on the candidate's actual CV projects and skills."""

    data = _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"Generate interview questions based on:\n\n{cv_text[:2500]}"},
    ], max_tokens=1500)
    return data.get("questions", []) if isinstance(data, dict) else data
