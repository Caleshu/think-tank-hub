import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Swords,
  Pencil,
  Check,
  X,
  Trash2,
  Plus,
} from "lucide-react";

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
  topics?: { name: string };
};

type Topic = {
  id: string;
  name: string;
  description: string;
};

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [args, setArgs] = useState<Argument[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [tab, setTab] = useState<"profile" | "debate">("profile");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [stance, setStance] = useState<"for" | "against" | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadData(session.user.id);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async (userId: string) => {
    const [profileRes, argsRes, topicsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, reputation, debates_count, changed_minds_count")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("arguments")
        .select("id, topic_id, stance, title, content, version, debates_used_in, topics(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("topics").select("id, name, description").order("name"),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (argsRes.data) setArgs(argsRes.data as any);
    if (topicsRes.data) setTopics(topicsRes.data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

    const { error } = await supabase
      .from("arguments")
      .update({
        title: editTitle,
        content: editContent,
        version: existing.version + 1,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      setArgs((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, title: editTitle, content: editContent, version: a.version + 1 }
            : a
        )
      );
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

  const submitNewArgument = async () => {
    if (!selectedTopic || !stance || !newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("arguments")
      .insert({
        user_id: session.user.id,
        topic_id: selectedTopic.id,
        stance,
        title: newTitle,
        content: newContent,
      })
      .select("id, topic_id, stance, title, content, version, debates_used_in")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setArgs((prev) => [{ ...data, topics: { name: selectedTopic.name } }, ...prev]);
      setSelectedTopic(null);
      setStance(null);
      setNewTitle("");
      setNewContent("");
      setTab("profile");
      toast({ title: "Argument saved!", description: "It's now in your profile." });
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
        <button
          onClick={() => setTab("profile")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "profile"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Profile
        </button>
        <button
          onClick={() => {
            setTab("debate");
            setSelectedTopic(null);
            setStance(null);
          }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "debate"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords className="w-4 h-4" /> Start Debating
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {tab === "profile" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Username */}
            <div className="mb-8">
              <h2 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {profile.username}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Your intellectual portfolio</p>
            </div>

            {/* Stats */}
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

            {/* Arguments list */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Saved Arguments
              </h2>
              <Button
                size="sm"
                onClick={() => {
                  setTab("debate");
                  setSelectedTopic(null);
                  setStance(null);
                }}
              >
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
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-background border-border"
                        />
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="bg-background border-border min-h-[120px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Check className="w-3 h-3" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-foreground font-medium">{arg.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {(arg as any).topics?.name}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  arg.stance === "for"
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {arg.stance === "for" ? "FOR" : "AGAINST"}
                              </span>
                              <span className="text-xs text-primary font-mono">v{arg.version}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(arg)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteArg(arg.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{arg.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Debate flow: Topic → Stance → Write */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!selectedTopic ? (
              <>
                <h2
                  className="text-3xl text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Pick a topic
                </h2>
                <p className="text-muted-foreground mb-8">Choose what you want to argue about.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopic(t)}
                      className="card-surface p-5 text-left hover:border-primary/50 transition-colors group"
                    >
                      <h3 className="text-foreground font-medium group-hover:text-primary transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : !stance ? (
              <>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-muted-foreground hover:text-foreground text-sm mb-6 inline-block"
                >
                  ← Back to topics
                </button>
                <h2
                  className="text-3xl text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {selectedTopic.name}
                </h2>
                <p className="text-muted-foreground mb-8">Which side are you on?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStance("for")}
                    className="card-surface p-8 text-center hover:border-green-500/50 transition-colors group"
                  >
                    <span className="text-3xl mb-2 block">👍</span>
                    <span className="text-foreground font-semibold group-hover:text-green-400 transition-colors">
                      FOR
                    </span>
                  </button>
                  <button
                    onClick={() => setStance("against")}
                    className="card-surface p-8 text-center hover:border-red-500/50 transition-colors group"
                  >
                    <span className="text-3xl mb-2 block">👎</span>
                    <span className="text-foreground font-semibold group-hover:text-red-400 transition-colors">
                      AGAINST
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStance(null)}
                  className="text-muted-foreground hover:text-foreground text-sm mb-6 inline-block"
                >
                  ← Back to stance
                </button>
                <h2
                  className="text-3xl text-foreground mb-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Write your argument
                </h2>
                <p className="text-muted-foreground mb-8">
                  {selectedTopic.name} ·{" "}
                  <span
                    className={
                      stance === "for" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {stance.toUpperCase()}
                  </span>
                </p>

                <div className="space-y-4">
                  <Input
                    placeholder="Give your argument a title…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-card border-border h-12"
                  />
                  <Textarea
                    placeholder="Write your opening argument…"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="bg-card border-border min-h-[200px]"
                  />
                  <Button
                    onClick={submitNewArgument}
                    disabled={saving || !newTitle.trim() || !newContent.trim()}
                    className="h-12 px-8"
                  >
                    {saving ? "Saving…" : "Save Argument"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
