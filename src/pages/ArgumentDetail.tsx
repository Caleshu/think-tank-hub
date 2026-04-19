import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/integrations/supabase/client"
import { FeedArgument, DebateReply, buildTree, findNode, getPathToNode } from "@/types/feed"
import FeedCard from "@/components/feed/FeedCard"
import ArgumentInteractionModal from "@/components/feed/ArgumentInteractionModal"
import ReplyComposer from "@/components/feed/ReplyComposer"
import FocusNodeCard from "@/components/feed/FocusNodeCard"
import { ArrowLeft, Sun, Moon } from "lucide-react"
import RotatingHint from "@/components/RotatingHint"
import { useTheme } from "@/hooks/useTheme"

export default function ArgumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const [argument, setArgument] = useState<FeedArgument | null>(null)
  const [flatReplies, setFlatReplies] = useState<DebateReply[]>([])
  const [replyTree, setReplyTree] = useState<DebateReply[]>([])
  const [myArgInteraction, setMyArgInteraction] = useState<{ stars: number | null; mind_changed: boolean } | null>(null)
  const [myReplyInteractions, setMyReplyInteractions] = useState<Map<string, { stars: number | null; mind_changed: boolean }>>(new Map())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [showComposers, setShowComposers] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user.id ?? null
      setCurrentUserId(userId)

      if (userId) {
        const { data: prof } = await supabase
          .from("profiles").select("username").eq("user_id", userId).single()
        setCurrentUsername(prof?.username ?? null)
      }

      const { data: argRow, error } = await supabase
        .from("arguments")
        .select("id, user_id, topic_id, stance, title, content, version, posted, pinned, changed_minds_count, avg_stars, created_at, topics(name)")
        .eq("id", id).single()

      if (error || !argRow) { setNotFound(true); setLoading(false); return }

      const { data: authorProf } = await supabase
        .from("profiles").select("username").eq("user_id", argRow.user_id).single()

      const feedArg: FeedArgument = {
        ...argRow,
        stance: argRow.stance as "for" | "against",
        topic_name: (argRow.topics as any)?.name,
        username: authorProf?.username ?? "unknown",
      }
      setArgument(feedArg)

      const { data: repliesData } = await (supabase as any)
        .from("debate_replies").select("*").eq("argument_id", id).order("created_at", { ascending: true })

      const flat: DebateReply[] = (repliesData ?? []).map((r: any) => ({ ...r, children: [] }))

      if (userId) {
        const { data: myArgInt } = await (supabase as any)
          .from("argument_interactions").select("stars, mind_changed")
          .eq("argument_id", id).eq("user_id", userId).maybeSingle()
        setMyArgInteraction(myArgInt ?? null)
        feedArg.my_interaction = myArgInt ?? null

        if (flat.length > 0) {
          const replyIds = flat.map((r) => r.id)
          const { data: myReplyInts } = await (supabase as any)
            .from("reply_interactions").select("reply_id, stars, mind_changed")
            .eq("user_id", userId).in("reply_id", replyIds)

          const intMap = new Map<string, { stars: number | null; mind_changed: boolean }>()
          ;(myReplyInts ?? []).forEach((ri: any) => {
            intMap.set(ri.reply_id, { stars: ri.stars, mind_changed: ri.mind_changed })
          })
          setMyReplyInteractions(intMap)
          flat.forEach((r) => { r.my_interaction = intMap.get(r.id) ?? null })
        }
      }

      setFlatReplies(flat)
      setReplyTree(buildTree(flat))
      setLoading(false)
    }
    load()
  }, [id])

  const handleReplyAdded = (newReply: DebateReply) => {
    setFlatReplies((prev) => {
      const updated = [...prev, newReply]
      setReplyTree(buildTree(updated))
      return updated
    })
  }

  const handleReplyInteracted = (updatedReply: DebateReply) => {
    setFlatReplies((prev) => {
      const updated = prev.map((r) =>
        r.id === updatedReply.id ? { ...updatedReply, children: r.children } : r
      )
      setReplyTree(buildTree(updated))
      return updated
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="w-6 h-6 border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent", borderRadius: 0 }} />
          <RotatingHint />
        </div>
      </div>
    )
  }

  if (notFound || !argument) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)" }}>Argument not found</p>
        <button onClick={() => navigate(-1)} style={{ color: "var(--color-primary)", fontSize: 13, fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer" }}>
          Go back
        </button>
      </div>
    )
  }

  const isRootFocused = focusedId === null
  const focusedReply = focusedId ? findNode(focusedId, replyTree) : null
  const path = focusedId ? getPathToNode(focusedId, replyTree) : []

  const parentIsRoot = !isRootFocused && path.length === 1
  const parentReply = !isRootFocused && path.length > 1 ? path[path.length - 2] : null

  const handleGoBack = () => {
    setShowComposers(false)
    if (parentReply) setFocusedId(parentReply.id)
    else setFocusedId(null)
  }

  const handleDrillIn = (id: string) => {
    setShowComposers(false)
    setFocusedId(id)
  }

  const isArgumentAuthor = !!currentUserId && argument.user_id === currentUserId

  const supportChildren = isRootFocused
    ? replyTree.filter((r) => r.reply_type === "support")
    : (focusedReply?.children.filter((c) => c.reply_type === "support") ?? [])

  const disagreeChildren = isRootFocused
    ? replyTree.filter((r) => r.reply_type === "disagree")
    : (focusedReply?.children.filter((c) => c.reply_type === "disagree") ?? [])

  const alreadyReplied = isRootFocused
    ? flatReplies.some((r) => r.user_id === currentUserId && r.parent_id === null)
    : flatReplies.some((r) => r.user_id === currentUserId && r.parent_id === focusedId)

  const canReplyHere =
    !!currentUserId &&
    !!currentUsername &&
    !alreadyReplied &&
    (isRootFocused
      ? !isArgumentAuthor
      : focusedReply?.user_id !== currentUserId)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate(-1)} style={{ margin: 0 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> Back
        </button>
        <span className="logo" style={{ cursor: "default" }}>
          <span className="dot" />
          <span>Debate Me Bro</span>
        </span>
        <button className="icon-btn-pill" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          <AnimatePresence mode="wait">
            {isRootFocused ? (
              <motion.div key="root-focused" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <FeedCard
                  argument={{ ...argument, my_interaction: myArgInteraction }}
                  currentUserId={currentUserId}
                  onOpenInteraction={() => setInteractionOpen(true)}
                  variant="detail"
                  onReply={canReplyHere && isRootFocused ? () => setShowComposers((v) => !v) : undefined}
                  replyOpen={showComposers}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`parent-${parentReply?.id ?? "root"}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{ opacity: 0.5, cursor: "pointer", transition: "opacity 0.15s" }}
                onClick={handleGoBack}
                title="Click to go back"
              >
                {parentIsRoot || !parentReply ? (
                  <FeedCard
                    argument={{ ...argument, my_interaction: myArgInteraction }}
                    currentUserId={currentUserId}
                    onOpenInteraction={() => {}}
                    variant="detail"
                  />
                ) : (
                  <FocusNodeCard
                    reply={parentReply}
                    myInteraction={myReplyInteractions.get(parentReply.id) ?? null}
                    currentUserId={currentUserId}
                    isFocused={false}
                    onClick={handleGoBack}
                    onInteracted={handleReplyInteracted}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <ArgumentInteractionModal
            argument={{ ...argument, my_interaction: myArgInteraction }}
            currentUserId={currentUserId}
            open={interactionOpen}
            onClose={() => setInteractionOpen(false)}
            onInteracted={(updated) => {
              setArgument(updated)
              setMyArgInteraction(updated.my_interaction ?? null)
            }}
          />

          {/* Connector line when drilled in */}
          {!isRootFocused && (
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
              <div style={{ width: 1, height: 32, background: "var(--rule)" }} />
            </div>
          )}

          {/* Focused reply node */}
          <AnimatePresence mode="wait">
            {!isRootFocused && focusedReply && (
              <motion.div
                key={focusedReply.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <FocusNodeCard
                  reply={focusedReply}
                  myInteraction={myReplyInteractions.get(focusedReply.id) ?? null}
                  currentUserId={currentUserId}
                  isFocused
                  onClick={() => {}}
                  onInteracted={handleReplyInteracted}
                  onReply={canReplyHere && !isRootFocused ? () => setShowComposers((v) => !v) : undefined}
                  replyOpen={showComposers}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply composers */}
          {canReplyHere && showComposers && (
            <div style={{ paddingTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <ReplyComposer
                  argumentId={argument.id}
                  parentId={isRootFocused ? null : focusedId}
                  replyType="support"
                  currentUserId={currentUserId!}
                  currentUsername={currentUsername!}
                  onReplyAdded={(r) => { handleReplyAdded(r); setShowComposers(false) }}
                />
                <ReplyComposer
                  argumentId={argument.id}
                  parentId={isRootFocused ? null : focusedId}
                  replyType="disagree"
                  currentUserId={currentUserId!}
                  currentUsername={currentUsername!}
                  onReplyAdded={(r) => { handleReplyAdded(r); setShowComposers(false) }}
                />
              </div>
            </div>
          )}

          {/* Children columns */}
          <div style={{ paddingTop: 32 }}>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "oklch(0.65 0.15 145 / 0.35)" }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "oklch(0.65 0.15 145)", whiteSpace: "nowrap"
                }}>
                  Support ({supportChildren.length})
                </span>
                <div style={{ flex: 1, height: 1, background: "oklch(0.65 0.15 145 / 0.35)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "oklch(0.55 0.22 25 / 0.35)" }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "var(--color-primary)", whiteSpace: "nowrap"
                }}>
                  Challenge ({disagreeChildren.length})
                </span>
                <div style={{ flex: 1, height: 1, background: "oklch(0.55 0.22 25 / 0.35)" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {supportChildren.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "24px 0" }}>No support yet.</p>
                ) : (
                  supportChildren.map((c) => (
                    <FocusNodeCard
                      key={c.id}
                      reply={c}
                      myInteraction={myReplyInteractions.get(c.id) ?? null}
                      currentUserId={currentUserId}
                      onClick={() => handleDrillIn(c.id)}
                      onInteracted={handleReplyInteracted}
                    />
                  ))
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {disagreeChildren.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "24px 0" }}>No challenges yet.</p>
                ) : (
                  disagreeChildren.map((c) => (
                    <FocusNodeCard
                      key={c.id}
                      reply={c}
                      myInteraction={myReplyInteractions.get(c.id) ?? null}
                      currentUserId={currentUserId}
                      onClick={() => handleDrillIn(c.id)}
                      onInteracted={handleReplyInteracted}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
