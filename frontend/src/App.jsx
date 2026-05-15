import { useState, useEffect, useCallback } from 'react'
import {
  Upload, LayoutDashboard, Search, FileText, List, Mic, Award,
  Zap, RefreshCw, ChevronRight, X, Check, AlertCircle, Loader,
  ExternalLink, Bot, Briefcase, TrendingUp, Target, Send,
  PlusCircle, LogIn, LogOut, History, GitCompare, User, Lock, Sparkles, Edit3, Save,
  Download, Calendar, BarChart3, Activity
} from 'lucide-react'
import * as api from './api'

const STATUS_LABELS = {
  saved: 'Saved', applied: 'Applied',
  interview: 'Interview', offer: 'Offer 🎉', rejected: 'Rejected'
}

function ScoreRing({ score, size = 90 }) {
  const r = 36, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#5DAF8B' : score >= 60 ? '#D4956A' : '#D4726A'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="#F0D9E2" strokeWidth="8" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
        <span style={{ fontSize: size>70?20:16, fontWeight:700, color:'var(--text)' }}>{score}</span>
        <span style={{ fontSize:10, color:'var(--text-tertiary)' }}>/ 100</span>
      </div>
    </div>
  )
}

function Spinner() {
  return <Loader size={16} style={{ animation:'spin 1s linear infinite', flexShrink:0 }} />
}

// ── LOCAL AUTH ────────────────────────────────────────────────
const AUTH_KEY = 'cc_users_v2'
function loadUsers() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)||'{}') } catch { return {} } }
function saveUsers(u) { localStorage.setItem(AUTH_KEY, JSON.stringify(u)) }

// ── AUTH SCREEN ───────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return }
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const users = loadUsers()
    await new Promise(r => setTimeout(r, 350))
    if (mode === 'signup') {
      if (users[email]) { setError('Email already registered.'); setLoading(false); return }
      users[email] = { name: name.trim(), password, profiles: [], cvHistory: [], applications: [] }
      saveUsers(users)
      onAuth({ email, userData: users[email] })
    } else {
      const u = users[email]
      if (!u || u.password !== password) { setError('Invalid email or password.'); setLoading(false); return }
      onAuth({ email, userData: u })
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',background:'var(--bg)' }}>
      <div style={{ maxWidth:440,width:'100%' }}>
        {/* Logo */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:'2rem' }}>
          <div style={{ width:48,height:48,background:'linear-gradient(135deg,#C4547A,#D4729A)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(196,84,122,0.35)' }}>
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize:22,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em' }}>Career Copilot</div>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:1 }}>AI job search for every field</div>
          </div>
        </div>

        <div className="card" style={{ padding:'2rem',borderColor:'var(--border)',background:'white' }}>
          <div style={{ display:'flex',gap:0,marginBottom:'1.5rem',background:'var(--border-light)',borderRadius:30,padding:3 }}>
            {[['signup','Create account'],['login','Log in']].map(([m,label]) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex:1,padding:'7px 0',fontSize:13,fontWeight:mode===m?600:400,color:mode===m?'white':'var(--text-secondary)',background:mode===m?'linear-gradient(135deg,#C4547A,#D4729A)':'transparent',border:'none',borderRadius:27,cursor:'pointer',boxShadow:mode===m?'0 2px 8px rgba(196,84,122,0.3)':'none',transition:'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {mode === 'signup' && (
              <div style={{ position:'relative' }}>
                <User size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-tertiary)',pointerEvents:'none' }} />
                <input placeholder="Your name" type="text" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={{ paddingLeft:36 }} />
              </div>
            )}
            <div style={{ position:'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-tertiary)',pointerEvents:'none' }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <input placeholder="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={{ paddingLeft:36 }} />
            </div>
            <div style={{ position:'relative' }}>
              <Lock size={14} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-tertiary)',pointerEvents:'none' }} />
              <input
                placeholder={mode==='signup'?'Password (min 6 chars)':'Password'}
                type={showPass?'text':'password'}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submit()}
                style={{ paddingLeft:36, paddingRight:40 }}
              />
              <button
                type="button"
                onClick={()=>setShowPass(p=>!p)}
                style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',padding:2,display:'flex',alignItems:'center' }}
                tabIndex={-1}
              >
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display:'flex',gap:7,alignItems:'center',padding:'9px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',color:'var(--coral)',fontSize:12,marginTop:10,border:'1px solid #F5D0CD' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width:'100%',marginTop:14,justifyContent:'center',gap:8 }} onClick={submit} disabled={loading}>
            {loading ? <><Spinner /> Processing…</> : mode==='signup' ? <><User size={14}/> Create account</> : <><LogIn size={14}/> Log in</>}
          </button>

          <div style={{ marginTop:'1rem',padding:'12px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--accent2-dark)',border:'1px solid var(--border-blue)' }}>
            <strong>Works for any field:</strong> Engineering, HR, Sales, Marketing, Finance, Design, Operations — upload any CV and get matched jobs + ATS coaching.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── UPLOAD SCREEN ─────────────────────────────────────────────
function UploadScreen({ onUploaded, isReupload=false, prevProfile=null, onBack }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const result = await api.uploadCV(file)
      localStorage.setItem('session_id', result.session_id)
      onUploaded(result)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem',background:'var(--bg)' }}>
      <div style={{ maxWidth:500,width:'100%',textAlign:'center' }}>
        {isReupload && onBack && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom:14 }} onClick={onBack}>← Back</button>
        )}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:'1.75rem' }}>
          <div style={{ width:44,height:44,background:'linear-gradient(135deg,#C4547A,#D4729A)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(196,84,122,0.3)' }}>
            <Sparkles size={22} color="white" />
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:20,fontWeight:700,letterSpacing:'-0.01em' }}>{isReupload?'Upload New CV Version':'Upload Your CV'}</div>
            <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:1 }}>{isReupload?`Previous ATS score: ${prevProfile?.ats_score||0}/100`:'Works for any profession'}</div>
          </div>
        </div>

        <div className="card" style={{ padding:'2rem' }}>
          <div
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0])}}
            onClick={()=>document.getElementById('cv-input').click()}
            style={{ border:`2px dashed ${dragging?'var(--accent)':'var(--border)'}`,borderRadius:12,padding:'2.5rem 1.5rem',cursor:'pointer',background:dragging?'var(--accent-light)':'var(--surface-pink)',transition:'all 0.15s' }}>
            {loading ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                <div style={{ width:50,height:50,background:'var(--accent-light)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Loader size={24} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }} />
                </div>
                <div style={{ fontWeight:600,color:'var(--text)' }}>Analyzing your CV…</div>
                <div style={{ color:'var(--text-secondary)',fontSize:13 }}>Scoring ATS, extracting skills, rewriting bullets…</div>
              </div>
            ) : (
              <>
                <div style={{ width:56,height:56,background:'var(--accent-light)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px' }}>
                  <Upload size={24} color="var(--accent)" />
                </div>
                <div style={{ fontWeight:600,marginBottom:4,color:'var(--text)' }}>Drop your CV here</div>
                <div style={{ color:'var(--text-secondary)',fontSize:13 }}>PDF, DOCX, or TXT · Max 5MB</div>
                <div style={{ marginTop:12,fontSize:12,color:'var(--text-tertiary)' }}>Engineering · HR · Sales · Marketing · Finance · Design · and more</div>
              </>
            )}
          </div>
          <input id="cv-input" type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
          {error && (
            <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',color:'var(--coral)',fontSize:13,marginTop:10,border:'1px solid #F5D0CD' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div style={{ marginTop:'1.25rem',padding:'12px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--accent2-dark)',textAlign:'left',border:'1px solid var(--border-blue)' }}>
            <strong>What happens:</strong> CV parsed → ATS scored → critical gaps found → bullets rewritten → matched against live jobs by field.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── CV COMPARE MODAL ──────────────────────────────────────────
function CVCompareModal({ oldProfile, newProfile, cvHistory, onClose }) {
  const oldScore = oldProfile?.ats_score||0
  const newScore = newProfile?.ats_score||0
  const delta = newScore - oldScore
  const oldAnalysis = oldProfile?.analysis||{}
  const newAnalysis = newProfile?.analysis||{}

  const improvements = []
  if (delta>0) improvements.push(`ATS score improved by ${delta} points`)
  if ((newAnalysis.skills?.length||0) > (oldAnalysis.skills?.length||0))
    improvements.push(`${(newAnalysis.skills?.length||0)-(oldAnalysis.skills?.length||0)} more skills detected`)
  if ((newAnalysis.rewritten_bullets?.length||0)>0)
    improvements.push('New rewritten bullets ready to copy into your CV')

  const toImprove = []
  const newGaps = (newAnalysis.critical_gaps||[])
  if (newGaps.filter(g=>g.severity==='critical').length>0)
    toImprove.push(`Address ${newGaps.filter(g=>g.severity==='critical').length} critical skill gap(s) to boost score further`)
  if (newScore<80) toImprove.push('Add quantified metrics to at least 2 more experience bullets')
  toImprove.push('Tailor your CV summary to match your target job title exactly')

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
      <div className="card" style={{ maxWidth:560,width:'100%',padding:'1.5rem',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <GitCompare size={18} color="var(--accent)" />
            <div style={{ fontWeight:700,fontSize:15 }}>CV Version Comparison</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:24,marginBottom:'1.25rem',padding:'1rem',background:'var(--surface-pink)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:6 }}>Previous (v{cvHistory.length-1})</div>
            <ScoreRing score={oldScore} size={80} />
          </div>
          <ChevronRight size={20} color="var(--text-tertiary)" />
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:6 }}>New (v{cvHistory.length})</div>
            <ScoreRing score={newScore} size={80} />
          </div>
          <div style={{ textAlign:'center',padding:'12px 16px',background:delta>=0?'var(--success-light)':'var(--coral-light)',borderRadius:'var(--radius)' }}>
            <div style={{ fontSize:11,color:delta>=0?'var(--success)':'var(--coral)' }}>Score change</div>
            <div style={{ fontSize:24,fontWeight:700,color:delta>=0?'var(--success)':'var(--coral)' }}>{delta>=0?'+':''}{delta}</div>
          </div>
        </div>
        {improvements.length>0 && (
          <div className="card" style={{ background:'var(--success-light)',marginBottom:10,border:'1px solid #C5E8D6' }}>
            <div style={{ fontSize:12,fontWeight:600,color:'var(--success)',marginBottom:8 }}>✓ What improved</div>
            {improvements.map((item,i)=>(
              <div key={i} style={{ display:'flex',gap:8,fontSize:13,marginBottom:5 }}>
                <Check size={13} color="var(--success)" style={{ flexShrink:0,marginTop:2 }} />{item}
              </div>
            ))}
          </div>
        )}
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--amber)',marginBottom:8 }}>→ Enhance further</div>
          {toImprove.map((item,i)=>(
            <div key={i} style={{ display:'flex',gap:8,fontSize:13,marginBottom:5,color:'var(--text-secondary)' }}>
              <ChevronRight size={13} color="var(--amber)" style={{ flexShrink:0,marginTop:2 }} />{item}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={onClose}>
          <Check size={14}/> Got it — view dashboard
        </button>
      </div>
    </div>
  )
}

// ── EDIT CV ───────────────────────────────────────────────────
// ── AI CV EDITOR ──────────────────────────────────────────────
function EditCV({ sessionId, profile, onSaved }) {
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [newScore, setNewScore] = useState(null)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState('edit') // edit | suggestions | diff
  const [fixingIdx, setFixingIdx] = useState(null)
  const [selectedText, setSelectedText] = useState('')
  const [aiRewrite, setAiRewrite] = useState(null)
  const [loadingRewrite, setLoadingRewrite] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const textareaRef = useState(null)
  const [fontFamily, setFontFamily] = useState('system')
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.8)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const lineCount = text.split('\n').length
  const oldScore = profile?.ats_score || 0

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const r = await api.getRawCV(sessionId)
        setText(r.raw_text || '')
        setOriginalText(r.raw_text || '')
      } catch(e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [sessionId])

  // Auto-save after 5 seconds of no typing
  useEffect(() => {
    if (!autoSaveEnabled || !hasChanges || text.length < 100) return
    const timer = setTimeout(() => {
      save()
    }, 5000)
    return () => clearTimeout(timer)
  }, [text, autoSaveEnabled])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasChanges) save()
      }
      // Ctrl/Cmd + B to make selected text bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        const sel = window.getSelection()?.toString()
        if (sel) setText(prev => prev.replace(sel, `**${sel}**`))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges, text])

  // Live AI suggestions — debounced, fires after 3s of no typing
  useEffect(() => {
    if (!text || text === originalText || text.length < 200) return
    const timer = setTimeout(() => getSuggestions(), 3000)
    return () => clearTimeout(timer)
  }, [text])

  const getSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are an expert CV coach. Analyze this CV and return a JSON array of exactly 5 specific, actionable improvement suggestions.

