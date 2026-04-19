import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Brain, MessageSquare, Sun, Moon } from "lucide-react";
import { FeedArgument } from "@/types/feed";
import ArgumentInteractionModal from "@/components/feed/ArgumentInteractionModal";
import RotatingHint from "@/components/RotatingHint";
import { useTheme } from "@/hooks/useTheme";

type PublicProfile = {
  user_id: string;
  username: string;
  reputation: number;
  debates_count: number;
  changed_minds_count: number;
};

type PinnedArgument = {
  id: string;
  user_id: string;
  topic_id: string;
  stance: string;
  title: string;
  content: string;
  version: number;
  posted: boolean;
  pinned: boolean;
  changed_minds_count: number;
  avg_stars: number;
  created_at: string;
  topics?: { id: string; name: string };
};

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [pinnedArgs, setPinnedArgs] = useState<PinnedArgument[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [interactionArg, setInteractionArg] = useState<FeedArgument | null>(null);

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user.id ?? null);

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id, username, reputation, debates_count, changed_minds_count")
        .eq("username", username)
        .single();

      if (error || !prof) { setNotFound(true); setLoading(false); return; }
      setProfileData(prof);

      const { data: argsData } = await supabase
        .from("arguments")
        .select("id, user_id, topic_id, stance, title, content, version, posted, pinned, changed_minds_count, avg_stars, created_at, topics(id, name)")
        .eq("user_id", prof.user_id)
        .eq("pinned", true)
        .order("created_at", { ascending: false });

      if (argsData) {
        const pinned = argsData as any[];
        if (session?.user.id && pinned.length > 0) {
          const argIds = pinned.map((a) => a.id);
          const { data: myInts } = await (supabase as any)
            .from("argument_interactions")
            .select("argument_id, stars, mind_changed")
            .eq("user_id", session.user.id)
            .in("argument_id", argIds);
          const intMap = new Map((myInts ?? []).map((i: any) => [i.argument_id, { stars: i.stars, mind_changed: i.mind_changed }]));
          pinned.forEach((a) => { a.my_interaction = intMap.get(a.id) ?? null; });
        }
        setPinnedArgs(pinned);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="w-6 h-6 border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent", borderRadius: 0 }} />
          <RotatingHint />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)" }}>Profile not found</p>
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No user with the username "{username}" exists.</p>
        <Link to="/dashboard" style={{ color: "var(--color-primary)", fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isOwn = currentUserId === profileData!.user_id;
  const availableTopics = Array.from(
    new Map(pinnedArgs.map((a) => [a.topic_id, a.topics])).entries()
  ).filter(([, t]) => t).map(([id, t]) => ({ id, name: t!.name }));

  const filtered = topicFilter === "all" ? pinnedArgs : pinnedArgs.filter((a) => a.topic_id === topicFilter);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate(-1)} style={{ margin: 0 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> Back
        </button>
        <span className="logo" style={{ cursor: "default" }}>
          <span className="dot" />
          <span>Debate Me Bro</span>
        </span>
        <button className="icon-btn-pill" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* Profile header */}
          <div style={{ marginBottom: 32 }}>
            <p className="kicker">Public profile</p>
            <h2 className="page-title">{profileData!.username}</h2>
          </div>

          {/* Stats */}
          <div className="stat-grid" style={{ marginBottom: 40 }}>
            {[
              { label: "Reputation", value: profileData!.reputation.toFixed(1), primary: true },
              { label: "Debates", value: profileData!.debates_count },
              { label: "Changed Minds", value: profileData!.changed_minds_count },
              { label: "Pinned Beliefs", value: pinnedArgs.length },
            ].map((s) => (
              <div key={s.label} className={`stat-tile${s.primary ? " primary-tile" : ""}`}>
                <div className="stat-num">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Beliefs header + topic tabs */}
          <div style={{ marginBottom: 8 }}>
            <h3 className="section-title" style={{ marginBottom: 16 }}>Pinned Beliefs</h3>
            {availableTopics.length > 0 && (
              <div style={{ display: "flex", borderBottom: "1px solid var(--rule)", marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" }}>
                {["all", ...availableTopics.map((t) => t.id)].map((val) => {
                  const label = val === "all" ? "All" : availableTopics.find((t) => t.id === val)?.name ?? val;
                  const isActive = topicFilter === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setTopicFilter(val)}
                      style={{
                        background: "none", border: "none",
                        borderBottom: `2px solid ${isActive ? "var(--color-primary)" : "transparent"}`,
                        color: isActive ? "var(--ink)" : "var(--ink-3)",
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        fontWeight: isActive ? 700 : 500,
                        letterSpacing: "0.10em", textTransform: "uppercase",
                        padding: "10px 16px 9px",
                        cursor: "pointer", whiteSpace: "nowrap",
                        transition: "color 0.1s, border-color 0.1s",
                        marginBottom: -1,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Argument list */}
          {pinnedArgs.length === 0 ? (
            <div className="dmb-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "var(--ink-3)", fontSize: 14 }}>
                {profileData!.username} hasn't pinned any beliefs yet.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="dmb-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No beliefs on this topic.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((arg) => {
                const avgStars = Number(arg.avg_stars ?? 0);
                return (
                  <div
                    key={arg.id}
                    className="belief-card"
                    onClick={() => navigate(`/argument/${arg.id}`)}
                  >
                    <div style={{ marginBottom: 10 }}>
                      <h4 className="belief-title">{arg.title}</h4>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{arg.topics?.name}</span>
                        <span className={`dmb-pill ${arg.stance}`}>{arg.stance === "for" ? "FOR" : "AGAINST"}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", padding: "2px 7px", background: "var(--rule)", borderRadius: 0 }}>v{arg.version}</span>
                      </div>
                    </div>
                    <p className="belief-body">{arg.content}</p>
                    <div className="belief-foot">
                      <div style={{ display: "flex", gap: 14 }}>
                        <span className="stat-chip">
                          <span style={{ color: "var(--color-primary)" }}>★</span>
                          {avgStars > 0 ? avgStars.toFixed(1) : "—"}
                        </span>
                        <span className="stat-chip">
                          <Brain style={{ width: 11, height: 11 }} />
                          {arg.changed_minds_count} minds changed
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {!isOwn && (
                          <button
                            className="dmb-btn ghost sm"
                            onClick={() => setInteractionArg({
                              ...arg,
                              stance: arg.stance as "for" | "against",
                              topic_name: arg.topics?.name,
                              username: profileData!.username,
                            })}
                          >
                            Rate
                          </button>
                        )}
                        <button
                          className="dmb-btn ghost sm"
                          onClick={() => navigate(`/argument/${arg.id}`)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <MessageSquare style={{ width: 11, height: 11 }} />
                          {isOwn ? "View Thread" : "Debate"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <ArgumentInteractionModal
            argument={interactionArg}
            currentUserId={currentUserId}
            open={!!interactionArg}
            onClose={() => setInteractionArg(null)}
            onInteracted={(updated) => {
              setPinnedArgs((prev) => prev.map((a) =>
                a.id === updated.id
                  ? { ...a, my_interaction: updated.my_interaction, avg_stars: updated.avg_stars, changed_minds_count: updated.changed_minds_count }
                  : a
              ));
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
