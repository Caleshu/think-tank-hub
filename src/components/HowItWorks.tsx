const steps = [
  {
    num: "01",
    title: "Write your argument",
    desc: "Pick a topic, choose your stance, and write your opening argument. Craft it as detailed and reasoned as you can — this is your intellectual stake in the ground.",
  },
  {
    num: "02",
    title: "Debate a real person",
    desc: "Get matched with someone who holds the opposite view. Read their argument in full before the live debate begins — no hot takes.",
  },
  {
    num: "03",
    title: "Build your reputation",
    desc: "Reputation is earned through good-faith engagement — averaged across all ratings you receive. The highest value action: changing someone's mind.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 32 }}>
        How it works
      </p>
      <div className="ed-hiw">
        {steps.map((step) => (
          <div key={step.num} className="ed-hiw-card">
            <span className="ed-hiw-num">{step.num}</span>
            <h3 className="ed-hiw-title">{step.title}</h3>
            <p className="ed-hiw-desc">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
