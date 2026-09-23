import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  // Supabase redirects here (with a #error=... or #access_token=... hash) after an
  // email confirmation link is clicked, since emailRedirectTo points at this page.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hash.get("error_code");
    const errorDescription = hash.get("error_description");

    if (errorCode) {
      toast({
        title: errorCode === "otp_expired" ? "Link expired" : "Confirmation failed",
        description:
          errorCode === "otp_expired"
            ? "That confirmation link expired or was already used. Sign up again to get a new one, and open it in the same browser right away."
            : errorDescription?.replace(/\+/g, " ") ?? "Please try again.",
        variant: "destructive",
      });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (hash.get("access_token")) {
      toast({ title: "Email confirmed", description: "You're all set — sign in to continue." });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email to confirm your account, then sign in.",
        });
        setIsSignUp(false);
        setShowResend(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setShowResend(true);
          }
          throw error;
        }
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      toast({ title: "Confirmation email sent", description: "Check your inbox and open the link right away." });
    } catch (error: any) {
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", padding: "0 16px" }}>
      {/* Minimal nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--rule)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Debate Me Bro
        </span>
        <button className="icon-btn-pill" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
        </button>
      </div>

      {/* Centered form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <Link
            to="/"
            className="back-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 28, textDecoration: "none" }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Back
          </Link>

          <div className="auth-card">
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 10px" }}>
                {isSignUp ? "New account" : "Welcome back"}
              </p>
              <h1 className="auth-title">
                {isSignUp ? "Enter the arena" : "Sign in"}
              </h1>
              <p className="auth-sub">
                {isSignUp ? "Create your account and start debating." : "Continue to Debate Me Bro."}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isSignUp && (
                <div className="field">
                  <label className="field-label">Username</label>
                  <input
                    type="text"
                    placeholder="your_handle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="dmb-input"
                    required
                  />
                </div>
              )}

              <div className="field">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="dmb-input"
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dmb-input"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="dmb-btn lg"
                style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
                disabled={loading}
              >
                {loading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            {showResend && (
              <p className="auth-switch">
                Didn't get the email?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}
                >
                  {resending ? "Sending..." : "Resend confirmation email"}
                </button>
              </p>
            )}

            <p className="auth-switch">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
