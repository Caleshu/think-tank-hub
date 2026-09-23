const items = [
  {
    num: "I",
    title: "Read before you respond",
    desc: "Arguments are written out in full before any debate begins. You see the whole position first — no hot takes, no drive-by dunks.",
  },
  {
    num: "II",
    title: "Changing minds is the win",
    desc: "The highest value action on the platform is marking that someone changed your mind. That's the metric that matters here.",
  },
  {
    num: "III",
    title: "Living arguments",
    desc: "Your position evolves with every debate. Pin your best arguments to your profile — a living document of what you actually believe.",
  },
  {
    num: "IV",
    title: "Growth, not virality",
    desc: "Reputation comes from how well you argue — averaged across every rating you receive. No likes, no followers, no gaming.",
  },
];

const Differentiators = () => {
  return (
    <div className="ed-diff">
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
        Why this is different
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", margin: "0 0 40px", lineHeight: 1.05 }}>
        Debate that <em>actually works</em>
      </h2>
      <div className="ed-diff-grid">
        {items.map((item) => (
          <div key={item.num} className="ed-diff-item">
            <span className="ed-diff-num">{item.num}</span>
            <h3 className="ed-diff-title">{item.title}</h3>
            <p className="ed-diff-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Differentiators;
