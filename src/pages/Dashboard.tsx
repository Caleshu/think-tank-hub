import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Swords, Pencil, Check, X, Trash2, Plus,
  Pin, PinOff, Search, User, Globe, Brain, MessageSquare,
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
  const [tab, setTab] = useState<"beliefs" | "arguments" | "feed">("beliefs");
  const [showNewArgForm, setShowNewArgForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [stance, setStance] = useState<"for" | "against" | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [matchmakingId, setMatchmakingId] = useState<string | null>(null);

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
      supabase.from("topics").select("id, name, description").order("name"),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (argsRes.data) setArgs(argsRes.data as any);
    if (topicsRes.data) setTopics(topicsRes.data);
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

    if (feedTopicFilter !== "all") query = query.eq("topic_id", feedTopicFilter);
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
    setShowNewArgForm(false);
    setSelectedTopic(null);
    setStance(null);
    setNewTitle("");
    setNewContent("");
  };

  const switchTab = (t: "beliefs" | "arguments" | "feed") => {
    resetCreationFlow();
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
      toast({ title: "Argument saved!" });
    }
    setSaving(false);
  };

  const handleUseArgument = async (arg: Argument) => {
    setMatchmakingId(arg.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const userId = session.user.id;
    const mySide = arg.stance === "for" ? "for" : "against";
    const oppSide = mySide === "for" ? "against" : "for";

    const { data: existing } = await supabase
      .from("debates").select("id")
      .eq("topic_id", arg.topic_id).eq("status", "waiting")
      .is(mySide === "for" ? "for_user_id" : "against_user_id", null)
      .not(oppSide === "for" ? "for_user_id" : "against_user_id", "is", null)
      .neq(oppSide === "for" ? "for_user_id" : "against_user_id", userId)
      .limit(1).maybeSingle();

    if (existing) {
      const joinField = mySide === "for"
        ? { for_user_id: userId, for_argument: arg.content, status: "reading" }
        : { against_user_id: userId, against_argument: arg.content, status: "reading" };
      await supabase.from("debates").update(joinField).eq("id", existing.id);
      navigate(`/debate/${existing.id}`);
      return;
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
      setMatchmakingId(null);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pinnedArgs = args.filter((a) => a.pinned);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          <span className="text-primary italic">feels</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile.username}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-border px-6 flex gap-0">
        {(["beliefs", "arguments", "feed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "feed" && <Search className="w-4 h-4" />}
            {t === "beliefs" ? "My Profile" : t === "arguments" ? "My Saved Arguments" : "Explore"}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── MY BELIEFS ── */}
        {tab === "beliefs" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-8">
              <h2 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {profile.username}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Your profile & public beliefs</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Reputation", value: profile.reputation.toFixed(1) },
                { label: "Debates", value: profile.debates_count },
                { label: "Arguments", value: args.length },
                { label: "Changed Minds", value: profile.changed_minds_count },
              ].map((s) => (
                <div key={s.label} className="bg-secondary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6 gap-4">
              <h3 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Pinned Beliefs
              </h3>
              {pinnedArgs.length > 0 && (() => {
                const pinTopics = Array.from(
                  new Map(pinnedArgs.map((a) => [a.topic_id, (a as any).topics?.name])).entries()
                ).filter(([, name]) => name);
                return pinTopics.length > 0 ? (
                  <select
                    value={beliefTopicFilter}
                    onChange={(e) => setBeliefTopicFilter(e.target.value)}
                    className="bg-card border border-border text-foreground text-xs rounded px-3 py-1.5 focus:outline-none focus:border-primary"
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
              <div className="card-surface p-8 text-center">
                <p className="text-muted-foreground">
                  No pinned beliefs yet.{" "}
                  <button onClick={() => switchTab("arguments")} className="text-primary hover:underline">
                    Pin an argument
                  </button>{" "}
                  to make it public.
                </p>
              </div>
            ) : (beliefTopicFilter !== "all" && pinnedArgs.filter((a) => a.topic_id === beliefTopicFilter).length === 0) ? (
              <div className="card-surface p-8 text-center">
                <p className="text-muted-foreground">No pinned beliefs on this topic.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(beliefTopicFilter === "all" ? pinnedArgs : pinnedArgs.filter((a) => a.topic_id === beliefTopicFilter)).map((arg) => (
                  <div
                    key={arg.id}
                    className="card-surface p-5 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/argument/${arg.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-foreground font-medium">{arg.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{(arg as any).topics?.name}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${arg.stance === "for" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                            {arg.stance === "for" ? "FOR" : "AGAINST"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Pinned</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); togglePin(arg); }} title="Unpin">
                        <PinOff className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{arg.content}</p>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="text-amber-400">★</span>{" "}
                          {(arg as any).avg_stars > 0 ? Number((arg as any).avg_stars).toFixed(1) : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {(arg as any).changed_minds_count ?? 0} minds changed
                        </span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/argument/${arg.id}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary border border-border hover:border-primary/50 rounded px-3 py-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          View Thread
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ArgumentInteractionModal
              argument={interactionArg}
              currentUserId={currentUserId}
              open={!!interactionArg}
              onClose={() => setInteractionArg(null)}
              onInteracted={(updated) => setInteractionArg(updated)}
            />
          </motion.div>
        )}

        {/* ── MY SAVED ARGUMENTS ── */}
        {tab === "arguments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!showNewArgForm ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    My Saved Arguments
                  </h2>
                  <Button size="sm" onClick={() => { setShowNewArgForm(true); setSelectedTopic(null); setStance(null); }}>
                    <Plus className="w-4 h-4" /> New Argument
                  </Button>
                </div>

                {args.length === 0 ? (
                  <div className="card-surface p-8 text-center">
                    <p className="text-muted-foreground">No arguments yet. Pick a topic and start writing!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {args.map((arg) => (
                      <div key={arg.id} className="card-surface p-5">
                        {editingId === arg.id ? (
                          <div className="space-y-3">
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-background border-border" />
                            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-background border-border min-h-[120px]" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit}><Check className="w-3 h-3" /> Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3 h-3" /> Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-foreground font-medium">{arg.title}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">{(arg as any).topics?.name}</span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${arg.stance === "for" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                    {arg.stance === "for" ? "FOR" : "AGAINST"}
                                  </span>
                                  <span className="text-xs text-primary font-mono">v{arg.version}</span>
                                  {arg.pinned && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Pinned</span>}
                                  {arg.posted && <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">Posted</span>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => togglePosted(arg)} title={arg.posted ? "Remove from feed" : "Post to feed"}>
                                  <Globe className={`w-3.5 h-3.5 ${arg.posted ? "text-blue-400" : ""}`} />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => togglePin(arg)} title={arg.pinned ? "Unpin" : "Pin to beliefs"}>
                                  {arg.pinned ? <PinOff className="w-3.5 h-3.5 text-primary" /> : <Pin className="w-3.5 h-3.5" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => startEdit(arg)}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => deleteArg(arg.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{arg.content}</p>
                            <Button size="sm" onClick={() => handleUseArgument(arg)} disabled={matchmakingId === arg.id}>
                              <Swords className="w-3.5 h-3.5" />
                              {matchmakingId === arg.id ? "Finding opponent..." : "Use This Argument"}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {!selectedTopic ? (
                  <>
                    <button onClick={resetCreationFlow} className="text-muted-foreground hover:text-foreground text-sm mb-6 inline-block">← Back to my arguments</button>
                    <h2 className="text-3xl text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Pick a topic</h2>
                    <p className="text-muted-foreground mb-8">Choose what you want to argue about.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topics.map((t) => {
                        const topicArgs = args.filter((a) => a.topic_id === t.id);
                        return (
                          <button key={t.id} onClick={() => setSelectedTopic(t)} className="card-surface p-5 text-left hover:border-primary/50 transition-colors group">
                            <h3 className="text-foreground font-medium group-hover:text-primary transition-colors">{t.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                            {topicArgs.length > 0 && (
                              <p className="text-xs text-primary mt-2 font-mono">
                                ✓ {topicArgs.length} argument{topicArgs.length > 1 ? "s" : ""} saved
                                {topicArgs.some((a) => a.pinned) ? " · Pinned" : ""}
                                {topicArgs.some((a) => a.posted) ? " · Posted" : ""}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : !stance ? (
                  <>
                    <button onClick={() => setSelectedTopic(null)} className="text-muted-foreground hover:text-foreground text-sm mb-6 inline-block">← Back to topics</button>
                    <h2 className="text-3xl text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>{selectedTopic.name}</h2>
                    <p className="text-muted-foreground mb-8">Which side are you on?</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setStance("for")} className="card-surface p-8 text-center hover:border-green-500/50 transition-colors group">
                        <span className="text-3xl mb-2 block">👍</span>
                        <span className="text-foreground font-semibold group-hover:text-green-400 transition-colors">FOR</span>
                      </button>
                      <button onClick={() => setStance("against")} className="card-surface p-8 text-center hover:border-red-500/50 transition-colors group">
                        <span className="text-3xl mb-2 block">👎</span>
                        <span className="text-foreground font-semibold group-hover:text-red-400 transition-colors">AGAINST</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={() => setStance(null)} className="text-muted-foreground hover:text-foreground text-sm mb-6 inline-block">← Back to stance</button>
                    <h2 className="text-3xl text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>Write your argument</h2>
                    <p className="text-muted-foreground mb-8">
                      {selectedTopic.name} · <span className={stance === "for" ? "text-green-400" : "text-red-400"}>{stance.toUpperCase()}</span>
                    </p>
                    <div className="space-y-4">
                      <Input placeholder="Give your argument a title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-card border-border h-12" />
                      <Textarea placeholder="Write your opening argument…" value={newContent} onChange={(e) => setNewContent(e.target.value)} className="bg-card border-border min-h-[200px]" />
                      <Button onClick={submitNewArgument} disabled={saving || !newTitle.trim() || !newContent.trim()} className="h-12 px-8">
                        {saving ? "Saving…" : "Save Argument"}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── MY FEED ── */}
        {tab === "feed" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* User search */}
            <div className="mb-8">
              <h2 className="text-3xl text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Explore</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for a thinker by username…"
                  value={feedQuery}
                  onChange={(e) => { const v = e.target.value; setFeedQuery(v); searchFeed(v); }}
                  className="bg-card border-border h-10 pl-10"
                />
              </div>
              {feedSearching && <div className="flex justify-center py-3"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
              {feedResults.length > 0 && (
                <div className="space-y-2 mb-6">
                  {feedResults.map((r) => (
                    <Link key={r.username} to={`/profile/${r.username}`} className="card-surface p-3 flex items-center justify-between hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-foreground text-sm font-medium">{r.username}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{r.reputation.toFixed(1)} rep</span>
                        <span>{r.debates_count} debates</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {!feedSearching && feedQuery.trim() && feedResults.length === 0 && (
                <p className="text-xs text-muted-foreground mb-6">No users found matching "{feedQuery}"</p>
              )}
            </div>

            {/* Feed filters */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <h3 className="text-lg text-foreground mr-auto" style={{ fontFamily: "var(--font-display)" }}>
                Public Arguments
              </h3>
              {/* Topic filter */}
              <select
                value={feedTopicFilter}
                onChange={(e) => setFeedTopicFilter(e.target.value)}
                className="bg-card border border-border text-foreground text-xs rounded px-3 py-1.5 focus:outline-none focus:border-primary"
              >
                <option value="all">All topics</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {/* Stance filter */}
              <div className="flex rounded overflow-hidden border border-border text-xs">
                {(["all", "for", "against"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedStanceFilter(s)}
                    className={`px-3 py-1.5 transition-colors ${feedStanceFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {s === "all" ? "All" : s === "for" ? "FOR" : "AGAINST"}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed list */}
            {feedLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : feedArgs.length === 0 ? (
              <div className="card-surface p-10 text-center">
                <p className="text-muted-foreground">No arguments posted yet. Post yours from My Saved Arguments!</p>
              </div>
            ) : (
              <div className="space-y-4">
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
