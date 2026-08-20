import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#compare', label: 'Comparison' },
  { href: '#self-host', label: 'Self-host' },
  { href: '#faq', label: 'FAQ' },
];

export function SiteNav({
  signedIn = false,
  email,
}: {
  signedIn?: boolean;
  email?: string | null;
}) {
  return (
    <header className="sticky top-0 z-50 bg-canvas-white brutal-border-2 border-t-0 border-l-0 border-r-0">
      <nav className="mx-auto max-w-[1280px] px-5 lg:px-8 h-[68px] flex items-center justify-between gap-6">
        <Link href="/" aria-label="Hal home" className="flex items-center">
          <HalWordmark size="sm" />
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="px-3 py-2 text-[15px] font-semibold text-ink/85 hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/hallelx2/hal-meetings"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex h-10 items-center gap-2 px-3 brutal-border text-[13px] font-bold uppercase tracking-adora text-ink hover:bg-lush-green transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.02c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 015.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.55 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            Star
          </a>
          {signedIn ? (
            <Link
              href="/app"
              className="inline-flex h-10 items-center px-5 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft transition-colors"
            >
              {email ? email.split('@')[0] : 'Open app'}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center px-5 bg-ink text-canvas-white text-[14px] font-bold uppercase tracking-adora hover:bg-ink-soft transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
