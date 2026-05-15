# 📦 Projects Feature - Documentation

## Overview

The **Projects** feature allows users to upload project ZIP files, get AI-generated CV-ready descriptions, optionally create GitHub repositories, and seamlessly integrate projects into their CV.

## 🎯 Key Features

### 1. **Intelligent Project Analysis**
- Upload any project as a ZIP file
- AI automatically detects:
  - Tech stack (languages, frameworks, tools)
  - Project type (Web App, API, CLI Tool, ML/AI, etc.)
  - Complexity level (Beginner → Expert)
  - Key features and technical highlights

### 2. **Personalized CV Descriptions**
When uploading, you provide:
- **Project Date**: When you worked on it (e.g., "Jan 2024 - Mar 2024")
- **Team/Solo**: Whether it was a team project and team size
- **Your Specific Role**: What YOU specifically did (most important!)

The AI then generates:
- **CV-ready description**: 2-3 sentences with action verbs and impact
- **Bullet points**: 3-5 bullets highlighting YOUR contributions with metrics
- **Keywords**: ATS-friendly terms for your CV

### 3. **GitHub Integration**
- One-click GitHub repository creation
- Auto-generated professional README
- Public or private repository options
- Direct link to your new repo

### 4. **CV Integration**
- Add project to your CV with one click
- AI rewrites your CV to include the project naturally
- See ATS score change immediately
- Projects marked as "In CV" for tracking

## 🚀 How to Use

### Step 1: Upload Project

1. Go to the **Projects** tab
2. Click "Choose ZIP file"
3. Select your project ZIP

### Step 2: Provide Context (Critical!)

A form will appear asking for:

**Project Date** (optional)
```
Examples:
- Jan 2024 - Mar 2024
- Q1 2024
- Summer 2023
```

**Team Project?** (checkbox)
- If yes, specify team size

**Your Specific Role** (required) ⭐
```
Be specific! Examples:

❌ Bad: "Worked on the backend"
✅ Good: "Built the authentication system and REST API. Implemented JWT tokens and role-based access control. Optimized database queries reducing load time by 40%."

❌ Bad: "Helped with the frontend"
✅ Good: "Designed and implemented the dashboard UI using React. Created reusable component library. Improved page load speed by 35% through code splitting."
```

### Step 3: Review & Edit

After analysis:
- Review the generated CV description
- Edit bullet points if needed
- Add/remove bullets
- Refine wording

### Step 4: Create GitHub Repo (Optional)

1. Click "Create GitHub repo"
2. Enter repository name
3. Choose public/private
4. AI generates professional README
5. Repo created instantly!

**Requirements:**
- Set `GITHUB_TOKEN` in `.env` file
- Token needs `repo` scope
- Get token at: https://github.com/settings/tokens

### Step 5: Add to CV

1. Click "Add to CV"
2. AI integrates project into your CV
3. CV is re-analyzed
4. See your new ATS score!

## 📋 Backend API Endpoints

### `POST /api/projects/upload`
Upload and analyze project ZIP

**Form Data:**
- `file`: ZIP file
- `session_id`: User session
- `project_date`: Optional date string
- `is_team_project`: Boolean
- `team_size`: Integer (if team project)
- `your_role`: String (required)

**Response:**
```json
{
  "project_id": 1,
  "project_name": "E-commerce API",
  "analysis": {
    "project_type": "API/Backend",
    "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
    "complexity": "Advanced",
    "cv_description": "Built a scalable e-commerce REST API...",
    "bullet_points": [
      "Developed RESTful API handling 10K+ requests/day...",
      "Implemented JWT authentication and role-based access...",
      "Optimized database queries reducing response time by 45%"
    ],
    "key_features": [...],
    "technical_highlights": [...],
    "keywords": [...]
  }
}
```

### `GET /api/projects/list/{session_id}`
List all projects for a user

### `GET /api/projects/{project_id}`
Get detailed project info

### `PUT /api/projects/update`
Update project description/bullets

**Body:**
```json
{
  "project_id": 1,
  "cv_description": "Updated description...",
  "bullet_points": ["Updated bullet 1", "Updated bullet 2"]
}
```

### `POST /api/projects/create-github-repo`
Create GitHub repository

**Body:**
```json
{
  "project_id": 1,
  "repo_name": "my-awesome-project",
  "is_private": false
}
```

**Response:**
```json
{
  "message": "GitHub repository created successfully!",
  "repo_url": "https://github.com/username/my-awesome-project",
  "repo_name": "my-awesome-project",
  "clone_url": "https://github.com/username/my-awesome-project.git"
}
```

### `POST /api/projects/integrate-to-cv`
Add project to CV and regenerate

**Body:**
```json
{
  "session_id": "abc123",
  "project_id": 1
}
```

**Response:**
```json
{
  "message": "Project successfully added to CV!",
  "ats_score": 85,
  "ats_score_change": +8,
  "project_section": "...",
  "changes_made": ["Added Projects section", "Updated summary"],
  "updated_cv_text": "...",
  "analysis": {...}
}
```

### `DELETE /api/projects/{project_id}`
Delete a project

## 🔧 Configuration

### Environment Variables

Add to `backend/.env`:

