import Link from 'next/link';
import { Logo } from './logo';

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Self-host', href: '#self-host' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: 'https://github.com/hallelx2/hal-meetings' },
      { label: 'Roadmap', href: '#' },
      { label: 'Contributing', href: '#' },
      { label: 'License (AGPL-3.0)', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Manifesto', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Contact', href: 'mailto:hachiagoholdings@gmail.com' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-cloud-mist/60 bg-canvas-white">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Logo className="text-[32px]" />
            <p className="max-w-[300px] text-[15px] text-slate-text/70 leading-[1.55]">
              An autonomous, self-hostable meeting agent for people who'd rather build than attend.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-text/55 font-medium uppercase tracking-adora">
              <span className="h-1.5 w-1.5 rounded-full bg-electric-green" />
              All systems · pre-alpha
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <div className="font-display text-[13px] font-semibold uppercase tracking-adora text-slate-text/55">
                {c.title}
              </div>
              <ul className="flex flex-col gap-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[15px] text-slate-text/85 hover:text-action-violet transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-cloud-mist/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[13px] text-slate-text/55">
            © {new Date().getFullYear()} Hal. Built in the open.
          </p>
          <div className="flex items-center gap-4 text-[13px] text-slate-text/55">
            <span>v0.0.0 · pre-alpha</span>
            <span>·</span>
            <span>Made for people who skip meetings.</span>
          </div>
        </div>
      </div>

      {/* Bottom color bar — Adora signature */}
      <div className="h-1.5 flex">
        <span className="flex-1 bg-action-violet" />
        <span className="flex-1 bg-air-blue" />
        <span className="flex-1 bg-lush-green" />
        <span className="flex-1 bg-sunset-pink" />
        <span className="flex-1 bg-neon-pink" />
        <span className="flex-1 bg-electric-green" />
      </div>
    </footer>
  );
}
