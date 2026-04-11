const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/50">
      <span className="text-foreground font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        Debate Me Bro
      </span>
      <button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
        Join Waitlist
      </button>
    </nav>
  );
};

export default Navbar;
