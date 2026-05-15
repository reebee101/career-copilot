"""project_service.py — Project analysis, GitHub integration, and CV description generation."""
import os
import json
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Optional
import httpx
from groq import Groq
from config import get_settings

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)
MODEL = "llama-3.3-70b-versatile"


def _chat_json(messages: list, max_tokens: int = 2000) -> dict:
    """Helper to get JSON response from Groq."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            messages=messages,
        )
        text = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            import re
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception as e:
        print(f"[Groq JSON] Error: {e}")
        raise


def _chat_text(prompt: str, max_tokens: int = 1000) -> str:
    """Helper to get text response from Groq."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[Groq Text] Error: {e}")
        raise


async def extract_and_analyze_project(zip_content: bytes, filename: str) -> Dict:
    """
    Extract ZIP file, analyze project structure, tech stack, and generate insights.
    Returns comprehensive project analysis.
    """
    # Create temp directory for extraction
    temp_dir = tempfile.mkdtemp()
    zip_path = os.path.join(temp_dir, filename)
    
    try:
        # Write and extract ZIP
        with open(zip_path, 'wb') as f:
            f.write(zip_content)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Analyze project structure
        project_info = _analyze_project_structure(temp_dir)
        
        # Generate AI analysis
        analysis = await _generate_project_analysis(project_info)
        
        return analysis
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)


def _analyze_project_structure(project_path: str) -> Dict:
    """Scan project directory and extract metadata."""
    info = {
        "files": [],
        "directories": [],
        "tech_stack": set(),
        "file_types": {},
        "total_files": 0,
        "total_lines": 0,
        "readme_content": "",
        "package_files": [],
    }
    
    # Common tech indicators
    tech_indicators = {
        "package.json": ["Node.js", "JavaScript", "npm"],
        "requirements.txt": ["Python", "pip"],
        "Pipfile": ["Python", "pipenv"],
        "pyproject.toml": ["Python", "Poetry"],
        "Cargo.toml": ["Rust", "Cargo"],
        "go.mod": ["Go"],
        "pom.xml": ["Java", "Maven"],
        "build.gradle": ["Java", "Gradle"],
        "Gemfile": ["Ruby", "Bundler"],
        "composer.json": ["PHP", "Composer"],
        "Dockerfile": ["Docker"],
        "docker-compose.yml": ["Docker Compose"],
        ".github/workflows": ["GitHub Actions", "CI/CD"],
        "tsconfig.json": ["TypeScript"],
        "angular.json": ["Angular"],
        "next.config.js": ["Next.js"],
        "vite.config": ["Vite"],
        "webpack.config": ["Webpack"],
    }
    
    # File extension to language mapping
    ext_to_lang = {
        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
        ".jsx": "React", ".tsx": "React/TypeScript", ".java": "Java",
        ".cpp": "C++", ".c": "C", ".cs": "C#", ".go": "Go",
        ".rs": "Rust", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
        ".kt": "Kotlin", ".scala": "Scala", ".r": "R", ".m": "MATLAB",
        ".sql": "SQL", ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
        ".vue": "Vue.js", ".dart": "Dart", ".sh": "Shell", ".yml": "YAML",
        ".json": "JSON", ".xml": "XML", ".md": "Markdown",
    }
    
    for root, dirs, files in os.walk(project_path):
        # Skip common ignore directories
        dirs[:] = [d for d in dirs if d not in {
            'node_modules', '__pycache__', '.git', 'venv', 'env',
            'dist', 'build', '.next', 'target', 'bin', 'obj'
        }]
        
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_path)
            info["files"].append(rel_path)
            info["total_files"] += 1
            
            # Check tech indicators
            for indicator, techs in tech_indicators.items():
                if indicator in rel_path.lower():
                    info["tech_stack"].update(techs)
                    if file in ["package.json", "requirements.txt", "Pipfile", "Cargo.toml", "go.mod"]:
                        info["package_files"].append(rel_path)
            
            # Track file types
            ext = Path(file).suffix.lower()
            if ext:
                info["file_types"][ext] = info["file_types"].get(ext, 0) + 1
                if ext in ext_to_lang:
                    info["tech_stack"].add(ext_to_lang[ext])
            
            # Read README
            if file.lower() in ["readme.md", "readme.txt", "readme"]:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        info["readme_content"] = f.read()[:3000]  # First 3000 chars
                except:
                    pass
            
            # Count lines for code files
            if ext in ext_to_lang:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        info["total_lines"] += len(f.readlines())
                except:
                    pass
    
    info["tech_stack"] = list(info["tech_stack"])
    return info


