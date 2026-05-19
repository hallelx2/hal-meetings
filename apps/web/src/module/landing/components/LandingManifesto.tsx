/**
 * Full-bleed black manifesto strip — Roomote's "testimonial slot," repurposed
 * for Hal's stake-in-the-ground statement.
 */
export function LandingManifesto() {
  return (
    <section id="manifesto" className="bg-ink text-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-8 max-w-[920px]">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-adora text-canvas-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-electric-green" />
            Manifesto · 01
          </div>

          <p className="font-display font-bold tracking-adora text-[28px] sm:text-[36px] lg:text-[44px] leading-[1.15]">
            "We don't think every meeting deserves a human. We think most deserve a
            summary, a few deserve a delegate, and almost none deserve another hour
            of your week. Hal is the agent that sorts the difference —{' '}
            <span className="text-electric-green">on the record</span>, with your
            tokens, on your infra."
          </p>

          <div className="flex items-center gap-3 pt-4">
            <span className="h-10 w-10 brutal-border-2 border-canvas-white/85 bg-electric-green flex items-center justify-center text-ink font-display font-bold text-[18px]">
              H
            </span>
            <div className="flex flex-col">
              <span className="font-display text-[15px] font-bold tracking-adora">Halleluyah Darasimi Oludele</span>
              <span className="text-[12px] text-canvas-white/55 uppercase tracking-adora">Built Hal · hallelx2 · 2026</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
