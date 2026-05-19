import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Comparison', href: '#compare' },
      { label: 'Self-host', href: '#self-host' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: 'https://github.com/hallelx2/hal-meetings' },
      { label: 'Roadmap', href: '#roadmap' },
      { label: 'Architecture', href: 'https://github.com/hallelx2/hal-meetings/blob/main/docs/architecture.md' },
      { label: 'License — AGPL-3.0', href: 'https://github.com/hallelx2/hal-meetings' },
    ],
  },
  {
    title: 'Index',
    links: [
      { label: 'Manifesto', href: '#manifesto' },
      { label: 'Privacy', href: '#privacy' },
      { label: 'Terms', href: '#' },
      { label: 'Contact', href: 'mailto:hachiagoholdings@gmail.com' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-canvas-white">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <HalWordmark size="md" invert />
            <p className="max-w-[320px] text-[15px] text-canvas-white/70 leading-[1.55]">
              An autonomous, self-hostable meeting agent for people who'd rather build than attend.
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-canvas-white/55 font-bold uppercase tracking-adora">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green cursor-blink" />
              Pre-alpha · built in the open
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <div className="font-display text-[12px] font-bold uppercase tracking-adora text-canvas-white/45">
                {c.title}
              </div>
              <ul className="flex flex-col gap-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[15px] text-canvas-white/85 hover:text-electric-green transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-canvas-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-canvas-white/45 tracking-adora">
          <p>© {new Date().getFullYear()} Hal. All rights mostly reserved.</p>
          <div className="flex items-center gap-4">
            <span>v0.0.0</span>
            <span>·</span>
            <span>Made for people who skip meetings.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
