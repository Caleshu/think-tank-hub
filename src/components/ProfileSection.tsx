import { motion } from "framer-motion";

const stats = [
  { label: "Debates", value: "47" },
  { label: "Extended Convos", value: "31" },
  { label: "Refinements", value: "84" },
  { label: "Changed Minds", value: "6" },
];

const topics = [
  { name: "Universal Healthcare", version: "v12", debates: 14 },
  { name: "Carbon Tax", version: "v8", debates: 9 },
  { name: "Immigration Policy", version: "v6", debates: 7 },
  { name: "Minimum Wage", version: "v15", debates: 17 },
];

const ProfileSection = () => {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <p className="step-number mb-4 uppercase tracking-[0.3em]">Your Intellectual Portfolio</p>
          <h2 className="text-4xl md:text-6xl text-foreground leading-tight">
            A profile that<br /><span className="text-gradient">means something</span>
          </h2>
          <p className="text-muted-foreground text-lg mt-6 max-w-xl">
            No followers. No likes. Just what you believe, how well you defend it, and how much you've grown.
          </p>
        </motion.div>

        {/* Mock profile card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface p-8 md:p-12 max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
              A
            </div>
            <div>
              <h3 className="text-foreground text-xl" style={{ fontFamily: 'var(--font-display)' }}>Alex Rivera</h3>
              <p className="text-muted-foreground text-sm">Reputation: <span className="text-primary font-semibold">4.7 / 5.0</span></p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-muted-foreground text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Topics */}
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest mb-4">Active Arguments</p>
            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-foreground text-sm">{t.name}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="text-primary font-mono">{t.version}</span>
                    <span>{t.debates} debates</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProfileSection;
