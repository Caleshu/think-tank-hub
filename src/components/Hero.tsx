import { motion } from "framer-motion";

const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center text-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, hsl(38, 92%, 50%), transparent 70%)' }} />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-4xl"
      >
        <p className="step-number mb-6 uppercase tracking-[0.3em]">The platform where debate feels good</p>
        
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-normal leading-[0.9] mb-8">
          <span className="text-foreground">Debate</span>
          <br />
          <span className="text-gradient">Me Bro</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
        >
          You don't truly understand your position until you've defended it against someone who's thought carefully about the other side.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base hover:opacity-90 transition-opacity">
            Start Debating
          </button>
          <button className="border border-border text-foreground px-8 py-4 rounded-lg font-semibold text-base hover:bg-secondary transition-colors">
            How It Works
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-5 h-8 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-1.5"
        >
          <div className="w-1 h-1.5 bg-muted-foreground/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