```env
# Required for all features
GROQ_API_KEY=gsk_...

# Optional - for GitHub integration
GITHUB_TOKEN=ghp_...
```

### GitHub Token Setup

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "Career Copilot"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Generate and copy token
6. Add to `.env`: `GITHUB_TOKEN=ghp_your_token_here`

## 💡 Best Practices

### Writing Your Role Description

**Include:**
- Specific technologies you used
- What you built/implemented
- Metrics and impact (%, numbers, time saved)
- Problems you solved

**Example Template:**
```
[Action verb] [what you built] using [technologies].
[Specific feature/improvement] resulting in [metric/impact].
[Another contribution] that [benefit/outcome].
```

**Real Examples:**

```
Backend Developer:
"Architected and implemented microservices-based backend using Node.js and MongoDB. Built authentication service handling 50K+ daily users. Optimized API response times by 60% through caching and query optimization."

Frontend Developer:
"Designed and developed responsive dashboard using React and TypeScript. Created reusable component library reducing development time by 40%. Implemented real-time data visualization with Chart.js."

Full-Stack:
"Built full-stack e-commerce platform using MERN stack. Developed shopping cart, payment integration (Stripe), and admin panel. Deployed on AWS with CI/CD pipeline, achieving 99.9% uptime."

Data Science:
"Developed machine learning model for customer churn prediction using Python and scikit-learn. Achieved 87% accuracy through feature engineering and hyperparameter tuning. Deployed model as REST API serving 1000+ predictions/day."
```

### Project Organization

**Good ZIP structure:**
```
my-project/
├── src/
├── tests/
├── README.md
├── requirements.txt or package.json
├── .gitignore
└── config files
```

**Avoid including:**
- `node_modules/`
- `venv/` or `env/`
- `.git/` folder
- Large binary files
- Sensitive data (API keys, passwords)

## 🎨 UI Components

### Project Card

Shows:
- Project name and type badge
- Complexity badge
- Tech stack tags
- CV description
- Bullet points
- GitHub link (if created)
- "In CV" badge (if integrated)

### Actions Available

- **Edit description**: Modify CV text before adding
- **Create GitHub repo**: One-click repo creation
- **Add to CV**: Integrate into your CV
- **Delete**: Remove project

## 🔍 Technical Details

### Project Analysis Process

1. **ZIP Extraction**: Safely extract to temp directory
2. **File Scanning**: Analyze structure, file types, dependencies
3. **Tech Detection**: Identify languages, frameworks, tools
4. **AI Analysis**: Groq LLaMA generates descriptions
5. **Context Enhancement**: Incorporate user-provided role info
6. **Storage**: Save to database with metadata

### CV Integration Process

1. **Load current CV**: Get user's latest CV text
2. **AI Rewrite**: Groq adds project to Projects section
3. **Re-analyze**: Full CV analysis with new content
4. **Update**: Save updated CV and new ATS score
5. **Mark**: Flag project as integrated

### GitHub Repo Creation

1. **Validate token**: Check GITHUB_TOKEN exists
2. **Generate README**: AI creates professional README
3. **API call**: Create repo via GitHub REST API
4. **Add README**: Commit README.md to repo
5. **Return URL**: Provide repo link to user

## 📊 Database Schema

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    session_id VARCHAR(64),
    project_name VARCHAR(300),
    project_type VARCHAR(100),
    tech_stack JSON,
    complexity VARCHAR(50),
    cv_description TEXT,
    bullet_points JSON,
    key_features JSON,
    technical_highlights JSON,
    keywords JSON,
    github_url VARCHAR(500),
    github_repo_name VARCHAR(200),
    analysis JSON,
    integrated_to_cv BOOLEAN,
    -- User metadata
    project_date VARCHAR(100),
    is_team_project BOOLEAN,
    team_size INTEGER,
    your_role TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

## 🐛 Troubleshooting

### "GitHub token not configured"
- Add `GITHUB_TOKEN` to `.env`
- Restart backend server
- Verify token has `repo` scope

### "Project upload failed"
- Check ZIP file size (max 50MB)
- Ensure ZIP is valid and not corrupted
- Check backend logs for details

### "Failed to integrate project to CV"
- Ensure CV is uploaded first
- Check session_id is valid
- Verify Groq API key is set

### Poor CV descriptions
- Provide more detail in "Your Role" field
- Include specific metrics and technologies
- Be clear about YOUR contributions vs team's

## 🚀 Future Enhancements

- [ ] Support for GitHub repo push (not just creation)
- [ ] Multiple project comparison
- [ ] Project templates for common types
- [ ] Automatic metric extraction from code
- [ ] Integration with LinkedIn
- [ ] Project portfolio page generation

## 📝 Example Workflow

```
1. User uploads "ecommerce-api.zip"
2. Fills form:
   - Date: "Jan 2024 - Mar 2024"
   - Team: Yes, 3 members
   - Role: "Built authentication and payment systems..."
3. AI analyzes → generates CV bullets
4. User reviews, edits one bullet
5. Clicks "Create GitHub repo"
   - Repo created: github.com/user/ecommerce-api
6. Clicks "Add to CV"
   - CV updated, ATS score: 72 → 80 (+8)
7. Done! Project in CV with GitHub link
```

---

**Need help?** Check the main README or open an issue on GitHub.