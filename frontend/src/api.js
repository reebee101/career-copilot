const BASE = '/api'

export async function uploadCV(file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`${BASE}/cv/upload`, { method: 'POST', body: fd })
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Upload failed') }
  return r.json()
}

export async function getProfile(sessionId) {
  const r = await fetch(`${BASE}/cv/profile/${sessionId}`)
  if (!r.ok) throw new Error('Profile not found')
  return r.json()
}

export async function scoreAgainstJD(sessionId, jdText, company = '', role = '') {
  const r = await fetch(`${BASE}/cv/score-against-jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, jd_text: jdText, company, role })
  })
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Scoring failed') }
  return r.json()
}

export async function generateCoverLetter(sessionId, jdText, company, role) {
  const r = await fetch(`${BASE}/cv/cover-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, jd_text: jdText, company, role })
  })
  if (!r.ok) throw new Error('Cover letter generation failed')
  return r.json()
}

export async function getInterviewPrep(sessionId, role, company = '') {
  const r = await fetch(`${BASE}/cv/interview-prep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, role, company })
  })
  if (!r.ok) throw new Error('Interview prep failed')
  return r.json()
}

export async function submitPracticeFeedback(sessionId, question, userAnswer, role) {
  const r = await fetch(`${BASE}/interview/practice-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question, user_answer: userAnswer, role })
  })
  if (!r.ok) throw new Error('Feedback failed')
  return r.json()
}

export async function fetchJobs(remoteOnly = false, country = null, limit = 100) {
  let url = `${BASE}/jobs/?limit=${limit}`
  if (remoteOnly) url += '&remote_only=true'
  if (country) url += `&country=${encodeURIComponent(country)}`
  const r = await fetch(url)
  if (!r.ok) throw new Error('Failed to fetch jobs')
  return r.json()
}

export async function refreshJobs(cvSkills = []) {
  let url = `${BASE}/jobs/refresh`
  if (cvSkills && cvSkills.length > 0) {
    url += `?cv_skills=${encodeURIComponent(cvSkills.join(','))}`
  }
  const r = await fetch(url)
  return r.json()
}

export async function getRawCV(sessionId) {
  const r = await fetch(`${BASE}/cv/raw/${sessionId}`)
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to load CV') }
  return r.json()
}

export async function editCV(sessionId, rawText) {
  const r = await fetch(`${BASE}/cv/edit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, raw_text: rawText })
  })
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to save CV') }
  return r.json()
}

export async function listApplications(sessionId) {
  const r = await fetch(`${BASE}/applications/?session_id=${sessionId}`)
  if (!r.ok) throw new Error('Failed to load applications')
  return r.json()
}

export async function createApplication(sessionId, company, role, applyUrl = '', jdText = '') {
  const r = await fetch(`${BASE}/applications/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, company, role, apply_url: applyUrl, jd_text: jdText })
  })
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to create application') }
  return r.json()
}

export async function updateApplicationStatus(appId, status, notes = '') {
  const r = await fetch(`${BASE}/applications/${appId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  })
  if (!r.ok) throw new Error('Failed to update status')
  return r.json()
}

export async function deleteApplication(appId) {
  await fetch(`${BASE}/applications/${appId}`, { method: 'DELETE' })
}

export async function triggerAutoApply(sessionId, applicationId, phone = '', linkedinUrl = '') {
  const r = await fetch(`${BASE}/applications/auto-apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, application_id: applicationId, phone, linkedin_url: linkedinUrl })
  })
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Auto-apply failed') }
  return r.json()
}

export async function refreshJobsSync(cvSkills = []) {
  let url = `${BASE}/jobs/refresh-sync`
  if (cvSkills && cvSkills.length > 0) {
    url += `?cv_skills=${encodeURIComponent(cvSkills.join(','))}`
  }
  const r = await fetch(url)
  return r.json()
}