async def _generate_project_analysis(project_info: Dict) -> Dict:
    """Use Groq AI to analyze project and generate CV-ready description."""
    
    system_prompt = """You are a senior software engineer and technical writer. Analyze this project and generate a professional, CV-ready description.

CRITICAL RULES:
- Focus on IMPACT and RESULTS, not just features
- Use action verbs: Built, Developed, Implemented, Designed, Architected, Optimized
- Include specific metrics where possible (e.g., "Reduced load time by 40%", "Handles 10K+ requests/day")
- Highlight technical complexity and problem-solving
- Make it ATS-friendly with relevant keywords
- Be honest - don't exaggerate or invent capabilities

Return a JSON object with EXACTLY these keys:
{
  "project_name": "string - inferred from structure or README",
  "project_type": "string - one of: Web App, Mobile App, API/Backend, CLI Tool, Library/Package, Data Science, ML/AI, DevOps, Game, Desktop App, Other",
  "tech_stack": ["array of main technologies used"],
  "complexity": "string - one of: Beginner, Intermediate, Advanced, Expert",
  "cv_description": "string - 2-3 sentences, CV-ready format with action verbs and impact",
  "bullet_points": ["array of 3-5 CV bullet points with metrics and impact"],
  "key_features": ["array of 3-5 main features/capabilities"],
  "technical_highlights": ["array of 2-3 impressive technical aspects"],
  "estimated_impact": "string - realistic business/user impact statement",
  "keywords": ["array of ATS keywords relevant to this project"],
  "github_readme_summary": "string - 2-3 sentences for GitHub README intro"
}"""

    user_content = f"""Analyze this project:

File Structure:
- Total files: {project_info['total_files']}
- Total lines of code: {project_info['total_lines']}
- File types: {json.dumps(project_info['file_types'], indent=2)}
- Detected technologies: {', '.join(project_info['tech_stack'])}

Key files found:
{chr(10).join(project_info['files'][:30])}  

README content (if available):
{project_info['readme_content'][:2000] if project_info['readme_content'] else 'No README found'}

Generate a comprehensive, honest analysis suitable for a professional CV."""

    return _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ], max_tokens=2000)


async def create_github_repo(
    repo_name: str,
    description: str,
    readme_content: str,
    is_private: bool = False
) -> Dict:
    """
    Create a GitHub repository using the GitHub API.
    Requires GITHUB_TOKEN in settings.
    """
    if not settings.github_token:
        raise ValueError("GitHub token not configured. Set GITHUB_TOKEN in .env")
    
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    # Create repository
    async with httpx.AsyncClient() as client:
        # Create repo
        create_payload = {
            "name": repo_name,
            "description": description,
            "private": is_private,
            "auto_init": False  # We'll add README separately
        }
        
        response = await client.post(
            "https://api.github.com/user/repos",
            headers=headers,
            json=create_payload,
            timeout=30.0
        )
        
        if response.status_code != 201:
            error_msg = response.json().get("message", "Unknown error")
            raise Exception(f"Failed to create GitHub repo: {error_msg}")
        
        repo_data = response.json()
        repo_url = repo_data["html_url"]
        
        # Add README file
        readme_payload = {
            "message": "Initial commit: Add README",
            "content": _base64_encode(readme_content)
        }
        
        readme_response = await client.put(
            f"https://api.github.com/repos/{repo_data['full_name']}/contents/README.md",
            headers=headers,
            json=readme_payload,
            timeout=30.0
        )
        
        return {
            "repo_url": repo_url,
            "repo_name": repo_data["name"],
            "full_name": repo_data["full_name"],
            "clone_url": repo_data["clone_url"],
            "created": True
        }


def _base64_encode(content: str) -> str:
    """Base64 encode string for GitHub API."""
    import base64
    return base64.b64encode(content.encode()).decode()


async def generate_github_readme(project_analysis: Dict, project_name: str) -> str:
    """Generate a professional GitHub README based on project analysis."""
    
    prompt = f"""Generate a professional, comprehensive GitHub README.md for this project:

Project Name: {project_name}
Type: {project_analysis.get('project_type', 'Software Project')}
Tech Stack: {', '.join(project_analysis.get('tech_stack', []))}

Description: {project_analysis.get('cv_description', '')}

Key Features:
{chr(10).join('- ' + f for f in project_analysis.get('key_features', []))}

Technical Highlights:
{chr(10).join('- ' + h for h in project_analysis.get('technical_highlights', []))}

Create a README with these sections:
1. Title and brief description
2. Features (bullet points)
3. Tech Stack
4. Installation/Setup (generic instructions)
5. Usage (basic examples)
6. Technical Architecture (if complex)
7. Future Improvements
8. License (MIT)

Make it professional, clear, and engaging. Use proper markdown formatting."""

    return _chat_text(prompt, max_tokens=1500)


async def integrate_project_into_cv(
    cv_text: str,
    project_analysis: Dict,
    project_url: Optional[str] = None
) -> Dict:
    """
    Rewrite CV to include the new project with proper formatting and impact.
    Returns updated CV text and analysis.
    """
    
    system_prompt = """You are an expert CV writer. Integrate this new project into the candidate's CV.

CRITICAL RULES:
- Add the project to the "Projects" section (create one if it doesn't exist)
- Use the exact bullet points provided, with proper formatting
- Include the GitHub URL if provided
- Maintain the CV's existing style and formatting
- Ensure the project fits naturally with existing content
- Update the summary/objective to mention this project if it's significant
- Keep all existing content intact, just add the new project

Return a JSON object with:
{
  "updated_cv_text": "string - full CV text with project integrated",
  "project_section": "string - just the new project section for preview",
  "summary_updated": boolean - whether summary was updated,
  "changes_made": ["array of strings describing what was changed"]
}"""

    project_section = f"""
Project: {project_analysis.get('project_name', 'Untitled Project')}
{f"GitHub: {project_url}" if project_url else ""}
{chr(10).join('• ' + bp for bp in project_analysis.get('bullet_points', []))}
"""

    user_content = f"""Current CV:
{cv_text}

New Project to Add:
{json.dumps(project_analysis, indent=2)}

Project URL: {project_url or 'Not provided'}

Integrate this project naturally into the CV."""

    return _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ], max_tokens=3000)

# Made with Bob
