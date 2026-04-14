import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { FeedArgument } from "@/types/feed"
import { Brain } from "lucide-react"

interface ArgumentInteractionModalProps {
  argument: FeedArgument | null
  currentUserId: string | null
  open: boolean
  onClose: () => void
  onInteracted: (updated: FeedArgument) => void
}

export default function ArgumentInteractionModal({
  argument,
  currentUserId,
  open,
  onClose,
  onInteracted,
}: ArgumentInteractionModalProps) {
  const [localStars, setLocalStars] = useState<number | null>(null)
  const [localMindChanged, setLocalMindChanged] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (argument) {
      setLocalStars(argument.my_interaction?.stars ?? null)
      setLocalMindChanged(argument.my_interaction?.mind_changed ?? false)
    }
  }, [argument?.id])

  if (!argument) return null

  const isOwn = argument.user_id === currentUserId
  const avgStars = Number(argument.avg_stars ?? 0)

  const handleSubmit = async () => {
    if (!currentUserId) return
    setSaving(true)

    await (supabase as any)
      .from("argument_interactions")
      .upsert(
        {
          argument_id: argument.id,
          user_id: currentUserId,
          stars: localStars,
          mind_changed: localMindChanged,
        },
        { onConflict: "argument_id,user_id" }
      )

    // Re-fetch argument with updated cached counts
    const { data } = await supabase
      .from("arguments")
      .select("id, user_id, topic_id, stance, title, content, version, posted, pinned, changed_minds_count, avg_stars, created_at")
      .eq("id", argument.id)
      .single()

    if (data) {
      onInteracted({
        ...argument,
        ...data,
        my_interaction: { stars: localStars, mind_changed: localMindChanged },
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="text-foreground text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {argument.title}
          </DialogTitle>
        </DialogHeader>

        {/* Metadata */}
        <div className="flex items-center gap-2 -mt-2 mb-1">
          <span className="text-xs text-muted-foreground">{argument.topic_name}</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              argument.stance === "for"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {argument.stance === "for" ? "FOR" : "AGAINST"}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">by {argument.username}</span>
        </div>

        {/* Full content */}
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
          {argument.content}
        </p>

        {/* Stats (always visible) */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground pt-1">
          <span>
            <span className="text-amber-400">★</span>{" "}
            {avgStars > 0 ? avgStars.toFixed(1) : "No ratings yet"}
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />
            {argument.changed_minds_count} minds changed
          </span>
        </div>

        {isOwn ? (
          <p className="text-xs text-muted-foreground italic">This is your argument.</p>
        ) : !currentUserId ? (
          <p className="text-xs text-muted-foreground italic">Sign in to rate this argument.</p>
        ) : (
          <div className="space-y-4 pt-2 border-t border-border">
            {/* Star rating */}
            <div>
              <p className="text-sm text-foreground mb-2">How would you rate this argument?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLocalStars(localStars === n ? null : n)}
                    className="text-2xl transition-all hover:scale-110"
                    style={{ color: (localStars ?? 0) >= n ? "hsl(38 92% 50%)" : "hsl(0 0% 30%)" }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Changed my mind */}
            <button
              onClick={() => setLocalMindChanged((v) => !v)}
              className={`w-full py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                localMindChanged
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <Brain className="w-4 h-4" />
              {localMindChanged ? "✓ This changed my mind" : "This changed my mind"}
            </button>

            <Button
              onClick={handleSubmit}
              disabled={saving || (localStars === null && !localMindChanged)}
              className="w-full"
            >
              {saving ? "Saving…" : "Submit"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
