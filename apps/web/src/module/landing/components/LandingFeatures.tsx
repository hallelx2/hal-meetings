/**
 * Black-bg 2x4 capability grid. Roomote's "X handles Y like a Z teammate" section,
 * adapted as Hal's capability matrix.
 */
const features = [
  {
    icon: <IconSpark />,
    title: 'Joins for you',
    body: 'When you can\'t attend, Hal joins as a disclosed delegate. Bot-as-delegate, never deepfake.',
  },
  {
    icon: <IconEye />,
    title: 'Listens like staff',
    body: 'Speaker-diarized transcripts. Action items, decisions, open questions surfaced automatically.',
  },
  {
    icon: <IconMic />,
    title: 'Speaks when you want',
    body: 'Pre-brief Hal on goals, talking points, hard nos. Confidence threshold before speaking.',
  },
  {
    icon: <IconReview />,
    title: 'Drafts for review',
    body: 'Follow-up emails, CRM updates, calendar holds — all drafted, never auto-sent.',
  },
  {
    icon: <IconShield />,
    title: 'Encrypted by default',
    body: 'AES-256 envelope encryption, per-user DEK, KMS-wrapped. Your tokens never leave plaintext.',
  },
  {
    icon: <IconCloud />,
    title: 'Bring your own everything',
    body: 'Whisper or Deepgram. Piper or ElevenLabs. Ollama or Claude. Local libsodium or AWS KMS. All swappable.',
  },
  {
    icon: <IconHandoff />,
    title: 'Easy to take over',
    body: 'Dial in mid-meeting and Hal mutes itself. Every line Hal said is in the audit log.',
  },
  {
    icon: <IconGit />,
    title: 'Open source, AGPL-3.0',
    body: 'Fork it. Run it. Contribute back. Self-host on a VPS or wait for the hosted plan.',
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-ink text-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col gap-4 max-w-[760px] mb-14">
          <span className="text-[11px] font-bold uppercase tracking-adora text-electric-green">
            Capabilities
          </span>
          <h2 className="font-display font-bold tracking-adora text-canvas-white text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
            Hal handles meetings
            <br />
            <span className="text-canvas-white/65">like a high-agency teammate.</span>
          </h2>
          <p className="text-canvas-white/65 text-[17px] leading-[1.55] max-w-[600px]">
            Hal isn't a transcription tool with a chat. It's an agent with a role, a voice,
            a kill switch, and an audit log. Built to be trusted in the room.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-canvas-white/15">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 p-6 lg:p-7 border-r border-b border-canvas-white/15"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center bg-electric-green text-ink brutal-border-2 border-canvas-white/20">
                {f.icon}
              </span>
              <h3 className="font-display text-[17px] font-bold tracking-adora text-canvas-white mt-1">
                {f.title}
              </h3>
              <p className="text-[14px] text-canvas-white/65 leading-[1.55]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 L 14 10 L 22 12 L 14 14 L 12 22 L 10 14 L 2 12 L 10 10 Z" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12 C 5 6, 9 4, 12 4 S 19 6, 22 12 C 19 18, 15 20, 12 20 S 5 18, 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11 a7 7 0 0 0 14 0 M12 18 V22" />
    </svg>
  );
}
function IconReview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M7 9 H17 M7 13 H14 M7 17 H11" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 L 20 5 V 11 C 20 16, 16 20, 12 22 C 8 20, 4 16, 4 11 V 5 Z" />
      <path d="M8 12 L 11 15 L 16 9" />
    </svg>
  );
}
function IconCloud() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 18 H17 a4 4 0 0 0 0 -8 a5 5 0 0 0 -9.6 1 A3.5 3.5 0 0 0 7 18 Z" />
      <path d="M12 11 V15 M9.5 13 H14.5" />
    </svg>
  );
}
function IconHandoff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12 H14 M11 8 L 15 12 L 11 16 M20 4 V20" />
    </svg>
  );
}
function IconGit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M6 8 V16 M8 6 H14 A4 4 0 0 1 16 10 V11" />
    </svg>
  );
}
