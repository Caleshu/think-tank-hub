const beliefs = [
  { title: "Universal healthcare improves outcomes and reduces overall cost", topic: "Healthcare", stance: "for", stars: "4.6", minds: 3 },
  { title: "A carbon tax is the most efficient path to emissions reduction", topic: "Climate", stance: "for", stars: "4.1", minds: 1 },
  { title: "Ranked-choice voting would reduce political polarization", topic: "Democracy", stance: "for", stars: "4.8", minds: 5 },
];

const ProfileSection = () => {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px", borderTop: "1px solid var(--rule)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 64, alignItems: "start" }}>

        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 16 }}>
            Your intellectual portfolio
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(32px, 4vw, 48px)", letterSpacing: "-0.03em", color: "var(--ink)", margin: "0 0 20px", lineHeight: 1.05 }}>
            A profile that<br /><em>means something</em>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-2)", margin: "0 0 16px" }}>
            No followers. No likes. Just what you believe, how well you defend it, and how much you've grown.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ink-3)", margin: 0 }}>
            Your pinned arguments are your public intellectual identity. Every version, every rating, every changed mind is tracked.
          </p>
        </div>

        {/* Mock profile card */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 0, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--rule)" }}>
            <div style={{ width: 40, height: 40, background: "oklch(0.55 0.22 25)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
              A
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>alex_debates</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 2 }}>
                Rep 4.6 · 12 debates · 9 minds changed
              </div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>
            Pinned beliefs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {beliefs.map((b) => (
              <div key={b.title} style={{ background: "var(--bg-2)", border: "1px solid var(--rule-2)", borderRadius: 0, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4, margin: 0 }}>{b.title}</p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)", flexShrink: 0, padding: "2px 6px", background: "var(--rule)", borderRadius: 0 }}>
                    {b.topic}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: b.stance === "for" ? "oklch(0.52 0.17 152)" : "oklch(0.55 0.22 25)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em" }}>
                    {b.stance.toUpperCase()}
                  </span>
                  <span>★ {b.stars}</span>
                  <span>↩ {b.minds} changed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
