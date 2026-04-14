import { useState } from "react"
import { Link } from "react-router-dom"
import { Brain } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { DebateReply } from "@/types/feed"
import ReplyComposer from "./ReplyComposer"

interface ReplyNodeProps {
  reply: DebateReply
  argumentId: string
  myInteraction: { stars: number | null; mind_changed: boolean } | null
  currentUserId: string | null
  currentUsername: string | null
  onReplyAdded: (reply: DebateReply, parentId: string | null) => void
  onInteracted: (updated: DebateReply) => void
}

export default function ReplyNode({
  reply,
  argumentId,
  myInteraction,
  currentUserId,
  currentUsername,
  onReplyAdded,
  onInteracted,
}: ReplyNodeProps) {
  const [showComposer, setShowComposer] = useState(false)
  const [showChildren, setShowChildren] = useState(true)
  const [showInteraction, setShowInteraction] = useState(false)
  const [localStars, setLocalStars] = useState<number | null>(myInteraction?.stars ?? null)
  const [localMindChanged, setLocalMindChanged] = useState(myInteraction?.mind_changed ?? false)
  const [savingInteraction, setSavingInteraction] = useState(false)

  const isOwn = reply.user_id === currentUserId
  const avgStars = Number(reply.avg_stars ?? 0)

  const supportChildren = reply.children.filter((c) => c.reply_type === "support")
  const disagreeChildren = reply.children.filter((c) => c.reply_type === "disagree")
  const hasChildren = reply.children.length > 0
  const hasBothSides = supportChildren.length > 0 && disagreeChildren.length > 0

  const submitInteraction = async () => {
    if (!currentUserId) return
    setSavingInteraction(true)
    await (supabase as any)
      .from("reply_interactions")
      .upsert(
        { reply_id: reply.id, user_id: currentUserId, stars: localStars, mind_changed: localMindChanged },
        { onConflict: "reply_id,user_id" }
      )
    const { data } = await (supabase as any)
      .from("debate_replies")
      .select("*")
      .eq("id", reply.id)
      .single()
    if (data) onInteracted({ ...data, children: reply.children })
    setSavingInteraction(false)
    setShowInteraction(false)
  }

  const typeBadge =
    reply.reply_type === "support" ? (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400">
        Support
      </span>
    ) : (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-400">
        Challenge
      </span>
    )

  const sharedProps = { argumentId, currentUserId, currentUsername, onReplyAdded, onInteracted }

  return (
    <div className="flex flex-col items-center w-full">

      {/* ── Node box ── uniform min-height so all cards look the same size */}
      <div className="card-surface p-4 w-full min-h-[120px] flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              to={`/profile/${reply.username}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              {reply.username}
            </Link>
            {typeBadge}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(reply.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Content — clamp to 4 lines so boxes stay compact */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {reply.content}
          </p>
        </div>

        {/* Stats + actions */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          <span>
            <span className="text-amber-400">★</span>{" "}
            {avgStars > 0 ? avgStars.toFixed(1) : "—"}
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {reply.changed_minds_count}
          </span>

          {!isOwn && currentUserId && (
            <button onClick={() => setShowInteraction((v) => !v)} className="hover:text-primary transition-colors">
              Rate
            </button>
          )}

          {currentUserId && !isOwn && (
            <button onClick={() => setShowComposer((v) => !v)} className="hover:text-primary transition-colors">
              {showComposer ? "Cancel" : "Reply"}
            </button>
          )}

          {hasChildren && (
            <button onClick={() => setShowChildren((v) => !v)} className="hover:text-primary transition-colors ml-auto">
              {showChildren
                ? "Collapse"
                : `Show ${reply.children.length} repl${reply.children.length === 1 ? "y" : "ies"}`}
            </button>
          )}
        </div>

        {/* Inline rating panel */}
        {showInteraction && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setLocalStars(localStars === n ? null : n)}
                  className="text-xl transition-all hover:scale-110"
                  style={{ color: (localStars ?? 0) >= n ? "hsl(38 92% 50%)" : "hsl(0 0% 30%)" }}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={() => setLocalMindChanged((v) => !v)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                localMindChanged ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Brain className="w-3 h-3" />
              {localMindChanged ? "✓ Changed my mind" : "Changed my mind"}
            </button>
            <button
              onClick={submitInteraction}
              disabled={savingInteraction || (localStars === null && !localMindChanged)}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {savingInteraction ? "Saving…" : "Submit"}
            </button>
          </div>
        )}

        {/* Reply composer */}
        {showComposer && currentUserId && currentUsername && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              <ReplyComposer
                argumentId={argumentId}
                parentId={reply.id}
                replyType="support"
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                onReplyAdded={(r) => { onReplyAdded(r, reply.id); setShowComposer(false) }}
              />
              <ReplyComposer
                argumentId={argumentId}
                parentId={reply.id}
                replyType="disagree"
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                onReplyAdded={(r) => { onReplyAdded(r, reply.id); setShowComposer(false) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tree connectors + children ── */}
      {hasChildren && showChildren && (
        <div className="w-full">
          {/* Vertical stem down from this node */}
          <div className="flex justify-center">
            <div className="w-px h-5 bg-border/50" />
          </div>

          {hasBothSides ? (
            <>
              {/* Horizontal bar: spans from center of left col to center of right col */}
              <div className="relative h-px">
                <div className="absolute inset-x-[25%] top-0 h-px bg-border/50" />
              </div>

              {/* Vertical drops + children */}
              <div className="grid grid-cols-2 gap-6">
                {/* Support — left */}
                <div className="flex flex-col items-center gap-0">
                  <div className="w-px h-5 bg-border/50" />
                  <div className="flex flex-col gap-5 w-full">
                    {supportChildren.map((c) => (
                      <ReplyNode key={c.id} reply={c} myInteraction={c.my_interaction ?? null} {...sharedProps} />
                    ))}
                  </div>
                </div>

                {/* Disagree — right */}
                <div className="flex flex-col items-center gap-0">
                  <div className="w-px h-5 bg-border/50" />
                  <div className="flex flex-col gap-5 w-full">
                    {disagreeChildren.map((c) => (
                      <ReplyNode key={c.id} reply={c} myInteraction={c.my_interaction ?? null} {...sharedProps} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Only one side — single centered column, no branching needed */
            <div className="flex flex-col gap-5">
              {[...supportChildren, ...disagreeChildren].map((c) => (
                <ReplyNode key={c.id} reply={c} myInteraction={c.my_interaction ?? null} {...sharedProps} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
