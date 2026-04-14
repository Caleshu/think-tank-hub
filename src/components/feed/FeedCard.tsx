import { Link, useNavigate } from "react-router-dom"
import { Brain } from "lucide-react"
import { FeedArgument } from "@/types/feed"

interface FeedCardProps {
  argument: FeedArgument
  currentUserId: string | null
  onOpenInteraction: (arg: FeedArgument) => void
  variant?: "feed" | "detail"
  onReply?: () => void
  replyOpen?: boolean
}

export default function FeedCard({
  argument,
  currentUserId,
  onOpenInteraction,
  variant = "feed",
  onReply,
  replyOpen = false,
}: FeedCardProps) {
  const navigate = useNavigate()
  const isOwn = argument.user_id === currentUserId
  const avgStars = Number(argument.avg_stars ?? 0)

  const handleCardClick = () => {
    if (variant === "feed") {
      navigate(`/argument/${argument.id}`)
    } else {
      onOpenInteraction(argument)
    }
  }

  return (
    <div
      className="card-surface p-5 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={handleCardClick}
    >
      {/* Top row: username + topic + stance */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Link
          to={`/profile/${argument.username}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {argument.username ?? "unknown"}
        </Link>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="text-xs text-muted-foreground">{argument.topic_name}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ml-auto ${
            argument.stance === "for"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {argument.stance === "for" ? "FOR" : "AGAINST"}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-foreground text-lg mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {argument.title}
      </h3>

      {/* Content */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {variant === "feed" && argument.content.length > 200
          ? argument.content.slice(0, 200) + "…"
          : argument.content}
      </p>

      {/* Stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="text-amber-400">★</span>
            {avgStars > 0 ? avgStars.toFixed(1) : "—"}
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {argument.changed_minds_count} minds changed
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!isOwn && (
            <button
              onClick={() => onOpenInteraction(argument)}
              className="text-xs font-medium text-muted-foreground hover:text-primary border border-border hover:border-primary/50 rounded px-3 py-1.5 transition-colors"
            >
              Rate
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="text-xs font-medium text-primary border border-primary/40 hover:border-primary rounded px-3 py-1.5 transition-colors"
            >
              {replyOpen ? "Cancel" : "Debate"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
