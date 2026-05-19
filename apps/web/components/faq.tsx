import { Badge } from '@hal/ui';

const faqs = [
  {
    q: 'Is this legal? Doesn\'t recording need consent?',
    a: 'Most jurisdictions require notice (one-party) or affirmative consent from every participant (all-party). Hal joins as a named bot ("Hal · AI for <your name>"), announces itself, and respects regional policy you configure. If you operate in an all-party-consent region, Hal can be set to wait for explicit consent before recording or speaking.',
  },
  {
    q: 'Does Hal pretend to be me?',
    a: 'No. Hal is bot-as-delegate, not deepfake. It always appears with "AI" in its name and discloses on joining. Voice cloning is opt-in, gated behind a consent flow, and every generated clip is watermarked and audit-logged.',
  },
  {
    q: 'Where do my transcripts and tokens live?',
    a: 'On your infrastructure when you self-host. Every OAuth token, transcript, and audio file is encrypted with a per-user data encryption key, which is itself wrapped by a master key in your KMS (Vault Transit, AWS KMS, GCP KMS, or local libsodium for development).',
  },
  {
    q: 'Which platforms work right now?',
    a: 'Phase 0 supports Google Meet via a headless browser worker. Zoom and Microsoft Teams via their official SDKs are next on the roadmap. Calendar integrations (Google Calendar, Microsoft 365) ship alongside.',
  },
  {
    q: 'Can I run Hal without any external APIs?',
    a: 'Yes. Pair Whisper for STT, Piper for TTS, Ollama for the LLM, and local libsodium for KMS. Latency suffers and quality is lower, but no audio or text ever leaves your box. This is the "fully air-gapped" tier.',
  },
  {
    q: 'When will hosted Hal be available?',
    a: 'After the self-host experience is solid. The same codebase will run both modes — managed Hal is just a deployment of the open-source project with cloud KMS, hosted STT/TTS, and billing turned on.',
  },
  {
    q: 'How is this different from Read AI, Otter, or Fireflies?',
    a: 'Those products join alongside you. Hal goes for you — listening when you can\'t attend, speaking on your behalf within boundaries you set, and following up after. Plus: open source, self-hostable, and encrypted by default.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1040px] px-6 lg:px-10">
        <div className="flex flex-col items-center gap-4 text-center max-w-[680px] mx-auto">
          <Badge tone="violet">Questions, answered straight</Badge>
          <h2 className="font-display font-bold tracking-adora text-rich-violet text-[36px] lg:text-[52px] leading-[1.05]">
            The honest FAQ.
          </h2>
        </div>

        <ul className="mt-14 flex flex-col gap-3">
          {faqs.map((f, i) => (
            <li key={i}>
              <details className="group rounded-cards border border-cloud-mist/80 bg-canvas-white open:bg-soft-gray-fill/30 transition-colors">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-6 p-6 lg:p-7">
                  <span className="font-display text-[18px] lg:text-[20px] font-semibold tracking-adora text-rich-violet leading-[1.3]">
                    {f.q}
                  </span>
                  <span className="mt-1 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-cloud-mist text-slate-text/70 group-open:rotate-45 transition-transform">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M7 1 v12 M1 7 h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 lg:px-7 pb-7 -mt-1 text-[16px] leading-[1.6] text-slate-text/80">
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
