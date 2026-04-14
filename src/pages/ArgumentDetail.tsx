import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/integrations/supabase/client"
import { FeedArgument, DebateReply, buildTree, findNode, getPathToNode } from "@/types/feed"
import FeedCard from "@/components/feed/FeedCard"
import ArgumentInteractionModal from "@/components/feed/ArgumentInteractionModal"
import ReplyComposer from "@/components/feed/ReplyComposer"
import FocusNodeCard from "@/components/feed/FocusNodeCard"
import { ArrowLeft } from "lucide-react"

export default function ArgumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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

  // null = root argument is the focused node
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !argument) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Argument not found
        </p>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline text-sm">
          Go back
        </button>
      </div>
    )
  }

  // ── Focus mode derived state ──────────────────────────────────────────────
  const isRootFocused = focusedId === null
  const focusedReply = focusedId ? findNode(focusedId, replyTree) : null
  const path = focusedId ? getPathToNode(focusedId, replyTree) : []

  // The parent of the focused node:
  //   - null when root is focused (no parent)
  //   - root argument when the focused reply is a direct child of root (path.length === 1)
  //   - the previous reply in the path otherwise
  const parentIsRoot = !isRootFocused && path.length === 1
  const parentReply = !isRootFocused && path.length > 1 ? path[path.length - 2] : null

  // Clicking the parent node navigates up one level
  const handleGoBack = () => {
    setShowComposers(false)
    if (parentReply) setFocusedId(parentReply.id)
    else setFocusedId(null)   // parent was root → back to root
  }

  const handleDrillIn = (id: string) => {
    setShowComposers(false)
    setFocusedId(id)
  }

  const isArgumentAuthor = !!currentUserId && argument.user_id === currentUserId

  // Immediate children of the focused node
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-primary italic">feels</span>
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-0">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0">

          {/* ── TOP NODE ─────────────────────────────────────────────────────
              When root is focused: root arg is the main node (no parent above).
              When a reply is focused: show its parent here, dimmed + clickable to go up.
          ─────────────────────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {isRootFocused ? (
              /* Root focused — root arg IS the focused node, shown prominently */
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
              /* Drill-down — show parent at top, dimmed, clicking goes back */
              <motion.div
                key={`parent-${parentReply?.id ?? "root"}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="opacity-50 hover:opacity-70 transition-opacity cursor-pointer"
                onClick={handleGoBack}
                title="Click to go back"
              >
                {parentIsRoot || !parentReply ? (
                  /* Parent is the root argument */
                  <FeedCard
                    argument={{ ...argument, my_interaction: myArgInteraction }}
                    currentUserId={currentUserId}
                    onOpenInteraction={() => {}}
                    variant="detail"
                  />
                ) : (
                  /* Parent is a reply node */
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

          {/* ── CONNECTOR LINE (only when drilled into a reply) ── */}
          {!isRootFocused && (
            <div className="flex justify-center py-1">
              <div className="w-px h-8 bg-border/60" />
            </div>
          )}

          {/* ── FOCUSED REPLY NODE (only when drilled in) ── */}
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

          {/* ── REPLY COMPOSERS ── */}
          {canReplyHere && showComposers && (
            <div className="pt-4">
              <div className="grid grid-cols-2 gap-4">
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

          {/* ── CHILDREN COLUMNS ── */}
          <div className="pt-6">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-green-500/30" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-widest whitespace-nowrap">
                  Support ({supportChildren.length})
                </span>
                <div className="h-px flex-1 bg-green-500/30" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-red-500/30" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-widest whitespace-nowrap">
                  Challenge ({disagreeChildren.length})
                </span>
                <div className="h-px flex-1 bg-red-500/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                {supportChildren.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No support yet.</p>
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
              <div className="flex flex-col gap-3">
                {disagreeChildren.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No challenges yet.</p>
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
