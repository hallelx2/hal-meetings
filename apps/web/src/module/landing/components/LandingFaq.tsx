/**
 * Plus-sign expandable FAQ. Roomote-style: thin rule between rows, plus icon flips
 * to × on open. No nested cards, just a row pattern.
 */
const faqs = [
  {
    q: "What is Hal, in one sentence?",
    a: "An autonomous, self-hostable meeting agent that joins Meet, Zoom, and Teams on your behalf — listens, optionally speaks, and follows up after.",
  },
  {
    q: 'Is this legal? Doesn\'t recording need consent?',
    a: 'Most jurisdictions require notice (one-party) or affirmative consent from every participant (all-party). Hal joins as a named bot ("Hal · AI for <your name>"), announces itself on join, and respects regional policy you configure. In all-party-consent regions, Hal can be set to wait for explicit consent before recording or speaking.',
  },
  {
    q: 'Does Hal pretend to be me? Is this a deepfake product?',
    a: "No, and we will not build that mode. Hal is bot-as-delegate. It always appears with \"AI\" in its display name and discloses itself on joining. Voice cloning is opt-in only, gated behind a consent flow, watermarked, and audit-logged. If you want a deepfake, this is the wrong project.",
  },
  {
    q: 'Where do my transcripts and tokens live?',
    a: 'On your infrastructure when you self-host. Every OAuth token, transcript, and audio file is encrypted with a per-user data encryption key, which is itself wrapped by a master key in your KMS (Vault Transit, AWS KMS, GCP KMS, or local libsodium for development).',
  },
  {
    q: 'Which platforms work right now?',
    a: "Phase 0 — Google Meet only, listen-only, manually triggered. Zoom and Teams (via their official SDKs) and calendar auto-join come next. The roadmap section is honest about ETAs.",
  },
  {
    q: 'Can I run Hal without any external APIs?',
    a: "Yes. Pair Whisper for STT, Piper for TTS, Ollama for the LLM, and local libsodium for KMS. Latency suffers and quality is lower than managed services, but no audio or text ever leaves your box. This is the 'fully air-gapped' tier and a first-class supported configuration.",
  },
  {
    q: 'When will hosted Hal be available?',
    a: "After the self-host experience is solid. The same codebase will run both modes — managed Hal is just a deployment of the open-source project with cloud KMS, hosted STT/TTS, and billing turned on. No SaaS-only features.",
  },
  {
    q: "How is Hal different from Read AI, Otter, or Fireflies?",
    a: "Those products join alongside you. Hal goes for you — listening when you can't attend, speaking on your behalf within boundaries you set, and following up after. Plus: open source, self-hostable, encrypted by default, and explicitly not a deepfake.",
  },
  {
    q: 'Who built this and why?',
    a: "Hal Okorie (hallelx2 on GitHub) built Hal because the existing meeting tools either join alongside you or require a 12-step Cursor build. Both feel wrong for the post-2026 \"agents that go for you\" pattern. The project is solo, open, and AGPL-3.0.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[680px] mb-12">
          <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
            FAQ
          </span>
          <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            Questions you may ask{' '}
            <span className="text-ink/55 italic">(we get these frequently)</span>
          </h2>
        </div>

        <ul className="brutal-border-2 bg-canvas-white">
          {faqs.map((f, i) => (
            <li key={i} className={i < faqs.length - 1 ? 'border-b border-ink/20' : ''}>
              <details className="group">
                <summary className="cursor-pointer list-none grid grid-cols-[32px_1fr] gap-4 items-start p-5 lg:p-6 hover:bg-lush-green/40 transition-colors">
                  <span className="font-display text-[20px] font-bold tracking-adora text-ink leading-none mt-1 transition-transform group-open:rotate-45">
                    +
                  </span>
                  <span className="font-display text-[16px] lg:text-[18px] font-bold tracking-adora text-ink leading-[1.35]">
                    {f.q}
                  </span>
                </summary>
                <div className="px-5 lg:px-6 pb-6 pl-[60px] lg:pl-[64px] text-[15px] leading-[1.65] text-ink/80 max-w-[760px]">
                  {f.a}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
