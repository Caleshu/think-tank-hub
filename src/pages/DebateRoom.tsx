import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type Phase = 'loading' | 'reading' | 'chat' | 'rating' | 'refine' | 'ended' | 'requeuing'
type Message = { id: string; user_id: string; content: string; created_at: string }

export default function DebateRoom() {
  const { id: debateId } = useParams()
  const navigate = useNavigate()

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

  // Keep phaseRef in sync so async callbacks can check current phase
  useEffect(() => { phaseRef.current = phase }, [phase])

  const updatePhase = (d: any, _u: any) => {
    if (d.status === 'waiting') { setPhase('loading'); return }
    if (d.status === 'reading') { setPhase('reading'); return }
    if (d.status === 'active') { setPhase('chat'); startTimer(d) }
    if (d.status === 'ended' && !d.ended_reason) setPhase('ended')
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
        setDebate(debateData)
        debateRef.current = debateData
        updatePhase(debateData, u)
        channel = supabase.channel(`debate-room-${debateId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'debates', filter: `id=eq.${debateId}` },
            (payload) => {
              const d = payload.new
              setDebate(d); debateRef.current = d
              if (d.status === 'ended' && d.ended_reason === 'disconnect') {
                if (phaseRef.current !== 'rating' && phaseRef.current !== 'refine') {
                  setPhase('requeuing'); autoRequeue(u, d)
                }
                return
              }
              // Don't interrupt rating/refine — user is finishing their session
              if (phaseRef.current !== 'rating' && phaseRef.current !== 'refine') {
                updatePhase(d, u)
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
    return () => { if (channel) channel.unsubscribe(); if (timerRef.current) clearInterval(timerRef.current) }
  }, [debateId])

  // Polling fallback: catches realtime events missed during loading and reading phases
  useEffect(() => {
    if (phase !== 'loading' && phase !== 'reading') return
    const expectedStatus = phase === 'loading' ? 'waiting' : 'reading'
    const poll = setInterval(async () => {
      const { data } = await supabase.from('debates').select('*').eq('id', debateId).single()
      if (data && data.status !== expectedStatus) {
        setDebate(data)
        debateRef.current = data
        updatePhase(data, userRef.current)
      }
    }, 3000)
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
    const { data } = await supabase.from('debates').select('*').eq('id', debateId).single()
    if (!data) return
    const bothReady = (mySide() === 'for' ? true : data.for_ready) && (mySide() === 'against' ? true : data.against_ready)
    if (bothReady) {
      const timerEnd = new Date(Date.now() + 3 * 60 * 1000).toISOString()
      await supabase.from('debates').update({ status: 'active', timer_end: timerEnd }).eq('id', debateId)
      // Transition immediately for the user who triggered the final update
      // (the other user catches it via realtime or the polling fallback)
      const activated = { ...data, status: 'active', timer_end: timerEnd }
      setDebate(activated)
      debateRef.current = activated
      updatePhase(activated, userRef.current)
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
    // SECURITY DEFINER function bypasses RLS so we can increment the opponent's count
    await supabase.rpc('increment_changed_minds', { target_user_id: oppId })
    // Insert a system message so the opponent gets a realtime notification
    await supabase.from('messages').insert({
      debate_id: debateId,
      user_id: user.id,
      content: '__mind_changed__',
    })
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
    // Update the debate record so the opponent sees the refined argument
    // and myArg() returns the new content when the panel reopens
    const argField = mySide() === 'for' ? { for_argument: liveArg } : { against_argument: liveArg }
    await supabase.from('debates').update(argField).eq('id', debateId)
    const updated = { ...debateRef.current, ...argField }
    setDebate(updated)
    debateRef.current = updated
    setSavingLive(false)
    setShowRefinePanel(false)
  }

  const handleLeave = () => {
    phaseRef.current = 'rating'
    setPhase('rating')
  }

  const submitRating = async () => {
    const oppId = mySide() === 'for' ? debate.against_user_id : debate.for_user_id
    await supabase.from('ratings').insert({
      debate_id: debateId, rater_id: user.id, rated_id: oppId,
      engaged_argument: ratings.argument || 3,
      respectful: ratings.behavior || 3,
    })
    await supabase.from('debates').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', debateId)
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

  if (phase === 'loading') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm tracking-wide">Connecting to debate...</p>
      </div>
    </div>
  )

  if (phase === 'requeuing') return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-lg p-10 max-w-sm w-full text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <h2 className="text-foreground font-display text-xl">Finding a new opponent</h2>
        <p className="text-muted-foreground text-sm">{requeueStatus}</p>
        <p className="text-muted-foreground text-xs">This page will advance automatically when matched</p>
        <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors">
          Change topic instead
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl p-8 space-y-6">

        {/* ── Reading phase ── */}
        {phase === 'reading' && (
          <>
            <div className="space-y-1">
              <p className="step-number">STEP 01</p>
              <h2 className="font-display text-2xl text-foreground">Read their opening</h2>
              <p className="text-muted-foreground text-sm">Chat unlocks only after both players confirm they've read the other side.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Your argument</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mySide() === 'for' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>{mySide()}</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{myArg()}</p>
              </div>
              <div className="bg-secondary border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Their argument</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mySide() === 'for' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>{mySide() === 'for' ? 'against' : 'for'}</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{oppArg() || 'Waiting for opponent...'}</p>
              </div>
            </div>
            <button onClick={handleUnderstand} disabled={understood}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${understood ? 'bg-primary/10 border border-primary/30 text-primary cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {understood ? '✓ Understood — waiting for opponent...' : 'I understand their side'}
            </button>
          </>
        )}

        {/* ── Chat phase ── */}
        {phase === 'chat' && (
          <>
            {/* Header: topic + timer / done button */}
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-4">
                <p className="text-foreground font-display text-lg truncate flex-1">{debate?.topic_title}</p>
                {canLeave ? (
                  <button onClick={handleLeave}
                    className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
                    Done debating →
                  </button>
                ) : (
                  <span className="text-sm font-semibold tabular-nums px-3 py-1 rounded-full border text-primary border-primary/30 bg-primary/10 whitespace-nowrap">
                    {mins}:{secs.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              {!canLeave && (
                <div className="h-0.5 bg-border rounded-full overflow-hidden">
                  <div className="h-0.5 rounded-full bg-primary transition-all duration-1000" style={{ width: `${timerPct}%` }} />
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex flex-col gap-3 min-h-[220px] max-h-[340px] overflow-y-auto py-2">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <p className="text-muted-foreground text-xs text-center">Chat is open. Make your first move.</p>
                </div>
              )}
              {messages.map(m => {
                if (m.content === '__mind_changed__') {
                  const isOwn = m.user_id === user?.id
                  return (
                    <div key={m.id} className="self-center w-full max-w-[90%]">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm text-center justify-center">
                        <span className="text-base">↩</span>
                        <span className="font-medium">
                          {isOwn ? 'You changed your mind' : 'They changed their mind'}
                        </span>
                        {!isOwn && <span className="text-xs text-primary/70">— credited to their profile</span>}
                      </div>
                    </div>
                  )
                }
                const isOwn = m.user_id === user?.id
                return (
                  <div key={m.id} className={`flex flex-col gap-1 max-w-[78%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm border border-border'}`}>
                      {m.content}
                    </div>
                    {!isOwn && (
                      <button
                        onClick={handleMindChanged}
                        disabled={mindChangedDone}
                        title="They changed your mind — the highest compliment"
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${mindChangedDone ? 'text-muted-foreground/40 cursor-default' : 'text-muted-foreground hover:text-primary'}`}>
                        {mindChangedDone ? '✓ changed my mind' : '↩ changed my mind'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* In-chat refine panel */}
            {showRefinePanel && (
              <div className="bg-secondary border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Refine your argument</p>
                  <button onClick={() => setShowRefinePanel(false)} className="text-muted-foreground hover:text-foreground text-xs leading-none">✕</button>
                </div>
                <textarea
                  value={liveArg}
                  onChange={e => setLiveArg(e.target.value)}
                  placeholder="Revise your argument with what you're learning..."
                  className="w-full min-h-[96px] px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <button onClick={saveLiveRefinement} disabled={savingLive || !liveArg.trim()}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {savingLive ? 'Saving...' : 'Save revision'}
                </button>
              </div>
            )}

            {/* Input row */}
            <div className="flex gap-2">
              <button
                onClick={() => { if (!showRefinePanel) setLiveArg(myArg()); setShowRefinePanel(v => !v) }}
                className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-xs transition-colors whitespace-nowrap">
                ✎ refine
              </button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Make your point..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              <button onClick={sendMessage} disabled={sending}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                Send
              </button>
            </div>

            {!canLeave && (
              <p className="text-muted-foreground text-xs text-center">Minimum 3 minutes — then you can leave</p>
            )}
          </>
        )}

        {/* ── Rating phase ── */}
        {phase === 'rating' && (
          <>
            <div className="space-y-1">
              <p className="step-number">RATE YOUR OPPONENT</p>
              <h2 className="font-display text-2xl text-foreground">Before you go</h2>
              <p className="text-muted-foreground text-sm">Two quick ratings — not on who was right, on how they argued.</p>
            </div>

            <div className="space-y-7 pt-2">
              <div className="space-y-2">
                <p className="text-foreground text-sm font-medium">How strong was their argument?</p>
                <p className="text-muted-foreground text-xs">Rate the quality of reasoning regardless of whether you agree with their position.</p>
                <div className="flex gap-3 pt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(r => ({ ...r, argument: n }))}
                      className={`text-2xl transition-all ${ratings.argument >= n ? 'opacity-100' : 'opacity-20'}`}
                      style={{ color: 'hsl(38 92% 50%)' }}>★</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-foreground text-sm font-medium">How did they conduct themselves?</p>
                <p className="text-muted-foreground text-xs">Were they respectful, trying to articulate their side, and genuinely engaging with yours?</p>
                <div className="flex gap-3 pt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatings(r => ({ ...r, behavior: n }))}
                      className={`text-2xl transition-all ${ratings.behavior >= n ? 'opacity-100' : 'opacity-20'}`}
                      style={{ color: 'hsl(38 92% 50%)' }}>★</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submitRating} disabled={ratings.argument === 0 || ratings.behavior === 0}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              Submit & refine my argument →
            </button>
          </>
        )}

        {/* ── Refine phase ── */}
        {phase === 'refine' && (
          <>
            <div className="space-y-1">
              <p className="step-number">STEP 03</p>
              <h2 className="font-display text-2xl text-foreground">Refine your argument</h2>
              <p className="text-muted-foreground text-sm">You've debated. Now make it stronger.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Your original</p>
                <div className="bg-secondary border border-border rounded-lg p-4 text-foreground text-sm leading-relaxed">{myArg()}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Their argument</p>
                <div className="bg-secondary border border-border rounded-lg p-4 text-foreground text-sm leading-relaxed">{oppArg()}</div>
              </div>
            </div>
            <textarea value={refinedArg} onChange={e => setRefinedArg(e.target.value)}
              placeholder="Rewrite your argument with what you've learned..."
              className="w-full min-h-[120px] px-4 py-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-y" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">Skip</button>
              <button onClick={saveAndFinish} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save & view profile →</button>
            </div>
          </>
        )}

        {/* ── Ended phase ── */}
        {phase === 'ended' && (
          <div className="text-center py-8 space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-foreground">Debate ended</h2>
              <p className="text-muted-foreground text-sm">Thanks for keeping it real.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Debate again</button>
              <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors">My profile</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
