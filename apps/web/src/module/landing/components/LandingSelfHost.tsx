/**
 * Self-host pitch. Lime section with a black terminal as the dramatic centerpiece,
 * and a "Local vs Cloud" pluggable provider matrix.
 */
function TerminalLine({ prompt, cmd, rest }: { prompt: string; cmd: string; rest: string }) {
  return (
    <span>
      <span className="text-canvas-white/55">{prompt} </span>
      <span className="text-electric-green">{cmd}</span>
      <span>{rest}</span>
      {'\n'}
    </span>
  );
}

function ArrowLine({ tone, tag, body }: { tone: 'aqua' | 'neon'; tag: string; body: string }) {
  const cls = tone === 'aqua' ? 'text-aqua-blue' : 'text-neon-pink';
  return (
    <span>
      <span className={cls}>{tag}</span>
      <span>{body}</span>
      {'\n'}
    </span>
  );
}

const pluggable = [
  { label: 'Speech-to-text', local: 'Whisper', cloud: ['Deepgram', 'AssemblyAI'] },
  { label: 'Text-to-speech', local: 'Piper', cloud: ['ElevenLabs'] },
  { label: 'LLM', local: 'Ollama', cloud: ['Anthropic', 'OpenAI'] },
  { label: 'Key management', local: 'libsodium', cloud: ['Vault Transit', 'AWS KMS', 'GCP KMS'] },
  { label: 'Object storage', local: 'Local FS', cloud: ['S3', 'GCS'] },
];

export function LandingSelfHost() {
  return (
    <section id="self-host" className="bg-lush-green">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-start">
          {/* Left — copy */}
          <div className="flex flex-col gap-5">
            <span className="text-[11px] font-bold uppercase tracking-adora text-ink/65">
              Self-host
            </span>
            <h2 className="font-display font-bold tracking-adora text-ink text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05]">
              Your infra.
              <br />
              <span className="sketch-underline">Your rules.</span>
            </h2>
            <p className="text-ink/80 text-[17px] leading-[1.6] max-w-[480px]">
              One <code className="font-mono-grit text-[15px] bg-canvas-white px-1.5 py-0.5 brutal-border">docker compose up</code> on a
              VPS and you have your own private meeting agent. No phone-home, no required
              SaaS dependency, no telemetry. The same codebase will eventually power the
              managed hosted plan — but you're not required to wait.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="https://github.com/hallelx2/hal-meetings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center px-6 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft transition-colors"
              >
                ★ Star on GitHub
              </a>
              <a
                href="https://github.com/hallelx2/hal-meetings/blob/main/docs/architecture.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center px-6 brutal-border-2 bg-canvas-white text-ink text-[14px] font-bold uppercase tracking-adora hover:bg-lush-green transition-colors"
              >
                Read the architecture
              </a>
            </div>

            {/* Pluggable matrix */}
            <div className="mt-8 brutal-border-2 bg-canvas-white p-5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3 items-center pb-3 mb-2 border-b border-ink/15">
                <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">Provider</span>
                <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">Local</span>
                <span className="text-[10px] font-bold uppercase tracking-adora text-ink/55">Cloud</span>
              </div>
              <ul className="flex flex-col">
                {pluggable.map((p, i) => (
                  <li
                    key={p.label}
                    className={`grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 items-center py-3 ${
                      i > 0 ? 'border-t border-ink/10' : ''
                    }`}
                  >
                    <span className="text-[14px] font-semibold text-ink">{p.label}</span>
                    <span className="inline-flex h-6 items-center px-2 brutal-border bg-lush-green text-ink text-[11px] font-bold uppercase tracking-adora">
                      {p.local}
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                      {p.cloud.map((c) => (
                        <span
                          key={c}
                          className="inline-flex h-6 items-center px-2 brutal-border bg-canvas-white text-ink text-[11px] font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — terminal */}
          <div className="relative">
            <div className="brutal-border-2 bg-ink text-canvas-white -rotate-[0.4deg]">
              <div className="flex items-center gap-2 px-4 h-9 border-b border-canvas-white/15 bg-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full bg-neon-pink" />
                <span className="h-2.5 w-2.5 rounded-full bg-sunset-pink" />
                <span className="h-2.5 w-2.5 rounded-full bg-electric-green" />
                <span className="ml-3 text-[11px] font-mono-grit text-canvas-white/45">~/hal-meetings</span>
              </div>
              <pre className="p-5 lg:p-7 text-[13px] leading-[1.85] font-mono-grit overflow-x-auto whitespace-pre">
                <TerminalLine prompt="$" cmd="git" rest=" clone https://github.com/hallelx2/hal-meetings" />
                <TerminalLine prompt="$" cmd="cd" rest=" hal-meetings && cp .env.example .env" />
                <TerminalLine prompt="$" cmd="docker" rest=" compose up -d" />
                {'\n'}
                <ArrowLine tone="aqua" tag="→ web" body="     listening on http://localhost:3000" />
                <ArrowLine tone="aqua" tag="→ agent" body="   bot worker ready" />
                <ArrowLine tone="aqua" tag="→ vault" body="   transit engine initialized" />
                <ArrowLine tone="aqua" tag="→ db" body="      postgres up · migrations applied" />
                {'\n'}
                <ArrowLine tone="neon" tag="first run" body="  open http://localhost:3000/setup" />
                <span className="text-canvas-white/45">
                  {'# OAuth your calendar. OAuth Meet/Zoom/Teams.\n'}
                  {'# Drop a meeting URL. Watch Hal join.'}
                </span>
              </pre>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-adora text-ink/55">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
              Phase 0 ships in &lt; 5 min on a 2-core VPS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
