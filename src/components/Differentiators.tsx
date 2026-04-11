import { motion } from "framer-motion";
import { BookOpen, Handshake, FileText, TrendingUp } from "lucide-react";

const items = [
  {
    icon: BookOpen,
    title: "Read before you respond",
    desc: "You must understand the other side before the chat opens. This alone eliminates most bad-faith arguing.",
  },
  {
    icon: Handshake,
    title: "Comprehension over combat",
    desc: "The \"I understand their side\" button reframes every debate from winning to genuine understanding.",
  },
  {
    icon: FileText,
    title: "Living arguments",
    desc: "Your position is a living document that evolves with every debate — not a throwaway comment lost in a feed.",
  },
  {
    icon: TrendingUp,
    title: "Growth, not virality",
    desc: "Reputation is built on good-faith engagement. The platform rewards intellectual growth, not outrage.",
  },
];

const Differentiators = () => {
  return (
    <section className="py-32 px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <p className="step-number mb-4 uppercase tracking-[0.3em]">Why This Is Different</p>
          <h2 className="text-4xl md:text-6xl text-foreground leading-tight">
            Debate that<br /><span className="text-gradient">actually works</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Differentiators;
