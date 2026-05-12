"""cv_service.py — All Groq-powered CV operations."""
import json, io
from groq import Groq
from config import get_settings

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)

MODEL = "llama-3.3-70b-versatile"


def _chat_json(messages: list, max_tokens: int = 2000) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
        messages=messages,
    )
    return json.loads(response.choices[0].message.content)


def _chat_text(prompt: str, max_tokens: int = 800) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


# ── Text extraction ────────────────────────────────────────────

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


# ── CV analysis ────────────────────────────────────────────────

async def analyze_cv(cv_text: str) -> dict:
    system = """You are a professional CV/resume analyst. Analyze the CV thoroughly and return a JSON object with EXACTLY these keys:

- name (string): candidate full name
- email (string): email address or empty string
- phone (string): phone number or empty string
- summary (string): 2-sentence professional summary
- ats_score (integer 0-100): honest ATS friendliness score based on keywords, formatting, structure
- score_breakdown (object with integer values 0-100 for each): { "keywords": 0-100, "formatting": 0-100, "experience": 0-100, "education": 0-100, "skills": 0-100 }
- skills (array of strings): technical skills found
- experience_years (integer): total years of experience
- education (string): highest degree and field
- strengths (array of exactly 3 strings): specific strengths based on the CV content
- gaps (array of strings): weaknesses or missing things
- critical_gaps (array of 3-5 strings): the most impactful missing skills or issues that are hurting job prospects right now — be specific and honest
- rewritten_bullets (array of 5 objects): each object has { "original": "exact bullet from CV", "rewritten": "improved version with action verb + specific metric + business impact", "improvement": "one sentence explaining what was improved" }
- recommended_certs (array of 3 objects): each has { "priority": 1/2/3, "name": "cert name", "provider": "e.g. Google/AWS/Coursera", "reason": "why it helps this candidate specifically", "score_impact": "e.g. +8 ATS points" }
- recommended_projects (array of 3 objects): each has { "title": "project name", "difficulty": "beginner/intermediate/advanced", "description": "2-sentence description", "skills_added": ["skill1", "skill2"] }

Be specific and honest — do not give generic advice. Reference the candidate's actual content."""

    return _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"Analyze this CV:\n\n{cv_text[:4000]}"},
    ], max_tokens=3000)


# ── Score CV against a job description ────────────────────────

async def score_cv_against_jd(cv_text: str, jd_text: str) -> dict:
    system = """You are a recruitment expert. Return a JSON object with EXACTLY these keys:
- match_score (integer 0-100)
- matched_keywords (array of strings found in both CV and JD)
- missing_keywords (array of important JD keywords missing from CV)
- tailored_bullets (array of 5 CV bullets rewritten specifically for this JD)
- recommendation (string, 4-5 sentences of concrete actionable advice)"""

    return _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"CV:\n{cv_text[:2500]}\n\nJob Description:\n{jd_text[:2000]}"},
    ], max_tokens=1200)


# ── Cover letter ───────────────────────────────────────────────

async def generate_full_cover_letter(cv_text: str, jd_text: str, company: str, role: str) -> str:
    prompt = f"""Write a professional, personalized cover letter for a candidate applying to {role} at {company}.
3-4 paragraphs. No placeholder text. Return only the letter, nothing else.

CV:
{cv_text[:2500]}

Job Description:
{jd_text[:1500]}"""
    return _chat_text(prompt, max_tokens=800)


# ── Interview prep ─────────────────────────────────────────────

async def generate_interview_prep(cv_text: str, role: str, company: str = "") -> list:
    company_str = f" at {company}" if company else ""
    system = f"""You are a senior interviewer for {role} roles{company_str}.
Return a JSON object with a single key "questions" containing an array of 8 objects.
Each object has: question (string), type (one of: technical, behavioural, project), tip (string, hint for a strong answer).
Reference the candidate's actual projects and skills from their CV."""

    data = _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"Generate interview questions based on this CV:\n\n{cv_text[:2500]}"},
    ], max_tokens=1500)
    return data.get("questions", data) if isinstance(data, dict) else data
# ── Match CV against job posting ──────────────────────────────

async def match_cv_to_job(cv_text: str, jd_text: str) -> dict:
    """
    Scores how well a CV matches a job description.
    Used by the scheduler to filter jobs automatically.
    """

    system = """
You are an expert AI recruiter and ATS scoring engine.

Return a JSON object with EXACTLY these keys:

- match_score (integer 0-100):
  realistic hiring match score

- matched (boolean):
  true if candidate is a strong fit

- strengths (array of strings):
  strongest matching qualifications

- missing_requirements (array of strings):
  important missing skills/tools/requirements

- matched_keywords (array of strings):
  keywords found in both CV and JD

- missing_keywords (array of strings):
  important JD keywords missing from CV

- reasoning (string):
  3-4 sentence explanation of why this candidate matches or does not match
"""

    return _chat_json([
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": f"""
CV:
{cv_text[:3000]}

JOB DESCRIPTION:
{jd_text[:2500]}
"""
        },
    ], max_tokens=1200)