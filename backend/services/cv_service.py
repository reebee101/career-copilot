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
skills (array of strings, ALL skills extracted from CV — be thorough, include languages, frameworks, tools, soft skills)
experience_years (integer)
education (string)
strengths (array of exactly 3 strings, specific to this person's actual CV content — NOT generic)
critical_gaps (array of EXACTLY 4 objects): EVERY object MUST have these exact keys:
  { "skill": "string — name of the missing skill or gap",
    "severity": "critical" | "moderate" | "minor",
    "reason": "string — 1 sentence explaining why this gap hurts job prospects" }
  IMPORTANT: critical_gaps MUST always return exactly 4 objects. Even excellent CVs have gaps.
  DO NOT return strings, only objects. DO NOT omit any of the three keys.
rewritten_bullets (array of 5 objects): each MUST have:
  { "original": "exact bullet text from CV",
    "rewritten": "improved bullet: strong action verb + specific number/metric + business impact",
    "improvement": "one sentence explaining what changed" }
recommended_certs (array of 3 objects): each has:
  { "priority": 1|2|3, "name": string, "provider": string,
    "reason": "tailored to this person's specific skill gaps",
    "score_impact": string like "+8 ATS points" }
recommended_projects (array of 3 objects): each has:
  { "title": string, "difficulty": "beginner"|"intermediate"|"advanced",
    "description": "2 sentences on what to build and why",
    "skills_added": [array of strings] }"""

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
rewritten_cv_sections (object):
  { "summary": "rewritten professional summary targeting this exact role",
    "skills_to_highlight": [array of strings from their CV that match this JD],
    "skills_to_add": [array of strings they should learn before applying] }
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


async def evaluate_practice_answer(cv_text: str, question: str, user_answer: str, role: str) -> dict:
    system = """You are a strict but fair interview coach. Evaluate the candidate's answer.
Return a JSON object with EXACTLY:
score (integer 1-10)
verdict (string, one of: "Excellent", "Good", "Needs Work", "Too Vague")
what_worked (array of 2-3 strings)
what_to_improve (array of 2-3 strings)
ideal_answer_outline (string, 2-3 sentences describing what a 10/10 answer looks like)"""

    return _chat_json([
        {"role": "system", "content": system},
        {"role": "user", "content": f"Role: {role}\nQuestion: {question}\nCandidate's answer: {user_answer}\n\nCV context:\n{cv_text[:1500]}"},
    ], max_tokens=800)
