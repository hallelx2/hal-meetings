import { Badge, LinkButton } from '@hal/ui';

const pluggable = [
  { label: 'Speech-to-text', options: ['Whisper (local)', 'Deepgram', 'AssemblyAI'] },
  { label: 'Text-to-speech', options: ['Piper (local)', 'ElevenLabs'] },
  { label: 'LLM', options: ['Ollama (local)', 'Anthropic', 'OpenAI'] },
  { label: 'Key management', options: ['libsodium (local)', 'Vault Transit', 'AWS KMS', 'GCP KMS'] },
  { label: 'Object storage', options: ['Local FS', 'S3', 'GCS'] },
];

export function SelfHost() {
  return (
    <section id="self-host" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-start">
          {/* Left — copy */}
          <div className="flex flex-col gap-5">
            <Badge tone="electric" dot>
              Open source · multi-tenant ready
            </Badge>
            <h2 className="font-display font-bold tracking-adora text-rich-violet text-[36px] lg:text-[52px] leading-[1.05]">
              Run it on{' '}
              <span className="text-action-violet">your infra</span>.
              <br />
              Or use ours when we open it up.
            </h2>
            <p className="text-slate-text/75 text-[18px] leading-[1.55] max-w-[560px]">
              Hal ships as a Bun monorepo with a Next.js dashboard and a containerized
              agent runtime. One <code className="font-mono text-[15px] bg-soft-gray-fill px-1.5 py-0.5 rounded-md">docker compose up</code> on a VPS and you have your own private Read AI — minus the
              telemetry, plus the source.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <LinkButton
                href="https://github.com/hachiago/hal-meetings"
                variant="primary"
                size="md"
                target="_blank"
                rel="noreferrer"
              >
                ★ Star on GitHub
              </LinkButton>
              <LinkButton href="#docs" variant="ghost" size="md">
                Read the docs
              </LinkButton>
            </div>

            <ul className="mt-4 flex flex-col gap-2 text-[15px] text-slate-text/85">
              {[
                'AGPL-3.0 core — fork it, run it, contribute back.',
                'Multi-tenant from commit one — start with one user, grow to a team.',
                'No phone-home. No required SaaS dependency.',
              ].map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-1 text-action-violet flex-shrink-0" aria-hidden>
                    <path d="M3 9 l4 4 l8 -8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {l}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — terminal + pluggable matrix */}
          <div className="flex flex-col gap-5">
            <div className="rounded-cards border border-cloud-mist/80 bg-[#0e0a1f] text-canvas-white overflow-hidden font-mono shadow-[0_30px_60px_-30px_rgba(33,22,76,0.4)]">
              <div className="flex items-center gap-2 px-4 h-9 border-b border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[12px] text-white/45">~/hal-meetings</span>
              </div>
              <pre className="p-5 text-[13px] leading-[1.7] tracking-adora overflow-x-auto">
{`$ `}<span className="text-electric-green">git</span>{` clone https://github.com/hachiago/hal-meetings
$ `}<span className="text-electric-green">cd</span>{` hal-meetings && cp .env.example .env
$ `}<span className="text-electric-green">docker</span>{` compose up -d
`}<span className="text-aqua-blue">→ web</span>{`     listening on http://localhost:3000
`}<span className="text-aqua-blue">→ agent</span>{`   bot worker ready
`}<span className="text-aqua-blue">→ vault</span>{`   transit engine initialized
`}<span className="text-neon-pink">first run</span>{` open http://localhost:3000/setup`}
              </pre>
            </div>

            <div className="rounded-cards border border-cloud-mist/80 bg-canvas-white p-6">
              <span className="font-display text-[12px] font-semibold uppercase tracking-adora text-slate-text/55">
                Bring your own everything
              </span>
              <ul className="mt-4 flex flex-col gap-3">
                {pluggable.map((p) => (
                  <li key={p.label} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-[140px] text-[13px] font-semibold text-rich-violet tracking-adora">
                      {p.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.options.map((o) => (
                        <span
                          key={o}
                          className="inline-flex h-6 items-center rounded-badges border border-cloud-mist bg-soft-gray-fill/40 px-2.5 text-[11.5px] font-medium text-slate-text/80 tracking-adora"
                        >
                          {o}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
