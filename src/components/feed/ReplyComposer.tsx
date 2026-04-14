import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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

  const placeholder =
    replyType === "support"
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
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="bg-background border-border min-h-[80px] text-sm resize-none"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={saving || !content.trim()}
        className={
          replyType === "support"
            ? "bg-green-600 hover:bg-green-500 text-white border-0"
            : "bg-red-600 hover:bg-red-500 text-white border-0"
        }
      >
        {saving ? "Posting…" : replyType === "support" ? "Add Support" : "Challenge"}
      </Button>
    </div>
  )
}
