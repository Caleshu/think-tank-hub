import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up Supabase auth
    console.log({ isSignUp, username, email, password });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(circle, hsl(38, 92%, 50%), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1
          className="text-4xl md:text-5xl font-normal mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isSignUp ? "Join the arena" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isSignUp
            ? "Create your account and start debating."
            : "Sign in to continue debating."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="debatekinggg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-card border-border h-12"
              />
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card border-border h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card border-border h-12"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-muted-foreground mt-6 text-sm">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline font-medium"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
