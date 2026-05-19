const platforms = [
  'Google Meet',
  'Zoom',
  'Microsoft Teams',
  'Google Calendar',
  'Microsoft 365',
  'Slack',
  'Notion',
  'Linear',
  'HubSpot',
  'Salesforce',
  'Attio',
  'GitHub',
];

export function Platforms() {
  return (
    <section className="relative py-16 lg:py-20 border-y border-cloud-mist/60 bg-soft-gray-fill/30 overflow-hidden">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10 mb-10">
        <p className="text-center font-display text-[14px] font-semibold uppercase tracking-adora text-slate-text/55">
          Works with the tools your team already lives in
        </p>
      </div>

      {/* Marquee */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-canvas-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-canvas-white to-transparent z-10" />
        <div className="flex w-max marquee-track">
          {[...platforms, ...platforms].map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="inline-flex items-center gap-3 px-8 py-4 font-display text-[22px] lg:text-[26px] font-semibold tracking-adora text-slate-text/65"
            >
              {p}
              <span className="h-1.5 w-1.5 rounded-full bg-slate-text/20" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
