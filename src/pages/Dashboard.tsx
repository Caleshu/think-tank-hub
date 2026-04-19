import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import {
  LogOut, Swords, Pencil, Check, X, Trash2, Plus,
  Pin, PinOff, Search, Globe, Brain, MessageSquare, ChevronRight, ArrowLeft, Sun, Moon,
} from "lucide-react";
import { FeedArgument } from "@/types/feed";
import FeedCard from "@/components/feed/FeedCard";
import ArgumentInteractionModal from "@/components/feed/ArgumentInteractionModal";

type Profile = {
  username: string;
  reputation: number;
  debates_count: number;
  changed_minds_count: number;
};

type Argument = {
  id: string;
  topic_id: string;
  stance: string;
  title: string;
  content: string;
  version: number;
  debates_used_in: number;
  pinned: boolean;
  posted: boolean;
  topics?: { name: string };
};

type Topic = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type ProfileResult = {
  username: string;
  reputation: number;
  debates_count: number;
  changed_minds_count: number;
};

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [args, setArgs] = useState<Argument[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [tab, setTab] = useState<"beliefs" | "brainstorm" | "stored" | "debate" | "feed">("beliefs");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [stance, setStance] = useState<"for" | "against" | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [brainstormTopicSearch, setBrainstormTopicSearch] = useState("");
  const [brainstormCategory, setBrainstormCategory] = useState<string>("all");

  // Debate tab state
  const [debateStep, setDebateStep] = useState<"topic" | "argument">("topic");
  const [debateTopic, setDebateTopic] = useState<Topic | null>(null);
  const [debateTopicSearch, setDebateTopicSearch] = useState("");
  const [debateArgSearch, setDebateArgSearch] = useState("");

  const [beliefTopicFilter, setBeliefTopicFilter] = useState<string>("all");

  // Feed state
  const [feedArgs, setFeedArgs] = useState<FeedArgument[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedTopicFilter, setFeedTopicFilter] = useState<string>("all");
  const [feedStanceFilter, setFeedStanceFilter] = useState<"all" | "for" | "against">("all");
  const [interactionArg, setInteractionArg] = useState<FeedArgument | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // User search state
  const [feedQuery, setFeedQuery] = useState("");
  const [feedResults, setFeedResults] = useState<ProfileResult[]>([]);
  const [feedSearching, setFeedSearching] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setCurrentUserId(session.user.id);
      loadData(session.user.id);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setCurrentUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load feed when feed tab is active or filters change
  useEffect(() => {
    if (tab === "feed") loadFeed();
  }, [tab, feedTopicFilter, feedStanceFilter]);

  const loadData = async (userId: string) => {
    const [profileRes, argsRes, topicsRes] = await Promise.all([
      supabase.from("profiles").select("username, reputation, debates_count, changed_minds_count").eq("user_id", userId).single(),
      supabase.from("arguments").select("id, topic_id, stance, title, content, version, debates_used_in, pinned, posted, avg_stars, changed_minds_count, topics(name)").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("topics").select("*").order("name"),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (argsRes.data) setArgs(argsRes.data as any);
    if (topicsRes.data) setTopics(topicsRes.data.map((t: any) => ({ ...t, category: t.category || "General" })));
  };

  const loadFeed = async () => {
    setFeedLoading(true);
    let query = supabase
      .from("arguments")
      .select("id, user_id, topic_id, stance, title, content, version, posted, pinned, changed_minds_count, avg_stars, created_at, topics(name)")
      .eq("posted", true)
      .order("changed_minds_count", { ascending: false })
      .order("avg_stars", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (feedTopicFilter !== "all") {
      const categoryTopicIds = topics.filter((t) => t.category === feedTopicFilter).map((t) => t.id);
      if (categoryTopicIds.length > 0) query = query.in("topic_id", categoryTopicIds);
    }
    if (feedStanceFilter !== "all") query = query.eq("stance", feedStanceFilter);

    const { data: argData } = await query;
    if (!argData) { setFeedLoading(false); return; }

    // Fetch profiles for all authors
    const userIds = [...new Set(argData.map((a: any) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    const usernameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.username]));

    const feedItems: FeedArgument[] = argData.map((a: any) => ({
      ...a,
      stance: a.stance as "for" | "against",
      topic_name: a.topics?.name,
      username: usernameMap.get(a.user_id) ?? "unknown",
    }));

    // Load current user's interactions for these arguments
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id && feedItems.length > 0) {
      const argIds = feedItems.map((a) => a.id);
      const { data: myInts } = await (supabase as any)
        .from("argument_interactions")
        .select("argument_id, stars, mind_changed")
        .eq("user_id", session.user.id)
        .in("argument_id", argIds);
      const intMap = new Map((myInts ?? []).map((i: any) => [i.argument_id, { stars: i.stars, mind_changed: i.mind_changed }]));
      feedItems.forEach((a) => { a.my_interaction = intMap.get(a.id) ?? null; });
    }

    setFeedArgs(feedItems);
    setFeedLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const resetCreationFlow = () => {
    setSelectedTopic(null);
    setStance(null);
    setNewTitle("");
    setNewContent("");
    setBrainstormTopicSearch("");
  };

  const switchTab = (t: "beliefs" | "brainstorm" | "stored" | "debate" | "feed") => {
    resetCreationFlow();
    setDebateStep("topic");
    setDebateTopic(null);
    setDebateTopicSearch("");
    setDebateArgSearch("");
    setTab(t);
  };

  const startEdit = (arg: Argument) => {
    setEditingId(arg.id);
    setEditTitle(arg.title);
    setEditContent(arg.content);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const existing = args.find((a) => a.id === editingId);
    if (!existing) return;

    const { error } = await supabase.from("arguments").update({
      title: editTitle,
      content: editContent,
      version: existing.version + 1,
    }).eq("id", editingId);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      setArgs((prev) => prev.map((a) => a.id === editingId ? { ...a, title: editTitle, content: editContent, version: a.version + 1 } : a));
      setEditingId(null);
      toast({ title: "Argument updated", description: `Now on v${existing.version + 1}` });
    }
  };

  const deleteArg = async (id: string) => {
    const { error } = await supabase.from("arguments").delete().eq("id", id);
    if (!error) {
      setArgs((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Argument deleted" });
    }
  };

  const togglePin = async (arg: Argument) => {
    const newPinned = !arg.pinned;
    const { error } = await supabase.from("arguments").update({ pinned: newPinned }).eq("id", arg.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setArgs((prev) => prev.map((a) => a.id === arg.id ? { ...a, pinned: newPinned } : a));
      toast({
        title: newPinned ? "Pinned to beliefs" : "Unpinned",
        description: newPinned ? "Now publicly visible on your profile." : "Removed from public beliefs.",
      });
    }
  };

  const togglePosted = async (arg: Argument) => {
    const newPosted = !arg.posted;
    const { error } = await supabase.from("arguments").update({ posted: newPosted }).eq("id", arg.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setArgs((prev) => prev.map((a) => a.id === arg.id ? { ...a, posted: newPosted } : a));
      toast({ title: newPosted ? "Posted to feed" : "Removed from feed" });
    }
  };

  const searchFeed = async (query: string) => {
    if (!query.trim()) { setFeedResults([]); return; }
    setFeedSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, reputation, debates_count, changed_minds_count")
      .ilike("username", `%${query.trim()}%`)
      .limit(20);
    if (!error && data) setFeedResults(data);
    setFeedSearching(false);
  };

  const submitNewArgument = async () => {
    if (!selectedTopic || !stance || !newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.from("arguments").insert({
      user_id: session.user.id,
      topic_id: selectedTopic.id,
      stance,
      title: newTitle,
      content: newContent,
    }).select("id, topic_id, stance, title, content, version, debates_used_in, pinned, posted").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setArgs((prev) => [{ ...data, topics: { name: selectedTopic.name } }, ...prev]);
      resetCreationFlow();
      setTab("stored");
      toast({ title: "Argument saved!" });
    }
    setSaving(false);
  };

  const handleDebateStart = async (arg: Argument) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const userId = session.user.id;
    const mySide = arg.stance === "for" ? "for" : "against";
    const oppSide = mySide === "for" ? "against" : "for";

    // Only match with debates created in the last 10 minutes — avoids ghost rooms
    const freshCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from("debates").select("id")
      .eq("topic_id", arg.topic_id).eq("status", "waiting")
      .is(mySide === "for" ? "for_user_id" : "against_user_id", null)
      .not(oppSide === "for" ? "for_user_id" : "against_user_id", "is", null)
      .neq(oppSide === "for" ? "for_user_id" : "against_user_id", userId)
      .gte("created_at", freshCutoff)
      .order("created_at", { ascending: true })
      .limit(1).maybeSingle();

    if (existing) {
      const joinField = mySide === "for"
        ? { for_user_id: userId, for_argument: arg.content, status: "reading" }
        : { against_user_id: userId, against_argument: arg.content, status: "reading" };

      // Atomic conditional update — only succeeds if the slot is still open and status still waiting
      const { data: joined } = await supabase
        .from("debates")
        .update(joinField)
        .eq("id", existing.id)
        .eq("status", "waiting")
        .is(mySide === "for" ? "for_user_id" : "against_user_id", null)
        .select("id")
        .single();

      if (joined) {
        navigate(`/debate/${joined.id}`);
        return;
      }
      // Race condition — someone else claimed that slot, fall through to create a new debate
    }

    const insertData: any = {
      topic_id: arg.topic_id,
      topic_title: (arg as any).topics?.name ?? "",
      status: "waiting",
    };
    insertData[mySide === "for" ? "for_user_id" : "against_user_id"] = userId;
    insertData[mySide === "for" ? "for_argument" : "against_argument"] = arg.content;

    const { data: created } = await supabase.from("debates").insert(insertData).select("id").single();
    if (created) {
      navigate(`/debate/${created.id}`);
    } else {
      toast({ title: "Error", description: "Couldn't start debate. Try again.", variant: "destructive" });
    }
  };

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const pinnedArgs = args.filter((a) => a.pinned);

  const tabLabels: Record<typeof tab, string> = {
    beliefs: "My Profile",
    brainstorm: "Brainstorm",
    stored: "My Arguments",
    debate: "Debate",
    feed: "Explore",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      {/* Flat topbar */}
      <div className="topbar">
        {/* Logo */}
        <div className="logo" onClick={() => navigate("/")}>
          <span className="dot" />
          <span>Debate Me Bro</span>
        </div>

        {/* Tab pills */}
        <div className="tab-pills">
          {(["beliefs", "brainstorm", "stored", "debate", "feed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`tab-pill${tab === t ? " active" : ""}`}
            >
              {t === "debate" && <Swords style={{ width: 12, height: 12 }} />}
              {t === "feed" && <Search style={{ width: 12, height: 12 }} />}
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* User + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="icon-btn-pill" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark"
              ? <Sun style={{ width: 13, height: 13 }} />
              : <Moon style={{ width: 13, height: 13 }} />}
          </button>
          <div className="user-chip">
            <div className="user-avatar">{profile.username.charAt(0).toUpperCase()}</div>
            <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.username}
            </span>
          </div>
          <button className="icon-btn-pill" onClick={handleSignOut} title="Sign out">
            <LogOut style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="mobile-tabs">
        {(["beliefs", "brainstorm", "stored", "debate", "feed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`mobile-tab${tab === t ? " active" : ""}`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* ── MY BELIEFS ── */}
        {tab === "beliefs" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ marginBottom: 0 }}>
              <p className="kicker">My Profile</p>
              <h2 className="page-title">{profile.username}</h2>
              <p className="page-lede">Your profile & public beliefs</p>
            </div>

            {/* Stat grid */}
            <div className="stat-grid">
              {[
                { label: "Reputation", value: profile.reputation.toFixed(1), primary: true },
                { label: "Debates", value: profile.debates_count, primary: false },
                { label: "Arguments", value: args.length, primary: false },
                { label: "Changed Minds", value: profile.changed_minds_count, primary: false },
              ].map((s) => (
                <div key={s.label} className={`stat-tile${s.primary ? " primary-tile" : ""}`}>
                  <div className="stat-num">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="section-head">
              <h3 className="section-title">Pinned Beliefs</h3>
              {pinnedArgs.length > 0 && (() => {
                const pinTopics = Array.from(
                  new Map(pinnedArgs.map((a) => [a.topic_id, (a as any).topics?.name])).entries()
                ).filter(([, name]) => name);
                return pinTopics.length > 0 ? (
                  <select
                    value={beliefTopicFilter}
                    onChange={(e) => setBeliefTopicFilter(e.target.value)}
                    style={{ background: "var(--surface)", border: "1px solid var(--rule)", color: "var(--ink)", fontSize: 12, borderRadius: 0, padding: "6px 12px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="all">All topics</option>
                    {pinTopics.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                ) : null;
              })()}
            </div>

            {pinnedArgs.length === 0 ? (
              <div className="dmb-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                <p style={{ color: "var(--ink-3)", fontSize: 14 }}>
                  No pinned beliefs yet.{" "}
                  <button onClick={() => switchTab("stored")} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
                    Pin an argument
                  </button>{" "}
                  to make it public.
                </p>
              </div>
            ) : (beliefTopicFilter !== "all" && pinnedArgs.filter((a) => a.topic_id === beliefTopicFilter).length === 0) ? (
              <div className="dmb-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No pinned beliefs on this topic.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(beliefTopicFilter === "all" ? pinnedArgs : pinnedArgs.filter((a) => a.topic_id === beliefTopicFilter)).map((arg) => (
                  <div
                    key={arg.id}
                    className="belief-card"
                    onClick={() => navigate(`/argument/${arg.id}`)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div>
                        <h4 className="belief-title">{arg.title}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{(arg as any).topics?.name}</span>
                          <span className={`dmb-pill ${arg.stance}`}>{arg.stance === "for" ? "FOR" : "AGAINST"}</span>
                          <span className="dmb-pill accent">Pinned</span>
                        </div>
                      </div>
                      <button
                        className="icon-btn-pill"
                        onClick={(e) => { e.stopPropagation(); togglePin(arg); }}
                        title="Unpin"
                        style={{ flexShrink: 0 }}
                      >
                        <PinOff style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    <p className="belief-body">{arg.content}</p>
                    <div className="belief-foot">
                      <div style={{ display: "flex", gap: 14 }}>
                        <span className="stat-chip">
                          <span style={{ color: "var(--color-primary)" }}>★</span>
                          {(arg as any).avg_stars > 0 ? Number((arg as any).avg_stars).toFixed(1) : "—"}
                        </span>
                        <span className="stat-chip">
                          <Brain style={{ width: 12, height: 12 }} />
                          {(arg as any).changed_minds_count ?? 0} minds changed
                        </span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/argument/${arg.id}`}
                          className="dmb-btn ghost sm"
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <MessageSquare style={{ width: 12, height: 12 }} />
                          View Thread
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </motion.div>
        )}

        {/* ── BRAINSTORM ── */}
        {tab === "brainstorm" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!selectedTopic ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h2 className="page-title">Brainstorm</h2>
                  <p className="page-lede">Pick a topic and write your argument.</p>
                </div>
                {(() => {
                  if (topics.length === 0) return (
                    <div className="dmb-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 6 }}>No topics found.</p>
                      <p style={{ color: "var(--ink-4)", fontSize: 12 }}>Run the database migration to seed topics.</p>
                    </div>
                  );

                  const categories = Array.from(new Set(topics.map((t) => t.category)));
                  const q = brainstormTopicSearch.toLowerCase();
                  const isSearching = q.length > 0;

                  // When searching, show all matching topics; otherwise filter by selected category
                  const visibleTopics = topics.filter((t) => {
                    const matchesSearch = !isSearching || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
                    const matchesCategory = isSearching || brainstormCategory === "all" || t.category === brainstormCategory;
                    return matchesSearch && matchesCategory;
                  });

                  return (
                    <>
                      {/* Search */}
                      <div className="search-wrap" style={{ marginBottom: 16 }}>
                        <Search className="search-ico" />
                        <input
                          className="dmb-input"
                          placeholder="Search topics…"
                          value={brainstormTopicSearch}
                          onChange={(e) => setBrainstormTopicSearch(e.target.value)}
                        />
                      </div>

                      {/* Category tabs — hidden while searching */}
                      {!isSearching && (
                        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--rule)", marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" }}>
                          {["all", ...categories].map((cat) => {
                            const isActive = brainstormCategory === cat;
                            return (
                              <button
                                key={cat}
                                onClick={() => setBrainstormCategory(cat)}
                                style={{
                                  background: "none", border: "none", borderBottom: `2px solid ${isActive ? "var(--color-primary)" : "transparent"}`,
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
                                {cat === "all" ? "All" : cat}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Topic list */}
                      {visibleTopics.length === 0 ? (
                        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>
                          {isSearching ? `No topics match "${brainstormTopicSearch}"` : "No topics in this category."}
                        </p>
                      ) : (
                        <div className="topic-list">
                          {visibleTopics.map((t, idx) => {
                            const count = args.filter((a) => a.topic_id === t.id).length;
                            return (
                              <button key={t.id} className="topic-row" onClick={() => setSelectedTopic(t)}>
                                <span className="topic-num">{String(idx + 1).padStart(2, "0")}</span>
                                <span className="topic-text">{t.name}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  {count > 0 && <span className="dmb-pill accent">✓ {count}</span>}
                                  <span className="topic-arrow"><ChevronRight style={{ width: 12, height: 12 }} /></span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : !stance ? (
              <>
                <button className="back-btn" onClick={() => setSelectedTopic(null)}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back to topics
                </button>
                <p className="kicker">{selectedTopic.category}</p>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                  {selectedTopic.name}
                </h2>
                <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 0 }}>Which side are you on?</p>
                <div className="stance-grid">
                  <button className="stance-card for" onClick={() => setStance("for")}>
                    <div className="stance-glyph">👍</div>
                    <div className="stance-label" style={{ color: "var(--mint-ink)" }}>FOR</div>
                  </button>
                  <button className="stance-card against" onClick={() => setStance("against")}>
                    <div className="stance-glyph">👎</div>
                    <div className="stance-label" style={{ color: "var(--coral-ink)" }}>AGAINST</div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="back-btn" onClick={() => setStance(null)}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back
                </button>
                <p className="kicker">{selectedTopic.category}</p>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                  {selectedTopic.name}
                </h2>
                <div style={{ marginBottom: 24 }}>
                  <span className={`dmb-pill ${stance}`}>{stance.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    className="dmb-input"
                    placeholder="Give your argument a title…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ height: 48, fontSize: 15 }}
                  />
                  <textarea
                    className="dmb-input dmb-textarea"
                    placeholder="Write your opening argument…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                  <button
                    className="dmb-btn lg"
                    onClick={submitNewArgument}
                    disabled={saving || !newTitle.trim() || !newContent.trim()}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {saving ? "Saving…" : "Save Argument"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── MY STORED ARGUMENTS ── */}
        {tab === "stored" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="section-head">
              <div>
                <h2 className="page-title">My Arguments</h2>
                <p className="page-lede">{args.length} saved</p>
              </div>
              <button className="dmb-btn sm" onClick={() => switchTab("brainstorm")}>
                <Plus style={{ width: 13, height: 13 }} /> New
              </button>
            </div>
            {args.length === 0 ? (
              <div className="dmb-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 10 }}>No arguments saved yet.</p>
                <button onClick={() => switchTab("brainstorm")} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
                  Go brainstorm one →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {args.map((arg) => (
                  <div key={arg.id} className="dmb-card" style={{ padding: "18px 22px" }}>
                    {editingId === arg.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="dmb-input"
                          style={{ height: 44 }}
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="dmb-input dmb-textarea"
                          style={{ minHeight: 120 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="dmb-btn sm" onClick={saveEdit}><Check style={{ width: 12, height: 12 }} /> Save</button>
                          <button className="dmb-btn ghost sm" onClick={() => setEditingId(null)}><X style={{ width: 12, height: 12 }} /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.3 }}>{arg.title}</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{(arg as any).topics?.name}</span>
                              <span className={`dmb-pill ${arg.stance}`}>{arg.stance === "for" ? "FOR" : "AGAINST"}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", padding: "2px 7px", background: "var(--rule)", borderRadius: 0 }}>v{arg.version}</span>
                              {arg.pinned && <span className="dmb-pill accent">Pinned</span>}
                              {arg.posted && <span className="dmb-pill neutral">Posted</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button className="icon-btn-pill" onClick={() => togglePosted(arg)} title={arg.posted ? "Remove from feed" : "Post to feed"}>
                              <Globe style={{ width: 13, height: 13, color: arg.posted ? "var(--color-primary)" : undefined }} />
                            </button>
                            <button className="icon-btn-pill" onClick={() => togglePin(arg)} title={arg.pinned ? "Unpin" : "Pin to profile"}>
                              {arg.pinned ? <PinOff style={{ width: 13, height: 13, color: "var(--color-primary)" }} /> : <Pin style={{ width: 13, height: 13 }} />}
                            </button>
                            <button className="icon-btn-pill" onClick={() => startEdit(arg)}>
                              <Pencil style={{ width: 13, height: 13 }} />
                            </button>
                            <button className="icon-btn-pill" onClick={() => deleteArg(arg.id)}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>{arg.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── DEBATE ── */}
        {tab === "debate" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Step: Pick topic */}
            {debateStep === "topic" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h2 className="page-title">Choose a topic <em>to debate</em></h2>
                  <p className="page-lede">Pick the topic you want to argue about.</p>
                </div>

                {(() => {
                  if (topics.length === 0) return (
                    <div className="dmb-card" style={{ textAlign: "center", padding: "40px 24px" }}>
                      <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No topics found.</p>
                    </div>
                  );

                  const categories = Array.from(new Set(topics.map((t) => t.category)));
                  const q = debateTopicSearch.toLowerCase();
                  const isSearching = q.length > 0;

                  const visibleTopics = topics.filter((t) => {
                    const matchesSearch = !isSearching || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
                    const matchesCategory = isSearching || brainstormCategory === "all" || t.category === brainstormCategory;
                    return matchesSearch && matchesCategory;
                  });

                  return (
                    <>
                      <div className="search-wrap" style={{ marginBottom: 16 }}>
                        <Search className="search-ico" />
                        <input
                          className="dmb-input"
                          placeholder="Search topics…"
                          value={debateTopicSearch}
                          onChange={(e) => setDebateTopicSearch(e.target.value)}
                        />
                      </div>

                      {!isSearching && (
                        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--rule)", marginBottom: 20, overflowX: "auto", scrollbarWidth: "none" }}>
                          {["all", ...categories].map((cat) => {
                            const isActive = brainstormCategory === cat;
                            return (
                              <button
                                key={cat}
                                onClick={() => setBrainstormCategory(cat)}
                                style={{
                                  background: "none", border: "none", borderBottom: `2px solid ${isActive ? "var(--color-primary)" : "transparent"}`,
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
                                {cat === "all" ? "All" : cat}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {visibleTopics.length === 0 ? (
                        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>
                          {isSearching ? `No topics match "${debateTopicSearch}"` : "No topics in this category."}
                        </p>
                      ) : (
                        <div className="topic-list">
                          {visibleTopics.map((t, idx) => {
                            const topicArgs = args.filter((a) => a.topic_id === t.id);
                            return (
                              <button
                                key={t.id}
                                className="topic-row"
                                onClick={() => { setDebateTopic(t); setDebateStep("argument"); setDebateArgSearch(""); }}
                              >
                                <span className="topic-num">{String(idx + 1).padStart(2, "0")}</span>
                                <span className="topic-text">{t.name}</span>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                  {topicArgs.length > 0 && <span className="dmb-pill accent">✓ {topicArgs.length}</span>}
                                  <span className="topic-arrow"><ChevronRight style={{ width: 12, height: 12 }} /></span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Step: Pick argument */}
            {debateStep === "argument" && debateTopic && (
              <>
                <button className="back-btn" onClick={() => { setDebateStep("topic"); setDebateTopic(null); }}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back to topics
                </button>

                <p className="kicker">{debateTopic.category}</p>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--ink)", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
                  {debateTopic.name}
                </h2>
                <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 20 }}>Select the argument you want to use in this debate.</p>

                {(() => {
                  const topicArgs = args.filter((a) => a.topic_id === debateTopic.id);
                  const filtered = topicArgs.filter((a) =>
                    a.title.toLowerCase().includes(debateArgSearch.toLowerCase()) ||
                    a.content.toLowerCase().includes(debateArgSearch.toLowerCase())
                  );

                  if (topicArgs.length === 0) {
                    return (
                      <div className="dmb-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                        <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 10 }}>
                          You don't have any saved arguments for this topic yet.
                        </p>
                        <button
                          onClick={() => switchTab("brainstorm")}
                          style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
                        >
                          Go write one →
                        </button>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="search-wrap" style={{ marginBottom: 16 }}>
                        <Search className="search-ico" />
                        <input
                          className="dmb-input"
                          placeholder="Search your arguments…"
                          value={debateArgSearch}
                          onChange={(e) => setDebateArgSearch(e.target.value)}
                        />
                      </div>

                      {filtered.length === 0 ? (
                        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No arguments match "{debateArgSearch}"</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {filtered.map((arg) => (
                            <button
                              key={arg.id}
                              onClick={() => handleDebateStart(arg)}
                              className="dmb-card hoverable"
                              style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                <span className={`dmb-pill ${arg.stance}`}>{arg.stance === "for" ? "FOR" : "AGAINST"}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-2)", padding: "2px 7px", background: "var(--rule)", borderRadius: 0 }}>v{arg.version}</span>
                                {arg.pinned && <span className="dmb-pill accent">Pinned</span>}
                                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)" }}>
                                  Use this <ChevronRight style={{ width: 12, height: 12 }} />
                                </span>
                              </div>
                              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)", margin: "0 0 6px" }}>{arg.title}</h3>
                              <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{arg.content}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

          </motion.div>
        )}

        {/* ── MY FEED ── */}
        {tab === "feed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* User search */}
            <div style={{ marginBottom: 28 }}>
              <h2 className="page-title" style={{ marginBottom: 16 }}>Explore</h2>
              <div className="search-wrap" style={{ marginBottom: 14 }}>
                <Search className="search-ico" />
                <input
                  className="dmb-input"
                  placeholder="Search for a thinker by username…"
                  value={feedQuery}
                  onChange={(e) => { const v = e.target.value; setFeedQuery(v); searchFeed(v); }}
                />
              </div>
              {feedSearching && <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} /></div>}
              {feedResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {feedResults.map((r) => (
                    <Link key={r.username} to={`/profile/${r.username}`} className="dmb-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 15 }}>{r.username.charAt(0).toUpperCase()}</div>
                        <span style={{ color: "var(--ink)", fontSize: 14, fontWeight: 500 }}>{r.username}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
                        <span>{r.reputation.toFixed(1)} rep</span>
                        <span>{r.debates_count} debates</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {!feedSearching && feedQuery.trim() && feedResults.length === 0 && (
                <p style={{ color: "var(--ink-4)", fontSize: 12, marginBottom: 20 }}>No users found matching "{feedQuery}"</p>
              )}
            </div>

            {/* Feed filters */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <h3 className="section-title" style={{ fontSize: 22, margin: 0 }}>Public Arguments</h3>
                {/* Stance filter */}
                <div style={{ display: "flex", border: "1px solid var(--rule)" }}>
                  {(["all", "for", "against"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFeedStanceFilter(s)}
                      style={{
                        background: feedStanceFilter === s ? "var(--color-primary)" : "transparent",
                        color: feedStanceFilter === s ? "var(--color-primary-ink)" : "var(--ink-3)",
                        border: "none", borderRight: s !== "against" ? "1px solid var(--rule)" : "none",
                        borderRadius: 0, padding: "6px 14px",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
                        fontFamily: "var(--font-mono)", cursor: "pointer", transition: "background 0.1s, color 0.1s",
                      }}
                    >
                      {s === "all" ? "All" : s === "for" ? "For" : "Against"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Category tabs */}
              {topics.length > 0 && (
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--rule)", overflowX: "auto", scrollbarWidth: "none" }}>
                  {["all", ...Array.from(new Set(topics.map((t) => t.category)))].map((cat) => {
                    const isActive = feedTopicFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setFeedTopicFilter(cat)}
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
                        {cat === "all" ? "All" : cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Feed list */}
            {feedLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
              </div>
            ) : feedArgs.length === 0 ? (
              <div className="dmb-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No arguments posted yet. Post yours from My Arguments!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {feedArgs.map((arg) => (
                  <FeedCard
                    key={arg.id}
                    argument={arg}
                    currentUserId={currentUserId}
                    onOpenInteraction={(a) => setInteractionArg(a)}
                  />
                ))}
              </div>
            )}

            <ArgumentInteractionModal
              argument={interactionArg}
              currentUserId={currentUserId}
              open={!!interactionArg}
              onClose={() => setInteractionArg(null)}
              onInteracted={(updated) => {
                setFeedArgs((prev) => prev.map((a) => a.id === updated.id ? updated : a));
              }}
            />
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
