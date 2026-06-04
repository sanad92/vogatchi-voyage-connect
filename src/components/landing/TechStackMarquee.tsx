const techs = ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'TailwindCSS', 'Vite', 'TanStack', 'Edge Functions'];

const TechStackMarquee = () => {
  return (
    <section className="py-12 bg-background border-y border-border">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <p className="text-center text-xs font-inter uppercase tracking-[0.2em] text-muted-foreground mb-6">
          تقنيات عالمية نبني بها Vogantra
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {techs.map((t) => (
            <span
              key={t}
              className="text-lg lg:text-xl font-bold text-muted-foreground/70 hover:text-foreground transition-colors font-mono"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackMarquee;
