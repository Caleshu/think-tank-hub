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
    <div className="arg-card" onClick={handleCardClick}>
      {/* Top row */}
      <div className="arg-byline">
        <div className="arg-avatar">{(argument.username ?? "?").charAt(0).toUpperCase()}</div>
        <Link
          to={`/profile/${argument.username}`}
          style={{ fontSize: 13, fontWeight: 500, color: "var(--color-primary)", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {argument.username ?? "unknown"}
        </Link>
        <span style={{ color: "var(--ink-4)", fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{argument.topic_name}</span>
        <span className={`dmb-pill ${argument.stance} ml-auto`} style={{ marginLeft: "auto" }}>
          {argument.stance === "for" ? "FOR" : "AGAINST"}
        </span>
      </div>

      {/* Title */}
      <h3 className="arg-title">{argument.title}</h3>

      {/* Content */}
      <p className="arg-body">
        {variant === "feed" && argument.content.length > 200
          ? argument.content.slice(0, 200) + "…"
          : argument.content}
      </p>

      {/* Footer */}
      <div className="arg-foot">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="stat-chip">
            <span style={{ color: "var(--color-primary)" }}>★</span>
            {avgStars > 0 ? avgStars.toFixed(1) : "—"}
          </span>
          <span className="stat-chip">
            <Brain style={{ width: 11, height: 11 }} />
            {argument.changed_minds_count} minds changed
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {!isOwn && (
            <button
              onClick={() => onOpenInteraction(argument)}
              className="dmb-btn ghost sm"
            >
              Rate
            </button>
          )}
          {onReply && (
            <button onClick={onReply} className="dmb-btn sm">
              {replyOpen ? "Cancel" : "Debate"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
