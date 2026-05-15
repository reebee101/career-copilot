"""AI-powered job recommendation and ranking service."""
from groq import Groq
from config import get_settings
import json
import re
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)
settings = get_settings()
client = Groq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"


async def rank_jobs_by_cv(cv_text: str, jobs: List[Dict], top_n: int = 20) -> List[Dict]:
    """
    Rank jobs based on CV match using AI.
    Returns top N jobs sorted by relevance score.
    """
    if not jobs:
        return []
    
    if not cv_text or len(cv_text.strip()) < 100:
        # No CV available, return jobs as-is
        return jobs[:top_n]
    
    try:
        # Extract key info from CV for faster processing
        cv_summary = _extract_cv_summary(cv_text)
        
        # Batch jobs for efficient processing (process 10 at a time)
        batch_size = 10
        ranked_jobs = []
        
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i + batch_size]
            scores = await _score_job_batch(cv_summary, batch)
            
            # Add scores to jobs
            for job, score in zip(batch, scores):
                job['match_score'] = score
                job['match_reasons'] = _generate_match_reasons(cv_summary, job, score)
            
            ranked_jobs.extend(batch)
        
        # Sort by match score (descending)
        ranked_jobs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        
        logger.info(f"Ranked {len(ranked_jobs)} jobs, top score: {ranked_jobs[0].get('match_score', 0)}")
        
        return ranked_jobs[:top_n]
        
    except Exception as e:
        logger.error(f"Error ranking jobs: {e}")
        # Fallback: return jobs as-is
        return jobs[:top_n]


def _extract_cv_summary(cv_text: str) -> Dict:
    """Extract key information from CV for matching."""
    # Simple extraction - can be enhanced with AI
    text_lower = cv_text.lower()
    
    # Common tech skills
    tech_skills = [
        'python', 'javascript', 'java', 'react', 'node', 'sql', 'aws',
        'docker', 'kubernetes', 'machine learning', 'ai', 'data science',
        'frontend', 'backend', 'fullstack', 'devops', 'mobile', 'ios', 'android'
    ]
    
    found_skills = [skill for skill in tech_skills if skill in text_lower]
    
    # Extract years of experience (rough estimate)
    years_match = re.findall(r'(\d+)\+?\s*years?', text_lower)
    years_exp = max([int(y) for y in years_match], default=0)
    
    # Extract education level
    education = 'bachelor'
    if 'phd' in text_lower or 'doctorate' in text_lower:
        education = 'phd'
    elif 'master' in text_lower or 'msc' in text_lower or 'mba' in text_lower:
        education = 'master'
    
    return {
        'skills': found_skills,
        'years_experience': years_exp,
        'education': education,
        'text_sample': cv_text[:1000]  # First 1000 chars for context
    }


async def _score_job_batch(cv_summary: Dict, jobs: List[Dict]) -> List[int]:
    """Score a batch of jobs against CV using AI."""
    
    # Prepare job descriptions
    job_summaries = []
    for idx, job in enumerate(jobs):
        job_summaries.append(f"""
Job {idx + 1}:
Title: {job.get('title', 'N/A')}
Company: {job.get('company', 'N/A')}
Location: {job.get('location', 'N/A')}
Description: {job.get('description', '')[:300]}
""")
    
    prompt = f"""You are a job matching expert. Score how well each job matches this candidate's profile.

Candidate Profile:
- Skills: {', '.join(cv_summary['skills'])}
- Experience: {cv_summary['years_experience']} years
- Education: {cv_summary['education']}

Jobs to Score:
{''.join(job_summaries)}

Return ONLY a JSON array of scores (0-100) for each job, where:
- 90-100: Excellent match (skills + experience align perfectly)
- 70-89: Good match (most requirements met)
- 50-69: Moderate match (some skills match)
- 30-49: Weak match (few skills match)
- 0-29: Poor match (minimal alignment)

Format: {{"scores": [score1, score2, ...]}}
"""
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=500,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.choices[0].message.content.strip()
        # Strip markdown if present
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        
        result = json.loads(text)
        scores = result.get('scores', [])
        
        # Ensure we have scores for all jobs
        while len(scores) < len(jobs):
            scores.append(50)  # Default moderate score
        
        return scores[:len(jobs)]
        
    except Exception as e:
        logger.error(f"Error scoring jobs: {e}")
        # Fallback: return moderate scores
        return [50] * len(jobs)


def _generate_match_reasons(cv_summary: Dict, job: Dict, score: int) -> List[str]:
    """Generate human-readable reasons for the match score."""
    reasons = []
    
    job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
    
    # Check skill matches
    matched_skills = [skill for skill in cv_summary['skills'] if skill in job_text]
    if matched_skills:
        reasons.append(f"Skills match: {', '.join(matched_skills[:3])}")
    
    # Check location
    location = job.get('location', '').lower()
    if 'remote' in location:
        reasons.append("Remote work available")
    elif 'egypt' in location or 'cairo' in location:
        reasons.append("Local opportunity")
    
    # Check seniority alignment
    title = job.get('title', '').lower()
    years = cv_summary['years_experience']
    
    if years >= 5 and ('senior' in title or 'lead' in title):
        reasons.append("Seniority level matches")
    elif years < 3 and ('junior' in title or 'entry' in title):
        reasons.append("Entry-level opportunity")
    elif 2 <= years <= 5 and 'senior' not in title and 'junior' not in title:
        reasons.append("Mid-level position")
    
    # Score-based reason
    if score >= 80:
        reasons.insert(0, "Excellent match for your profile")
    elif score >= 60:
        reasons.insert(0, "Good fit for your skills")
    elif score >= 40:
        reasons.insert(0, "Moderate match")
    
    return reasons[:4]  # Return top 4 reasons


async def get_personalized_job_insights(cv_text: str, job: Dict) -> Dict:
    """Get detailed insights on why a specific job matches the CV."""
    
    prompt = f"""Analyze this job opportunity for the candidate.

Candidate CV Summary:
{cv_text[:1500]}

Job Details:
Title: {job.get('title')}
Company: {job.get('company')}
Description: {job.get('description', '')[:800]}

Provide a JSON response with:
{{
  "match_score": 0-100,
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "Apply/Consider/Skip",
  "reasoning": "One sentence explaining the recommendation"
}}
"""
    
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=800,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        
        return json.loads(text)
        
    except Exception as e:
        logger.error(f"Error getting job insights: {e}")
        return {
            "match_score": 50,
            "strengths": ["Unable to analyze"],
            "gaps": [],
            "recommendation": "Review manually",
            "reasoning": "Analysis unavailable"
        }

# Made with Bob
