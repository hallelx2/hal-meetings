import { Badge } from '@hal/ui';

export function Privacy() {
  return (
    <section id="privacy" className="relative py-24 lg:py-32 bg-soft-gray-fill/40 border-y border-cloud-mist/60">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10 grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
        {/* Diagram */}
        <div className="order-2 lg:order-1">
          <EnvelopeDiagram />
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2 flex flex-col gap-5">
          <Badge tone="aqua">Encrypted by default</Badge>
          <h2 className="font-display font-bold tracking-adora text-rich-violet text-[36px] lg:text-[52px] leading-[1.05]">
            Your tokens never leave plaintext.{' '}
            <span className="text-action-violet">Not even once.</span>
          </h2>
          <p className="text-slate-text/80 text-[18px] leading-[1.55] max-w-[540px]">
            Hal uses standard envelope encryption: a master key in your KMS wraps a per-user
            data encryption key, which encrypts every OAuth token, transcript, and audio file.
            Lose the database — lose nothing.
          </p>

          <ul className="mt-3 grid sm:grid-cols-2 gap-3 max-w-[560px]">
            {[
              ['AES-256-GCM', 'Authenticated encryption everywhere'],
              ['Per-user DEK', 'One breach can\'t fan out'],
              ['Pluggable KMS', 'Vault, AWS KMS, GCP KMS, local'],
              ['Zero plaintext logs', 'Tokens redacted at the logger'],
              ['Bot-as-delegate', 'Always disclosed, never deepfake'],
              ['Audit trail', 'Every action Hal took, in writing'],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-2xl border border-cloud-mist/80 bg-canvas-white px-4 py-3.5"
              >
                <div className="font-display text-[15px] font-semibold tracking-adora text-rich-violet">
                  {title}
                </div>
                <div className="text-[13.5px] text-slate-text/70 mt-0.5">{body}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function EnvelopeDiagram() {
  return (
    <div className="relative rounded-cards border border-cloud-mist bg-canvas-white p-8 lg:p-10 overflow-hidden">
      <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-air-blue/60 blur-2xl" aria-hidden />
      <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-sunset-pink/50 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-5">
        <Layer
          label="KMS · Master Key (KEK)"
          tone="violet"
          note="never leaves KMS"
          big
        />
        <Connector />
        <Layer
          label="Per-user DEK (AES-256)"
          tone="aqua"
          note="stored as ciphertext only"
        />
        <Connector />
        <Layer
          label="Tokens · Transcripts · Audio"
          tone="green"
          note="ciphertext at rest, in transit, in logs"
        />
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
    violet: 'bg-action-violet text-canvas-white border-action-violet',
    aqua: 'bg-air-blue text-rich-violet border-aqua-blue/60',
    green: 'bg-lush-green text-rich-violet border-electric-green/60',
  }[tone];

  return (
    <div
      className={`rounded-2xl border-2 px-5 py-4 flex items-center justify-between gap-4 ${styles} ${
        big ? 'shadow-[0_18px_36px_-18px_rgba(89,46,255,0.55)]' : ''
      }`}
    >
      <span className="font-display text-[16px] font-semibold tracking-adora">{label}</span>
      <span className="text-[11.5px] font-medium uppercase tracking-adora opacity-80">{note}</span>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <svg width="20" height="32" viewBox="0 0 20 32" fill="none" className="text-slate-text/35">
        <path d="M10 0 V26" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" />
        <path d="M4 22 L10 30 L16 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
