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

  const isSupport = reply.reply_type === "support"

  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${isFocused ? "var(--color-primary)" : "var(--rule)"}`,
        background: isFocused ? "oklch(0.55 0.22 25 / 0.05)" : "var(--surface)",
        padding: isFocused ? "20px 20px" : "14px 16px",
        cursor: "pointer",
        userSelect: "none",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!isFocused) (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.55 0.22 25 / 0.5)"
      }}
      onMouseLeave={(e) => {
        if (!isFocused) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--rule)"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Link
          to={`/profile/${reply.username}`}
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 12, fontWeight: 500, color: "var(--color-primary)", textDecoration: "none", fontFamily: "var(--font-mono)" }}
        >
          {reply.username}
        </Link>
        <span
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
            fontFamily: "var(--font-mono)", padding: "2px 7px",
            background: isSupport ? "oklch(0.65 0.15 145 / 0.12)" : "oklch(0.55 0.22 25 / 0.12)",
            color: isSupport ? "oklch(0.65 0.15 145)" : "var(--color-primary)",
          }}
        >
          {isSupport ? "Support" : "Challenge"}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
          {new Date(reply.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Content */}
      <p style={{
        fontSize: 13, lineHeight: 1.55, marginBottom: 10, color: isFocused ? "var(--ink)" : "var(--ink-2)",
        display: isFocused ? undefined : "-webkit-box",
        WebkitLineClamp: isFocused ? undefined : 3,
        WebkitBoxOrient: isFocused ? undefined : "vertical" as any,
        overflow: isFocused ? undefined : "hidden",
      }}>
        {reply.content}
      </p>

      {/* Stats + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
        <span className="stat-chip">
          <span style={{ color: "var(--color-primary)" }}>★</span>
          {avgStars > 0 ? avgStars.toFixed(1) : "—"}
        </span>
        <span className="stat-chip">
          <Brain style={{ width: 10, height: 10 }} />
          {reply.changed_minds_count}
        </span>
        {childCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "oklch(0.55 0.22 25 / 0.7)", fontFamily: "var(--font-mono)" }}>
            <ChevronRight style={{ width: 11, height: 11 }} />
            {childCount} {childCount === 1 ? "reply" : "replies"}
          </span>
        )}
        {!isOwn && currentUserId && isFocused && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowRating((v) => !v) }}
              className="dmb-btn ghost sm"
            >
              {showRating ? "Cancel" : "Rate"}
            </button>
            {onReply && (
              <button
                onClick={(e) => { e.stopPropagation(); onReply() }}
                className="dmb-btn ghost sm"
              >
                {replyOpen ? "Cancel" : "Debate"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline rating panel */}
      {showRating && (
        <div
          style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rule)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setLocalStars(localStars === n ? null : n)}
                style={{
                  fontSize: 20, background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                  color: (localStars ?? 0) >= n ? "var(--color-primary)" : "var(--ink-4)",
                  transition: "color 0.1s",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <button
            onClick={() => setLocalMindChanged((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
              border: "1px solid",
              borderColor: localMindChanged ? "var(--color-primary)" : "var(--rule)",
              background: localMindChanged ? "oklch(0.55 0.22 25 / 0.08)" : "transparent",
              color: localMindChanged ? "var(--color-primary)" : "var(--ink-3)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8,
              transition: "all 0.1s",
            }}
          >
            <Brain style={{ width: 12, height: 12 }} />
            {localMindChanged ? "✓ Changed my mind" : "Changed my mind"}
          </button>
          <button
            onClick={submitInteraction}
            disabled={saving || (localStars === null && !localMindChanged)}
            className="dmb-btn sm"
            style={{ opacity: saving || (localStars === null && !localMindChanged) ? 0.4 : 1 }}
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </div>
      )}
    </div>
  )
}
