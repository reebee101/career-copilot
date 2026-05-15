import { useState, useEffect, useCallback } from 'react'
import {
  Upload, LayoutDashboard, Search, FileText, List, Mic, Award,
  Zap, RefreshCw, ChevronRight, X, Check, AlertCircle, Loader,
  ExternalLink, Bot, Briefcase, TrendingUp, Target, Send,
  PlusCircle, LogIn, LogOut, History, GitCompare, User, Lock, Sparkles, Edit3, Save
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
function EditCV({ sessionId, profile, onSaved }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const r = await api.getRawCV(sessionId)
        setText(r.raw_text || '')
        setCharCount((r.raw_text || '').length)
      } catch(e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const save = async () => {
    if (text.trim().length < 100) {
      setError('CV text is too short (min 100 characters).')
      return
    }
    setSaving(true); setError(''); setSaved(false)
    try {
      const result = await api.editCV(sessionId, text)
      setSaved(true)
      onSaved(result)
      setTimeout(() => setSaved(false), 3000)
    } catch(e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'4rem',gap:10,color:'var(--text-secondary)' }}>
      <Spinner /> Loading your CV...
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:700,fontSize:16 }}>Edit your CV</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:2 }}>
            Edit the text below and click Save — your ATS score will be recalculated instantly.
          </div>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <span style={{ fontSize:12,color:'var(--text-tertiary)' }}>{charCount.toLocaleString()} chars</span>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner /> Re-analyzing…</> : saved ? <><Check size={14}/> Saved!</> : <><Save size={14}/> Save & re-score</>}
          </button>
        </div>
      </div>

      {saved && (
        <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'var(--success-light)',borderRadius:'var(--radius-sm)',marginBottom:10,border:'1px solid #C5E8D6',fontSize:13,color:'var(--success)' }}>
          <Check size={14}/> CV saved and re-scored! Check your Dashboard for the updated ATS score.
        </div>
      )}
      {error && (
        <div style={{ display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'var(--coral-light)',borderRadius:'var(--radius-sm)',marginBottom:10,border:'1px solid #F5D0CD',fontSize:13,color:'var(--coral)' }}>
          <AlertCircle size={14}/> {error}
        </div>
      )}

      <div style={{ position:'relative' }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setCharCount(e.target.value.length) }}
          style={{
            width:'100%',
            minHeight:'65vh',
            fontFamily:"DM Mono, Fira Code, Courier New, monospace",
            fontSize:13,
            lineHeight:1.7,
            padding:'1rem',
            border:'1.5px solid var(--border)',
            borderRadius:'var(--radius)',
            background:'white',
            color:'var(--text)',
            resize:'vertical',
          }}
          placeholder="Your CV text will appear here..."
          spellCheck={false}
        />
      </div>

      <div style={{ marginTop:10,padding:'10px 14px',background:'var(--accent2-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--accent2-dark)',border:'1px solid var(--border-blue)' }}>
        <strong>Tips:</strong> Add quantified achievements (e.g. "increased sales by 30%"), include keywords from job descriptions you're targeting, and make sure your job titles are clear. Each save re-runs the full ATS analysis.
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

  const updateStatus=async(appId,status)=>{ try{await api.updateApplicationStatus(appId,status);onRefresh()}catch(e){alert(e.message)} }
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

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:10 }}>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}><PlusCircle size={13}/> Add manually</button>
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

// ── ROOT APP ──────────────────────────────────────────────────
const TABS=[
  {id:'dashboard',label:'Dashboard',Icon:LayoutDashboard},
  {id:'jobs',label:'Jobs',Icon:Briefcase},
  {id:'jd',label:'JD Analyzer',Icon:Target},
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
          {tab==='jobs'&&<JobsBoard sessionId={sessionId} profile={profile} onCreateApp={handleCreateApp}/>}
          {tab==='jd'&&<JDAnalyzer sessionId={sessionId} onCreateApp={handleCreateApp}/>}
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
