"""projects.py — Project upload, analysis, GitHub integration, and CV integration."""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.database import get_db, CVProfile, Project
from services.project_service import (
    extract_and_analyze_project,
    create_github_repo,
    generate_github_readme,
    integrate_project_into_cv
)
from services.cv_service import analyze_cv
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()


class CreateGitHubRepoRequest(BaseModel):
    project_id: int
    repo_name: str
    is_private: bool = False


class IntegrateToCVRequest(BaseModel):
    session_id: str
    project_id: int


class UpdateProjectRequest(BaseModel):
    project_id: int
    cv_description: Optional[str] = None
    bullet_points: Optional[list] = None


@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    project_date: str = Form(""),
    is_team_project: bool = Form(False),
    team_size: int = Form(None),
    your_role: str = Form(""),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a project ZIP file, extract and analyze it with user-provided context.
    Returns project analysis with CV-ready description.
    """
    # Validate session exists
    result = await db.execute(select(CVProfile).where(CVProfile.session_id == session_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Session not found. Please upload your CV first.")
    
    # Validate file
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(400, "Only ZIP files are supported.")
    
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(400, "File too large. Max 50MB.")
    
    try:
        # Analyze project
        analysis = await extract_and_analyze_project(content, file.filename)
        
        # Store in database
        # Enhance analysis with user context if provided
        if your_role or project_date or is_team_project:
            context = f"\nUser context: "
            if project_date:
                context += f"Date: {project_date}. "
            if is_team_project:
                context += f"Team project ({team_size} members). "
            if your_role:
                context += f"Your role: {your_role}"
            
            # Re-generate bullets with context
            from services.project_service import _chat_json
            enhanced_prompt = f"""Given this project analysis and user context, regenerate the CV bullet points to be more specific and personalized.

Original analysis: {analysis.get('cv_description', '')}

{context}

Return JSON with:
- cv_description: Updated 2-3 sentence description incorporating the user's specific role
- bullet_points: Array of 3-5 CV bullets highlighting what THIS person specifically did, with metrics

