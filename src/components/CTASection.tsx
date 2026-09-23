import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <div className="ed-cta-section">
      <h2 className="ed-cta-title">
        Ready to find out what<br />you <em>actually</em> believe?
      </h2>
      <p className="ed-cta-sub">
        Join the platform where your ideas get pressure-tested by real people — and come out stronger.
      </p>
      <div className="ed-cta">
        <button className="ed-btn-primary" onClick={() => navigate("/auth")}>
          Start your first debate
        </button>
        <button className="ed-btn-link" onClick={() => navigate("/auth")}>
          Sign in
        </button>
      </div>
      <p className="ed-cta-fine">Free to join. No ads. No algorithms.</p>
    </div>
  );
};

export default CTASection;
