import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="py-32 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl text-foreground leading-tight mb-6">
            Ready to find out what<br />you <span className="text-gradient italic">actually</span> believe?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
            Join the platform where your ideas get pressure-tested by real people — and come out stronger.
          </p>
          <button className="bg-primary text-primary-foreground px-10 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity">
            Start Your First Debate
          </button>
          <p className="text-muted-foreground text-xs mt-6">Free to join. No ads. No algorithms.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
