import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ProfileSection from "@/components/ProfileSection";
import Differentiators from "@/components/Differentiators";
import CTASection from "@/components/CTASection";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="editorial" style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      {/* Max-width container */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <Navbar />
        <Hero />
      </div>

      <HowItWorks />
      <ProfileSection />
      <Differentiators />
      <CTASection />

      <footer style={{ borderTop: "1px solid var(--rule)", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#aaa", margin: 0 }}>
          © 2026 Debate Me Bro · Where positions get tested.
        </p>
      </footer>
    </div>
  );
};

export default Index;
