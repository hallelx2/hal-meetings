/**
 * Envelope encryption — the diagram is the headline. Black bg for gravity.
 */
export function LandingPrivacy() {
  return (
    <section id="privacy" className="bg-ink text-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
          {/* Diagram */}
          <div className="order-2 lg:order-1">
            <EnvelopeDiagram />
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2 flex flex-col gap-5">
            <span className="text-[11px] font-bold uppercase tracking-adora text-electric-green">
              Encrypted by default
            </span>
            <h2 className="font-display font-bold tracking-adora text-canvas-white text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
              Your tokens never leave plaintext.
              <br />
              <span className="text-canvas-white/65">Not even once.</span>
            </h2>
            <p className="text-canvas-white/75 text-[17px] leading-[1.6] max-w-[540px]">
              Hal uses standard envelope encryption: a master key in your KMS wraps a
              per-user data encryption key, which encrypts every OAuth token,
              transcript, and audio file. Lose the database — lose nothing.
            </p>

            <ul className="grid sm:grid-cols-2 gap-3 mt-4 max-w-[560px]">
              {[
                ['AES-256-GCM', 'Authenticated encryption everywhere'],
                ['Per-user DEK', "One breach can't fan out"],
                ['Pluggable KMS', 'Vault · AWS KMS · GCP KMS · local'],
                ['Zero plaintext logs', 'Tokens redacted at the logger'],
                ['Bot-as-delegate', 'Always disclosed, never deepfake'],
                ['Audit trail', 'Every action Hal took, in writing'],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="p-4 brutal-border-2 border-canvas-white/15 bg-ink-soft"
                >
                  <div className="font-display text-[14px] font-bold tracking-adora text-canvas-white">
                    {title}
                  </div>
                  <div className="text-[13px] text-canvas-white/55 mt-0.5">{body}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function EnvelopeDiagram() {
  return (
    <div className="brutal-border-2 border-canvas-white bg-ink p-6 lg:p-8">
      <div className="text-[11px] font-bold uppercase tracking-adora text-canvas-white/55 mb-5">
        Envelope encryption
      </div>
      <div className="flex flex-col gap-3">
        <Layer
          label="KMS · Master Key (KEK)"
          tone="violet"
          note="never leaves KMS"
          big
        />
        <Connector />
        <Layer
          label="Per-user DEK (AES-256-GCM)"
          tone="aqua"
          note="stored as ciphertext"
        />
        <Connector />
        <Layer
          label="Tokens · Transcripts · Audio"
          tone="green"
          note="ciphertext at rest, in transit, in logs"
        />
      </div>

      {/* Footnote */}
      <div className="mt-7 pt-5 border-t border-canvas-white/15">
        <div className="text-[11px] font-bold uppercase tracking-adora text-canvas-white/55 mb-2">
          What this protects · what it doesn't
        </div>
        <ul className="flex flex-col gap-1.5 text-[12.5px]">
          <li className="flex items-start gap-2 text-canvas-white/85">
            <span className="text-electric-green font-bold">✓</span> A stolen DB dump
          </li>
          <li className="flex items-start gap-2 text-canvas-white/85">
            <span className="text-electric-green font-bold">✓</span> A leaky log line
          </li>
          <li className="flex items-start gap-2 text-canvas-white/85">
            <span className="text-electric-green font-bold">✓</span> A malicious operator with read-only DB access
          </li>
          <li className="flex items-start gap-2 text-canvas-white/55 mt-2">
            <span className="text-neon-pink font-bold">×</span> Shell access to a bot worker mid-meeting
          </li>
          <li className="flex items-start gap-2 text-canvas-white/55">
            <span className="text-neon-pink font-bold">×</span> A compromised KMS master key
          </li>
        </ul>
      </div>
    </div>
  );
}

function Layer({
  label,
  tone,
  note,
  big,
}: {
  label: string;
  tone: 'violet' | 'aqua' | 'green';
  note: string;
  big?: boolean;
}) {
  const styles = {
    violet: 'bg-action-violet text-canvas-white border-canvas-white',
    aqua: 'bg-air-blue text-ink border-ink',
    green: 'bg-lush-green text-ink border-ink',
  }[tone];

  return (
    <div className={`brutal-border-2 ${styles} px-4 py-3 flex items-center justify-between gap-3 ${big ? '' : ''}`}>
      <span className="font-display text-[15px] font-bold tracking-adora">{label}</span>
      <span className="text-[10px] font-bold uppercase tracking-adora opacity-70">{note}</span>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <svg width="20" height="22" viewBox="0 0 20 22" fill="none" className="text-canvas-white/45">
        <path d="M10 0 V16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
        <path d="M4 14 L 10 20 L 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
