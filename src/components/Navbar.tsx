import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="ed-nav">
      <span className="ed-nav-logo" onClick={() => navigate("/")}>
        Debate Me Bro
      </span>
      <div className="ed-nav-right">
        <button
          onClick={toggleTheme}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--ink-3)", padding: "8px 6px", display: "flex", alignItems: "center",
            transition: "color 0.12s",
          }}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
        </button>
        <button className="ed-nav-link" onClick={() => navigate("/auth")}>
          Sign in
        </button>
        <button className="ed-nav-cta" onClick={() => navigate("/auth")}>
          Get started
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
