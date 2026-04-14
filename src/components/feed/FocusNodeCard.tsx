import { useState } from "react"
import { Link } from "react-router-dom"
import { Brain, ChevronRight } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { DebateReply } from "@/types/feed"

interface FocusNodeCardProps {
  reply: DebateReply
  myInteraction: { stars: number | null; mind_changed: boolean } | null
  currentUserId: string | null
  /** Renders the larger focused style instead of the compact child style */
  isFocused?: boolean
  onClick: () => void
  onInteracted: (updated: DebateReply) => void
  onReply?: () => void
  replyOpen?: boolean
}

export default function FocusNodeCard({
  reply,
  myInteraction,
  currentUserId,
  isFocused = false,
  onClick,
  onInteracted,
  onReply,
  replyOpen = false,
}: FocusNodeCardProps) {
  const [showRating, setShowRating] = useState(false)
  const [localStars, setLocalStars] = useState<number | null>(myInteraction?.stars ?? null)
  const [localMindChanged, setLocalMindChanged] = useState(myInteraction?.mind_changed ?? false)
  const [saving, setSaving] = useState(false)

  const isOwn = reply.user_id === currentUserId
  const avgStars = Number(reply.avg_stars ?? 0)
  const childCount = reply.children.length

  const submitInteraction = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return
    setSaving(true)
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
    setSaving(false)
    setShowRating(false)
  }

  const typeBadge =
    reply.reply_type === "support" ? (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400">Support</span>
    ) : (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-400">Challenge</span>
    )

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all select-none ${
        isFocused
          ? "border-primary bg-primary/5 shadow-lg p-6"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Link
          to={`/profile/${reply.username}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-medium text-primary hover:underline"
        >
          {reply.username}
        </Link>
        {typeBadge}
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(reply.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed mb-3 ${isFocused ? "text-foreground" : "text-muted-foreground line-clamp-3"}`}>
        {reply.content}
      </p>

      {/* Stats + actions */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>
          <span className="text-amber-400">★</span>{" "}
          {avgStars > 0 ? avgStars.toFixed(1) : "—"}
        </span>
        <span className="flex items-center gap-1">
          <Brain className="w-3 h-3" />
          {reply.changed_minds_count}
        </span>
        {childCount > 0 && (
          <span className="flex items-center gap-0.5 text-primary/70">
            <ChevronRight className="w-3 h-3" />
            {childCount} {childCount === 1 ? "reply" : "replies"}
          </span>
        )}
        {!isOwn && currentUserId && isFocused && (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRating((v) => !v) }}
              className="hover:text-primary transition-colors"
            >
              {showRating ? "Cancel" : "Rate"}
            </button>
            {onReply && (
              <button
                onClick={(e) => { e.stopPropagation(); onReply() }}
                className="hover:text-primary transition-colors"
              >
                {replyOpen ? "Cancel" : "Debate"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline rating panel */}
      {showRating && (
        <div className="mt-3 pt-3 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
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
              localMindChanged
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Brain className="w-3 h-3" />
            {localMindChanged ? "✓ Changed my mind" : "Changed my mind"}
          </button>
          <button
            onClick={submitInteraction}
            disabled={saving || (localStars === null && !localMindChanged)}
            className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      )}
    </div>
  )
}