Focus on their individual contributions, not generic project features."""
            
            try:
                enhanced = _chat_json([{"role": "user", "content": enhanced_prompt}], max_tokens=1000)
                analysis['cv_description'] = enhanced.get('cv_description', analysis.get('cv_description'))
                analysis['bullet_points'] = enhanced.get('bullet_points', analysis.get('bullet_points'))
            except:
                pass  # Use original if enhancement fails
        
        project = Project(
            session_id=session_id,
            project_name=analysis.get("project_name", "Untitled Project"),
            project_type=analysis.get("project_type", ""),
            tech_stack=analysis.get("tech_stack", []),
            complexity=analysis.get("complexity", ""),
            cv_description=analysis.get("cv_description", ""),
            bullet_points=analysis.get("bullet_points", []),
            key_features=analysis.get("key_features", []),
            technical_highlights=analysis.get("technical_highlights", []),
            keywords=analysis.get("keywords", []),
            analysis=analysis,
            project_date=project_date,
            is_team_project=is_team_project,
            team_size=team_size,
            your_role=your_role,
        )
        
        db.add(project)
        await db.commit()
        await db.refresh(project)
        
        return {
            "project_id": project.id,
            "project_name": project.project_name,
            "analysis": analysis,
            "message": "Project analyzed successfully. You can now create a GitHub repo or add it to your CV."
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to analyze project: {str(e)}")


@router.get("/list/{session_id}")
async def list_projects(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get all projects for a session."""
    result = await db.execute(
        select(Project)
        .where(Project.session_id == session_id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return {
        "projects": [
            {
                "id": p.id,
                "project_name": p.project_name,
                "project_type": p.project_type,
                "tech_stack": p.tech_stack,
                "complexity": p.complexity,
                "cv_description": p.cv_description,
                "bullet_points": p.bullet_points,
                "github_url": p.github_url,
                "integrated_to_cv": p.integrated_to_cv,
                "created_at": p.created_at.isoformat(),
            }
            for p in projects
        ]
    }


@router.get("/{project_id}")
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed project information."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found.")
    
    return {
        "id": project.id,
        "project_name": project.project_name,
        "project_type": project.project_type,
        "tech_stack": project.tech_stack,
        "complexity": project.complexity,
        "cv_description": project.cv_description,
        "bullet_points": project.bullet_points,
        "key_features": project.key_features,
        "technical_highlights": project.technical_highlights,
        "keywords": project.keywords,
        "github_url": project.github_url,
        "github_repo_name": project.github_repo_name,
        "integrated_to_cv": project.integrated_to_cv,
        "analysis": project.analysis,
        "created_at": project.created_at.isoformat(),
    }


@router.put("/update")
async def update_project(req: UpdateProjectRequest, db: AsyncSession = Depends(get_db)):
    """Update project description or bullet points before adding to CV."""
    result = await db.execute(select(Project).where(Project.id == req.project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found.")
    
    if req.cv_description is not None:
        project.cv_description = req.cv_description
    
    if req.bullet_points is not None:
        project.bullet_points = req.bullet_points
    
    await db.commit()
    await db.refresh(project)
    
    return {
        "message": "Project updated successfully.",
        "project_id": project.id,
        "cv_description": project.cv_description,
        "bullet_points": project.bullet_points,
    }


@router.post("/create-github-repo")
async def create_repo(req: CreateGitHubRepoRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a GitHub repository for the project.
    Requires GITHUB_TOKEN in .env
    """
    result = await db.execute(select(Project).where(Project.id == req.project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found.")
    
    if project.github_url:
        raise HTTPException(400, "GitHub repository already created for this project.")
    
    try:
        # Generate README
        readme = await generate_github_readme(project.analysis, req.repo_name)
        
        # Create repo
        repo_info = await create_github_repo(
            repo_name=req.repo_name,
            description=project.cv_description,
            readme_content=readme,
            is_private=req.is_private
        )
        
        # Update project
        project.github_url = repo_info["repo_url"]
        project.github_repo_name = repo_info["repo_name"]
        
        await db.commit()
        await db.refresh(project)
        
        return {
            "message": "GitHub repository created successfully!",
            "repo_url": repo_info["repo_url"],
            "repo_name": repo_info["repo_name"],
            "clone_url": repo_info["clone_url"],
        }
        
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to create GitHub repo: {str(e)}")


@router.post("/integrate-to-cv")
async def integrate_to_cv(req: IntegrateToCVRequest, db: AsyncSession = Depends(get_db)):
    """
    Add project to CV and regenerate CV with the new project.
    Returns updated CV text and analysis.
    """
    # Get CV profile
    cv_result = await db.execute(select(CVProfile).where(CVProfile.session_id == req.session_id))
    profile = cv_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "CV session not found.")
    
    # Get project
    proj_result = await db.execute(select(Project).where(Project.id == req.project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found.")
    
    if project.session_id != req.session_id:
        raise HTTPException(403, "Project does not belong to this session.")
    
    try:
        # Integrate project into CV
        integration_result = await integrate_project_into_cv(
            cv_text=profile.raw_text,
            project_analysis=project.analysis,
            project_url=project.github_url or None
        )
        
        updated_cv_text = integration_result.get("updated_cv_text", profile.raw_text)
        
        # Re-analyze updated CV
        new_analysis = await analyze_cv(updated_cv_text)
        
        # Update CV profile
        profile.raw_text = updated_cv_text
        profile.analysis = new_analysis
        profile.ats_score = new_analysis.get("ats_score", profile.ats_score)
        
        # Mark project as integrated
        project.integrated_to_cv = True
        
        await db.commit()
        await db.refresh(profile)
        await db.refresh(project)
        
        return {
            "message": "Project successfully added to CV!",
            "session_id": profile.session_id,
            "ats_score": profile.ats_score,
            "ats_score_change": profile.ats_score - (project.analysis.get("ats_score", 0) if "ats_score" in project.analysis else profile.ats_score),
            "project_section": integration_result.get("project_section", ""),
            "changes_made": integration_result.get("changes_made", []),
            "updated_cv_text": updated_cv_text,
            "analysis": new_analysis,
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to integrate project to CV: {str(e)}")


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(404, "Project not found.")
    
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully."}

# Made with Bob
