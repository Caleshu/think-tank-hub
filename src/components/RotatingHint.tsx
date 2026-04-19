import { useState, useEffect } from "react"

const HINTS = [
  "Attacking the person doesn't strengthen your argument",
  "Make sure you're responding to their actual point",
  "Two options aren't always the only options",
  "Just because something happened first doesn't mean it caused the next",
  "A claim isn't stronger just because many people believe it",
  "A strong argument needs more than a strong tone",
  "Don't assume intent—focus on what was actually said",
  "One example doesn't prove a general rule",
  "Avoid exaggerating the other side's position",
  "Saying it loudly doesn't make it more true",
]

export default function RotatingHint() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * HINTS.length))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % HINTS.length)
        setVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-xs text-muted-foreground/60 max-w-xs text-center leading-relaxed transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span className="text-muted-foreground/40 uppercase tracking-widest text-[10px] block mb-1">Hint</span>
      {HINTS[index]}
    </p>
  )
}
