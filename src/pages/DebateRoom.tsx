import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import RotatingHint from '@/components/RotatingHint'
import { useTheme } from '@/hooks/useTheme'
import { ArrowLeft, Sun, Moon, Brain } from 'lucide-react'

type Phase = 'loading' | 'reading' | 'chat' | 'rating' | 'refine' | 'ended' | 'requeuing'
type Message = { id: string; user_id: string; content: string; created_at: string }

export default function DebateRoom() {
  const { id: debateId } = useParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [debate, setDebate] = useState<any>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [timerSecs, setTimerSecs] = useState(180)
  const [canLeave, setCanLeave] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [mindChangedDone, setMindChangedDone] = useState(false)
  const [showRefinePanel, setShowRefinePanel] = useState(false)
  const [liveArg, setLiveArg] = useState('')
  const [savingLive, setSavingLive] = useState(false)
  const [ratings, setRatings] = useState({ argument: 0, behavior: 0 })
  const [refinedArg, setRefinedArg] = useState('')
  const [sending, setSending] = useState(false)
  const [requeueStatus, setRequeueStatus] = useState('Finding you a new opponent...')
  const chatRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<any>(null)
  const debateRef = useRef<any>(null)
  const userRef = useRef<any>(null)
  const phaseRef = useRef<Phase>('loading')

  useEffect(() => { phaseRef.current = phase }, [phase])

  const updatePhase = (d: any, _u: any) => {
    if (d.status === 'waiting') { setPhase('loading'); return }
    if (d.status === 'reading') { setPhase('reading'); return }
    if (d.status === 'active') { setPhase('chat'); startTimer(d) }
    if (d.status === 'ended' && !d.ended_reason) setPhase('ended')
  }

  // Try to advance reading→active when both players are ready
  const tryAdvanceToActive = async (d: any) => {
    if (!d.for_ready || !d.against_ready || d.status !== 'reading') return
    const timerEnd = new Date(Date.now() + 3 * 60 * 1000).toISOString()
    // Use conditional update so only one client wins the race
    const { data: updated } = await supabase
      .from('debates')
      .update({ status: 'active', timer_end: timerEnd })
      .eq('id', d.id)
      .eq('status', 'reading')    // only fires if still 'reading'
      .select('*')
      .single()
    if (updated) {
      setDebate(updated)
      debateRef.current = updated
      updatePhase(updated, userRef.current)
    }
  }

  useEffect(() => {
    let channel: any = null
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/auth'); return }
      setUser(data.user)
      userRef.current = data.user
      const init = async (u: any) => {
        const { data: debateData } = await supabase.from('debates').select('*').eq('id', debateId).single()
        if (!debateData) { navigate('/'); return }

        // If this debate was already ended/abandoned, send user back
        if (debateData.status === 'ended') { navigate('/dashboard'); return }

        setDebate(debateData)
        debateRef.current = debateData
        updatePhase(debateData, u)
        // If both already ready when we join, advance immediately
        await tryAdvanceToActive(debateData)

        channel = supabase.channel(`debate-room-${debateId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'debates', filter: `id=eq.${debateId}` },
            async (payload) => {
              const d = payload.new
              setDebate(d); debateRef.current = d
              if (d.status === 'ended') {
                if (d.ended_reason === 'disconnect' || d.ended_reason === 'abandoned') {
                  if (phaseRef.current !== 'rating' && phaseRef.current !== 'refine') {
                    setPhase('requeuing'); autoRequeue(u, d)
                  }
                } else if (!d.ended_reason) {
                  // Normal chat-end — move both users to rating if they're still in chat
                  if (phaseRef.current === 'chat') {
                    phaseRef.current = 'rating'
                    setPhase('rating')
                  }
                }
                return
              }
              if (phaseRef.current !== 'rating' && phaseRef.current !== 'refine') {
                // If both ready but status still reading, advance
                if (d.for_ready && d.against_ready && d.status === 'reading') {
                  await tryAdvanceToActive(d)
                } else {
                  updatePhase(d, u)
                }
              }
            })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `debate_id=eq.${debateId}` },
            (payload) => {
              setMessages(prev => [...prev, payload.new as Message])
              setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50)
            })
          .subscribe()
        const { data: msgs } = await supabase.from('messages').select('*').eq('debate_id', debateId).order('created_at')
        if (msgs) setMessages(msgs)
      }
      init(data.user)
    })
    return () => {
      // On unmount, clean up the debate so the other user isn't left hanging
      const d = debateRef.current
      const p = phaseRef.current
      if (d) {
        if (p === 'loading') {
          // Cancel waiting debate — prevents other users from joining a ghost room
          supabase.from('debates')
            .update({ status: 'ended', ended_reason: 'abandoned' })
            .eq('id', d.id)
            .eq('status', 'waiting')
            .then(() => {})
        } else if (p === 'reading' || p === 'chat') {
          // Signal disconnect to opponent so they get requeued
          supabase.from('debates')
            .update({ status: 'ended', ended_reason: 'disconnect' })
            .eq('id', d.id)
            .in('status', ['reading', 'active'])
            .then(() => {})
        }
      }
      if (channel) channel.unsubscribe()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [debateId])

  // Polling fallback — 1.5 s for loading/reading, 3 s during chat
  useEffect(() => {
    if (phase !== 'loading' && phase !== 'reading' && phase !== 'chat') return
    const interval = phase === 'chat' ? 3000 : 1500
    const poll = setInterval(async () => {
      const { data } = await supabase.from('debates').select('*').eq('id', debateId).single()
      if (!data) return

      if (data.status === 'ended') {
        if (data.ended_reason === 'abandoned' || data.ended_reason === 'disconnect') {
          if (phaseRef.current !== 'rating' && phaseRef.current !== 'refine') {
            clearInterval(poll); setPhase('requeuing'); autoRequeue(userRef.current, data)
          }
        } else if (!data.ended_reason && phaseRef.current === 'chat') {
          // Other user clicked "Done debating" — move to rating
          phaseRef.current = 'rating'; setPhase('rating')
        }
        return
      }

      if (phase === 'loading' || phase === 'reading') {
        const expectedStatus = phase === 'loading' ? 'waiting' : 'reading'
        if (data.status !== expectedStatus) {
          setDebate(data); debateRef.current = data
          updatePhase(data, userRef.current)
        } else if (phase === 'reading' && data.for_ready && data.against_ready) {
          await tryAdvanceToActive(data)
        }
      }
    }, interval)
    return () => clearInterval(poll)
  }, [phase, debateId])

  const startTimer = (d: any) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (d.timer_end) {
      const tick = () => {
        const secs = Math.max(0, Math.floor((new Date(d.timer_end).getTime() - Date.now()) / 1000))
        setTimerSecs(secs)
        if (secs <= 0) { clearInterval(timerRef.current); setCanLeave(true) }
      }
      tick(); timerRef.current = setInterval(tick, 1000)
    }
  }

  const autoRequeue = async (u: any, d: any) => {
    setRequeueStatus('Opponent left. Finding you a new match...')
    const mySide = d.for_user_id === u.id ? 'for' : 'against'
    const myArg = d.for_user_id === u.id ? d.for_argument : d.against_argument
    const oppSide = mySide === 'for' ? 'against' : 'for'
    await new Promise(res => setTimeout(res, 1500))
    const { data: existing } = await supabase.from('debates').select('id')
      .eq('topic_id', d.topic_id).eq('status', 'waiting')
      .is(mySide === 'for' ? 'for_user_id' : 'against_user_id', null)
      .not(oppSide === 'for' ? 'for_user_id' : 'against_user_id', 'is', null)
      .neq(oppSide === 'for' ? 'for_user_id' : 'against_user_id', u.id)
      .limit(1).maybeSingle()
    if (existing) {
      const updateField = mySide === 'for'
        ? { for_user_id: u.id, for_argument: myArg, status: 'reading' }
        : { against_user_id: u.id, against_argument: myArg, status: 'reading' }
      const { data: updated } = await supabase.from('debates').update(updateField).eq('id', existing.id).select('id').single()
      if (updated) { navigate(`/debate/${updated.id}`); return }
    }
    const insertData: any = { topic_id: d.topic_id, topic_title: d.topic_title, status: 'waiting' }
    insertData[mySide === 'for' ? 'for_user_id' : 'against_user_id'] = u.id
    insertData[mySide === 'for' ? 'for_argument' : 'against_argument'] = myArg
    const { data: created } = await supabase.from('debates').insert(insertData).select('id').single()
    if (!created) { navigate('/dashboard'); return }
    setRequeueStatus('Waiting for a new opponent...')
    const waitChannel = supabase.channel(`requeue-${created.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'debates', filter: `id=eq.${created.id}` },
        (payload) => {
          if (payload.new.status === 'reading') { waitChannel.unsubscribe(); navigate(`/debate/${created.id}`) }
        }).subscribe()
  }

  const myArg = () => !debate || !user ? '' : debate.for_user_id === user.id ? debate.for_argument : debate.against_argument
  const oppArg = () => !debate || !user ? '' : debate.for_user_id === user.id ? debate.against_argument : debate.for_argument
  const mySide = () => !debate || !user ? '' : debate.for_user_id === user.id ? 'for' : 'against'

  const handleUnderstand = async () => {
    setUnderstood(true)
    const field = mySide() === 'for' ? { for_ready: true } : { against_ready: true }
    await supabase.from('debates').update(field).eq('id', debateId)
    // Re-fetch and try to advance — handles the case where opponent already clicked
    const { data } = await supabase.from('debates').select('*').eq('id', debateId).single()
    if (data) {
      setDebate(data); debateRef.current = data
      await tryAdvanceToActive(data)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    await supabase.from('messages').insert({ debate_id: debateId, user_id: user.id, content: input.trim() })
    setInput(''); setSending(false)
  }

  const handleMindChanged = async () => {
    if (mindChangedDone || !debate || !user) return
    setMindChangedDone(true)
    const oppId = mySide() === 'for' ? debate.against_user_id : debate.for_user_id
    await supabase.rpc('increment_changed_minds', { target_user_id: oppId })
    await supabase.from('messages').insert({ debate_id: debateId, user_id: user.id, content: '__mind_changed__' })
  }

  const saveLiveRefinement = async () => {
    if (!liveArg.trim() || savingLive) return
    setSavingLive(true)
    const { data: existing } = await supabase.from('arguments').select('id, version')
      .eq('user_id', user.id).eq('topic_id', debate.topic_id).eq('stance', mySide())
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing) {
      await supabase.from('arguments').update({ content: liveArg, version: existing.version + 1 }).eq('id', existing.id)
    }
    const argField = mySide() === 'for' ? { for_argument: liveArg } : { against_argument: liveArg }
    await supabase.from('debates').update(argField).eq('id', debateId)
    const updated = { ...debateRef.current, ...argField }
    setDebate(updated); debateRef.current = updated
    setSavingLive(false); setShowRefinePanel(false)
  }

  const handleLeave = async () => {
    phaseRef.current = 'rating'
    setPhase('rating')
    // Signal the other user — only the first caller wins the conditional update
    await supabase.from('debates')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', debateId)
      .eq('status', 'active')
  }

  const submitRating = async () => {
    const oppId = mySide() === 'for' ? debate.against_user_id : debate.for_user_id
    await supabase.from('ratings').insert({
      debate_id: debateId, rater_id: user.id, rated_id: oppId,
      engaged_argument: ratings.argument || 3, respectful: ratings.behavior || 3,
    })
    // Status is already 'ended' (set by handleLeave) — just move this user to refine
    phaseRef.current = 'refine'
    setRefinedArg(myArg())
    setPhase('refine')
  }

  const saveAndFinish = async () => {
    if (refinedArg.trim()) {
      const { data: existing } = await supabase.from('arguments').select('id, version')
        .eq('user_id', user.id).eq('topic_id', debate.topic_id).eq('stance', mySide())
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (existing) {
        await supabase.from('arguments').update({ content: refinedArg, version: existing.version + 1 }).eq('id', existing.id)
      }
    }
    navigate('/dashboard')
  }

  const mins = Math.floor(timerSecs / 60)
  const secs = timerSecs % 60
  const timerPct = (timerSecs / 180) * 100

  // ── Shared topbar ─────────────────────────────────────────────
  const Topbar = ({ showBack = true }: { showBack?: boolean }) => (
    <div className="topbar">
      {showBack ? (
        <button className="back-btn" onClick={() => navigate('/dashboard')} style={{ margin: 0 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> Dashboard
        </button>
      ) : <span />}
      <span className="logo" style={{ cursor: 'default' }}>
        <span className="dot" />
        <span>Debate Me Bro</span>
      </span>
      <button className="icon-btn-pill" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        {theme === 'dark' ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
      </button>
    </div>
  )

  // ── Loading phase ──────────────────────────────────────────────
  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Topbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div className="w-8 h-8 border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent', borderRadius: 0, marginBottom: 24 }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>
            Waiting for an opponent
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Another debater is being matched to your topic. This page will advance automatically.
          </p>
          <RotatingHint />
        </div>
      </div>
    </div>
  )

  // ── Requeuing phase ────────────────────────────────────────────
  if (phase === 'requeuing') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Topbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', padding: '0 24px' }}>
        <div className="dmb-card" style={{ maxWidth: 400, width: '100%', padding: '40px 32px', textAlign: 'center' }}>
          <div className="w-8 h-8 border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent', borderRadius: 0, marginBottom: 24 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 8px' }}>Finding a new opponent</h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 6 }}>{requeueStatus}</p>
          <p style={{ color: 'var(--ink-4)', fontSize: 12, marginBottom: 24 }}>This page will advance automatically when matched.</p>
          <RotatingHint />
          <button
            onClick={() => navigate('/dashboard')}
            style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            Change topic instead
          </button>
        </div>
      </div>
    </div>
  )

  // ── Main debate shell ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <Topbar showBack={phase === 'ended'} />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Reading phase ──────────────────────────────────── */}
        {phase === 'reading' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p className="kicker">Step 01 of 03</p>
              <h2 className="page-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 8 }}>Read their opening</h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                Chat unlocks once both sides confirm they've read the other's argument.
              </p>
            </div>

            {/* Two-column argument comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {/* My argument */}
              <div style={{ background: 'var(--surface)', border: `2px solid var(--color-primary)`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Your argument</span>
                  <span className={`dmb-pill ${mySide()}`}>{mySide().toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{myArg()}</p>
              </div>

              {/* Opponent's argument */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Their argument</span>
                  <span className={`dmb-pill ${mySide() === 'for' ? 'against' : 'for'}`}>
                    {mySide() === 'for' ? 'AGAINST' : 'FOR'}
                  </span>
                </div>
                {oppArg() ? (
                  <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{oppArg()}</p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>Waiting for opponent…</p>
                )}
              </div>
            </div>

            <button
              onClick={handleUnderstand}
              disabled={understood}
              className={understood ? 'dmb-btn ghost' : 'dmb-btn'}
              style={{ width: '100%', justifyContent: 'center', opacity: understood ? 0.7 : 1 }}
            >
              {understood ? '✓ Understood — waiting for opponent…' : 'I understand their side'}
            </button>

            {understood && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 12, fontFamily: 'var(--font-mono)' }}>
                Waiting for the other side to confirm…
              </p>
            )}
          </div>
        )}

        {/* ── Chat phase ─────────────────────────────────────── */}
        {phase === 'chat' && (
          <div>
            {/* Header: topic + timer */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <h2 className="chat-topic" style={{ flex: 1 }}>{debate?.topic_title}</h2>
                {canLeave ? (
                  <button onClick={handleLeave} className="dmb-btn sm">
                    Done debating →
                  </button>
                ) : (
                  <span className="timer">
                    {mins}:{secs.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              {!canLeave && (
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${timerPct}%`, transition: 'width 1s linear' }} />
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={chatRef} className="chat-msgs">
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                  <p style={{ color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                    Chat is open. Make your first move.
                  </p>
                </div>
              )}
              {messages.map(m => {
                if (m.content === '__mind_changed__') {
                  const isOwn = m.user_id === user?.id
                  return (
                    <div key={m.id} style={{ alignSelf: 'center', width: '100%', maxWidth: '90%' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                        background: 'oklch(0.55 0.22 25 / 0.08)', border: '1px solid oklch(0.55 0.22 25 / 0.25)',
                        color: 'var(--color-primary)', fontSize: 13, justifyContent: 'center',
                      }}>
                        <Brain style={{ width: 13, height: 13 }} />
                        <span style={{ fontWeight: 600 }}>
                          {isOwn ? 'You changed your mind' : 'They changed their mind'}
                        </span>
                        {!isOwn && <span style={{ fontSize: 11, opacity: 0.7 }}>— credited to their profile</span>}
                      </div>
                    </div>
                  )
                }
                const isOwn = m.user_id === user?.id
                return (
                  <div key={m.id} className={`msg ${isOwn ? 'self' : 'other'}`}>
                    <div className="msg-bubble">{m.content}</div>
                    {!isOwn && (
                      <button
                        onClick={handleMindChanged}
                        disabled={mindChangedDone}
                        style={{
                          background: 'none', border: 'none', cursor: mindChangedDone ? 'default' : 'pointer',
                          fontSize: 11, color: mindChangedDone ? 'var(--ink-4)' : 'var(--ink-3)',
                          fontFamily: 'var(--font-mono)', padding: '2px 0',
                          transition: 'color 0.1s',
                        }}
                        onMouseEnter={e => { if (!mindChangedDone) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)' }}
                        onMouseLeave={e => { if (!mindChangedDone) (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)' }}
                      >
                        {mindChangedDone ? '✓ changed my mind' : '↩ changed my mind'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* In-chat refine panel */}
            {showRefinePanel && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    Refine your argument
                  </span>
                  <button onClick={() => setShowRefinePanel(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
                <textarea
                  value={liveArg}
                  onChange={e => setLiveArg(e.target.value)}
                  placeholder="Revise your argument with what you're learning…"
                  style={{
                    width: '100%', minHeight: 90, resize: 'vertical', padding: '10px 12px',
                    background: 'var(--bg-2)', border: '1px solid var(--rule)', color: 'var(--ink)',
                    fontSize: 13, lineHeight: 1.55, outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit', transition: 'border-color 0.1s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink-3)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
                />
                <button
                  onClick={saveLiveRefinement}
                  disabled={savingLive || !liveArg.trim()}
                  className="dmb-btn sm"
                  style={{ marginTop: 8, opacity: savingLive || !liveArg.trim() ? 0.4 : 1 }}
                >
                  {savingLive ? 'Saving…' : 'Save revision'}
                </button>
              </div>
            )}

            {/* Input row */}
            <div className="chat-input-row">
              <button
                onClick={() => { if (!showRefinePanel) setLiveArg(myArg()); setShowRefinePanel(v => !v) }}
                className="dmb-btn ghost sm"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                ✎ refine
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Make your point…"
                className="chat-input"
              />
              <button onClick={sendMessage} disabled={sending} className="dmb-btn sm" style={{ opacity: sending ? 0.5 : 1, flexShrink: 0 }}>
                Send
              </button>
            </div>

            {!canLeave && (
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', marginTop: 12, fontFamily: 'var(--font-mono)' }}>
                Minimum 3 minutes — then you can leave
              </p>
            )}
          </div>
        )}

        {/* ── Rating phase ───────────────────────────────────── */}
        {phase === 'rating' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p className="kicker">Rate your opponent</p>
              <h2 className="page-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 8 }}>Before you go</h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                Two quick ratings — not on who was right, on how they argued.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 32 }}>
              {/* Argument quality */}
              <div className="dmb-card" style={{ padding: '22px 24px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>How strong was their argument?</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>Rate the quality of reasoning, regardless of whether you agree with their position.</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(r => ({ ...r, argument: n }))}
                      style={{
                        fontSize: 26, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                        color: ratings.argument >= n ? 'var(--color-primary)' : 'var(--ink-4)',
                        transition: 'color 0.1s, transform 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
                    >★</button>
                  ))}
                </div>
              </div>

              {/* Conduct */}
              <div className="dmb-card" style={{ padding: '22px 24px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>How did they conduct themselves?</p>
                <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>Were they respectful, engaging with your points, and genuinely trying to articulate their side?</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(r => ({ ...r, behavior: n }))}
                      style={{
                        fontSize: 26, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                        color: ratings.behavior >= n ? 'var(--color-primary)' : 'var(--ink-4)',
                        transition: 'color 0.1s, transform 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
                    >★</button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={submitRating}
              disabled={ratings.argument === 0 || ratings.behavior === 0}
              className="dmb-btn lg"
              style={{ width: '100%', justifyContent: 'center', opacity: ratings.argument === 0 || ratings.behavior === 0 ? 0.4 : 1 }}
            >
              Submit &amp; refine my argument →
            </button>
          </div>
        )}

        {/* ── Refine phase ───────────────────────────────────── */}
        {phase === 'refine' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <p className="kicker">Step 03 of 03</p>
              <h2 className="page-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginBottom: 8 }}>Refine your argument</h2>
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>You've debated. Now make it stronger.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Your original</p>
                <div className="dmb-card" style={{ padding: '16px 18px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{myArg()}</div>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Their argument</p>
                <div className="dmb-card" style={{ padding: '16px 18px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{oppArg()}</div>
              </div>
            </div>

            <textarea
              value={refinedArg}
              onChange={e => setRefinedArg(e.target.value)}
              placeholder="Rewrite your argument with what you've learned…"
              className="dmb-input dmb-textarea"
              style={{ minHeight: 140, marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => navigate('/dashboard')} className="dmb-btn ghost">
                Skip
              </button>
              <button onClick={saveAndFinish} className="dmb-btn">
                Save &amp; view profile →
              </button>
            </div>
          </div>
        )}

        {/* ── Ended phase ────────────────────────────────────── */}
        {phase === 'ended' && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p className="kicker" style={{ justifyContent: 'center' }}>Debate complete</p>
            <h2 className="page-title" style={{ marginBottom: 12 }}>Well argued.</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 32 }}>Thanks for keeping it real.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard')} className="dmb-btn">
                Debate again
              </button>
              <button onClick={() => navigate('/dashboard')} className="dmb-btn ghost">
                My profile
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