Each suggestion must be a JSON object with:
- "type": one of "bullet", "missing_section", "keyword", "quantify", "format"  
- "severity": "critical" | "important" | "nice_to_have"
- "title": short title (5 words max)
- "issue": what is wrong (1 sentence)
- "fix": exact text to add or change (be specific, give example)
- "section": which part of CV this applies to

Return ONLY a JSON array, no markdown, no explanation.

CV:
${text.slice(0, 3000)}`
          }]
        })
      })
      const data = await resp.json()
      const raw = data.content?.[0]?.text || '[]'
      const clean = raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
      setAiSuggestions(JSON.parse(clean))
    } catch(e) { console.error('Suggestions error:', e) }
    finally { setLoadingSuggestions(false) }
  }

  const applySuggestion = async (suggestion, idx) => {
    setFixingIdx(idx)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Apply this specific improvement to the CV below. Return ONLY the complete improved CV text, no explanation, no markdown.

Improvement to apply:
Section: ${suggestion.section}
Issue: ${suggestion.issue}
Fix: ${suggestion.fix}

CV:
${text}`
          }]
        })
      })
      const data = await resp.json()
      const improved = data.content?.[0]?.text || text
      setText(improved)
      setAiSuggestions(prev => prev.filter((_, i) => i !== idx))
      setActiveTab('edit')
    } catch(e) { alert('Failed to apply fix: ' + e.message) }
    finally { setFixingIdx(null) }
  }

  const rewriteSelected = async () => {
    const sel = window.getSelection()?.toString() || selectedText
    if (!sel || sel.length < 20) { alert('Select at least one bullet point or sentence to rewrite.'); return }
    setLoadingRewrite(true); setAiRewrite(null)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Rewrite this CV bullet/sentence to be stronger: add action verb, quantify impact, show business value. Return ONLY the rewritten text, nothing else.

Original: "${sel}"

CV context (for reference): ${text.slice(0, 500)}`
          }]
        })
      })
      const data = await resp.json()
      setAiRewrite({ original: sel, improved: data.content?.[0]?.text?.trim() || sel })
    } catch(e) { alert('Rewrite failed: ' + e.message) }
    finally { setLoadingRewrite(false) }
  }

  const applyRewrite = () => {
    if (!aiRewrite) return
    setText(prev => prev.replace(aiRewrite.original, aiRewrite.improved))
    setAiRewrite(null)
  }

  const getDiff = () => {
    const oldLines = originalText.split('\n')
    const newLines = text.split('\n')
    const result = []
    const maxLen = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i] ?? ''
      const n = newLines[i] ?? ''
      if (o === n) result.push({ type: 'same', text: n })
      else if (!o) result.push({ type: 'added', text: n })
      else if (!n) result.push({ type: 'removed', text: o })
      else { result.push({ type: 'removed', text: o }); result.push({ type: 'added', text: n }) }
    }
    return result
  }

  const save = async () => {
    if (text.trim().length < 100) { setError('CV text is too short.'); return }
    setSaving(true); setError(''); setSaved(false); setNewScore(null)
    try {
      const result = await api.editCV(sessionId, text)
      setNewScore(result.ats_score)
      setSaved(true)
      setOriginalText(text)
      onSaved(result)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const scoreDelta = newScore !== null ? newScore - oldScore : null
  const hasChanges = text !== originalText

  const sevColor = { critical: 'var(--coral)', important: 'var(--amber)', nice_to_have: 'var(--accent2)' }
  const sevBg = { critical: 'var(--coral-light)', important: 'var(--amber-light)', nice_to_have: 'var(--accent2-light)' }
  const typeIcon = { bullet: '•', missing_section: '📋', keyword: '🔑', quantify: '📊', format: '📐' }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'4rem',gap:10,color:'var(--text-secondary)' }}>
      <Spinner /> Loading your CV...
    </div>
  )

  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 380px',gap:16,alignItems:'start',height:'calc(100vh - 180px)' }}>
      {/* LEFT — editor */}
      <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8 }}>
          <div style={{ display:'flex',gap:6 }}>
            {['edit','suggestions','diff'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding:'5px 14px',borderRadius:20,border:activeTab===t?'1.5px solid var(--accent)':`1.5px solid var(--border)`,background:activeTab===t?'var(--accent-light)':'transparent',color:activeTab===t?'var(--accent)':'var(--text-secondary)',fontSize:12,fontWeight:activeTab===t?600:400,cursor:'pointer',textTransform:'capitalize' }}>
                {t}{t==='suggestions'&&aiSuggestions.length>0?` (${aiSuggestions.length})`:''}
              </button>
            ))}
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
            <label style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-secondary)',cursor:'pointer' }}>
              <input type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} style={{ cursor:'pointer' }} />
              Auto-save
            </label>
            <span style={{ fontSize:11,color:'var(--text-tertiary)',padding:'2px 6px',background:'var(--border-light)',borderRadius:4 }}>⌘S to save</span>
            <span style={{ fontSize:12,color:'var(--text-tertiary)' }}>{wordCount} words · {lineCount} lines</span>
            {hasChanges && <span style={{ fontSize:11,color:'var(--amber)',fontWeight:500 }}>● Unsaved</span>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving||!hasChanges}>
              {saving?<><Spinner/> Saving…</>:saved?<><Check size={13}/> Saved!</>:<><Save size={13}/> Save</>}
            </button>
          </div>
        </div>

        {/* Score delta after save */}
        {saved && scoreDelta !== null && (
          <div style={{ display:'flex',gap:10,alignItems:'center',padding:'10px 14px',background:scoreDelta>=0?'var(--success-light)':'var(--coral-light)',borderRadius:'var(--radius-sm)',marginBottom:10,border:`1px solid ${scoreDelta>=0?'#C5E8D6':'#F5D0CD'}`,fontSize:13 }}>
            <span style={{ fontSize:18,fontWeight:700,color:scoreDelta>=0?'var(--success)':'var(--coral)' }}>{scoreDelta>=0?'+':''}{scoreDelta}</span>
            <span style={{ color:'var(--text)' }}>ATS score {scoreDelta>=0?'improved':'changed'}: <strong>{oldScore}</strong> → <strong>{newScore}</strong>/100</span>
          </div>
        )}
        {error && (
          <div style={{ display:'flex',gap:8,alignItems:'center',padding:'9px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',marginBottom:10,border:'1px solid #F5D0CD',fontSize:13,color:'var(--coral)' }}>
            <AlertCircle size={13}/> {error}
          </div>
        )}

        {/* Editor */}
        {activeTab==='edit' && (
          <div style={{ flex:1,display:'flex',flexDirection:'column',minHeight:0 }}>
            {/* Editor chrome */}
            <div style={{
              border:'1.5px solid var(--border)',
              borderRadius:'var(--radius)',
              overflow:'hidden',
              boxShadow:'0 2px 12px rgba(196,84,122,0.07)',
              background:'white',
              display:'flex',
              flexDirection:'column',
              height:'100%',
            }}>
              {/* Editor toolbar */}
              <div style={{
                display:'flex',alignItems:'center',gap:8,
                padding:'8px 12px',
                background:'var(--surface-pink)',
                borderBottom:'1px solid var(--border)',
                flexWrap:'wrap',
              }}>
                {/* Fake traffic lights */}
                <div style={{ display:'flex',gap:5,marginRight:6 }}>
                  {['#FF5F57','#FFBD2E','#28C840'].map((c,i) => (
                    <div key={i} style={{ width:11,height:11,borderRadius:'50%',background:c,opacity:0.8 }}/>
                  ))}
                </div>
                
                {/* Font selector */}
                <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}
                  style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer' }}>
                  <option value="system">System</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                  <option value="arial">Arial</option>
                  <option value="times">Times New Roman</option>
                  <option value="georgia">Georgia</option>
                  <option value="courier">Courier</option>
                </select>
                
                {/* Font size */}
                <select value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}
                  style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer',width:55 }}>
                  {[12,13,14,15,16,18].map(s=><option key={s} value={s}>{s}px</option>)}
                </select>
                
                {/* Line height */}
                <select value={lineHeight} onChange={e=>setLineHeight(Number(e.target.value))}
                  style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer',width:50 }}>
                  {[1.4,1.6,1.8,2.0,2.2].map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                
                <div style={{ width:1,background:'var(--border)',height:20 }}/>
                
                {/* Formatting buttons */}
                <div style={{ display:'flex',gap:2 }}>
                  <button onClick={()=>{const sel=window.getSelection()?.toString();if(sel)setText(prev=>prev.replace(sel,`**${sel}**`))}}
                    style={{ width:24,height:24,border:'none',background:'transparent',borderRadius:4,fontSize:12,fontWeight:700,cursor:'pointer',color:'var(--text-secondary)' }} title="Bold (Ctrl+B)">
                    B
                  </button>
                  <button onClick={()=>{const sel=window.getSelection()?.toString();if(sel)setText(prev=>prev.replace(sel,`*${sel}*`))}}
                    style={{ width:24,height:24,border:'none',background:'transparent',borderRadius:4,fontSize:12,fontStyle:'italic',cursor:'pointer',color:'var(--text-secondary)' }} title="Italic">
                    I
                  </button>
                  <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.startsWith('• ')?l:l.trim()?'• '+l:l).join('\n'))}
                    style={{ height:24,padding:'0 8px',border:'none',background:'transparent',borderRadius:4,fontSize:11,cursor:'pointer',color:'var(--text-secondary)' }} title="Add bullets">
                    • List
                  </button>
                  <button onClick={()=>setText(prev=>prev.split('\n').map((l,i)=>l.match(/^\d+\./)?l:l.trim()?`${i+1}. ${l}`:l).join('\n'))}
                    style={{ height:24,padding:'0 8px',border:'none',background:'transparent',borderRadius:4,fontSize:11,cursor:'pointer',color:'var(--text-secondary)' }} title="Numbered list">
                    1. List
                  </button>
                </div>
                
                <div style={{ width:1,background:'var(--border)',height:20 }}/>
                
                {/* Smart formatting */}
                <div style={{ display:'flex',gap:2 }}>
                  <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.trim()).join('\n'))}
                    style={{ height:24,padding:'0 8px',border:'none',background:'transparent',borderRadius:4,fontSize:10,cursor:'pointer',color:'var(--text-secondary)' }} title="Remove extra spaces">
                    Trim
                  </button>
                  <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.replace(/\s+/g,' ').trim()).join('\n'))}
                    style={{ height:24,padding:'0 8px',border:'none',background:'transparent',borderRadius:4,fontSize:10,cursor:'pointer',color:'var(--text-secondary)' }} title="Fix spacing">
                    Fix Spaces
                  </button>
                  <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.trim()?l.charAt(0).toUpperCase()+l.slice(1):l).join('\n'))}
                    style={{ height:24,padding:'0 8px',border:'none',background:'transparent',borderRadius:4,fontSize:10,cursor:'pointer',color:'var(--text-secondary)' }} title="Capitalize lines">
                    Caps
                  </button>
                </div>
                
                <div style={{ flex:1,textAlign:'center',fontSize:11,color:'var(--text-tertiary)',fontWeight:500,minWidth:100 }}>
                  {wordCount} words
                </div>
              </div>

              {/* Line numbers + textarea */}
              <div style={{ display:'flex',position:'relative',flex:1,minHeight:0,overflow:'hidden' }}>
                {/* Line numbers */}
                <div style={{
                  width:44,
                  padding:'14px 0',
                  background:'var(--surface-pink)',
                  borderRight:'1px solid var(--border-light)',
                  textAlign:'right',
                  userSelect:'none',
                  flexShrink:0,
                  overflowY:'auto',
                  overflowX:'hidden',
                }}>
                  {text.split('\n').map((_,i) => (
                    <div key={i} style={{ fontSize:11,lineHeight:'1.8',paddingRight:8,color:'var(--text-tertiary)',fontFamily:'monospace' }}>
                      {i+1}
                    </div>
                  ))}
                </div>

                {/* Actual textarea */}
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onMouseUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                  onKeyUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                  onScroll={e => {
                    const lineNumbers = e.target.previousElementSibling
                    if (lineNumbers) lineNumbers.scrollTop = e.target.scrollTop
                  }}
                  style={{
                    flex:1,
                    height:'100%',
                    fontFamily: fontFamily==='system'?"'DM Sans', system-ui, sans-serif":
                               fontFamily==='serif'?"Georgia, 'Times New Roman', serif":
                               fontFamily==='mono'?"'Courier New', monospace":
                               fontFamily==='arial'?"Arial, sans-serif":
                               fontFamily==='times'?"'Times New Roman', serif":
                               fontFamily==='georgia'?"Georgia, serif":
                               fontFamily==='courier'?"'Courier New', monospace":
                               "'DM Sans', system-ui, sans-serif",
                    fontSize,
                    lineHeight,
                    padding:'14px 16px',
                    border:'none',
                    outline:'none',
                    background:'white',
                    color:'var(--text)',
                    resize:'none',
                    letterSpacing: fontFamily==='mono'?'0':'0.01em',
                    overflowY:'auto',
                    whiteSpace:'pre-wrap',
                    wordWrap:'break-word',
                  }}
                  spellCheck={true}
                  placeholder="Start typing your CV or paste it here…"
                />
              </div>

              {/* Status bar */}
              <div style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'5px 14px',
                background:'var(--surface-pink)',
                borderTop:'1px solid var(--border-light)',
                fontSize:11,
                color:'var(--text-tertiary)',
              }}>
                <div style={{ display:'flex',gap:14 }}>
                  <span>{wordCount} words</span>
                  <span>{lineCount} lines</span>
                  <span>{text.length.toLocaleString()} chars</span>
                </div>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  {selectedText.length > 0 && <span style={{ color:'var(--accent)' }}>{selectedText.split(/\s+/).filter(Boolean).length} words selected</span>}
                  {hasChanges ? <span style={{ color:'var(--amber)',fontWeight:500 }}>● Unsaved</span> : <span style={{ color:'var(--success)' }}>✓ Saved</span>}
                </div>
              </div>
            </div>
            {/* Rewrite panel */}
            {selectedText.length >= 20 && (
              <div style={{ marginTop:8,padding:'10px 14px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
                <div style={{ fontSize:12,color:'var(--accent-dark)' }}>
                  <strong>Selected:</strong> "{selectedText.slice(0,60)}{selectedText.length>60?'…':''}"
                </div>
                <button className="btn btn-primary btn-sm" onClick={rewriteSelected} disabled={loadingRewrite}>
                  {loadingRewrite?<><Spinner/> Rewriting…</>:<><Sparkles size={12}/> AI Rewrite</>}
                </button>
              </div>
            )}
            {aiRewrite && (
              <div style={{ marginTop:8,padding:'14px',background:'white',borderRadius:'var(--radius)',border:'1.5px solid var(--accent)' }}>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',marginBottom:6 }}>BEFORE</div>
                <div style={{ fontSize:13,color:'var(--text-secondary)',padding:'8px',background:'var(--border-light)',borderRadius:'var(--radius-sm)',marginBottom:10,borderLeft:'2px solid var(--border)' }}>{aiRewrite.original}</div>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--accent)',marginBottom:6 }}>AI REWRITE</div>
                <div style={{ fontSize:13,padding:'8px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:10 }}>{aiRewrite.improved}</div>
                <div style={{ display:'flex',gap:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={applyRewrite}><Check size={12}/> Apply</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAiRewrite(null)}><X size={12}/> Dismiss</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions tab */}
        {activeTab==='suggestions' && (
          <div>
            {loadingSuggestions && (
              <div style={{ display:'flex',gap:8,alignItems:'center',padding:'1rem',color:'var(--text-secondary)',fontSize:13 }}>
                <Spinner/> AI is analyzing your CV changes…
              </div>
            )}
            {!loadingSuggestions && aiSuggestions.length===0 && (
              <div style={{ textAlign:'center',padding:'3rem' }}>
                <div style={{ color:'var(--text-secondary)',marginBottom:12 }}>Make some edits first — AI suggestions appear automatically after 3 seconds of no typing.</div>
                <button className="btn btn-secondary" onClick={getSuggestions}><Sparkles size={14}/> Analyze now</button>
              </div>
            )}
            {aiSuggestions.map((s, i) => (
              <div key={i} className="card" style={{ marginBottom:8,borderLeft:`3px solid ${sevColor[s.severity]||'var(--border)'}` }}>
                <div style={{ display:'flex',gap:8,alignItems:'flex-start',justifyContent:'space-between' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',gap:6,alignItems:'center',marginBottom:6 }}>
                      <span style={{ fontSize:14 }}>{typeIcon[s.type]||'✏️'}</span>
                      <span style={{ fontWeight:600,fontSize:13 }}>{s.title}</span>
                      <span className="badge" style={{ background:sevBg[s.severity],color:sevColor[s.severity],fontSize:10 }}>{s.severity}</span>
                      {s.section && <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{s.section}</span>}
                    </div>
                    <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>{s.issue}</div>
                    <div style={{ fontSize:13,padding:'7px 10px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',fontStyle:'italic' }}>
                      💡 {s.fix}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => applySuggestion(s, i)} disabled={fixingIdx===i} style={{ flexShrink:0,marginTop:2 }}>
                    {fixingIdx===i?<><Spinner/> Fixing…</>:<><Zap size={12}/> Auto-fix</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Diff tab */}
        {activeTab==='diff' && (
          <div className="card" style={{ fontFamily:"'DM Mono',monospace",fontSize:12,lineHeight:1.8,maxHeight:'70vh',overflowY:'auto',background:'white' }}>
            {!hasChanges
              ? <div style={{ color:'var(--text-secondary)',textAlign:'center',padding:'2rem' }}>No changes yet — edit your CV to see what changed.</div>
              : getDiff().map((line, i) => (
                <div key={i} style={{ padding:'1px 8px',background:line.type==='added'?'#E6F5EE':line.type==='removed'?'#FDECEA':'transparent',color:line.type==='added'?'#1A6040':line.type==='removed'?'#7A2A22':'var(--text)',borderLeft:`3px solid ${line.type==='added'?'#5DAF8B':line.type==='removed'?'#D4726A':'transparent'}` }}>
                  {line.type==='added'?'+':line.type==='removed'?'-':' '} {line.text}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* RIGHT — sidebar */}
      <div style={{ display:'flex',flexDirection:'column',gap:10,overflowY:'auto',height:'100%',paddingRight:4 }}>
        {/* Score card */}
        <div className="card" style={{ textAlign:'center',padding:'1.25rem',position:'sticky',top:0,zIndex:10,background:'white' }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Current ATS Score</div>
          <ScoreRing score={newScore ?? oldScore} size={80} />
          {scoreDelta !== null && (
            <div style={{ marginTop:8,fontSize:13,fontWeight:600,color:scoreDelta>=0?'var(--success)':'var(--coral)' }}>
              {scoreDelta>=0?'+':''}{scoreDelta} from edit
            </div>
          )}
        </div>

        {/* Quick tips */}
        <div className="card" style={{ background:'var(--surface-pink)' }}>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:10 }}>Quick wins</div>
          {[
            { icon:'📊', tip:'Add numbers to every bullet — "increased sales by 32%"' },
            { icon:'🔑', tip:'Copy exact keywords from job descriptions you want' },
            { icon:'⚡', tip:'Start every bullet with a strong action verb' },
            { icon:'📋', tip:'Add a Skills section if you don\'t have one' },
            { icon:'🎯', tip:'Tailor your summary to your target job title' },
          ].map((t,i) => (
            <div key={i} style={{ display:'flex',gap:8,marginBottom:8,fontSize:12,color:'var(--text-secondary)',alignItems:'flex-start' }}>
              <span style={{ flexShrink:0 }}>{t.icon}</span>
              <span>{t.tip}</span>
            </div>
          ))}
        </div>

        {/* Gaps from analysis */}
        {profile?.analysis?.critical_gaps?.length > 0 && (
          <div className="card">
            <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:10 }}>Gaps to address</div>
            {(profile.analysis.critical_gaps||[]).slice(0,4).map((g,i) => {
              const skill = typeof g==='object'?g.skill:g
              const sev = typeof g==='object'?g.severity:'moderate'
              return (
                <div key={i} style={{ display:'flex',gap:6,alignItems:'center',marginBottom:6,fontSize:12 }}>
                  <span className={`badge badge-${sev==='critical'?'coral':sev==='moderate'?'amber':'gray'}`} style={{ fontSize:10,flexShrink:0 }}>{sev}</span>
                  <span style={{ color:'var(--text-secondary)' }}>{skill}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="card" style={{ fontSize:11,color:'var(--text-tertiary)' }}>
          <div style={{ fontWeight:600,marginBottom:6 }}>Tips</div>
          <div>• Select text → AI Rewrite button appears</div>
          <div style={{ marginTop:4 }}>• Edit tab → Suggestions tab → see AI fixes</div>
          <div style={{ marginTop:4 }}>• Diff tab → see every line you changed</div>
          <div style={{ marginTop:4 }}>• Save & re-score updates your ATS score</div>
        </div>
      </div>
    </div>
  )
}


// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ profile, applications }) {
  const analysis = profile?.analysis||{}
  const breakdown = analysis.score_breakdown||{}
  const gaps = (analysis.critical_gaps||[]).map(g =>
    typeof g === 'object' ? g : { skill: String(g), severity:'moderate', reason:'' }
  )

  const statCards = [
    { label:'ATS Score', val:profile?.ats_score||0, color:'var(--accent)', bg:'var(--accent-light)' },
    { label:'Applications', val:applications.length, color:'var(--accent2)', bg:'var(--accent2-light)' },
    { label:'Interviews', val:applications.filter(a=>a.status==='interview').length, color:'var(--amber)', bg:'var(--amber-light)' },
    { label:'Offers', val:applications.filter(a=>a.status==='offer').length, color:'var(--success)', bg:'var(--success-light)' },
  ]

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:'1rem' }}>
        {statCards.map(m=>(
          <div key={m.label} className="card" style={{ textAlign:'center',padding:'1.25rem 1rem',background:m.bg,border:`1px solid ${m.color}22` }}>
            <div style={{ fontSize:30,fontWeight:700,color:m.color }}>{m.val}</div>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:10,marginBottom:'1rem' }}>
        <div className="card" style={{ display:'flex',alignItems:'center',gap:16 }}>
          <ScoreRing score={profile?.ats_score||0} />
          <div>
            <div style={{ fontWeight:600,marginBottom:4 }}>ATS Score</div>
            <div style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.5 }}>{analysis.summary||'Upload your CV to get started.'}</div>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Score breakdown</div>
          {Object.entries(breakdown).map(([k,v])=>(
            <div key={k} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:7 }}>
              <div style={{ fontSize:12,width:130,color:'var(--text-secondary)',flexShrink:0,textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</div>
              <div style={{ flex:1,height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ width:`${v}%`,height:'100%',background:v>=70?'var(--accent)':v>=50?'var(--amber)':'var(--coral)',borderRadius:3,transition:'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize:12,fontWeight:600,width:28,textAlign:'right',color:'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Strengths</div>
          {(analysis.strengths||[]).length===0
            ? <div style={{ fontSize:13,color:'var(--text-secondary)' }}>Upload your CV to see strengths.</div>
            : (analysis.strengths||[]).map((s,i)=>(
                <div key={i} style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:7,fontSize:13 }}>
                  <div style={{ width:18,height:18,background:'var(--success-light)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1 }}>
                    <Check size={11} color="var(--success)" />
                  </div>
                  <span>{s}</span>
                </div>
              ))
          }
        </div>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Critical gaps</div>
          {gaps.length===0
            ? <div style={{ fontSize:13,color:'var(--text-secondary)' }}>No gaps found — re-upload CV to refresh.</div>
            : gaps.map((g,i)=>{
                const skill = g.skill||g.name||'Unknown'
                const severity = g.severity||'moderate'
                const reason = g.reason||g.description||''
                const sevVariant = severity==='critical'?'coral':severity==='moderate'?'amber':'gray'
                return (
                  <div key={i} style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,fontSize:13 }}>
                    <span className={`badge badge-${sevVariant}`} style={{ flexShrink:0,marginTop:1 }}>{severity}</span>
                    <div>
                      <div style={{ fontWeight:500 }}>{skill}</div>
                      {reason&&<div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{reason}</div>}
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}

// ── JD ANALYZER ───────────────────────────────────────────────
function JDAnalyzer({ sessionId, onCreateApp }) {
  const [jd,setJd]=useState('')
  const [company,setCompany]=useState('')
  const [role,setRole]=useState('')
  const [result,setResult]=useState(null)
  const [loading,setLoading]=useState(false)
  const [coverLetter,setCoverLetter]=useState('')
  const [loadingCL,setLoadingCL]=useState(false)
  const [saved,setSaved]=useState(false)
  const [activeTab,setActiveTab]=useState('match')

  const analyze=async()=>{
    if(!jd.trim()) return
    if(jd.trim().length < 100){
      alert('Please paste a real job description (at least 100 characters). The more detail you provide, the more accurate the analysis.')
      return
    }
    setLoading(true);setResult(null);setCoverLetter('');setSaved(false)
    try { setResult(await api.scoreAgainstJD(sessionId,jd,company,role)) }
    catch(e){
      if(e.message&&e.message.includes('Session not found')){
        alert('Your session expired — please re-upload your CV using the "New CV" button in the sidebar.')
      } else {
        alert('JD analysis failed: '+e.message)
      }
    }
    finally { setLoading(false) }
  }
  const genCL=async()=>{
    setLoadingCL(true)
    try { const r=await api.generateCoverLetter(sessionId,jd,company,role); setCoverLetter(r.cover_letter) }
    catch(e){ alert(e.message) }
    finally { setLoadingCL(false) }
  }
  const saveApp=async()=>{
    try { await onCreateApp(company,role,'',jd); setSaved(true) }
    catch(e){ alert(e.message) }
  }

  const tabs=[{id:'match',label:'Match Analysis'},{id:'rewrite',label:'Rewritten CV'},{id:'cover',label:'Cover Letter'}]
  const matchColor=s=>s>=80?'var(--success)':s>=65?'var(--amber)':'var(--coral)'

  return (
    <div>
      <div className="card" style={{ marginBottom:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
          <input placeholder="Company name" value={company} onChange={e=>setCompany(e.target.value)} />
          <input placeholder="Role title (any field)" value={role} onChange={e=>setRole(e.target.value)} />
        </div>
        <textarea placeholder="Paste the full job description here…" value={jd} onChange={e=>setJd(e.target.value)} style={{ minHeight:140,marginBottom:10 }} />
        <button className="btn btn-primary" onClick={analyze} disabled={!jd.trim()||loading}>
          {loading?<><Spinner/> Analyzing…</>:<><Target size={14}/> Score & rewrite CV for this role</>}
        </button>
      </div>
      {result&&(
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'120px 1fr',gap:10,marginBottom:10 }}>
            <div className="card" style={{ textAlign:'center',padding:'1.25rem 1rem',background:'var(--surface-pink)' }}>
              <ScoreRing score={result.match_score} size={80} />
              <div style={{ fontWeight:600,marginTop:8,fontSize:13,color:matchColor(result.match_score) }}>{result.verdict}</div>
            </div>
            <div className="card">
              <div style={{ fontWeight:600,marginBottom:8 }}>Application strategy</div>
              <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:10,lineHeight:1.6 }}>{result.application_strategy}</div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={genCL} disabled={loadingCL}>
                  {loadingCL?<><Spinner/> Generating…</>:<><FileText size={13}/> Cover Letter</>}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={saveApp} disabled={saved}>
                  {saved?<><Check size={13}/> Saved!</>:<><List size={13}/> Save to Tracker</>}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display:'flex',gap:6,marginBottom:10 }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                style={{ padding:'6px 16px',borderRadius:30,border:activeTab===t.id?'1.5px solid var(--accent)':'1.5px solid var(--border)',background:activeTab===t.id?'var(--accent-light)':'transparent',color:activeTab===t.id?'var(--accent)':'var(--text-secondary)',fontSize:12,fontWeight:activeTab===t.id?600:400,cursor:'pointer',transition:'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
          {activeTab==='match'&&(
            <div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
                <div className="card">
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Matched keywords</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.matched_keywords||[]).map((k,i)=><span key={i} className="badge badge-green">{k}</span>)}</div>
                </div>
                <div className="card">
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Missing keywords</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.missing_keywords||[]).map((k,i)=><span key={i} className="badge badge-coral">{k}</span>)}</div>
                </div>
              </div>
              <div className="card">
                <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Tailored bullets to add</div>
                {(result.tailored_bullets||[]).map((b,i)=>(
                  <div key={i} style={{ fontSize:13,padding:'8px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:6 }}>• {b}</div>
                ))}
              </div>
            </div>
          )}
          {activeTab==='rewrite'&&result.rewritten_cv_sections&&(
            <div>
              <div className="card" style={{ marginBottom:10 }}>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Rewritten summary for this role</div>
                <div style={{ fontSize:13,lineHeight:1.7,padding:'10px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)' }}>
                  {result.rewritten_cv_sections.summary}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }} onClick={()=>navigator.clipboard.writeText(result.rewritten_cv_sections.summary)}>Copy</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div className="card">
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Highlight these skills</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.rewritten_cv_sections.skills_to_highlight||[]).map((s,i)=><span key={i} className="badge badge-pink">{s}</span>)}</div>
                </div>
                <div className="card">
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Learn before applying</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.rewritten_cv_sections.skills_to_add||[]).map((s,i)=><span key={i} className="badge badge-amber">{s}</span>)}</div>
                </div>
              </div>
            </div>
          )}
          {activeTab==='cover'&&(
            <div className="card">
              {coverLetter?(
                <>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase' }}>Cover letter</div>
                    <button className="btn btn-ghost btn-sm" onClick={()=>navigator.clipboard.writeText(coverLetter)}>Copy</button>
                  </div>
                  <div style={{ fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',color:'var(--text)' }}>{coverLetter}</div>
                </>
              ):(
                <div style={{ textAlign:'center',padding:'2rem' }}>
                  <button className="btn btn-primary" onClick={genCL} disabled={loadingCL}>
                    {loadingCL?<><Spinner/> Generating…</>:<><FileText size={14}/> Generate Cover Letter</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── JOBS BOARD ────────────────────────────────────────────────
function JobsBoard({ sessionId, profile, onCreateApp }) {
  const [jobs,setJobs]=useState([])
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [selected,setSelected]=useState(null)
  const [region,setRegion]=useState('egypt')

  // Common skill abbreviations/aliases for better matching
  const SKILL_ALIASES={
    'machine learning':['ml'],'artificial intelligence':['ai'],'natural language processing':['nlp'],
    'deep learning':['dl'],'computer vision':['cv'],'business intelligence':['bi'],
    'human resources':['hr'],'project management':['pm','pmp'],'customer relationship management':['crm'],
    'enterprise resource planning':['erp'],'search engine optimization':['seo'],
    'user experience':['ux'],'user interface':['ui'],'application programming interface':['api'],
    'javascript':['js'],'typescript':['ts'],'python':['py'],'kubernetes':['k8s'],
    'continuous integration':['ci'],'continuous deployment':['cd'],'amazon web services':['aws'],
    'google cloud platform':['gcp'],'microsoft azure':['azure'],'structured query language':['sql'],
    'postgresql':['postgres'],'mongodb':['mongo'],'react':['reactjs','react.js'],
    'node':['nodejs','node.js'],'power bi':['powerbi'],'microsoft office':['ms office','office 365'],
  }

  const scoreJob=useCallback((job,skills,profileSummary)=>{
    const title=(job.title||'').toLowerCase()
    const desc=(job.description_full||job.description||'').toLowerCase()
    const jd=title+' '+desc

    // No skills yet — show all jobs neutrally
    if(!skills||skills.length===0) return 55

    // Build expanded skill set including aliases and tokens
    const expandedSkills=new Set()
    skills.forEach(s=>{
      const sl=s.toLowerCase().trim()
      expandedSkills.add(sl)
      // Add aliases
      const aliases=SKILL_ALIASES[sl]||[]
      aliases.forEach(a=>expandedSkills.add(a))
      // Also add individual words for multi-word skills
      sl.split(/[\s/,+.-]+/).filter(t=>t.length>2).forEach(t=>expandedSkills.add(t))
    })

    // 1. Score each skill — title match = 3pts, desc match = 1pt
    let titlePts=0, descPts=0, matched=0
    expandedSkills.forEach(skill=>{
      if(title.includes(skill)){ titlePts+=3; matched++ }
      else if(jd.includes(skill)){ descPts+=1; matched++ }
    })
    const total=Math.max(expandedSkills.size,1)
    // Scale: if 40%+ skills match → 60+ score; 20%+ → 40+ score
    const matchRatio=matched/total
    const skillScore=Math.min(65, Math.round(matchRatio*65 + Math.min(titlePts*2,20)))

    // 2. Title ↔ summary semantic overlap
    const summaryWords=(profileSummary||'').toLowerCase().split(/\W+/).filter(w=>w.length>3)
    const titleWords=title.split(/\W+/).filter(w=>w.length>3)
    const overlap=titleWords.filter(w=>summaryWords.some(sw=>sw===w||sw.includes(w)||w.includes(sw))).length
    const titleScore=Math.min(25, overlap*9)

    // 3. Seniority penalty (soft — only penalise when clear mismatch)
    const seniorW=['senior','lead','principal','director','head','chief','vp']
    const juniorW=['junior','graduate','entry level','trainee']
    const cvSenior=summaryWords.some(w=>seniorW.includes(w))
    const cvJunior=summaryWords.some(w=>juniorW.some(j=>j.includes(w)))
    let penalty=0
    if(cvSenior&&juniorW.some(w=>title.includes(w))) penalty=10
    if(cvJunior&&seniorW.some(w=>title.includes(w))) penalty=8

    // 4. Recency bonus
    const posted=job.posted_at?new Date(job.posted_at):null
    const fresh=posted&&(Date.now()-posted.getTime())<14*24*3600*1000
    const ageBonus=fresh?5:0

    const final=Math.max(15, Math.min(99, Math.round(skillScore+titleScore+ageBonus-penalty)))
    return final
  },[])

  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const remoteOnly=region==='remote'
      // For egypt tab, let the backend do the filtering — don't pass country for worldwide/remote
      const country=region==='egypt'?'egypt':null
      const rawJobs=await api.fetchJobs(remoteOnly,country)
      const skills=profile?.analysis?.skills||[]
      const summary=profile?.analysis?.summary||''
      const scored=rawJobs
        .map(job=>({...job,match_score:scoreJob(job,skills,summary)}))
        // Backend sets job.country = 'eg' | 'remote' | 'worldwide'
        .filter(job=>{
          if(region==='egypt') return job.country==='eg'  // strict: only Egypt jobs
          if(region==='remote') return job.remote===true
          return true  // worldwide: show all
        })
        // Show everything — let match score do the ranking, don't hide low-match jobs
        .sort((a,b)=>b.match_score-a.match_score)
      setJobs(scored)
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  },[region,profile,scoreJob])

  useEffect(()=>{load()},[load])

  const refresh=async()=>{
    setRefreshing(true)
    try {
      await fetch('/api/jobs/clear-demos', { method: 'DELETE' })
      const skills=profile?.analysis?.skills||[]
      await api.refreshJobsSync(skills)
    } catch(e){ console.error(e) }
    await load()
    setRefreshing(false)
  }

  const srcBadge={wuzzuf:'badge-pink',linkedin:'badge-blue',adzuna:'badge-green',google_jobs:'badge-green',remotive:'badge-green',arbeitnow:'badge-purple',indeed:'badge-amber',glassdoor:'badge-green',jsearch:'badge-blue',demo:'badge-gray'}
  const matchColor=s=>s>=85?'var(--success)':s>=70?'var(--amber)':'var(--coral)'

  return (
    <div style={{ display:'grid',gridTemplateColumns:selected?'1fr 1.3fr':'1fr',gap:10 }}>
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:10,flexWrap:'wrap' }}>
          {[{value:'egypt',label:'🇪🇬 Egypt'},{value:'remote',label:'🌐 Remote'},{value:'worldwide',label:'🌍 Worldwide'}].map(opt=>(
            <button key={opt.value} onClick={()=>setRegion(opt.value)}
              style={{ padding:'6px 14px',borderRadius:30,border:region===opt.value?'1.5px solid var(--accent)':'1.5px solid var(--border)',background:region===opt.value?'var(--accent-light)':'transparent',color:region===opt.value?'var(--accent)':'var(--text-secondary)',fontSize:12,fontWeight:region===opt.value?600:400,cursor:'pointer',transition:'all 0.15s' }}>
              {opt.label}
            </button>
          ))}
          <div style={{ marginLeft:'auto',fontSize:12,color:'var(--text-secondary)' }}>
            {!loading&&<span>{jobs.length} jobs · ranked by fit</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
            {refreshing?'Refreshing…':'Refresh'}
          </button>
        </div>
        {loading
          ? <div style={{ textAlign:'center',padding:'4rem',color:'var(--text-secondary)' }}><Spinner/></div>
          : jobs.length===0
            ? <div style={{ textAlign:'center',padding:'3rem' }}>
                <div style={{ color:'var(--text-secondary)',marginBottom:12 }}>No jobs found yet.</div>
                <button className="btn btn-primary" onClick={refresh} disabled={refreshing}>
                  {refreshing?<><Spinner/> Fetching jobs…</>:<><RefreshCw size={13}/> Fetch jobs now</>}
                </button>
              </div>
            : jobs.map(job=>(
                <div key={job.id} className="card" style={{ marginBottom:8,cursor:'pointer',border:selected?.id===job.id?'1.5px solid var(--accent)':'1px solid var(--border)',transition:'border 0.15s' }}
                  onClick={()=>setSelected(selected?.id===job.id?null:job)}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6 }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:600,marginBottom:2 }}>{job.title}</div>
                      <div style={{ fontSize:13,color:'var(--text-secondary)' }}>{job.company} · {job.location}</div>
                      {(job.salary_min||job.salary_max)&&<div style={{ fontSize:12,color:'var(--accent)',marginTop:4,fontWeight:500 }}>{job.salary_min&&job.salary_max?`${Math.round(job.salary_min/1000)}k – ${Math.round(job.salary_max/1000)}k`:''}</div>}
                    </div>
                    <div style={{ display:'flex',gap:5,flexShrink:0,flexDirection:'column',alignItems:'flex-end' }}>
                      {job.remote&&<span className="badge badge-green">Remote</span>}
                      <span className={`badge ${srcBadge[job.source]||'badge-gray'}`}>{job.source}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ flex:1,height:5,background:'var(--border-light)',borderRadius:3,overflow:'hidden' }}>
                      <div style={{ width:`${job.match_score}%`,height:'100%',background:matchColor(job.match_score),borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:11,fontWeight:600,color:matchColor(job.match_score),flexShrink:0 }}>{job.match_score}% match</span>
                  </div>
                  <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{job.description}</div>
                </div>
              ))
        }
      </div>
      {selected&&(
        <div className="card" style={{ height:'fit-content',position:'sticky',top:10,borderColor:'var(--border)' }}>
          <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
            <div>
              <div style={{ fontWeight:700,fontSize:15 }}>{selected.title}</div>
              <div style={{ color:'var(--text-secondary)',marginTop:2,fontSize:13 }}>{selected.company} · {selected.location}</div>
              <div style={{ marginTop:6,display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ flex:1,height:5,background:'var(--border-light)',borderRadius:3,overflow:'hidden',maxWidth:120 }}>
                  <div style={{ width:`${selected.match_score}%`,height:'100%',background:matchColor(selected.match_score) }} />
                </div>
                <span style={{ fontSize:12,fontWeight:600,color:matchColor(selected.match_score) }}>{selected.match_score}% match</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}><X size={14}/></button>
          </div>
          <div style={{ fontSize:13,lineHeight:1.7,color:'var(--text)',maxHeight:300,overflowY:'auto',marginBottom:12 }}>{selected.description_full||selected.description}</div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={async()=>{await onCreateApp(selected.company,selected.title,selected.apply_url,selected.description_full);alert('Added to tracker!')}}>
              <List size={13}/> Add to Tracker
            </button>
            {selected.apply_url&&(
              <a href={selected.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <ExternalLink size={13}/> Apply
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TRACKER ───────────────────────────────────────────────────
function ApplicationsTracker({ sessionId, applications, onRefresh }) {
  const [autoApplyId,setAutoApplyId]=useState(null)
  const [phone,setPhone]=useState('')
  const [linkedinUrl,setLinkedinUrl]=useState('')
  const [applying,setApplying]=useState(null)
  const [selectedApp,setSelectedApp]=useState(null)
  const [showAdd,setShowAdd]=useState(false)
  const [manualForm,setManualForm]=useState({company:'',role:'',apply_url:'',notes:''})
  const [addingManual,setAddingManual]=useState(false)
  const [showRejectionInsights,setShowRejectionInsights]=useState(false)
  const [rejectionInsights,setRejectionInsights]=useState(null)
  const [loadingInsights,setLoadingInsights]=useState(false)

  const updateStatus=async(appId,status,rejectionData={})=>{
    try{
      await api.updateApplicationStatus(appId,status,rejectionData.rejection_reason||'',rejectionData.rejection_stage||'',rejectionData.rejection_feedback||'')
      onRefresh()
    }catch(e){alert(e.message)}
  }
  
  const loadRejectionInsights=async()=>{
    setLoadingInsights(true)
    try{
      const insights=await api.getRejectionInsights(sessionId)
      setRejectionInsights(insights)
      setShowRejectionInsights(true)
    }catch(e){alert(e.message)}
    finally{setLoadingInsights(false)}
  }
  const deleteApp=async(appId)=>{ if(!confirm('Delete?'))return; try{await api.deleteApplication(appId);onRefresh()}catch(e){alert(e.message)} }
  const doAutoApply=async(appId)=>{
    setApplying(appId)
    try{ const r=await api.triggerAutoApply(sessionId,appId,phone,linkedinUrl); alert(r.message); setAutoApplyId(null); setTimeout(onRefresh,3000) }
    catch(e){ alert(e.message) }
    finally{ setApplying(null) }
  }
  const addManual=async()=>{
    if(!manualForm.company||!manualForm.role) return alert('Company and role required.')
    setAddingManual(true)
    try{ await api.createApplication(sessionId,manualForm.company,manualForm.role,manualForm.apply_url,manualForm.notes); setManualForm({company:'',role:'',apply_url:'',notes:''}); setShowAdd(false); onRefresh() }
    catch(e){ alert(e.message) }
    finally{ setAddingManual(false) }
  }

  const cols=['saved','applied','interview','offer','rejected']
  const byStatus=Object.fromEntries(cols.map(c=>[c,applications.filter(a=>a.status===c)]))
  const colColors={saved:'var(--accent2)',applied:'var(--amber)',interview:'var(--lavender)',offer:'var(--success)',rejected:'var(--coral)'}

  const rejectedCount=applications.filter(a=>a.status==='rejected').length
  
  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        {rejectedCount>0&&(
          <button className="btn btn-secondary btn-sm" onClick={loadRejectionInsights} disabled={loadingInsights}>
            {loadingInsights?<><Spinner/> Loading…</>:<><TrendingUp size={13}/> Learn from {rejectedCount} rejection{rejectedCount>1?'s':''}</>}
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={()=>setShowAdd(true)}><PlusCircle size={13}/> Add manually</button>
      </div>
      <div style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:4 }}>
        {cols.map(col=>(
          <div key={col} style={{ minWidth:200,flex:1 }}>
            <div style={{ fontWeight:600,fontSize:12,color:colColors[col],textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8,display:'flex',alignItems:'center',gap:6 }}>
              {col}<span style={{ background:'var(--border-light)',borderRadius:20,padding:'1px 7px',fontSize:11,color:'var(--text-secondary)',fontWeight:400 }}>{byStatus[col].length}</span>
            </div>
            {byStatus[col].map(app=>(
              <div key={app.id} className="card" style={{ marginBottom:8,fontSize:13,borderTop:`2px solid ${colColors[col]}` }}>
                <div style={{ fontWeight:600,marginBottom:2 }}>{app.company}</div>
                <div style={{ color:'var(--text-secondary)',marginBottom:8 }}>{app.role}</div>
                {app.match_score>0&&<div style={{ fontSize:12,color:'var(--accent)',marginBottom:6 }}>Match: <strong>{app.match_score}%</strong></div>}
                <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedApp(app)}>Details</button>
                  {col==='saved'&&<button className="btn btn-secondary btn-sm" onClick={()=>setAutoApplyId(app.id)}><Zap size={12}/> Auto-apply</button>}
                  {col!=='rejected'&&col!=='offer'&&(
                    <select style={{ fontSize:11,padding:'3px 6px',width:'auto' }} value={app.status} onChange={e=>updateStatus(app.id,e.target.value)}>
                      {cols.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={()=>deleteApp(app.id)}><X size={11}/></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999 }}>
          <div className="card" style={{ maxWidth:440,width:'90%' }}>
            <div style={{ fontWeight:700,fontSize:15,marginBottom:12 }}>Add job manually</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
              <input placeholder="Company name *" value={manualForm.company} onChange={e=>setManualForm(f=>({...f,company:e.target.value}))} />
              <input placeholder="Role / Position *" value={manualForm.role} onChange={e=>setManualForm(f=>({...f,role:e.target.value}))} />
              <input placeholder="Application URL (optional)" value={manualForm.apply_url} onChange={e=>setManualForm(f=>({...f,apply_url:e.target.value}))} />
              <textarea placeholder="Notes (optional)" value={manualForm.notes} onChange={e=>setManualForm(f=>({...f,notes:e.target.value}))} style={{ minHeight:80 }} />
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-primary" onClick={addManual} disabled={addingManual||!manualForm.company||!manualForm.role}>
                {addingManual?<><Spinner/> Adding…</>:<><PlusCircle size={14}/> Add to Tracker</>}
              </button>
              <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {autoApplyId&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999 }}>
          <div className="card" style={{ maxWidth:420,width:'90%' }}>
            <div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>Auto-Apply</div>
            <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:16 }}>Supports LinkedIn Easy Apply, Wuzzuf, and generic forms.</div>
            <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
              <input placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} />
              <input placeholder="LinkedIn URL (optional)" value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} />
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-primary" onClick={()=>doAutoApply(autoApplyId)} disabled={applying===autoApplyId}>
                {applying===autoApplyId?<><Spinner/> Applying…</>:<><Zap size={14}/> Apply now</>}
              </button>
              <button className="btn btn-ghost" onClick={()=>setAutoApplyId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedApp&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999 }}>
          <div className="card" style={{ maxWidth:560,width:'90%',maxHeight:'80vh',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:12 }}>
              <div><div style={{ fontWeight:700,fontSize:15 }}>{selectedApp.company}</div><div style={{ color:'var(--text-secondary)' }}>{selectedApp.role}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedApp(null)}><X size={14}/></button>
            </div>
            {selectedApp.cover_letter&&(
              <><div style={{ fontWeight:600,marginBottom:6 }}>Cover letter</div>
              <div style={{ fontSize:13,lineHeight:1.7,background:'var(--surface-pink)',padding:12,borderRadius:'var(--radius-sm)',marginBottom:12,whiteSpace:'pre-wrap',border:'1px solid var(--border)' }}>{selectedApp.cover_letter}</div></>
            )}
            {selectedApp.tailored_bullets?.length>0&&(
              <><div style={{ fontWeight:600,marginBottom:6 }}>Tailored bullets</div>
              {selectedApp.tailored_bullets.map((b,i)=><div key={i} style={{ fontSize:13,padding:'7px 10px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:5 }}>• {b}</div>)}</>
            )}
            {selectedApp.missing_keywords?.length>0&&(
              <><div style={{ fontWeight:600,margin:'10px 0 6px' }}>Missing keywords</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{selectedApp.missing_keywords.map((k,i)=><span key={i} className="badge badge-coral">{k}</span>)}</div></>
            )}
            {selectedApp.apply_url&&<a href={selectedApp.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ marginTop:14,display:'inline-flex' }}><ExternalLink size={12}/> Open application</a>}
          </div>
        </div>
      )}

      {/* Rejection Insights Modal */}
      {showRejectionInsights&&rejectionInsights&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
          <div className="card" style={{ maxWidth:800,width:'100%',maxHeight:'90vh',overflowY:'auto',padding:'1.5rem' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <TrendingUp size={20} color="var(--coral)" />
                <div style={{ fontWeight:700,fontSize:16 }}>Learn from Rejections</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowRejectionInsights(false)}><X size={14}/></button>
            </div>

            {rejectionInsights.total_rejections===0?(
              <div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}>
                No rejections yet. Keep applying!
              </div>
            ):(
              <>
                {/* Summary Stats */}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:'1.5rem' }}>
                  <div style={{ textAlign:'center',padding:12,background:'var(--coral-light)',borderRadius:'var(--radius)',border:'1px solid #F5D0CD' }}>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4 }}>Total Rejections</div>
                    <div style={{ fontSize:28,fontWeight:700,color:'var(--coral)' }}>{rejectionInsights.total_rejections}</div>
                  </div>
                  <div style={{ textAlign:'center',padding:12,background:'var(--surface-pink)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4 }}>Avg Match Score</div>
                    <div style={{ fontSize:28,fontWeight:700,color:'var(--text)' }}>{rejectionInsights.patterns.avg_match_score}%</div>
                  </div>
                  <div style={{ textAlign:'center',padding:12,background:'var(--surface-pink)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4 }}>Avg CV Score</div>
                    <div style={{ fontSize:28,fontWeight:700,color:'var(--text)' }}>{rejectionInsights.patterns.avg_cv_score}</div>
                  </div>
                </div>

                {/* Key Insights */}
                {rejectionInsights.insights.length>0&&(
                  <div style={{ marginBottom:'1.5rem' }}>
                    <div style={{ fontWeight:600,marginBottom:12,fontSize:14 }}>🔍 Key Insights</div>
                    {rejectionInsights.insights.map((insight,i)=>(
                      <div key={i} className="card" style={{ marginBottom:8,borderLeft:`3px solid ${insight.severity==='critical'?'var(--coral)':insight.severity==='high'?'var(--amber)':'var(--accent2)'}` }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                          <span className={`badge ${insight.severity==='critical'?'badge-coral':insight.severity==='high'?'badge-amber':'badge-blue'}`}>{insight.severity}</span>
                          <div style={{ fontWeight:600,fontSize:13 }}>{insight.title}</div>
                        </div>
                        <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>{insight.description}</div>
                        <div style={{ fontSize:13,color:'var(--accent)',fontWeight:500 }}>💡 {insight.recommendation}</div>
                        {insight.keywords&&(
                          <div style={{ marginTop:8,display:'flex',flexWrap:'wrap',gap:5 }}>
                            {insight.keywords.map((kw,j)=><span key={j} className="badge badge-pink">{kw}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Patterns */}
                {Object.keys(rejectionInsights.patterns.stages).length>0&&(
                  <div style={{ marginBottom:'1.5rem' }}>
                    <div style={{ fontWeight:600,marginBottom:12,fontSize:14 }}>📊 Rejection Stages</div>
                    <div className="card">
                      {Object.entries(rejectionInsights.patterns.stages).map(([stage,count])=>(
                        <div key={stage} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:8 }}>
                          <div style={{ flex:1,fontSize:13,textTransform:'capitalize' }}>{stage.replace('_',' ')}</div>
                          <div style={{ flex:2,height:24,background:'var(--border-light)',borderRadius:4,overflow:'hidden',position:'relative' }}>
                            <div style={{ width:`${(count/rejectionInsights.total_rejections)*100}%`,height:'100%',background:'var(--coral)',borderRadius:4 }} />
                            <span style={{ position:'absolute',right:8,top:3,fontSize:11,fontWeight:600,color:'var(--text)' }}>{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Missing Keywords */}
                {rejectionInsights.patterns.top_missing_keywords.length>0&&(
                  <div style={{ marginBottom:'1.5rem' }}>
                    <div style={{ fontWeight:600,marginBottom:12,fontSize:14 }}>🎯 Most Frequently Missing Keywords</div>
                    <div className="card">
                      <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                        {rejectionInsights.patterns.top_missing_keywords.slice(0,15).map((item,i)=>(
                          <div key={i} style={{ padding:'6px 12px',background:'var(--coral-light)',borderRadius:20,fontSize:12,border:'1px solid #F5D0CD' }}>
                            <strong>{item.keyword}</strong> <span style={{ color:'var(--text-secondary)' }}>×{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {rejectionInsights.recommendations.length>0&&(
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontWeight:600,marginBottom:12,fontSize:14 }}>✨ Action Plan</div>
                    <div className="card" style={{ background:'var(--accent2-light)',border:'1px solid var(--border-blue)' }}>
                      {rejectionInsights.recommendations.map((rec,i)=>(
                        <div key={i} style={{ display:'flex',gap:8,marginBottom:i<rejectionInsights.recommendations.length-1?10:0 }}>
                          <div style={{ width:24,height:24,background:'var(--accent2)',color:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0 }}>{i+1}</div>
                          <div style={{ fontSize:13,color:'var(--accent2-dark)',lineHeight:1.6 }}>{rec}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={()=>setShowRejectionInsights(false)}>
                  <Check size={14}/> Got it — let's improve!
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── INTERVIEW PREP ────────────────────────────────────────────
function InterviewPrep({ sessionId, profile }) {
  const [questions,setQuestions]=useState([])
  const [role,setRole]=useState('')
  const [company,setCompany]=useState('')
  const [loading,setLoading]=useState(false)
  const [practicing,setPracticing]=useState(null)
  const [answer,setAnswer]=useState('')
  const [feedback,setFeedback]=useState(null)
  const [loadingFB,setLoadingFB]=useState(false)

  const generate=async()=>{
    setLoading(true);setQuestions([])
    try{ const r=await api.getInterviewPrep(sessionId,role,company); setQuestions(r.questions||[]) }
    catch(e){ alert(e.message) }
    finally{ setLoading(false) }
  }
  const getFeedback=async(q)=>{
    if(!answer.trim()) return
    setLoadingFB(true);setFeedback(null)
    try{ const r=await api.submitPracticeFeedback(sessionId,q.question,answer,role); setFeedback(r) }
    catch(e){ alert(e.message) }
    finally{ setLoadingFB(false) }
  }
  const catColor={technical:'badge-blue',behavioural:'badge-gray',project:'badge-green','system-design':'badge-amber',sales:'badge-pink',hr:'badge-purple',finance:'badge-amber',marketing:'badge-green'}

  return (
    <div>
      <div className="card" style={{ marginBottom:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
          <input placeholder="Role (e.g. HR Manager, Sales Director, Engineer…)" value={role} onChange={e=>setRole(e.target.value)} />
          <input placeholder="Company (optional)" value={company} onChange={e=>setCompany(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading||!role}>
          {loading?<><Spinner/> Generating…</>:<><Mic size={14}/> Generate questions from my CV</>}
        </button>
      </div>
      {questions.map((q,i)=>(
        <div key={i} className="card" style={{ marginBottom:8 }}>
          <div style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:8 }}>
            <span className={`badge ${catColor[q.category]||'badge-gray'}`} style={{ flexShrink:0 }}>{q.category}</span>
            <div style={{ fontWeight:500 }}>{q.question}</div>
          </div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:8 }}>💡 {q.tip}</div>
          {practicing===i?(
            <div>
              <textarea placeholder="Type your answer…" value={answer} onChange={e=>setAnswer(e.target.value)} style={{ marginBottom:8 }} />
              <div style={{ display:'flex',gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={()=>getFeedback(q)} disabled={loadingFB}>{loadingFB?<><Spinner/> Evaluating…</>:<><Send size={12}/> Get feedback</>}</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setPracticing(null);setAnswer('');setFeedback(null)}}>Cancel</button>
              </div>
              {feedback&&(
                <div style={{ marginTop:12,padding:12,background:'var(--surface-pink)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:8 }}>
                    <span style={{ fontWeight:700,fontSize:20,color:'var(--text)' }}>{feedback.score}/10</span>
                    <span className={`badge ${feedback.score>=7?'badge-green':feedback.score>=5?'badge-amber':'badge-coral'}`}>{feedback.verdict}</span>
                  </div>
                  {feedback.what_worked?.length>0&&<div style={{ marginBottom:8 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--success)',marginBottom:4 }}>What worked</div>{feedback.what_worked.map((w,j)=><div key={j} style={{ fontSize:13,marginBottom:2 }}>✓ {w}</div>)}</div>}
                  {feedback.what_to_improve?.length>0&&<div style={{ marginBottom:8 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--coral)',marginBottom:4 }}>Improve</div>{feedback.what_to_improve.map((w,j)=><div key={j} style={{ fontSize:13,marginBottom:2 }}>→ {w}</div>)}</div>}
                  <div style={{ fontSize:13,color:'var(--text-secondary)',borderTop:'1px solid var(--border)',paddingTop:8,marginTop:8 }}><strong>Ideal answer:</strong> {feedback.ideal_answer_outline}</div>
                </div>
              )}
            </div>
          ):(
            <button className="btn btn-ghost btn-sm" onClick={()=>{setPracticing(i);setAnswer('');setFeedback(null)}}><Mic size={12}/> Practice answering</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── UPSKILL ───────────────────────────────────────────────────
function Upskill({ profile }) {
  const analysis=profile?.analysis||{}
  const certs=analysis.recommended_certs||[]
  const projects=analysis.recommended_projects||[]
  return (
    <div>
      {certs.length===0&&projects.length===0&&<div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}>Upload your CV to get personalized upskill recommendations.</div>}
      {certs.length>0&&(
        <div className="card" style={{ marginBottom:10 }}>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12 }}>Certifications (ranked by ROI for your gaps)</div>
          {certs.map((c,i)=>(
            <div key={i} style={{ display:'flex',gap:10,padding:'10px 0',borderBottom:i<certs.length-1?'1px solid var(--border-light)':'none',alignItems:'flex-start' }}>
              <div style={{ width:28,height:28,background:'var(--accent2-light)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--accent2-dark)',flexShrink:0 }}>{c.priority}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500,marginBottom:2 }}>{c.name}</div>
                <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:2 }}>{c.provider} · {c.reason}</div>
                <span style={{ fontSize:11,color:'var(--accent)',fontWeight:600 }}>{c.score_impact}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {projects.length>0&&(
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12 }}>Project ideas (tailored to your profile)</div>
          {projects.map((p,i)=>(
            <div key={i} style={{ padding:'10px 0',borderBottom:i<projects.length-1?'1px solid var(--border-light)':'none' }}>
              <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4 }}>
                <div style={{ fontWeight:500 }}>{p.title}</div>
                <span className={`badge ${p.difficulty==='advanced'?'badge-coral':p.difficulty==='intermediate'?'badge-amber':'badge-green'}`}>{p.difficulty}</span>
              </div>
              <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>{p.description}</div>
              <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>{(p.skills_added||[]).map((s,j)=><span key={j} className="badge badge-purple">{s}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BULLETS ───────────────────────────────────────────────────
function BulletRewriter({ profile }) {
  const bullets=profile?.analysis?.rewritten_bullets||[]
  return (
    <div>
      <div style={{ padding:'10px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--accent2-dark)',marginBottom:12,border:'1px solid var(--border-blue)' }}>
        Every bullet rewritten: <strong>Action verb → Metric → Business impact</strong>. Copy the improved versions into your CV.
      </div>
      {bullets.length===0&&<div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}>Upload your CV to see rewritten bullets.</div>}
      {bullets.map((b,i)=>(
        <div key={i} className="card" style={{ marginBottom:8 }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--text-tertiary)',marginBottom:4,textTransform:'uppercase' }}>Before</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',padding:'8px 12px',background:'var(--border-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--border)',marginBottom:8 }}>{b.original||b}</div>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4,textTransform:'uppercase' }}>After</div>
          <div style={{ fontSize:13,padding:'8px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:6 }}>{b.rewritten||b}</div>
          {b.improvement&&<div style={{ fontSize:12,color:'var(--text-secondary)' }}>💡 {b.improvement}</div>}
          <button className="btn btn-ghost btn-sm" style={{ marginTop:6 }} onClick={()=>navigator.clipboard.writeText(b.rewritten||b)}>Copy</button>
        </div>
      ))}
    </div>
  )
}

// ── CV ANALYTICS DASHBOARD ────────────────────────────────────
function CVAnalytics({ sessionId }) {
  const [analytics, setAnalytics] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [versionDetail, setVersionDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [sessionId])

  const loadAnalytics = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const [analyticsData, versionsData] = await Promise.all([
        api.getCVAnalytics(sessionId),
        api.getCVVersions(sessionId)
      ])
      setAnalytics(analyticsData)
      setVersions(versionsData.versions || [])
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  const viewVersion = async (versionId) => {
    setLoadingDetail(true)
    try {
      const detail = await api.getCVVersionDetail(sessionId, versionId)
      setVersionDetail(detail)
      setSelectedVersion(versionId)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <Spinner /> <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>Loading analytics...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        No version history available yet. Edit your CV to create versions.
      </div>
    )
  }

  const summary = analytics.summary
  const charts = analytics.charts

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <BarChart3 size={24} color="var(--accent)" />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>CV Version History & Analytics</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Track your CV improvements over time with detailed metrics and comparisons
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--accent-light), white)', border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Current ATS Score</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{summary.current_ats_score}</div>
          <div style={{ fontSize: 13, color: summary.ats_improvement >= 0 ? 'var(--success)' : 'var(--coral)' }}>
            {summary.ats_improvement >= 0 ? '↑' : '↓'} {Math.abs(summary.ats_improvement)} points from v1
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Versions</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{summary.total_versions}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
            Since {new Date(summary.first_version_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Word Count</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{summary.current_word_count}</div>
          <div style={{ fontSize: 13, color: summary.word_count_change >= 0 ? 'var(--success)' : 'var(--coral)' }}>
            {summary.word_count_change >= 0 ? '+' : ''}{summary.word_count_change} words from v1
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Skills Tracked</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{summary.current_skills_count}</div>
          <div style={{ fontSize: 13, color: summary.skills_added >= 0 ? 'var(--success)' : 'var(--coral)' }}>
            {summary.skills_added >= 0 ? '+' : ''}{summary.skills_added} skills from v1
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {/* ATS Score Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Activity size={16} color="var(--accent)" />
            <div style={{ fontWeight: 600, fontSize: 14 }}>ATS Score Progress</div>
          </div>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px' }}>
            {charts.ats_scores.map((item, i) => {
              const maxScore = Math.max(...charts.ats_scores.map(s => s.score))
              const height = (item.score / maxScore) * 100
              const color = item.score >= 80 ? 'var(--success)' : item.score >= 60 ? 'var(--amber)' : 'var(--coral)'
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{item.score}</div>
                  <div style={{ width: '100%', height: `${height}%`, background: color, borderRadius: '4px 4px 0 0', minHeight: 20, transition: 'all 0.3s' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>v{item.version}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Word Count Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={16} color="var(--accent2)" />
            <div style={{ fontWeight: 600, fontSize: 14 }}>Word Count Trend</div>
          </div>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px' }}>
            {charts.word_counts.map((item, i) => {
              const maxCount = Math.max(...charts.word_counts.map(w => w.count))
              const height = (item.count / maxCount) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{item.count}</div>
                  <div style={{ width: '100%', height: `${height}%`, background: 'var(--accent2)', borderRadius: '4px 4px 0 0', minHeight: 20, transition: 'all 0.3s' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>v{item.version}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <History size={16} color="var(--accent)" />
          <div style={{ fontWeight: 600, fontSize: 14 }}>Version Timeline</div>
        </div>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />
          
          {analytics.timeline.slice().reverse().map((item, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: 16, paddingBottom: 16, borderBottom: i < analytics.timeline.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              {/* Timeline dot */}
              <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid white', boxShadow: '0 0 0 2px var(--accent-light)' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Version {item.version}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{item.change || 'CV updated'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => viewVersion(versions.find(v => v.version_number === item.version)?.id)}>
                  <FileText size={12} /> View
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => api.downloadCVVersion(sessionId, versions.find(v => v.version_number === item.version)?.id)}>
                  <Download size={12} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version Detail Modal */}
      {selectedVersion && versionDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,26,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', position: 'sticky', top: 0, background: 'white', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="var(--accent)" />
                <div style={{ fontWeight: 700, fontSize: 15 }}>Version {versionDetail.version_number}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedVersion(null); setVersionDetail(null) }}>
                <X size={14} />
              </button>
            </div>

            {/* Version Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-pink)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>ATS Score</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{versionDetail.ats_score}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-pink)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Words</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{versionDetail.word_count}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: 'var(--surface-pink)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Skills</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{versionDetail.analysis?.skills?.length || 0}</div>
              </div>
            </div>

            {/* CV Text */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>CV Content</div>
              <div style={{ padding: 12, background: 'var(--border-light)', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', border: '1px solid var(--border)' }}>
                {versionDetail.raw_text}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => api.downloadCVVersion(sessionId, selectedVersion)} style={{ flex: 1, justifyContent: 'center' }}>
                <Download size={14} /> Download This Version
              </button>
              <button className="btn btn-ghost" onClick={() => { setSelectedVersion(null); setVersionDetail(null) }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PROJECTS ──────────────────────────────────────────────────
function Projects({ sessionId, profile, onCVUpdated }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showGitHubModal, setShowGitHubModal] = useState(false)
  const [repoName, setRepoName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [integrating, setIntegrating] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const [editBullets, setEditBullets] = useState([])
  const [showMetadataForm, setShowMetadataForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [metadata, setMetadata] = useState({
    project_date: '',
    is_team_project: false,
    team_size: '',
    your_role: ''
  })

  useEffect(() => {
    loadProjects()
  }, [sessionId])

  const loadProjects = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await api.listProjects(sessionId)
      setProjects(result.projects || [])
    } catch (e) {
      console.error('Failed to load projects:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only ZIP files are supported')
      return
    }
    setSelectedFile(file)
    setShowMetadataForm(true)
    setError('')
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    setError('')
    try {
      const result = await api.uploadProject(selectedFile, sessionId, metadata)
      // Reload projects to get the complete data
      await loadProjects()
      setShowMetadataForm(false)
      setSelectedFile(null)
      setMetadata({ project_date: '', is_team_project: false, team_size: '', your_role: '' })
      // No alert - the project will now be displayed in the list with action buttons
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const openGitHubModal = (project) => {
    setSelectedProject(project)
    setRepoName(project.project_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    setShowGitHubModal(true)
  }

  const createGitHubRepo = async () => {
    if (!repoName.trim()) {
      alert('Please enter a repository name')
      return
    }
    
    setCreatingRepo(true)
    try {
      const result = await api.createGitHubRepo(selectedProject.id, repoName, isPrivate)
      alert(`GitHub repository created successfully!\n${result.repo_url}`)
      await loadProjects()
      setShowGitHubModal(false)
      window.open(result.repo_url, '_blank')
    } catch (e) {
      alert(`Failed to create GitHub repo: ${e.message}\n\nMake sure you've set GITHUB_TOKEN in your .env file.`)
    } finally {
      setCreatingRepo(false)
    }
  }

  const integrateToCV = async (projectId) => {
    if (!confirm('This will add the project to your CV and regenerate it. Continue?')) return
    
    setIntegrating(true)
    try {
      const result = await api.integrateProjectToCV(sessionId, projectId)
      const scoreChange = result.ats_score_change >= 0 ? `+${result.ats_score_change}` : result.ats_score_change
      
      // Show success message with download option
      if (confirm(`✅ Project added to CV!\n\nNew ATS Score: ${result.ats_score}/100 (${scoreChange} change)\n\nWould you like to download your updated CV now?`)) {
        api.downloadCV(sessionId)
      }
      
      await loadProjects()
      if (onCVUpdated) onCVUpdated(result)
    } catch (e) {
      alert(`Failed to integrate project: ${e.message}`)
    } finally {
      setIntegrating(false)
    }
  }

  const startEdit = (project) => {
    setEditingProject(project.id)
    setEditDescription(project.cv_description)
    setEditBullets([...project.bullet_points])
  }

  const saveEdit = async () => {
    try {
      await api.updateProject(editingProject, editDescription, editBullets)
      await loadProjects()
      setEditingProject(null)
      alert('Project updated successfully!')
    } catch (e) {
      alert(`Failed to update project: ${e.message}`)
    }
  }

  const deleteProject = async (projectId) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await api.deleteProject(projectId)
      await loadProjects()
    } catch (e) {
      alert(`Failed to delete project: ${e.message}`)
    }
  }

  return (
    <div>
      {/* Upload section */}
      <div className="card" style={{ marginBottom: 10, background: 'linear-gradient(135deg, #FFF5F8 0%, #FFF 100%)', border: '1.5px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Upload Project ZIP</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI will analyze your code, generate CV-ready descriptions, and optionally create a GitHub repo</div>
          </div>
        </div>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
          id="project-upload"
          disabled={uploading}
        />
        <button
          className="btn btn-primary"
          onClick={() => document.getElementById('project-upload').click()}
          disabled={uploading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {uploading ? <><Spinner /> Analyzing project…</> : <><Upload size={14} /> Choose ZIP file</>}
        </button>
        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--coral-light)', borderRadius: 'var(--radius-sm)', color: 'var(--coral)', fontSize: 13, marginTop: 10, border: '1px solid #F5D0CD' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Info card */}
      <div style={{ padding: '12px 14px', background: 'var(--accent2-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent2-dark)', marginBottom: 12, border: '1px solid var(--border-blue)' }}>
        <strong>How it works:</strong> Upload project ZIP → AI analyzes tech stack & features → Generate CV bullets with metrics → Create GitHub repo with README → Add to your CV
      </div>

      {/* Projects list */}
      {loading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2rem', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <Spinner /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 13 }}>Upload a project ZIP to get started</div>
        </div>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${project.integrated_to_cv ? 'var(--success)' : 'var(--accent)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{project.project_name}</div>
                  <span className="badge badge-purple">{project.project_type}</span>
                  <span className={`badge ${project.complexity === 'Expert' ? 'badge-coral' : project.complexity === 'Advanced' ? 'badge-amber' : 'badge-green'}`}>
                    {project.complexity}
                  </span>
                  {project.integrated_to_cv && <span className="badge badge-green">✓ In CV</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {editingProject === project.id ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      style={{ width: '100%', minHeight: 60, marginBottom: 8 }}
                    />
                  ) : (
                    project.cv_description
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {project.tech_stack.slice(0, 8).map((tech, i) => (
                    <span key={i} className="badge badge-blue">{tech}</span>
                  ))}
                  {project.tech_stack.length > 8 && <span className="badge">+{project.tech_stack.length - 8} more</span>}
                </div>
              </div>
            </div>

            {/* Bullet points */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>CV Bullet Points</div>
              {editingProject === project.id ? (
                <div>
                  {editBullets.map((bullet, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...editBullets]
                          newBullets[i] = e.target.value
                          setEditBullets(newBullets)
                        }}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditBullets(editBullets.filter((_, idx) => idx !== i))}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditBullets([...editBullets, ''])}
                    style={{ marginTop: 6 }}
                  >
                    <PlusCircle size={12} /> Add bullet
                  </button>
                </div>
              ) : (
                project.bullet_points.map((bullet, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '6px 10px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--accent)', marginBottom: 4 }}>
                    • {bullet}
                  </div>
                ))
              )}
            </div>

            {/* GitHub link */}
            {project.github_url && (
              <div style={{ padding: '8px 12px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', marginBottom: 10, border: '1px solid #C5E8D6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <Check size={14} color="var(--success)" />
                  <span style={{ color: 'var(--success)', fontWeight: 500 }}>GitHub:</span>
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {project.github_repo_name} <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {editingProject === project.id ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                    <Save size={12} /> Save changes
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingProject(null)}>
                    <X size={12} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(project)}>
                    <Edit3 size={12} /> Edit description
                  </button>
                  {!project.github_url && (
                    <button className="btn btn-primary btn-sm" onClick={() => openGitHubModal(project)}>
                      <Zap size={12} /> Create GitHub repo
                    </button>
                  )}
                  {!project.integrated_to_cv && (
                    <button className="btn btn-primary btn-sm" onClick={() => integrateToCV(project.id)} disabled={integrating}>
                      {integrating ? <><Spinner /> Adding…</> : <><PlusCircle size={12} /> Add to CV</>}
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteProject(project.id)} style={{ color: 'var(--coral)' }}>
                    <X size={12} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Metadata form modal */}
      {showMetadataForm && selectedFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,26,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Project Details</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Help AI generate better CV descriptions</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowMetadataForm(false); setSelectedFile(null) }}><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-dark)', marginBottom: 16, border: '1px solid var(--border)' }}>
              <strong>Selected:</strong> {selectedFile.name}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                Project Date <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={metadata.project_date}
                onChange={(e) => setMetadata({ ...metadata, project_date: e.target.value })}
                placeholder="e.g., Jan 2024 - Mar 2024 or Q1 2024"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8, padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={metadata.is_team_project}
                  onChange={(e) => setMetadata({ ...metadata, is_team_project: e.target.checked })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>This was a team project</span>
              </label>
              {metadata.is_team_project && (
                <input
                  type="number"
                  value={metadata.team_size}
                  onChange={(e) => setMetadata({ ...metadata, team_size: e.target.value })}
                  placeholder="Team size (e.g., 4)"
                  style={{ width: '100%' }}
                  min="2"
                />
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                Your Specific Role <span style={{ color: 'var(--coral)' }}>*</span>
              </label>
              <textarea
                value={metadata.your_role}
                onChange={(e) => setMetadata({ ...metadata, your_role: e.target.value })}
                placeholder="What exactly did YOU do? e.g., 'Built the authentication system and REST API. Implemented JWT tokens and role-based access control. Optimized database queries reducing load time by 40%.'"
                style={{ width: '100%', minHeight: 100 }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Be specific about YOUR contributions, not the whole project. Include metrics if possible.
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--accent2-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent2-dark)', marginBottom: 16, border: '1px solid var(--border-blue)' }}>
              <strong>💡 Tip:</strong> The more specific you are about your role, the better the AI-generated CV bullets will be!
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading || !metadata.your_role.trim()} style={{ flex: 1, justifyContent: 'center' }}>
                {uploading ? <><Spinner /> Analyzing…</> : <><Zap size={14} /> Analyze Project</>}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowMetadataForm(false); setSelectedFile(null) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub modal */}
      {showGitHubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(45,26,36,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Create GitHub Repository</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowGitHubModal(false)}><X size={14} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Repository Name</label>
              <input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-awesome-project"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>Make repository private</span>
              </label>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--accent2-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent2-dark)', marginBottom: 16, border: '1px solid var(--border-blue)' }}>
              <strong>Note:</strong> This will create a new repository with a professional README based on your project analysis. Make sure you've set GITHUB_TOKEN in your .env file.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={createGitHubRepo} disabled={creatingRepo} style={{ flex: 1, justifyContent: 'center' }}>
                {creatingRepo ? <><Spinner /> Creating…</> : <><Zap size={14} /> Create Repository</>}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowGitHubModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ROOT APP ──────────────────────────────────────────────────
const TABS=[
  {id:'dashboard',label:'Dashboard',Icon:LayoutDashboard},
  {id:'analytics',label:'CV Analytics',Icon:BarChart3},
  {id:'jobs',label:'Jobs',Icon:Briefcase},
  {id:'jd',label:'JD Analyzer',Icon:Target},
  {id:'projects',label:'Projects',Icon:Upload},
  {id:'editcv',label:'Edit CV',Icon:Edit3},
  {id:'bullets',label:'Bullets',Icon:TrendingUp},
  {id:'tracker',label:'Tracker',Icon:List},
  {id:'interview',label:'Interview',Icon:Mic},
  {id:'upskill',label:'Upskill',Icon:Award},
]

export default function App() {
  const [authUser,setAuthUser]=useState(null)
  const [profile,setProfile]=useState(null)
  const [prevProfile,setPrevProfile]=useState(null)
  const [showCompare,setShowCompare]=useState(false)
  const [cvHistory,setCvHistory]=useState([])
  const [tab,setTab]=useState('dashboard')
  const [applications,setApplications]=useState([])
  const [showUpload,setShowUpload]=useState(false)

  const sessionId=profile?.session_id||localStorage.getItem('session_id')

  useEffect(()=>{
    const savedEmail=localStorage.getItem('cc_email')
    if(savedEmail){
      const users=loadUsers()
      const u=users[savedEmail]
      if(u){
        setAuthUser({email:savedEmail,userData:u})
        if(u.profiles?.length>0){
          const last=u.profiles[u.profiles.length-1]
          setProfile(last)
          setCvHistory(u.cvHistory||[])
        }
      }
    }
  },[])

  const loadApplications=useCallback(async()=>{
    if(!sessionId) return
    try{ const a=await api.listApplications(sessionId); setApplications(a) }catch{}
  },[sessionId])

  useEffect(()=>{ loadApplications() },[loadApplications])

  const handleAuth=({email,userData})=>{
    setAuthUser({email,userData})
    localStorage.setItem('cc_email',email)
    if(userData.profiles?.length>0){
      const last=userData.profiles[userData.profiles.length-1]
      setProfile(last)
      setCvHistory(userData.cvHistory||[])
      localStorage.setItem('session_id',last.session_id)
    }
  }

  const handleUploaded=(result)=>{
    const email=authUser?.email
    const users=loadUsers()
    const u=users[email]||{password:'',profiles:[],cvHistory:[],applications:[]}
    const newVersion=(u.cvHistory?.length||0)+1
    const histEntry={version:newVersion,ats_score:result.ats_score,uploaded_at:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),session_id:result.session_id}
    const oldProfile=profile
    const newProfile={...result}
    u.profiles=[...(u.profiles||[]),newProfile]
    u.cvHistory=[...(u.cvHistory||[]),histEntry]
    users[email]=u
    saveUsers(users)
    setPrevProfile(oldProfile)
    setProfile(newProfile)
    setCvHistory(u.cvHistory)
    setShowUpload(false)
    setTab('dashboard')
    if(oldProfile&&newVersion>1) setShowCompare(true)
  }

  const handleCVSaved=(result)=>{
    // Update profile in state and localStorage with re-analyzed data
    const email=authUser?.email
    const users=loadUsers()
    const u=users[email]||{}
    const updatedProfile={...result}
    if(u.profiles?.length>0){
      u.profiles[u.profiles.length-1]=updatedProfile
    } else {
      u.profiles=[updatedProfile]
    }
    users[email]=u
    saveUsers(users)
    setProfile(updatedProfile)
  }

  const handleCreateApp=async(company,role,applyUrl,jdText)=>{
    if(!sessionId) throw new Error('Upload your CV first')
    await api.createApplication(sessionId,company,role,applyUrl,jdText)
    await loadApplications()
  }

  const handleLogout=()=>{
    localStorage.removeItem('session_id'); localStorage.removeItem('cc_email')
    setAuthUser(null); setProfile(null); setCvHistory([]); setApplications([]); setPrevProfile(null); setShowCompare(false)
  }

  if(!authUser) return <AuthScreen onAuth={handleAuth} />
  if(!profile||showUpload) return <UploadScreen onUploaded={handleUploaded} isReupload={!!profile} prevProfile={profile} onBack={profile?()=>setShowUpload(false):undefined} />

  return (
    <div style={{ display:'flex',minHeight:'100vh' }}>
      {/* Sidebar */}
      <div style={{ width:210,background:'white',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'1rem 0',flexShrink:0,boxShadow:'1px 0 12px rgba(196,84,122,0.06)' }}>
        {/* Brand */}
        <div style={{ padding:'0 1rem 1rem',borderBottom:'1px solid var(--border-light)',marginBottom:'0.75rem' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
            <div style={{ width:32,height:32,background:'linear-gradient(135deg,#C4547A,#D4729A)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(196,84,122,0.3)' }}>
              <Sparkles size={16} color="white"/>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:13,letterSpacing:'-0.01em' }}>Career Copilot</div>
              <div style={{ fontSize:10,color:'var(--text-secondary)' }}>Any field · Any role</div>
            </div>
          </div>
          {/* User card */}
          <div style={{ padding:'8px 10px',background:'var(--surface-pink)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:600,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)' }}>{authUser.userData?.name||authUser.email}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{authUser.email}</div>
            <div style={{ fontSize:11,color:'var(--accent)',marginTop:2,fontWeight:500 }}>ATS: {profile.ats_score}/100 · v{cvHistory.length}</div>
            {cvHistory.length>1&&(
              <button className="btn btn-ghost btn-sm" style={{ marginTop:5,width:'100%',fontSize:10,padding:'2px 6px',borderRadius:20 }} onClick={()=>setShowCompare(true)}>
                <History size={10}/> Compare versions
              </button>
            )}
          </div>
        </div>
        {/* Nav */}
        {TABS.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 1rem',fontSize:13,fontWeight:tab===id?600:400,color:tab===id?'var(--accent)':'var(--text-secondary)',background:tab===id?'linear-gradient(90deg,var(--accent-light),transparent)':'transparent',border:'none',cursor:'pointer',textAlign:'left',borderLeft:tab===id?'3px solid var(--accent)':'3px solid transparent',transition:'all 0.12s' }}>
            <Icon size={15}/>{label}
            {id==='tracker'&&applications.length>0&&<span style={{ marginLeft:'auto',background:'var(--accent-light)',color:'var(--accent)',borderRadius:20,padding:'1px 6px',fontSize:10,fontWeight:600 }}>{applications.length}</span>}
          </button>
        ))}
        {/* Footer actions */}
        <div style={{ marginTop:'auto',padding:'0.75rem 1rem',borderTop:'1px solid var(--border-light)',display:'flex',flexDirection:'column',gap:6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%',justifyContent:'center',borderRadius:20 }} onClick={()=>setShowUpload(true)}><Upload size={12}/> New CV</button>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%',justifyContent:'center',borderRadius:20 }} onClick={handleLogout}><LogOut size={12}/> Log out</button>
        </div>
      </div>
      {/* Main */}
      <div style={{ flex:1,overflow:'auto',padding:'1.25rem' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          {tab==='dashboard'&&<Dashboard profile={profile} applications={applications}/>}
          {tab==='analytics'&&<CVAnalytics sessionId={sessionId}/>}
          {tab==='jobs'&&<JobsBoard sessionId={sessionId} profile={profile} onCreateApp={handleCreateApp}/>}
          {tab==='jd'&&<JDAnalyzer sessionId={sessionId} onCreateApp={handleCreateApp}/>}
          {tab==='projects'&&<Projects sessionId={sessionId} profile={profile} onCVUpdated={handleCVSaved}/>}
          {tab==='editcv'&&<EditCV sessionId={sessionId} profile={profile} onSaved={handleCVSaved}/>}
          {tab==='bullets'&&<BulletRewriter profile={profile}/>}
          {tab==='tracker'&&<ApplicationsTracker sessionId={sessionId} applications={applications} onRefresh={loadApplications}/>}
          {tab==='interview'&&<InterviewPrep sessionId={sessionId} profile={profile}/>}
          {tab==='upskill'&&<Upskill profile={profile}/>}
        </div>
      </div>
      {showCompare&&prevProfile&&(
        <CVCompareModal oldProfile={prevProfile} newProfile={profile} cvHistory={cvHistory} onClose={()=>setShowCompare(false)}/>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
