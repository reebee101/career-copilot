import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, LayoutDashboard, FileText, List, Mic, Award,
  Zap, RefreshCw, ChevronRight, X, Check, AlertCircle, Loader,
  ExternalLink, Briefcase, TrendingUp, Target, Send,
  PlusCircle, LogIn, LogOut, History, GitCompare, User, Lock, Sparkles, Edit3, Save,
  Download, Calendar, BarChart3, Activity, Eye, Printer
} from 'lucide-react'
import * as api from './api'

const STATUS_LABELS = {
  saved: 'Saved', applied: 'Applied',
  interview: 'Interview', offer: 'Offer 🎉', rejected: 'Rejected'
}

const EG_TERMS = ['egypt','cairo','alexandria','giza','hurghada','luxor','mansoura','tanta','maadi','zamalek','heliopolis','nasr city','new cairo','6th of october']

function isEgyptJob(job) {
  const loc = (job.location || '').toLowerCase()
  const ctr = (job.country || '').toLowerCase()
  const src = (job.source || '').toLowerCase()
  return src === 'wuzzuf' || ctr === 'eg' || ctr === 'egy' || ctr === 'egypt' || EG_TERMS.some(t => loc.includes(t))
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

const AUTH_KEY = 'cc_users_v2'
function loadUsers() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)||'{}') } catch { return {} } }
function saveUsers(u) { localStorage.setItem(AUTH_KEY, JSON.stringify(u)) }

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
                style={{ flex:1,padding:'7px 0',fontSize:13,fontWeight:mode===m?600:400,color:mode===m?'white':'var(--text-secondary)',background:mode===m?'linear-gradient(135deg,#C4547A,#D4729A)':'transparent',border:'none',borderRadius:27,cursor:'pointer',transition:'all 0.2s' }}>
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
              <input placeholder={mode==='signup'?'Password (min 6 chars)':'Password'} type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={{ paddingLeft:36,paddingRight:40 }} />
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',padding:2,display:'flex',alignItems:'center' }} tabIndex={-1}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          {error && <div style={{ display:'flex',gap:7,alignItems:'center',padding:'9px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',color:'var(--coral)',fontSize:12,marginTop:10,border:'1px solid #F5D0CD' }}><AlertCircle size={13} /> {error}</div>}
          <button className="btn btn-primary" style={{ width:'100%',marginTop:14,justifyContent:'center',gap:8 }} onClick={submit} disabled={loading}>
            {loading ? <><Spinner /> Processing…</> : mode==='signup' ? <><User size={14}/> Create account</> : <><LogIn size={14}/> Log in</>}
          </button>
          <div style={{ marginTop:'1rem',padding:'12px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--accent2-dark)',border:'1px solid var(--border-blue)' }}>
            <strong>Works for any field:</strong> Engineering, HR, Sales, Marketing, Finance, Design, Operations.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

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
        {isReupload && onBack && <button className="btn btn-ghost btn-sm" style={{ marginBottom:14 }} onClick={onBack}>← Back</button>}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:'1.75rem' }}>
          <div style={{ width:44,height:44,background:'linear-gradient(135deg,#C4547A,#D4729A)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Sparkles size={22} color="white" />
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:20,fontWeight:700 }}>{isReupload?'Upload New CV Version':'Upload Your CV'}</div>
            <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:1 }}>{isReupload?`Previous ATS score: ${prevProfile?.ats_score||0}/100`:'Works for any profession'}</div>
          </div>
        </div>
        <div className="card" style={{ padding:'2rem' }}>
          <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0])}}
            onClick={()=>document.getElementById('cv-input').click()}
            style={{ border:`2px dashed ${dragging?'var(--accent)':'var(--border)'}`,borderRadius:12,padding:'2.5rem 1.5rem',cursor:'pointer',background:dragging?'var(--accent-light)':'var(--surface-pink)',transition:'all 0.15s' }}>
            {loading ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                <Loader size={24} color="var(--accent)" style={{ animation:'spin 1s linear infinite' }} />
                <div style={{ fontWeight:600 }}>Analyzing your CV…</div>
                <div style={{ color:'var(--text-secondary)',fontSize:13 }}>Scoring ATS, extracting skills, rewriting bullets…</div>
              </div>
            ) : (
              <>
                <div style={{ width:56,height:56,background:'var(--accent-light)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px' }}>
                  <Upload size={24} color="var(--accent)" />
                </div>
                <div style={{ fontWeight:600,marginBottom:4 }}>Drop your CV here</div>
                <div style={{ color:'var(--text-secondary)',fontSize:13 }}>PDF, DOCX, or TXT · Max 5MB</div>
              </>
            )}
          </div>
          <input id="cv-input" type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])} />
          {error && <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',color:'var(--coral)',fontSize:13,marginTop:10,border:'1px solid #F5D0CD' }}><AlertCircle size={14} /> {error}</div>}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function CVCompareModal({ oldProfile, newProfile, cvHistory, onClose }) {
  const oldScore = oldProfile?.ats_score||0, newScore = newProfile?.ats_score||0, delta = newScore - oldScore
  const improvements = delta>0?[`ATS score improved by ${delta} points`]:[]
  const toImprove = ['Add quantified metrics to experience bullets','Tailor your CV summary to your target role']
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
      <div className="card" style={{ maxWidth:520,width:'100%',padding:'1.5rem',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}><GitCompare size={18} color="var(--accent)" /><div style={{ fontWeight:700,fontSize:15 }}>CV Version Comparison</div></div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:24,marginBottom:'1.25rem',padding:'1rem',background:'var(--surface-pink)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:6 }}>Previous (v{cvHistory.length-1})</div><ScoreRing score={oldScore} size={80} /></div>
          <ChevronRight size={20} color="var(--text-tertiary)" />
          <div style={{ textAlign:'center' }}><div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:6 }}>New (v{cvHistory.length})</div><ScoreRing score={newScore} size={80} /></div>
          <div style={{ textAlign:'center',padding:'12px 16px',background:delta>=0?'var(--success-light)':'var(--coral-light)',borderRadius:'var(--radius)' }}>
            <div style={{ fontSize:11,color:delta>=0?'var(--success)':'var(--coral)' }}>Change</div>
            <div style={{ fontSize:24,fontWeight:700,color:delta>=0?'var(--success)':'var(--coral)' }}>{delta>=0?'+':''}{delta}</div>
          </div>
        </div>
        {improvements.length>0&&<div className="card" style={{ background:'var(--success-light)',marginBottom:10,border:'1px solid #C5E8D6' }}>{improvements.map((item,i)=><div key={i} style={{ display:'flex',gap:8,fontSize:13,marginBottom:5 }}><Check size={13} color="var(--success)" style={{ flexShrink:0,marginTop:2 }} />{item}</div>)}</div>}
        <div className="card" style={{ marginBottom:'1.25rem' }}>{toImprove.map((item,i)=><div key={i} style={{ display:'flex',gap:8,fontSize:13,marginBottom:5,color:'var(--text-secondary)' }}><ChevronRight size={13} color="var(--amber)" style={{ flexShrink:0,marginTop:2 }} />{item}</div>)}</div>
        <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={onClose}><Check size={14}/> Got it</button>
      </div>
    </div>
  )
}
// ── AI CV EDITOR — full viewport, paper feel, auto-grow ───────
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
  const [activeTab, setActiveTab] = useState('edit')
  const [fixingIdx, setFixingIdx] = useState(null)
  const [selectedText, setSelectedText] = useState('')
  const [aiRewrite, setAiRewrite] = useState(null)
  const [loadingRewrite, setLoadingRewrite] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [fontFamily, setFontFamily] = useState('georgia')
  const [fontSize, setFontSize] = useState(14)
  const [lineSpacing, setLineSpacing] = useState(1.9)
  const textareaRef = useRef(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const lineCount = text.split('\n').length
  const oldScore = profile?.ats_score || 0

  // CRITICAL: hasChanges declared BEFORE any useEffect that references it
  const hasChanges = text !== originalText
  const scoreDelta = newScore !== null ? newScore - oldScore : null

  const autoGrow = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.max(ta.scrollHeight, window.innerHeight - 300) + 'px'
  }, [])

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

  useEffect(() => { autoGrow() }, [text, fontSize, lineSpacing, autoGrow])

  useEffect(() => {
    if (!autoSaveEnabled || !hasChanges || text.length < 100) return
    const timer = setTimeout(() => save(), 6000)
    return () => clearTimeout(timer)
  }, [text, autoSaveEnabled, hasChanges])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (hasChanges) save() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges, text])

  useEffect(() => {
    if (!text || text === originalText || text.length < 200) return
    const timer = setTimeout(() => getSuggestions(), 3500)
    return () => clearTimeout(timer)
  }, [text])

  const getSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: `Analyze this CV and return a JSON array of exactly 5 improvement suggestions. Each object: "type" (bullet|missing_section|keyword|quantify|format), "severity" (critical|important|nice_to_have), "title" (5 words max), "issue" (1 sentence), "fix" (specific example), "section". Return ONLY a JSON array.\n\nCV:\n${text.slice(0, 3000)}` }]
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000,
          messages: [{ role: 'user', content: `Apply this improvement to the CV. Return ONLY the complete improved CV text.\n\nSection: ${suggestion.section}\nIssue: ${suggestion.issue}\nFix: ${suggestion.fix}\n\nCV:\n${text}` }]
        })
      })
      const data = await resp.json()
      setText(data.content?.[0]?.text || text)
      setAiSuggestions(prev => prev.filter((_, i) => i !== idx))
      setActiveTab('edit')
    } catch(e) { alert('Failed to apply fix: ' + e.message) }
    finally { setFixingIdx(null) }
  }

  const rewriteSelected = async () => {
    const sel = window.getSelection()?.toString() || selectedText
    if (!sel || sel.length < 20) { alert('Select at least one sentence to rewrite.'); return }
    setLoadingRewrite(true); setAiRewrite(null)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400,
          messages: [{ role: 'user', content: `Rewrite this CV bullet: action verb + metric + impact. Return ONLY the rewritten text.\n\nOriginal: "${sel}"` }]
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
    const oldLines = originalText.split('\n'), newLines = text.split('\n')
    const result = [], maxLen = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i] ?? '', n = newLines[i] ?? ''
      if (o === n) result.push({ type:'same', text:n })
      else if (!o) result.push({ type:'added', text:n })
      else if (!n) result.push({ type:'removed', text:o })
      else { result.push({ type:'removed', text:o }); result.push({ type:'added', text:n }) }
    }
    return result
  }

  const save = async () => {
    if (text.trim().length < 100) { setError('CV text is too short.'); return }
    setSaving(true); setError(''); setSaved(false); setNewScore(null)
    try {
      const result = await api.editCV(sessionId, text)
      setNewScore(result.ats_score); setSaved(true); setOriginalText(text); onSaved(result)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const getFontStack = () => ({ georgia:"Georgia,'Times New Roman',serif", system:"'DM Sans',system-ui,sans-serif", mono:"'Courier New',monospace", arial:"Arial,sans-serif", times:"'Times New Roman',serif" }[fontFamily] || "Georgia,serif")

  const sevColor = { critical:'var(--coral)', important:'var(--amber)', nice_to_have:'var(--accent2)' }
  const sevBg = { critical:'var(--coral-light)', important:'var(--amber-light)', nice_to_have:'var(--accent2-light)' }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'6rem',gap:10,color:'var(--text-secondary)' }}><Spinner /> Loading your CV...</div>

  return (
    <div style={{ display:'flex',height:'calc(100vh - 120px)',overflow:'hidden',margin:'-1.25rem',marginTop:0 }}>
      {/* MAIN EDITOR */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',borderRight:'1px solid var(--border)' }}>
        {/* Top bar */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:'var(--surface-pink)',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap',gap:6 }}>
          <div style={{ display:'flex',gap:5 }}>
            {['edit','suggestions','diff'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding:'4px 12px',borderRadius:20,border:activeTab===t?'1.5px solid var(--accent)':'1.5px solid var(--border)',background:activeTab===t?'var(--accent-light)':'transparent',color:activeTab===t?'var(--accent)':'var(--text-secondary)',fontSize:11,fontWeight:activeTab===t?600:400,cursor:'pointer',textTransform:'capitalize' }}>
                {t}{t==='suggestions'&&aiSuggestions.length>0?` (${aiSuggestions.length})`:''}
              </button>
            ))}
          </div>
          <div style={{ display:'flex',gap:6,alignItems:'center' }}>
            <label style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-secondary)',cursor:'pointer' }}>
              <input type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} />Auto-save
            </label>
            <span style={{ fontSize:10,color:'var(--text-tertiary)',padding:'2px 5px',background:'var(--border-light)',borderRadius:4 }}>⌘S</span>
            {hasChanges && <span style={{ fontSize:11,color:'var(--amber)',fontWeight:500 }}>● Unsaved</span>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving||!hasChanges}>
              {saving?<><Spinner/> Saving…</>:saved?<><Check size={12}/> Saved!</>:<><Save size={12}/> Save</>}
            </button>
          </div>
        </div>

        {saved && scoreDelta !== null && (
          <div style={{ display:'flex',gap:10,alignItems:'center',padding:'8px 16px',background:scoreDelta>=0?'var(--success-light)':'var(--coral-light)',fontSize:13,flexShrink:0,borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:16,fontWeight:700,color:scoreDelta>=0?'var(--success)':'var(--coral)' }}>{scoreDelta>=0?'+':''}{scoreDelta}</span>
            <span>ATS score: <strong>{oldScore}</strong> → <strong>{newScore}</strong>/100</span>
          </div>
        )}
        {error && <div style={{ display:'flex',gap:8,alignItems:'center',padding:'8px 16px',background:'var(--coral-light)',fontSize:13,color:'var(--coral)',flexShrink:0,borderBottom:'1px solid var(--border)' }}><AlertCircle size={13}/> {error}</div>}

        {/* EDIT TAB */}
        {activeTab === 'edit' && (
          <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative' }}>
            {/* Formatting toolbar */}
            <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'white',borderBottom:'1px solid var(--border-light)',flexShrink:0,flexWrap:'wrap' }}>
              <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)} style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer',width:120 }}>
                <option value="georgia">Georgia (Recommended)</option>
                <option value="system">Sans-serif</option>
                <option value="times">Times New Roman</option>
                <option value="arial">Arial</option>
                <option value="mono">Monospace</option>
              </select>
              <select value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer',width:52 }}>
                {[11,12,13,14,15,16,18].map(s=><option key={s} value={s}>{s}px</option>)}
              </select>
              <select value={lineSpacing} onChange={e=>setLineSpacing(Number(e.target.value))} style={{ fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,background:'white',cursor:'pointer',width:50 }}>
                {[1.4,1.6,1.8,1.9,2.0,2.2].map(h=><option key={h} value={h}>{h}</option>)}
              </select>
              <div style={{ width:1,background:'var(--border)',height:18,margin:'0 2px' }}/>
              <button onClick={()=>{const s=window.getSelection()?.toString();if(s)setText(prev=>prev.replace(s,`**${s}**`))}} style={{ padding:'2px 7px',border:'1px solid var(--border)',borderRadius:4,fontSize:12,fontWeight:700,cursor:'pointer',background:'white' }} title="Bold">B</button>
              <button onClick={()=>{const s=window.getSelection()?.toString();if(s)setText(prev=>prev.replace(s,`*${s}*`))}} style={{ padding:'2px 7px',border:'1px solid var(--border)',borderRadius:4,fontSize:12,fontStyle:'italic',cursor:'pointer',background:'white' }} title="Italic">I</button>
              <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.trim()&&!l.startsWith('• ')?'• '+l:l).join('\n'))} style={{ padding:'2px 7px',border:'1px solid var(--border)',borderRadius:4,fontSize:11,cursor:'pointer',background:'white' }}>• List</button>
              <div style={{ width:1,background:'var(--border)',height:18,margin:'0 2px' }}/>
              <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.replace(/\s+/g,' ').trim()).join('\n'))} style={{ padding:'2px 7px',border:'1px solid var(--border)',borderRadius:4,fontSize:10,cursor:'pointer',background:'white',color:'var(--text-secondary)' }}>Fix spaces</button>
              <button onClick={()=>setText(prev=>prev.split('\n').map(l=>l.trim()?l.charAt(0).toUpperCase()+l.slice(1):l).join('\n'))} style={{ padding:'2px 7px',border:'1px solid var(--border)',borderRadius:4,fontSize:10,cursor:'pointer',background:'white',color:'var(--text-secondary)' }}>Caps</button>
              <div style={{ marginLeft:'auto',fontSize:11,color:'var(--text-tertiary)' }}>{wordCount}w · {lineCount}L · {text.length.toLocaleString()}c</div>
            </div>

            {/* Scrollable page area */}
            <div style={{ flex:1,overflowY:'auto',background:'#F0EDE8' }}>
              <div style={{ maxWidth:820,margin:'28px auto',paddingBottom:100 }}>
                {/* Paper page */}
                <div style={{ background:'white',boxShadow:'0 4px 32px rgba(0,0,0,0.14)',borderRadius:2,position:'relative' }}>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => { setText(e.target.value); autoGrow() }}
                    onMouseUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                    onKeyUp={() => setSelectedText(window.getSelection()?.toString() || '')}
                    style={{
                      width:'100%', display:'block', boxSizing:'border-box',
                      minHeight: `${window.innerHeight - 300}px`,
                      fontFamily: getFontStack(), fontSize, lineHeight: lineSpacing,
                      padding:'56px 72px',
                      border:'none', outline:'none', background:'transparent',
                      color:'#1A1A2E', resize:'none', overflowY:'hidden',
                      whiteSpace:'pre-wrap', wordWrap:'break-word',
                    }}
                    spellCheck={true}
                    placeholder="Start typing your CV or paste it here…"
                  />
                </div>
              </div>
            </div>

            {/* Floating rewrite bar */}
            {selectedText.length >= 20 && (
              <div style={{ position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',background:'white',border:'1.5px solid var(--accent)',borderRadius:30,padding:'8px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 20px rgba(196,84,122,0.2)',zIndex:50,whiteSpace:'nowrap' }}>
                <span style={{ fontSize:12,color:'var(--text-secondary)',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis' }}>"{selectedText.slice(0,50)}{selectedText.length>50?'…':''}"</span>
                <button className="btn btn-primary btn-sm" onClick={rewriteSelected} disabled={loadingRewrite}>
                  {loadingRewrite?<><Spinner/> Rewriting…</>:<><Sparkles size={12}/> AI Rewrite</>}
                </button>
              </div>
            )}
            {aiRewrite && (
              <div style={{ position:'absolute',bottom:70,left:'50%',transform:'translateX(-50%)',background:'white',border:'1.5px solid var(--accent)',borderRadius:12,padding:'14px',maxWidth:500,width:'90%',boxShadow:'0 8px 32px rgba(196,84,122,0.15)',zIndex:50 }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--text-tertiary)',marginBottom:4 }}>BEFORE</div>
                <div style={{ fontSize:13,color:'var(--text-secondary)',padding:'6px 10px',background:'var(--border-light)',borderRadius:6,marginBottom:8,borderLeft:'2px solid var(--border)' }}>{aiRewrite.original}</div>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--accent)',marginBottom:4 }}>AI REWRITE</div>
                <div style={{ fontSize:13,padding:'6px 10px',background:'var(--accent-light)',borderRadius:6,borderLeft:'2px solid var(--accent)',marginBottom:10 }}>{aiRewrite.improved}</div>
                <div style={{ display:'flex',gap:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={applyRewrite}><Check size={12}/> Apply</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAiRewrite(null)}><X size={12}/> Dismiss</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUGGESTIONS TAB */}
        {activeTab === 'suggestions' && (
          <div style={{ flex:1,overflowY:'auto',padding:'1rem' }}>
            {loadingSuggestions && <div style={{ display:'flex',gap:8,alignItems:'center',padding:'1rem',color:'var(--text-secondary)',fontSize:13 }}><Spinner/> Analyzing CV…</div>}
            {!loadingSuggestions && aiSuggestions.length===0 && (
              <div style={{ textAlign:'center',padding:'3rem' }}>
                <div style={{ color:'var(--text-secondary)',marginBottom:12 }}>Edit your CV first — suggestions appear automatically after 3.5s of no typing.</div>
                <button className="btn btn-secondary" onClick={getSuggestions}><Sparkles size={14}/> Analyze now</button>
              </div>
            )}
            {aiSuggestions.map((s, i) => (
              <div key={i} className="card" style={{ marginBottom:8,borderLeft:`3px solid ${sevColor[s.severity]||'var(--border)'}` }}>
                <div style={{ display:'flex',gap:8,alignItems:'flex-start',justifyContent:'space-between' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',gap:6,alignItems:'center',marginBottom:6 }}>
                      <span style={{ fontWeight:600,fontSize:13 }}>{s.title}</span>
                      <span className="badge" style={{ background:sevBg[s.severity],color:sevColor[s.severity],fontSize:10 }}>{s.severity}</span>
                      {s.section && <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>{s.section}</span>}
                    </div>
                    <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>{s.issue}</div>
                    <div style={{ fontSize:13,padding:'7px 10px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',fontStyle:'italic' }}>💡 {s.fix}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => applySuggestion(s, i)} disabled={fixingIdx===i} style={{ flexShrink:0,marginTop:2 }}>
                    {fixingIdx===i?<><Spinner/> Fixing…</>:<><Zap size={12}/> Auto-fix</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DIFF TAB */}
        {activeTab === 'diff' && (
          <div style={{ flex:1,overflowY:'auto',fontFamily:'monospace',fontSize:12,lineHeight:1.8,background:'white',padding:'1rem' }}>
            {!hasChanges ? <div style={{ color:'var(--text-secondary)',textAlign:'center',padding:'2rem' }}>No changes yet.</div>
              : getDiff().map((line, i) => (
                <div key={i} style={{ padding:'1px 8px',background:line.type==='added'?'#E6F5EE':line.type==='removed'?'#FDECEA':'transparent',color:line.type==='added'?'#1A6040':line.type==='removed'?'#7A2A22':'var(--text)',borderLeft:`3px solid ${line.type==='added'?'#5DAF8B':line.type==='removed'?'#D4726A':'transparent'}` }}>
                  {line.type==='added'?'+':line.type==='removed'?'-':' '} {line.text}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ width:240,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)',flexShrink:0 }}>
        <div style={{ overflowY:'auto',flex:1 }}>
          {/* Score */}
          <div style={{ padding:'1rem',textAlign:'center',borderBottom:'1px solid var(--border-light)',background:'white' }}>
            <div style={{ fontSize:10,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8,letterSpacing:'0.05em' }}>ATS Score</div>
            <ScoreRing score={newScore ?? oldScore} size={72} />
            {scoreDelta !== null && <div style={{ marginTop:6,fontSize:12,fontWeight:600,color:scoreDelta>=0?'var(--success)':'var(--coral)' }}>{scoreDelta>=0?'+':''}{scoreDelta} pts</div>}
          </div>
          {/* Stats grid */}
          <div style={{ padding:'10px 12px',borderBottom:'1px solid var(--border-light)',background:'white',display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
            {[['Words',wordCount],['Lines',lineCount],['Chars',text.length.toLocaleString()],['Status',hasChanges?'Unsaved':'Saved']].map(([l,v])=>(
              <div key={l} style={{ textAlign:'center',padding:'6px 4px',background:'var(--surface-pink)',borderRadius:'var(--radius-sm)' }}>
                <div style={{ fontSize:13,fontWeight:700,color:'var(--text)' }}>{v}</div>
                <div style={{ fontSize:10,color:'var(--text-tertiary)' }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Quick wins */}
          <div style={{ padding:'12px',borderBottom:'1px solid var(--border-light)' }}>
            <div style={{ fontSize:10,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Quick wins</div>
            {[['📊','Add numbers: "increased by 32%"'],['🔑','Mirror exact JD keywords'],['⚡','Start bullets with action verbs'],['📋','Add a Skills section if missing'],['🎯','Tailor summary to target role'],['📏','Keep to 1-2 pages max']].map(([ic,tip],i)=>(
              <div key={i} style={{ display:'flex',gap:7,marginBottom:6,fontSize:11,color:'var(--text-secondary)',alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>{ic}</span><span>{tip}</span>
              </div>
            ))}
          </div>
          {/* Gaps */}
          {(profile?.analysis?.critical_gaps||[]).length > 0 && (
            <div style={{ padding:'12px' }}>
              <div style={{ fontSize:10,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Gaps to address</div>
              {(profile.analysis.critical_gaps||[]).slice(0,5).map((g,i) => {
                const skill = typeof g==='object'?g.skill:g
                const sev = typeof g==='object'?g.severity:'moderate'
                return (
                  <div key={i} style={{ display:'flex',gap:5,alignItems:'center',marginBottom:5,fontSize:11 }}>
                    <span className={`badge badge-${sev==='critical'?'coral':sev==='moderate'?'amber':'gray'}`} style={{ fontSize:9,flexShrink:0,padding:'1px 5px' }}>{sev}</span>
                    <span style={{ color:'var(--text-secondary)' }}>{skill}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ profile, applications }) {
  const analysis = profile?.analysis||{}
  const breakdown = analysis.score_breakdown||{}
  const gaps = (analysis.critical_gaps||[]).map(g => typeof g==='object'?g:{skill:String(g),severity:'moderate',reason:''})
  const statCards = [
    {label:'ATS Score',val:profile?.ats_score||0,color:'var(--accent)',bg:'var(--accent-light)'},
    {label:'Applications',val:applications.length,color:'var(--accent2)',bg:'var(--accent2-light)'},
    {label:'Interviews',val:applications.filter(a=>a.status==='interview').length,color:'var(--amber)',bg:'var(--amber-light)'},
    {label:'Offers',val:applications.filter(a=>a.status==='offer').length,color:'var(--success)',bg:'var(--success-light)'},
  ]
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:'1rem' }}>
        {statCards.map(m=><div key={m.label} className="card" style={{ textAlign:'center',padding:'1.25rem 1rem',background:m.bg,border:`1px solid ${m.color}22` }}><div style={{ fontSize:30,fontWeight:700,color:m.color }}>{m.val}</div><div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{m.label}</div></div>)}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:10,marginBottom:'1rem' }}>
        <div className="card" style={{ display:'flex',alignItems:'center',gap:16 }}>
          <ScoreRing score={profile?.ats_score||0} />
          <div><div style={{ fontWeight:600,marginBottom:4 }}>ATS Score</div><div style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.5 }}>{analysis.summary||'Upload your CV to get started.'}</div></div>
        </div>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Score breakdown</div>
          {Object.entries(breakdown).map(([k,v])=>(
            <div key={k} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:7 }}>
              <div style={{ fontSize:12,width:130,color:'var(--text-secondary)',flexShrink:0,textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</div>
              <div style={{ flex:1,height:6,background:'var(--border-light)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ width:`${v}%`,height:'100%',background:v>=70?'var(--accent)':v>=50?'var(--amber)':'var(--coral)',borderRadius:3,transition:'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize:12,fontWeight:600,width:28,textAlign:'right' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Strengths</div>
          {(analysis.strengths||[]).length===0?<div style={{ fontSize:13,color:'var(--text-secondary)' }}>Upload your CV to see strengths.</div>
            :(analysis.strengths||[]).map((s,i)=><div key={i} style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:7,fontSize:13 }}><div style={{ width:18,height:18,background:'var(--success-light)',borderRadius:50,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1 }}><Check size={11} color="var(--success)" /></div><span>{s}</span></div>)}
        </div>
        <div className="card">
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10 }}>Critical gaps</div>
          {gaps.length===0?<div style={{ fontSize:13,color:'var(--text-secondary)' }}>No gaps found.</div>
            :gaps.map((g,i)=>{
              const skill=g.skill||'Unknown',severity=g.severity||'moderate',reason=g.reason||''
              const sv=severity==='critical'?'coral':severity==='moderate'?'amber':'gray'
              return <div key={i} style={{ display:'flex',gap:8,alignItems:'flex-start',marginBottom:8,fontSize:13 }}><span className={`badge badge-${sv}`} style={{ flexShrink:0,marginTop:1 }}>{severity}</span><div><div style={{ fontWeight:500 }}>{skill}</div>{reason&&<div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{reason}</div>}</div></div>
            })}
        </div>
      </div>
    </div>
  )
}

// ── JD ANALYZER — full CV rewrite + live preview + PDF ────────
function JDAnalyzer({ sessionId, onCreateApp, currentCVText }) {
  const [jd, setJd] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rewrittenCV, setRewrittenCV] = useState(null)
  const [rewritingCV, setRewritingCV] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [loadingCL, setLoadingCL] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('match')
  const [showPreview, setShowPreview] = useState(false)
  const printRef = useRef(null)

  const analyze = async () => {
    if (!jd.trim() || jd.trim().length < 100) { alert('Please paste the full job description (min 100 chars).'); return }
    setLoading(true); setResult(null); setRewrittenCV(null); setCoverLetter(''); setSaved(false)
    try { setResult(await api.scoreAgainstJD(sessionId, jd, company, role)) }
    catch(e) { alert('JD analysis failed: ' + e.message) }
    finally { setLoading(false) }
  }

  const rewriteFullCV = async () => {
    if (!result) return
    const cvText = currentCVText || ''
    if (!cvText) { alert('No CV text found. Please upload your CV first.'); return }
    setRewritingCV(true)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 3000,
          messages: [{ role: 'user', content: `You are an expert CV writer. Rewrite this full CV tailored for the job below.

Rules:
- Rewrite the summary to target this exact role at ${company||'this company'}
- Weave these missing keywords naturally into skills/experience: ${(result.missing_keywords||[]).join(', ')}
- Improve weak bullets using these tailored versions where relevant: ${(result.tailored_bullets||[]).join(' | ')}
- Keep ALL existing experience, education and dates intact — do not invent anything
- Return ONLY the complete rewritten CV text, no preamble, no markdown fences

JOB DESCRIPTION:
${jd.slice(0,1500)}

CURRENT CV:
${cvText}` }]
        })
      })
      const data = await resp.json()
      setRewrittenCV(data.content?.[0]?.text?.trim() || '')
      setShowPreview(true)
      setActiveTab('rewrite')
    } catch(e) { alert('CV rewrite failed: ' + e.message) }
    finally { setRewritingCV(false) }
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>CV — ${role} at ${company}</title><style>body{font-family:Georgia,serif;font-size:13px;line-height:1.75;margin:48px;color:#1a1a2e;white-space:pre-wrap;}@media print{body{margin:24px}}</style></head><body>${(printRef.current.innerText||'').replace(/</g,'&lt;')}</body></html>`)
    w.document.close(); w.focus(); w.print(); w.close()
  }

  const genCL = async () => {
    setLoadingCL(true)
    try { const r = await api.generateCoverLetter(sessionId, jd, company, role); setCoverLetter(r.cover_letter) }
    catch(e) { alert(e.message) } finally { setLoadingCL(false) }
  }

  const saveApp = async () => {
    try { await onCreateApp(company, role, '', jd); setSaved(true) } catch(e) { alert(e.message) }
  }

  const matchColor = s => s>=80?'var(--success)':s>=65?'var(--amber)':'var(--coral)'
  const tabs = [{id:'match',label:'Match Analysis'},{id:'rewrite',label:'Rewritten CV'},{id:'cover',label:'Cover Letter'}]

  return (
    <div style={{ display:'grid',gridTemplateColumns:showPreview&&rewrittenCV?'1fr 1fr':'1fr',gap:12 }}>
      <div>
        <div className="card" style={{ marginBottom:10 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
            <input placeholder="Company name" value={company} onChange={e=>setCompany(e.target.value)} />
            <input placeholder="Role title" value={role} onChange={e=>setRole(e.target.value)} />
          </div>
          <textarea placeholder="Paste the full job description here…" value={jd} onChange={e=>setJd(e.target.value)} style={{ minHeight:140,marginBottom:10 }} />
          <button className="btn btn-primary" onClick={analyze} disabled={!jd.trim()||loading}>
            {loading?<><Spinner/> Analyzing…</>:<><Target size={14}/> Analyze & Score</>}
          </button>
        </div>

        {result && (
          <div>
            <div style={{ display:'grid',gridTemplateColumns:'110px 1fr',gap:10,marginBottom:10 }}>
              <div className="card" style={{ textAlign:'center',padding:'1.25rem 1rem',background:'var(--surface-pink)' }}>
                <ScoreRing score={result.match_score} size={80} />
                <div style={{ fontWeight:600,marginTop:8,fontSize:13,color:matchColor(result.match_score) }}>{result.verdict}</div>
              </div>
              <div className="card">
                <div style={{ fontWeight:600,marginBottom:8 }}>Strategy</div>
                <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:10,lineHeight:1.6 }}>{result.application_strategy}</div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={rewriteFullCV} disabled={rewritingCV}>
                    {rewritingCV?<><Spinner/> Rewriting full CV…</>:<><Edit3 size={13}/> Rewrite My CV For This Job</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={genCL} disabled={loadingCL}>
                    {loadingCL?<><Spinner/> Generating…</>:<><FileText size={13}/> Cover Letter</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={saveApp} disabled={saved}>
                    {saved?<><Check size={13}/> Saved!</>:<><List size={13}/> Track</>}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:'flex',gap:6,marginBottom:10 }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{ padding:'5px 14px',borderRadius:30,border:activeTab===t.id?'1.5px solid var(--accent)':'1.5px solid var(--border)',background:activeTab===t.id?'var(--accent-light)':'transparent',color:activeTab===t.id?'var(--accent)':'var(--text-secondary)',fontSize:12,fontWeight:activeTab===t.id?600:400,cursor:'pointer',transition:'all 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab==='match' && (
              <div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
                  <div className="card"><div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Matched</div><div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.matched_keywords||[]).map((k,i)=><span key={i} className="badge badge-green">{k}</span>)}</div></div>
                  <div className="card"><div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Missing</div><div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>{(result.missing_keywords||[]).map((k,i)=><span key={i} className="badge badge-coral">{k}</span>)}</div></div>
                </div>
                <div className="card">
                  <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:8 }}>Tailored bullets (merged automatically on rewrite)</div>
                  {(result.tailored_bullets||[]).map((b,i)=><div key={i} style={{ fontSize:13,padding:'8px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:6 }}>• {b}</div>)}
                </div>
              </div>
            )}

            {activeTab==='rewrite' && (
              <div>
                {!rewrittenCV ? (
                  <div style={{ textAlign:'center',padding:'3rem' }}>
                    <div style={{ color:'var(--text-secondary)',marginBottom:16,fontSize:14 }}>
                      Click <strong>"Rewrite My CV For This Job"</strong> above.<br/>
                      <span style={{ fontSize:12,marginTop:4,display:'block' }}>Your full CV will be rewritten with the missing keywords and tailored bullets merged in — not just snippets.</span>
                    </div>
                    <button className="btn btn-primary" onClick={rewriteFullCV} disabled={rewritingCV}>
                      {rewritingCV?<><Spinner/> Rewriting…</>:<><Edit3 size={14}/> Rewrite My Full CV</>}
                    </button>
                  </div>
                ) : (
                  <div className="card">
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                      <div style={{ fontWeight:600,fontSize:14 }}>✅ Tailored CV — {role}{company?` at ${company}`:''}</div>
                      <div style={{ display:'flex',gap:6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setShowPreview(!showPreview)}><Eye size={12}/> {showPreview?'Hide':'Preview'}</button>
                        <button className="btn btn-primary btn-sm" onClick={handlePrint}><Printer size={12}/> Download PDF</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigator.clipboard.writeText(rewrittenCV)}>Copy text</button>
                      </div>
                    </div>
                    <div ref={printRef} style={{ fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:400,overflowY:'auto',color:'#1A1A2E',fontFamily:'Georgia,serif',padding:'8px 0',borderTop:'1px solid var(--border)' }}>
                      {rewrittenCV}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab==='cover' && (
              <div className="card">
                {coverLetter ? (
                  <>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                      <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase' }}>Cover letter</div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>navigator.clipboard.writeText(coverLetter)}>Copy</button>
                    </div>
                    <div style={{ fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap' }}>{coverLetter}</div>
                  </>
                ) : (
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

      {/* Live A4 preview panel */}
      {showPreview && rewrittenCV && (
        <div style={{ position:'sticky',top:0,height:'calc(100vh - 160px)',display:'flex',flexDirection:'column' }}>
          <div className="card" style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexShrink:0 }}>
              <div style={{ fontWeight:600,fontSize:13 }}>📄 CV Preview</div>
              <div style={{ display:'flex',gap:6 }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}><Printer size={12}/> PDF</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowPreview(false)}><X size={12}/></button>
              </div>
            </div>
            <div style={{ flex:1,overflowY:'auto',background:'white',boxShadow:'0 2px 12px rgba(0,0,0,0.1)',borderRadius:4,padding:'32px 36px',fontSize:12,lineHeight:1.75,fontFamily:'Georgia,serif',color:'#1A1A2E',whiteSpace:'pre-wrap' }}>
              {rewrittenCV}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ── JOBS BOARD — fixed Egypt filter ──────────────────────────
const SKILL_ALIASES = {
  'machine learning':['ml'],'artificial intelligence':['ai'],'natural language processing':['nlp'],
  'deep learning':['dl'],'computer vision':['cv'],'business intelligence':['bi'],
  'human resources':['hr'],'project management':['pm','pmp'],'customer relationship management':['crm'],
  'javascript':['js'],'typescript':['ts'],'python':['py'],'kubernetes':['k8s'],
  'amazon web services':['aws'],'google cloud platform':['gcp'],'structured query language':['sql'],
  'postgresql':['postgres'],'mongodb':['mongo'],'react':['reactjs','react.js'],'node':['nodejs','node.js'],
}

function JobsBoard({ sessionId, profile, onCreateApp }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState(null)
  const [region, setRegion] = useState('egypt')

  const scoreJob = useCallback((job, skills, profileSummary) => {
    const title = (job.title||'').toLowerCase()
    const desc = (job.description_full||job.description||'').toLowerCase()
    const jd = title+' '+desc
    if (!skills||skills.length===0) return 55
    const expandedSkills = new Set()
    skills.forEach(s => {
      const sl = s.toLowerCase().trim()
      expandedSkills.add(sl)
      ;(SKILL_ALIASES[sl]||[]).forEach(a => expandedSkills.add(a))
      sl.split(/[\s/,+.-]+/).filter(t=>t.length>2).forEach(t => expandedSkills.add(t))
    })
    let titlePts=0, matched=0
    expandedSkills.forEach(skill => {
      if (title.includes(skill)) { titlePts+=3; matched++ }
      else if (jd.includes(skill)) matched++
    })
    const matchRatio = matched/Math.max(expandedSkills.size,1)
    const skillScore = Math.min(65, Math.round(matchRatio*65+Math.min(titlePts*2,20)))
    const summaryWords = (profileSummary||'').toLowerCase().split(/\W+/).filter(w=>w.length>3)
    const titleWords = title.split(/\W+/).filter(w=>w.length>3)
    const overlap = titleWords.filter(w=>summaryWords.some(sw=>sw===w||sw.includes(w)||w.includes(sw))).length
    const titleScore = Math.min(25, overlap*9)
    const seniorW=['senior','lead','principal','director','head','chief','vp']
    const juniorW=['junior','graduate','entry level','trainee']
    const cvSenior = summaryWords.some(w=>seniorW.includes(w))
    const cvJunior = summaryWords.some(w=>juniorW.some(j=>j.includes(w)))
    let penalty=0
    if (cvSenior&&juniorW.some(w=>title.includes(w))) penalty=10
    if (cvJunior&&seniorW.some(w=>title.includes(w))) penalty=8
    const posted = job.posted_at?new Date(job.posted_at):null
    const ageBonus = posted&&(Date.now()-posted.getTime())<14*24*3600*1000?5:0
    return Math.max(15,Math.min(99,Math.round(skillScore+titleScore+ageBonus-penalty)))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const remoteOnly = region==='remote'
      const country = region==='egypt'?'egypt':null
      const rawJobs = await api.fetchJobs(remoteOnly, country)
      const skills = profile?.analysis?.skills||[]
      const summary = profile?.analysis?.summary||''
      const scored = rawJobs
        .map(job => ({...job, match_score: scoreJob(job, skills, summary)}))
        .filter(job => {
          // FIXED: use isEgyptJob helper — checks source, country field, AND location text
          if (region==='egypt') return isEgyptJob(job)
          if (region==='remote') return job.remote===true
          return true
        })
        .sort((a,b) => b.match_score - a.match_score)
      setJobs(scored)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [region, profile, scoreJob])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/jobs/clear-demos', { method:'DELETE' })
      await api.refreshJobsSync(profile?.analysis?.skills||[])
    } catch(e) { console.error(e) }
    await load()
    setRefreshing(false)
  }

  const srcBadge = {wuzzuf:'badge-pink',linkedin:'badge-blue',adzuna:'badge-green',google_jobs:'badge-green',remotive:'badge-green',arbeitnow:'badge-purple',indeed:'badge-amber',glassdoor:'badge-green',jsearch:'badge-blue',demo:'badge-gray'}
  const matchColor = s => s>=85?'var(--success)':s>=70?'var(--amber)':'var(--coral)'

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
          <div style={{ marginLeft:'auto',fontSize:12,color:'var(--text-secondary)' }}>{!loading&&`${jobs.length} jobs`}</div>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />{refreshing?'Refreshing…':'Refresh'}
          </button>
        </div>
        {loading ? <div style={{ textAlign:'center',padding:'4rem',color:'var(--text-secondary)' }}><Spinner/></div>
          : jobs.length===0 ? (
            <div style={{ textAlign:'center',padding:'3rem' }}>
              <div style={{ color:'var(--text-secondary)',marginBottom:12 }}>No {region} jobs found yet.</div>
              <button className="btn btn-primary" onClick={refresh} disabled={refreshing}>{refreshing?<><Spinner/> Fetching…</>:<><RefreshCw size={13}/> Fetch jobs now</>}</button>
            </div>
          ) : jobs.map(job=>(
            <div key={job.id} className="card" style={{ marginBottom:8,cursor:'pointer',border:selected?.id===job.id?'1.5px solid var(--accent)':'1px solid var(--border)',transition:'border 0.15s' }} onClick={()=>setSelected(selected?.id===job.id?null:job)}>
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
          ))}
      </div>
      {selected&&(
        <div className="card" style={{ height:'fit-content',position:'sticky',top:10 }}>
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
          <div style={{ fontSize:13,lineHeight:1.7,maxHeight:300,overflowY:'auto',marginBottom:12 }}>{selected.description_full||selected.description}</div>
          <div style={{ display:'flex',gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={async()=>{await onCreateApp(selected.company,selected.title,selected.apply_url,selected.description_full);alert('Added to tracker!')}}>
              <List size={13}/> Add to Tracker
            </button>
            {selected.apply_url&&<a href={selected.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13}/> Apply</a>}
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
  const [rejectionInsights,setRejectionInsights]=useState(null)
  const [showRejection,setShowRejection]=useState(false)
  const [loadingInsights,setLoadingInsights]=useState(false)

  const updateStatus=async(appId,status)=>{
    try{ await api.updateApplicationStatus(appId,status,'','',''); onRefresh() }catch(e){alert(e.message)}
  }
  const loadRejectionInsights=async()=>{
    setLoadingInsights(true)
    try{ const i=await api.getRejectionInsights(sessionId); setRejectionInsights(i); setShowRejection(true) }
    catch(e){alert(e.message)} finally{setLoadingInsights(false)}
  }
  const deleteApp=async(appId)=>{if(!confirm('Delete?'))return;try{await api.deleteApplication(appId);onRefresh()}catch(e){alert(e.message)}}
  const doAutoApply=async(appId)=>{
    setApplying(appId)
    try{const r=await api.triggerAutoApply(sessionId,appId,phone,linkedinUrl);alert(r.message);setAutoApplyId(null);setTimeout(onRefresh,3000)}
    catch(e){alert(e.message)}finally{setApplying(null)}
  }
  const addManual=async()=>{
    if(!manualForm.company||!manualForm.role)return alert('Company and role required.')
    setAddingManual(true)
    try{await api.createApplication(sessionId,manualForm.company,manualForm.role,manualForm.apply_url,manualForm.notes);setManualForm({company:'',role:'',apply_url:'',notes:''});setShowAdd(false);onRefresh()}
    catch(e){alert(e.message)}finally{setAddingManual(false)}
  }

  const cols=['saved','applied','interview','offer','rejected']
  const byStatus=Object.fromEntries(cols.map(c=>[c,applications.filter(a=>a.status===c)]))
  const colColors={saved:'var(--accent2)',applied:'var(--amber)',interview:'var(--lavender)',offer:'var(--success)',rejected:'var(--coral)'}
  const rejectedCount=applications.filter(a=>a.status==='rejected').length

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        {rejectedCount>0&&<button className="btn btn-secondary btn-sm" onClick={loadRejectionInsights} disabled={loadingInsights}>{loadingInsights?<><Spinner/> Loading…</>:<><TrendingUp size={13}/> Learn from {rejectedCount} rejection{rejectedCount>1?'s':''}</>}</button>}
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
                  {col!=='rejected'&&col!=='offer'&&<select style={{ fontSize:11,padding:'3px 6px',width:'auto' }} value={app.status} onChange={e=>updateStatus(app.id,e.target.value)}>{cols.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>}
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
              <input placeholder="Company *" value={manualForm.company} onChange={e=>setManualForm(f=>({...f,company:e.target.value}))} />
              <input placeholder="Role *" value={manualForm.role} onChange={e=>setManualForm(f=>({...f,role:e.target.value}))} />
              <input placeholder="URL (optional)" value={manualForm.apply_url} onChange={e=>setManualForm(f=>({...f,apply_url:e.target.value}))} />
              <textarea placeholder="Notes" value={manualForm.notes} onChange={e=>setManualForm(f=>({...f,notes:e.target.value}))} style={{ minHeight:60 }} />
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-primary" onClick={addManual} disabled={addingManual||!manualForm.company||!manualForm.role}>{addingManual?<><Spinner/> Adding…</>:<><PlusCircle size={14}/> Add</>}</button>
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
              <button className="btn btn-primary" onClick={()=>doAutoApply(autoApplyId)} disabled={applying===autoApplyId}>{applying===autoApplyId?<><Spinner/> Applying…</>:<><Zap size={14}/> Apply now</>}</button>
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
            {selectedApp.cover_letter&&<><div style={{ fontWeight:600,marginBottom:6 }}>Cover letter</div><div style={{ fontSize:13,lineHeight:1.7,background:'var(--surface-pink)',padding:12,borderRadius:'var(--radius-sm)',marginBottom:12,whiteSpace:'pre-wrap',border:'1px solid var(--border)' }}>{selectedApp.cover_letter}</div></>}
            {selectedApp.tailored_bullets?.length>0&&<><div style={{ fontWeight:600,marginBottom:6 }}>Tailored bullets</div>{selectedApp.tailored_bullets.map((b,i)=><div key={i} style={{ fontSize:13,padding:'7px 10px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:5 }}>• {b}</div>)}</>}
            {selectedApp.apply_url&&<a href={selectedApp.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ marginTop:14,display:'inline-flex' }}><ExternalLink size={12}/> Open application</a>}
          </div>
        </div>
      )}

      {showRejection&&rejectionInsights&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
          <div className="card" style={{ maxWidth:680,width:'100%',maxHeight:'90vh',overflowY:'auto',padding:'1.5rem' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}><TrendingUp size={20} color="var(--coral)" /><div style={{ fontWeight:700,fontSize:16 }}>Learn from Rejections</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowRejection(false)}><X size={14}/></button>
            </div>
            {rejectionInsights.total_rejections===0?<div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}>No rejections yet. Keep applying!</div>:(
              <>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:'1.5rem' }}>
                  {[['Rejections',rejectionInsights.total_rejections,'var(--coral)','var(--coral-light)'],['Avg Match',`${rejectionInsights.patterns.avg_match_score}%`,'var(--text)','var(--surface-pink)'],['Avg CV Score',rejectionInsights.patterns.avg_cv_score,'var(--text)','var(--surface-pink)']].map(([l,v,c,bg])=>(
                    <div key={l} style={{ textAlign:'center',padding:12,background:bg,borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
                      <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:28,fontWeight:700,color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
                {rejectionInsights.insights?.length>0&&(
                  <div style={{ marginBottom:'1.5rem' }}>
                    <div style={{ fontWeight:600,marginBottom:12 }}>🔍 Key Insights</div>
                    {rejectionInsights.insights.map((ins,i)=>(
                      <div key={i} className="card" style={{ marginBottom:8,borderLeft:`3px solid ${ins.severity==='critical'?'var(--coral)':ins.severity==='high'?'var(--amber)':'var(--accent2)'}` }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                          <span className={`badge ${ins.severity==='critical'?'badge-coral':ins.severity==='high'?'badge-amber':'badge-blue'}`}>{ins.severity}</span>
                          <div style={{ fontWeight:600,fontSize:13 }}>{ins.title}</div>
                        </div>
                        <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:4 }}>{ins.description}</div>
                        <div style={{ fontSize:13,color:'var(--accent)',fontWeight:500 }}>💡 {ins.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
                {rejectionInsights.recommendations?.length>0&&(
                  <div className="card" style={{ background:'var(--accent2-light)',border:'1px solid var(--border-blue)',marginBottom:'1rem' }}>
                    <div style={{ fontWeight:600,marginBottom:10 }}>✨ Action Plan</div>
                    {rejectionInsights.recommendations.map((rec,i)=>(
                      <div key={i} style={{ display:'flex',gap:8,marginBottom:8 }}>
                        <div style={{ width:22,height:22,background:'var(--accent2)',color:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0 }}>{i+1}</div>
                        <div style={{ fontSize:13,color:'var(--accent2-dark)',lineHeight:1.6 }}>{rec}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={()=>setShowRejection(false)}><Check size={14}/> Got it!</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
// ── INTERVIEW PREP ────────────────────────────────────────────
function InterviewPrep({ sessionId }) {
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
    try{const r=await api.getInterviewPrep(sessionId,role,company);setQuestions(r.questions||[])}
    catch(e){alert(e.message)}finally{setLoading(false)}
  }
  const getFeedback=async(q)=>{
    if(!answer.trim())return
    setLoadingFB(true);setFeedback(null)
    try{const r=await api.submitPracticeFeedback(sessionId,q.question,answer,role);setFeedback(r)}
    catch(e){alert(e.message)}finally{setLoadingFB(false)}
  }
  const catColor={technical:'badge-blue',behavioural:'badge-gray',project:'badge-green','system-design':'badge-amber',sales:'badge-pink',hr:'badge-purple',finance:'badge-amber',marketing:'badge-green'}
  return (
    <div>
      <div className="card" style={{ marginBottom:10 }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
          <input placeholder="Role (HR Manager, Engineer, Sales Director…)" value={role} onChange={e=>setRole(e.target.value)} />
          <input placeholder="Company (optional)" value={company} onChange={e=>setCompany(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading||!role}>{loading?<><Spinner/> Generating…</>:<><Mic size={14}/> Generate questions from my CV</>}</button>
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
                    <span style={{ fontWeight:700,fontSize:20 }}>{feedback.score}/10</span>
                    <span className={`badge ${feedback.score>=7?'badge-green':feedback.score>=5?'badge-amber':'badge-coral'}`}>{feedback.verdict}</span>
                  </div>
                  {feedback.what_worked?.length>0&&<div style={{ marginBottom:8 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--success)',marginBottom:4 }}>What worked</div>{feedback.what_worked.map((w,j)=><div key={j} style={{ fontSize:13,marginBottom:2 }}>✓ {w}</div>)}</div>}
                  {feedback.what_to_improve?.length>0&&<div style={{ marginBottom:8 }}><div style={{ fontSize:12,fontWeight:600,color:'var(--coral)',marginBottom:4 }}>Improve</div>{feedback.what_to_improve.map((w,j)=><div key={j} style={{ fontSize:13,marginBottom:2 }}>→ {w}</div>)}</div>}
                  <div style={{ fontSize:13,color:'var(--text-secondary)',borderTop:'1px solid var(--border)',paddingTop:8,marginTop:8 }}><strong>Ideal:</strong> {feedback.ideal_answer_outline}</div>
                </div>
              )}
            </div>
          ):<button className="btn btn-ghost btn-sm" onClick={()=>{setPracticing(i);setAnswer('');setFeedback(null)}}><Mic size={12}/> Practice</button>}
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
      {certs.length>0&&<div className="card" style={{ marginBottom:10 }}>
        <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12 }}>Certifications (ranked by ROI)</div>
        {certs.map((c,i)=><div key={i} style={{ display:'flex',gap:10,padding:'10px 0',borderBottom:i<certs.length-1?'1px solid var(--border-light)':'none',alignItems:'flex-start' }}>
          <div style={{ width:28,height:28,background:'var(--accent2-light)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--accent2-dark)',flexShrink:0 }}>{c.priority}</div>
          <div style={{ flex:1 }}><div style={{ fontWeight:500,marginBottom:2 }}>{c.name}</div><div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:2 }}>{c.provider} · {c.reason}</div><span style={{ fontSize:11,color:'var(--accent)',fontWeight:600 }}>{c.score_impact}</span></div>
        </div>)}
      </div>}
      {projects.length>0&&<div className="card">
        <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12 }}>Project ideas</div>
        {projects.map((p,i)=><div key={i} style={{ padding:'10px 0',borderBottom:i<projects.length-1?'1px solid var(--border-light)':'none' }}>
          <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4 }}><div style={{ fontWeight:500 }}>{p.title}</div><span className={`badge ${p.difficulty==='advanced'?'badge-coral':p.difficulty==='intermediate'?'badge-amber':'badge-green'}`}>{p.difficulty}</span></div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6 }}>{p.description}</div>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>{(p.skills_added||[]).map((s,j)=><span key={j} className="badge badge-purple">{s}</span>)}</div>
        </div>)}
      </div>}
    </div>
  )
}

// ── BULLETS ───────────────────────────────────────────────────
function BulletRewriter({ profile }) {
  const bullets=profile?.analysis?.rewritten_bullets||[]
  return (
    <div>
      <div style={{ padding:'10px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--accent2-dark)',marginBottom:12,border:'1px solid var(--border-blue)' }}>
        Every bullet rewritten: <strong>Action verb → Metric → Business impact</strong>.
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

// ── CV ANALYTICS ──────────────────────────────────────────────
function CVAnalytics({ sessionId }) {
  const [analytics,setAnalytics]=useState(null)
  const [versions,setVersions]=useState([])
  const [loading,setLoading]=useState(true)
  const [selectedVersion,setSelectedVersion]=useState(null)
  const [versionDetail,setVersionDetail]=useState(null)

  useEffect(()=>{loadAnalytics()},[sessionId])

  const loadAnalytics=async()=>{
    if(!sessionId)return
    setLoading(true)
    try{
      const [a,v]=await Promise.all([api.getCVAnalytics(sessionId),api.getCVVersions(sessionId)])
      setAnalytics(a);setVersions(v.versions||[])
    }catch(e){console.error(e)}finally{setLoading(false)}
  }

  const viewVersion=async(versionId)=>{
    if(!versionId)return
    try{const d=await api.getCVVersionDetail(sessionId,versionId);setVersionDetail(d);setSelectedVersion(versionId)}
    catch(e){alert(e.message)}
  }

  if(loading)return <div style={{ textAlign:'center',padding:'3rem' }}><Spinner /></div>
  if(!analytics)return <div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}>No version history yet. Edit your CV to create versions.</div>

  const {summary,charts}=analytics
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:'1.5rem' }}>
        {[['ATS Score',summary.current_ats_score,summary.ats_improvement,'var(--accent)'],['Versions',summary.total_versions,null,'var(--accent2)'],['Words',summary.current_word_count,summary.word_count_change,'var(--text)'],['Skills',summary.current_skills_count,summary.skills_added,'var(--success)']].map(([l,v,delta,c])=>(
          <div key={l} className="card">
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:30,fontWeight:700,color:c,marginBottom:delta!=null?4:0 }}>{v}</div>
            {delta!=null&&<div style={{ fontSize:12,color:delta>=0?'var(--success)':'var(--coral)' }}>{delta>=0?'+':''}{delta} from v1</div>}
          </div>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:'1.5rem' }}>
        {[['ATS Score Progress',charts.ats_scores,'score'],['Word Count Trend',charts.word_counts,'count']].map(([title,data,key])=>(
          <div key={title} className="card">
            <div style={{ fontWeight:600,fontSize:14,marginBottom:12 }}>{title}</div>
            <div style={{ height:160,display:'flex',alignItems:'flex-end',gap:6,padding:'0 4px' }}>
              {data.map((item,i)=>{
                const max=Math.max(...data.map(d=>d[key]),1)
                const h=(item[key]/max)*100
                const col=key==='score'?(item[key]>=80?'var(--success)':item[key]>=60?'var(--amber)':'var(--coral)'):'var(--accent2)'
                return <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <div style={{ fontSize:10,fontWeight:600 }}>{item[key]}</div>
                  <div style={{ width:'100%',height:`${h}%`,background:col,borderRadius:'3px 3px 0 0',minHeight:16,transition:'all 0.3s' }} />
                  <div style={{ fontSize:9,color:'var(--text-tertiary)' }}>v{item.version}</div>
                </div>
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontWeight:600,fontSize:14,marginBottom:16 }}>Version Timeline</div>
        <div style={{ position:'relative',paddingLeft:24 }}>
          <div style={{ position:'absolute',left:8,top:8,bottom:8,width:2,background:'var(--border)' }} />
          {analytics.timeline.slice().reverse().map((item,i)=>(
            <div key={i} style={{ position:'relative',marginBottom:16,paddingBottom:16,borderBottom:i<analytics.timeline.length-1?'1px solid var(--border-light)':'none' }}>
              <div style={{ position:'absolute',left:-20,top:4,width:12,height:12,borderRadius:'50%',background:'var(--accent)',border:'2px solid white',boxShadow:'0 0 0 2px var(--accent-light)' }} />
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4 }}>
                <div style={{ fontWeight:600,fontSize:13 }}>Version {item.version}</div>
                <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>{new Date(item.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
              </div>
              <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:8 }}>{item.change||'CV updated'}</div>
              <div style={{ display:'flex',gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>viewVersion(versions.find(v=>v.version_number===item.version)?.id)}><FileText size={12}/> View</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>api.downloadCVVersion(sessionId,versions.find(v=>v.version_number===item.version)?.id)}><Download size={12}/> Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedVersion&&versionDetail&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
          <div className="card" style={{ maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',padding:'1.5rem' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem',position:'sticky',top:0,background:'white',paddingBottom:12,borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontWeight:700,fontSize:15 }}>Version {versionDetail.version_number}</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setSelectedVersion(null);setVersionDetail(null)}}><X size={14}/></button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
              {[['ATS',versionDetail.ats_score,'var(--accent)'],['Words',versionDetail.word_count,'var(--text)'],['Skills',versionDetail.analysis?.skills?.length||0,'var(--text)']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center',padding:12,background:'var(--surface-pink)',borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:11,color:'var(--text-secondary)',marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:24,fontWeight:700,color:c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:12,background:'var(--border-light)',borderRadius:'var(--radius)',fontSize:13,fontFamily:'monospace',whiteSpace:'pre-wrap',maxHeight:300,overflow:'auto',border:'1px solid var(--border)',marginBottom:16 }}>{versionDetail.raw_text}</div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-primary" onClick={()=>api.downloadCVVersion(sessionId,selectedVersion)} style={{ flex:1,justifyContent:'center' }}><Download size={14}/> Download</button>
              <button className="btn btn-ghost" onClick={()=>{setSelectedVersion(null);setVersionDetail(null)}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ── PROJECTS — README preview + edit before GitHub push ───────
function Projects({ sessionId, profile, onCVUpdated }) {
  const [projects,setProjects]=useState([])
  const [loading,setLoading]=useState(true)
  const [uploading,setUploading]=useState(false)
  const [error,setError]=useState('')
  const [integrating,setIntegrating]=useState(false)
  const [editingProject,setEditingProject]=useState(null)
  const [editDescription,setEditDescription]=useState('')
  const [editBullets,setEditBullets]=useState([])
  const [showMetadataForm,setShowMetadataForm]=useState(false)
  const [selectedFile,setSelectedFile]=useState(null)
  const [metadata,setMetadata]=useState({project_date:'',is_team_project:false,team_size:'',your_role:''})
  const [githubModal,setGithubModal]=useState(null)
  const [repoName,setRepoName]=useState('')
  const [isPrivate,setIsPrivate]=useState(false)
  const [generatingReadme,setGeneratingReadme]=useState(false)
  const [readmePreview,setReadmePreview]=useState('')
  const [creatingRepo,setCreatingRepo]=useState(false)
  const [readmeEditMode,setReadmeEditMode]=useState(false)

  useEffect(()=>{loadProjects()},[sessionId])

  const loadProjects=async()=>{
    if(!sessionId)return
    setLoading(true)
    try{const r=await api.listProjects(sessionId);setProjects(r.projects||[])}
    catch(e){console.error(e)}finally{setLoading(false)}
  }

  const handleFileSelect=(file)=>{
    if(!file)return
    if(!file.name.toLowerCase().endsWith('.zip')){setError('Only ZIP files supported');return}
    setSelectedFile(file);setShowMetadataForm(true);setError('')
  }

  const handleFileUpload=async()=>{
    if(!selectedFile)return
    setUploading(true);setError('')
    try{await api.uploadProject(selectedFile,sessionId,metadata);await loadProjects();setShowMetadataForm(false);setSelectedFile(null);setMetadata({project_date:'',is_team_project:false,team_size:'',your_role:''})}
    catch(e){setError(e.message)}finally{setUploading(false)}
  }

  const openGitHubModal=async(project)=>{
    const rn=project.project_name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
    setRepoName(rn);setIsPrivate(false);setReadmePreview('');setReadmeEditMode(false);setGithubModal({project})
    setGeneratingReadme(true)
    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,
          messages:[{role:'user',content:`Generate a professional GitHub README.md for this project using proper markdown.\n\nProject: ${project.project_name}\nType: ${project.project_type}\nStack: ${(project.tech_stack||[]).join(', ')}\nDescription: ${project.cv_description}\nBullets:\n${(project.bullet_points||[]).map(b=>'- '+b).join('\n')}\n\nInclude: title, description, features, tech stack, installation, usage, license (MIT). Return ONLY the markdown, nothing else.`}]
        })
      })
      const data=await resp.json()
      setReadmePreview(data.content?.[0]?.text?.trim()||`# ${project.project_name}\n\n${project.cv_description}`)
    }catch(e){
      setReadmePreview(`# ${project.project_name}\n\n${project.cv_description}\n\n## Tech Stack\n${(project.tech_stack||[]).join(', ')}\n\n## Features\n${(project.bullet_points||[]).map(b=>'- '+b).join('\n')}\n\n## License\nMIT`)
    }finally{setGeneratingReadme(false)}
  }

  const pushToGitHub=async()=>{
    if(!repoName.trim()){alert('Enter a repository name');return}
    setCreatingRepo(true)
    try{
      const result=await api.createGitHubRepo(githubModal.project.id,repoName,isPrivate)
      alert(`✅ Repository created!\n${result.repo_url}`)
      await loadProjects();setGithubModal(null);window.open(result.repo_url,'_blank')
    }catch(e){alert(`Failed: ${e.message}\n\nMake sure GITHUB_TOKEN is set in your backend .env`)}
    finally{setCreatingRepo(false)}
  }

  const integrateToCV=async(projectId)=>{
    if(!confirm('Add this project to your CV?'))return
    setIntegrating(true)
    try{
      const result=await api.integrateProjectToCV(sessionId,projectId)
      const sc=result.ats_score_change>=0?`+${result.ats_score_change}`:result.ats_score_change
      if(confirm(`✅ Project added!\nNew ATS Score: ${result.ats_score}/100 (${sc})\n\nDownload updated CV?`))api.downloadCV(sessionId)
      await loadProjects();if(onCVUpdated)onCVUpdated(result)
    }catch(e){alert(`Failed: ${e.message}`)}finally{setIntegrating(false)}
  }

  const startEdit=(project)=>{setEditingProject(project.id);setEditDescription(project.cv_description);setEditBullets([...project.bullet_points])}
  const saveEdit=async()=>{
    try{await api.updateProject(editingProject,editDescription,editBullets);await loadProjects();setEditingProject(null)}
    catch(e){alert(`Failed: ${e.message}`)}
  }
  const deleteProject=async(projectId)=>{
    if(!confirm('Delete this project?'))return
    try{await api.deleteProject(projectId);await loadProjects()}catch(e){alert(e.message)}
  }

  return (
    <div>
      <div className="card" style={{ marginBottom:10,background:'linear-gradient(135deg,#FFF5F8,#FFF)',border:'1.5px solid var(--accent)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
          <div style={{ width:40,height:40,background:'var(--accent)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center' }}><Upload size={20} color="white"/></div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600,marginBottom:2 }}>Upload Project ZIP</div>
            <div style={{ fontSize:13,color:'var(--text-secondary)' }}>AI analyzes your code → CV bullets → Preview & push to GitHub</div>
          </div>
        </div>
        <input type="file" accept=".zip" onChange={e=>handleFileSelect(e.target.files[0])} style={{ display:'none' }} id="project-upload" disabled={uploading} />
        <button className="btn btn-primary" onClick={()=>document.getElementById('project-upload').click()} disabled={uploading} style={{ width:'100%',justifyContent:'center' }}>
          {uploading?<><Spinner/> Analyzing…</>:<><Upload size={14}/> Choose ZIP</>}
        </button>
        {error&&<div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 12px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',color:'var(--coral)',fontSize:13,marginTop:10,border:'1px solid #F5D0CD' }}><AlertCircle size={14}/> {error}</div>}
      </div>

      {loading?<div style={{ display:'flex',gap:8,alignItems:'center',padding:'2rem',justifyContent:'center',color:'var(--text-secondary)' }}><Spinner/> Loading…</div>
        :projects.length===0?<div style={{ textAlign:'center',padding:'3rem',color:'var(--text-secondary)' }}><div style={{ fontSize:48,marginBottom:12 }}>📦</div><div style={{ fontWeight:600,marginBottom:6 }}>No projects yet</div><div style={{ fontSize:13 }}>Upload a ZIP to get started</div></div>
        :projects.map(project=>(
          <div key={project.id} className="card" style={{ marginBottom:10,borderLeft:`3px solid ${project.integrated_to_cv?'var(--success)':'var(--accent)'}` }}>
            <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap' }}>
                  <div style={{ fontWeight:600,fontSize:15 }}>{project.project_name}</div>
                  <span className="badge badge-purple">{project.project_type}</span>
                  <span className={`badge ${project.complexity==='Expert'?'badge-coral':project.complexity==='Advanced'?'badge-amber':'badge-green'}`}>{project.complexity}</span>
                  {project.integrated_to_cv&&<span className="badge badge-green">✓ In CV</span>}
                </div>
                {editingProject===project.id
                  ?<textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} style={{ width:'100%',minHeight:60,marginBottom:8,fontSize:13 }} />
                  :<div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:8 }}>{project.cv_description}</div>}
                <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginBottom:8 }}>
                  {(project.tech_stack||[]).slice(0,8).map((t,i)=><span key={i} className="badge badge-blue">{t}</span>)}
                  {(project.tech_stack||[]).length>8&&<span className="badge">+{project.tech_stack.length-8} more</span>}
                </div>
              </div>
            </div>

            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase',marginBottom:6 }}>CV Bullets</div>
              {editingProject===project.id?(
                <div>
                  {editBullets.map((bullet,i)=>(
                    <div key={i} style={{ display:'flex',gap:6,marginBottom:6 }}>
                      <input value={bullet} onChange={e=>{const nb=[...editBullets];nb[i]=e.target.value;setEditBullets(nb)}} style={{ flex:1,fontSize:13 }} />
                      <button className="btn btn-ghost btn-sm" onClick={()=>setEditBullets(editBullets.filter((_,idx)=>idx!==i))}><X size={12}/></button>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={()=>setEditBullets([...editBullets,''])} style={{ marginTop:4 }}><PlusCircle size={12}/> Add bullet</button>
                </div>
              ):(project.bullet_points||[]).map((bullet,i)=><div key={i} style={{ fontSize:13,padding:'6px 10px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',borderLeft:'2px solid var(--accent)',marginBottom:4 }}>• {bullet}</div>)}
            </div>

            {project.github_url&&<div style={{ padding:'8px 12px',background:'var(--success-light)',borderRadius:'var(--radius-sm)',marginBottom:10,border:'1px solid #C5E8D6' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:13 }}>
                <Check size={14} color="var(--success)" /><span style={{ color:'var(--success)',fontWeight:500 }}>GitHub:</span>
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)',textDecoration:'none',display:'flex',alignItems:'center',gap:4 }}>{project.github_repo_name} <ExternalLink size={12}/></a>
              </div>
            </div>}

            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {editingProject===project.id?(
                <><button className="btn btn-primary btn-sm" onClick={saveEdit}><Save size={12}/> Save</button><button className="btn btn-ghost btn-sm" onClick={()=>setEditingProject(null)}><X size={12}/> Cancel</button></>
              ):(
                <>
                  <button className="btn btn-secondary btn-sm" onClick={()=>startEdit(project)}><Edit3 size={12}/> Edit</button>
                  {!project.github_url&&<button className="btn btn-primary btn-sm" onClick={()=>openGitHubModal(project)}>🐙 Preview & Push to GitHub</button>}
                  {!project.integrated_to_cv&&<button className="btn btn-primary btn-sm" onClick={()=>integrateToCV(project.id)} disabled={integrating}>{integrating?<><Spinner/> Adding…</>:<><PlusCircle size={12}/> Add to CV</>}</button>}
                  <button className="btn btn-ghost btn-sm" onClick={()=>deleteProject(project.id)} style={{ color:'var(--coral)' }}><X size={12}/> Delete</button>
                </>
              )}
            </div>
          </div>
        ))}

      {/* Metadata form modal */}
      {showMetadataForm&&selectedFile&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
          <div className="card" style={{ maxWidth:520,width:'100%',padding:'1.5rem',maxHeight:'90vh',overflowY:'auto' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
              <div><div style={{ fontWeight:700,fontSize:15,marginBottom:4 }}>Project Details</div><div style={{ fontSize:12,color:'var(--text-secondary)' }}>Help AI generate better CV bullets</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setShowMetadataForm(false);setSelectedFile(null)}}><X size={14}/></button>
            </div>
            <div style={{ padding:'10px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',fontSize:12,marginBottom:14 }}><strong>File:</strong> {selectedFile.name}</div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:6,display:'block' }}>Project Date (optional)</label>
              <input value={metadata.project_date} onChange={e=>setMetadata({...metadata,project_date:e.target.value})} placeholder="e.g., Jan 2024 - Mar 2024" style={{ width:'100%' }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:8 }}>
                <input type="checkbox" checked={metadata.is_team_project} onChange={e=>setMetadata({...metadata,is_team_project:e.target.checked})} />
                <span style={{ fontSize:13,fontWeight:500 }}>Team project</span>
              </label>
              {metadata.is_team_project&&<input type="number" value={metadata.team_size} onChange={e=>setMetadata({...metadata,team_size:e.target.value})} placeholder="Team size" style={{ width:'100%' }} min="2" />}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:6,display:'block' }}>Your Role <span style={{ color:'var(--coral)' }}>*</span></label>
              <textarea value={metadata.your_role} onChange={e=>setMetadata({...metadata,your_role:e.target.value})} placeholder="What exactly did YOU do? Include specific contributions and metrics." style={{ width:'100%',minHeight:90 }} />
              <div style={{ fontSize:11,color:'var(--text-tertiary)',marginTop:4 }}>The more specific, the better your AI-generated bullets will be.</div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading||!metadata.your_role.trim()} style={{ flex:1,justifyContent:'center' }}>{uploading?<><Spinner/> Analyzing…</>:<><Zap size={14}/> Analyze Project</>}</button>
              <button className="btn btn-ghost" onClick={()=>{setShowMetadataForm(false);setSelectedFile(null)}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub modal — README preview/edit BEFORE pushing */}
      {githubModal&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(45,26,36,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem' }}>
          <div className="card" style={{ maxWidth:740,width:'100%',maxHeight:'93vh',display:'flex',flexDirection:'column',padding:'1.5rem' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',flexShrink:0 }}>
              <div style={{ fontWeight:700,fontSize:15 }}>🐙 Preview & Push to GitHub</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setGithubModal(null)}><X size={14}/></button>
            </div>

            {/* Repo settings */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:10,marginBottom:10,flexShrink:0,alignItems:'center' }}>
              <div>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:4,display:'block' }}>Repository name</label>
                <input value={repoName} onChange={e=>setRepoName(e.target.value)} placeholder="my-awesome-project" style={{ fontFamily:'monospace',fontSize:13 }} />
              </div>
              <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginTop:16 }}>
                <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} />Private
              </label>
            </div>

            {/* README section */}
            <div style={{ flex:1,display:'flex',flexDirection:'column',minHeight:0,marginBottom:10 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexShrink:0 }}>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--text-tertiary)',textTransform:'uppercase' }}>
                  README.md — {generatingReadme?'Generating…':'Review & edit before pushing'}
                </div>
                {!generatingReadme&&<button className="btn btn-ghost btn-sm" onClick={()=>setReadmeEditMode(m=>!m)}>
                  {readmeEditMode?<><Eye size={12}/> Preview</>:<><Edit3 size={12}/> Edit README</>}
                </button>}
              </div>

              {generatingReadme?(
                <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'var(--text-secondary)',background:'var(--surface-pink)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
                  <Spinner/> Generating README with AI…
                </div>
              ):readmeEditMode?(
                <textarea
                  value={readmePreview}
                  onChange={e=>setReadmePreview(e.target.value)}
                  style={{ flex:1,fontFamily:'monospace',fontSize:12,resize:'none',minHeight:300,background:'#1e1e2e',color:'#cdd6f4',padding:'16px',border:'none',borderRadius:'var(--radius)',outline:'none' }}
                />
              ):(
                <div style={{ flex:1,overflowY:'auto',background:'white',borderRadius:'var(--radius)',border:'1px solid var(--border)',padding:'20px 24px',fontSize:13,lineHeight:1.75,fontFamily:'Georgia,serif',whiteSpace:'pre-wrap',color:'#1A1A2E' }}>
                  {readmePreview}
                </div>
              )}
            </div>

            <div style={{ padding:'10px 12px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--accent2-dark)',marginBottom:12,flexShrink:0 }}>
              <strong>📝 What you see above is what gets pushed.</strong> Edit the README if needed, then click Push to GitHub.
            </div>

            <div style={{ display:'flex',gap:8,flexShrink:0 }}>
              <button className="btn btn-primary" onClick={pushToGitHub} disabled={creatingRepo||generatingReadme||!repoName.trim()} style={{ flex:1,justifyContent:'center' }}>
                {creatingRepo?<><Spinner/> Creating repo…</>:<>🐙 Push to GitHub</>}
              </button>
              <button className="btn btn-ghost" onClick={()=>setGithubModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ROOT APP ──────────────────────────────────────────────────
const TABS = [
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
  const [rawCVText,setRawCVText]=useState('')

  const sessionId = profile?.session_id || localStorage.getItem('session_id')

  useEffect(()=>{
    const savedEmail=localStorage.getItem('cc_email')
    if(savedEmail){
      const users=loadUsers(), u=users[savedEmail]
      if(u){
        setAuthUser({email:savedEmail,userData:u})
        if(u.profiles?.length>0){
          const last=u.profiles[u.profiles.length-1]
          setProfile(last); setCvHistory(u.cvHistory||[])
        }
      }
    }
  },[])

  // Load raw CV text for JD analyzer
  useEffect(()=>{
    if(!sessionId)return
    api.getRawCV(sessionId).then(r=>setRawCVText(r.raw_text||'')).catch(()=>{})
  },[sessionId])

  const loadApplications=useCallback(async()=>{
    if(!sessionId)return
    try{const a=await api.listApplications(sessionId);setApplications(a)}catch{}
  },[sessionId])

  useEffect(()=>{loadApplications()},[loadApplications])

  const handleAuth=({email,userData})=>{
    setAuthUser({email,userData}); localStorage.setItem('cc_email',email)
    if(userData.profiles?.length>0){
      const last=userData.profiles[userData.profiles.length-1]
      setProfile(last); setCvHistory(userData.cvHistory||[])
      localStorage.setItem('session_id',last.session_id)
    }
  }

  const handleUploaded=(result)=>{
    const email=authUser?.email, users=loadUsers()
    const u=users[email]||{password:'',profiles:[],cvHistory:[],applications:[]}
    const newVersion=(u.cvHistory?.length||0)+1
    const histEntry={version:newVersion,ats_score:result.ats_score,uploaded_at:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),session_id:result.session_id}
    const oldProfile=profile
    u.profiles=[...(u.profiles||[]),{...result}]
    u.cvHistory=[...(u.cvHistory||[]),histEntry]
    users[email]=u; saveUsers(users)
    setPrevProfile(oldProfile); setProfile({...result}); setCvHistory(u.cvHistory)
    setShowUpload(false); setTab('dashboard')
    if(oldProfile&&newVersion>1)setShowCompare(true)
  }

  const handleCVSaved=(result)=>{
    const email=authUser?.email, users=loadUsers()
    const u=users[email]||{}
    if(u.profiles?.length>0)u.profiles[u.profiles.length-1]={...result}
    else u.profiles=[{...result}]
    users[email]=u; saveUsers(users); setProfile({...result})
    setRawCVText(result.raw_text||rawCVText)
  }

  const handleCreateApp=async(company,role,applyUrl,jdText)=>{
    if(!sessionId)throw new Error('Upload your CV first')
    await api.createApplication(sessionId,company,role,applyUrl,jdText)
    await loadApplications()
  }

  const handleLogout=()=>{
    localStorage.removeItem('session_id'); localStorage.removeItem('cc_email')
    setAuthUser(null); setProfile(null); setCvHistory([]); setApplications([]); setPrevProfile(null); setShowCompare(false); setRawCVText('')
  }

  if(!authUser) return <AuthScreen onAuth={handleAuth} />
  if(!profile||showUpload) return <UploadScreen onUploaded={handleUploaded} isReupload={!!profile} prevProfile={profile} onBack={profile?()=>setShowUpload(false):undefined} />

  return (
    <div style={{ display:'flex',minHeight:'100vh',overflow:'hidden' }}>
      {/* Sidebar */}
      <div style={{ width:200,background:'white',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'1rem 0',flexShrink:0,boxShadow:'1px 0 12px rgba(196,84,122,0.06)',overflowY:'auto' }}>
        <div style={{ padding:'0 1rem 1rem',borderBottom:'1px solid var(--border-light)',marginBottom:'0.75rem' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
            <div style={{ width:32,height:32,background:'linear-gradient(135deg,#C4547A,#D4729A)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(196,84,122,0.3)' }}><Sparkles size={16} color="white"/></div>
            <div><div style={{ fontWeight:700,fontSize:13,letterSpacing:'-0.01em' }}>Career Copilot</div><div style={{ fontSize:10,color:'var(--text-secondary)' }}>Any field · Any role</div></div>
          </div>
          <div style={{ padding:'8px 10px',background:'var(--surface-pink)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:600,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{authUser.userData?.name||authUser.email}</div>
            <div style={{ fontSize:10,color:'var(--text-tertiary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{authUser.email}</div>
            <div style={{ fontSize:11,color:'var(--accent)',marginTop:2,fontWeight:500 }}>ATS: {profile.ats_score}/100 · v{cvHistory.length}</div>
            {cvHistory.length>1&&<button className="btn btn-ghost btn-sm" style={{ marginTop:5,width:'100%',fontSize:10,padding:'2px 6px',borderRadius:20 }} onClick={()=>setShowCompare(true)}><History size={10}/> Compare versions</button>}
          </div>
        </div>
        {TABS.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ display:'flex',alignItems:'center',gap:9,padding:'9px 1rem',fontSize:13,fontWeight:tab===id?600:400,color:tab===id?'var(--accent)':'var(--text-secondary)',background:tab===id?'linear-gradient(90deg,var(--accent-light),transparent)':'transparent',border:'none',cursor:'pointer',textAlign:'left',borderLeft:tab===id?'3px solid var(--accent)':'3px solid transparent',transition:'all 0.12s' }}>
            <Icon size={15}/>{label}
            {id==='tracker'&&applications.length>0&&<span style={{ marginLeft:'auto',background:'var(--accent-light)',color:'var(--accent)',borderRadius:20,padding:'1px 6px',fontSize:10,fontWeight:600 }}>{applications.length}</span>}
          </button>
        ))}
        <div style={{ marginTop:'auto',padding:'0.75rem 1rem',borderTop:'1px solid var(--border-light)',display:'flex',flexDirection:'column',gap:6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%',justifyContent:'center',borderRadius:20 }} onClick={()=>setShowUpload(true)}><Upload size={12}/> New CV</button>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%',justifyContent:'center',borderRadius:20 }} onClick={handleLogout}><LogOut size={12}/> Log out</button>
        </div>
      </div>

      {/* Main content — editcv gets full height, no padding, no scroll (editor handles it) */}
      <div style={{ flex:1, overflow: tab==='editcv'?'hidden':'auto', padding: tab==='editcv'?0:'1.25rem' }}>
        <div style={{ maxWidth: tab==='editcv'?'none':1100, margin:'0 auto', height: tab==='editcv'?'100%':undefined }}>
          {tab==='dashboard'&&<Dashboard profile={profile} applications={applications}/>}
          {tab==='analytics'&&<CVAnalytics sessionId={sessionId}/>}
          {tab==='jobs'&&<JobsBoard sessionId={sessionId} profile={profile} onCreateApp={handleCreateApp}/>}
          {tab==='jd'&&<JDAnalyzer sessionId={sessionId} onCreateApp={handleCreateApp} currentCVText={rawCVText}/>}
          {tab==='projects'&&<Projects sessionId={sessionId} profile={profile} onCVUpdated={handleCVSaved}/>}
          {tab==='editcv'&&<EditCV sessionId={sessionId} profile={profile} onSaved={handleCVSaved}/>}
          {tab==='bullets'&&<BulletRewriter profile={profile}/>}
          {tab==='tracker'&&<ApplicationsTracker sessionId={sessionId} applications={applications} onRefresh={loadApplications}/>}
          {tab==='interview'&&<InterviewPrep sessionId={sessionId}/>}
          {tab==='upskill'&&<Upskill profile={profile}/>}
        </div>
      </div>

      {showCompare&&prevProfile&&<CVCompareModal oldProfile={prevProfile} newProfile={profile} cvHistory={cvHistory} onClose={()=>setShowCompare(false)}/>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
