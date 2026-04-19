import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { DebateReply } from "@/types/feed"

interface ReplyComposerProps {
  argumentId: string
  parentId: string | null
  replyType: "support" | "disagree"
  currentUserId: string
  currentUsername: string
  onReplyAdded: (reply: DebateReply) => void
}

export default function ReplyComposer({
  argumentId,
  parentId,
  replyType,
  currentUserId,
  currentUsername,
  onReplyAdded,
}: ReplyComposerProps) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const isSupport = replyType === "support"

  const placeholder = isSupport
    ? "Add evidence or reinforce this argument…"
    : "Argue against this claim…"

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSaving(true)

    const { data, error } = await (supabase as any)
      .from("debate_replies")
      .insert({
        argument_id: argumentId,
        parent_id: parentId,
        reply_type: replyType,
        content: content.trim(),
        user_id: currentUserId,
        username: currentUsername,
      })
      .select("*")
      .single()

    if (!error && data) {
      onReplyAdded({ ...data, children: [] })
      setContent("")
    }
    setSaving(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Label */}
      <p style={{
        fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: isSupport ? "oklch(0.65 0.15 145)" : "var(--color-primary)",
        marginBottom: 2,
      }}>
        {isSupport ? "Add Support" : "Challenge"}
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          width: "100%", resize: "vertical",
          background: "var(--surface)", color: "var(--ink)",
          border: "1px solid var(--rule)", outline: "none",
          fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.5,
          padding: "10px 12px", boxSizing: "border-box",
          transition: "border-color 0.12s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = isSupport
            ? "oklch(0.65 0.15 145 / 0.7)"
            : "var(--color-primary)"
        }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--rule)" }}
      />

      <button
        onClick={handleSubmit}
        disabled={saving || !content.trim()}
        style={{
          alignSelf: "flex-start",
          padding: "7px 18px",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", border: "none", cursor: saving || !content.trim() ? "not-allowed" : "pointer",
          opacity: saving || !content.trim() ? 0.4 : 1,
          background: isSupport ? "oklch(0.55 0.15 145)" : "var(--color-primary)",
          color: "#fff",
          transition: "opacity 0.1s",
        }}
      >
        {saving ? "Posting…" : isSupport ? "Post Support" : "Post Challenge"}
      </button>
    </div>
  )
}
