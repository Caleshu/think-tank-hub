import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MessageSquare, Brain } from "lucide-react";
import { FeedArgument } from "@/types/feed";
import ArgumentInteractionModal from "@/components/feed/ArgumentInteractionModal";

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

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfileData(prof);

      const { data: argsData } = await supabase
        .from("arguments")
        .select("id, user_id, topic_id, stance, title, content, version, posted, pinned, changed_minds_count, avg_stars, created_at, topics(id, name)")
        .eq("user_id", prof.user_id)
        .eq("pinned", true)
        .order("created_at", { ascending: false });

      if (argsData) {
        const pinned = argsData as any[];
        // Load current user's interactions for these arguments
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Profile not found
        </p>
        <p className="text-muted-foreground text-sm">
          No user with the username "{username}" exists.
        </p>
        <Link to="/dashboard" className="text-primary hover:underline text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isOwn = currentUserId === profileData!.user_id;

  // Unique topics from pinned args for the filter
  const availableTopics = Array.from(
    new Map(pinnedArgs.map((a) => [a.topic_id, a.topics])).entries()
  )
    .filter(([, t]) => t)
    .map(([id, t]) => ({ id, name: t!.name }));

  const filtered =
    topicFilter === "all"
      ? pinnedArgs
      : pinnedArgs.filter((a) => a.topic_id === topicFilter);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-primary italic">feels</span>
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mb-8">
            <h2 className="text-4xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              {profileData!.username}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Public beliefs</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Reputation", value: profileData!.reputation.toFixed(1) },
              { label: "Debates", value: profileData!.debates_count },
              { label: "Changed Minds", value: profileData!.changed_minds_count },
              { label: "Pinned Beliefs", value: pinnedArgs.length },
            ].map((s) => (
              <div key={s.label} className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Beliefs header + topic filter */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <h3 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Beliefs
            </h3>
            {availableTopics.length > 0 && (
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="bg-card border border-border text-foreground text-xs rounded px-3 py-1.5 focus:outline-none focus:border-primary"
              >
                <option value="all">All topics</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {pinnedArgs.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-muted-foreground">
                {profileData!.username} hasn't pinned any beliefs yet.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-muted-foreground">No beliefs on this topic.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((arg) => {
                const avgStars = Number(arg.avg_stars ?? 0);
                return (
                  <div
                    key={arg.id}
                    className="card-surface p-5 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/argument/${arg.id}`)}
                  >
                    {/* Title row */}
                    <div className="mb-2">
                      <h4 className="text-foreground font-medium">{arg.title}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{arg.topics?.name}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            arg.stance === "for"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {arg.stance === "for" ? "FOR" : "AGAINST"}
                        </span>
                        <span className="text-xs font-mono text-primary">v{arg.version}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{arg.content}</p>

                    {/* Stats + action row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="text-amber-400">★</span>{" "}
                          {avgStars > 0 ? avgStars.toFixed(1) : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {arg.changed_minds_count} minds changed
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!isOwn && (
                          <button
                            onClick={() => setInteractionArg({
                              ...arg,
                              stance: arg.stance as "for" | "against",
                              topic_name: arg.topics?.name,
                              username: profileData!.username,
                            })}
                            className="text-xs font-medium text-muted-foreground hover:text-primary border border-border hover:border-primary/50 rounded px-3 py-1.5 transition-colors"
                          >
                            Rate
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/argument/${arg.id}`)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary border border-border hover:border-primary/50 rounded px-3 py-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
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
              ))
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
