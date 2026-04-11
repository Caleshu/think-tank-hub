import { motion } from "framer-motion";
import { Target, PenLine, Swords, MessageCircle, Star, RefreshCw } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Pick Your Topic & Side",
    desc: "Browse curated political topics. Pick one you care about. Choose your position. Enter the queue.",
    icon: Target,
  },
  {
    num: "02",
    title: "Write Your Opening",
    desc: "Craft your position in your own words — as detailed, nuanced, and well-reasoned as you can make it.",
    icon: PenLine,
  },
  {
    num: "03",
    title: "Enter the Debate Dungeon",
    desc: "Read your opponent's argument. They read yours. Both click \"I understand their side\" before chat opens.",
    icon: Swords,
  },
  {
    num: "04",
    title: "The Chat",
    desc: "3-minute open conversation. No timer pressure on messages. Both vote to keep going or wrap up.",
    icon: MessageCircle,
  },
  {
    num: "05",
    title: "Rate Your Opponent",
    desc: "Rate how they engaged — not whether they won. Did they make you think? Were they respectful?",
    icon: Star,
  },
  {
    num: "06",
    title: "Refine Your Argument",
    desc: "Edit your opening argument side-by-side with your opponent's. Get sharper with every debate.",
    icon: RefreshCw,
  },
];

const HowItWorks = () => {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <p className="step-number mb-4 uppercase tracking-[0.3em]">The Core Loop</p>
          <h2 className="text-4xl md:text-6xl text-foreground leading-tight">
            Six steps to a<br /><span className="text-gradient">sharper mind</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-surface p-8 group hover:border-glow transition-colors duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <step.icon className="w-5 h-5 text-primary" />
                <span className="step-number">{step.num}</span>
              </div>
              <h3 className="text-xl text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
