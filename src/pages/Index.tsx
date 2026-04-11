import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ProfileSection from "@/components/ProfileSection";
import Differentiators from "@/components/Differentiators";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ProfileSection />
      <Differentiators />
      <CTASection />
      <footer className="py-12 px-6 border-t border-border text-center">
        <p className="text-muted-foreground text-sm">
          © 2026 Debate Me Bro. The platform where debate feels good.
        </p>
      </footer>
    </div>
  );
};

export default Index;
