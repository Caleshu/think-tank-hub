import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="ed-hero">
      <div className="ed-eyebrow">
        <span style={{ display: "inline-block", width: 6, height: 1, background: "var(--color-primary)", flexShrink: 0 }} />
        Arguments forged under pressure
      </div>

      <h1 className="ed-title">
        Debate.<br />
        <em>Sharpen.</em>
      </h1>

      <p className="ed-sub">
        You don't truly understand your position until you've defended it against someone who's thought carefully about the other side.
      </p>

      <div className="ed-cta">
        <button className="ed-btn-primary" onClick={() => navigate("/auth")}>
          Start debating →
        </button>
        <button className="ed-btn-link" onClick={scrollToHowItWorks}>
          How it works
        </button>
      </div>

      <div className="ed-stats">
        {[
          { num: "57", label: "Debate Topics" },
          { num: "10", label: "Categories" },
          { num: "Free", label: "Always" },
        ].map((s) => (
          <div key={s.label} className="ed-stat">
            <div className="ed-stat-num">{s.num}</div>
            <div className="ed-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Hero;
