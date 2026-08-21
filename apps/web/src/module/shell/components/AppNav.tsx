'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hal/ui';
import { NAV_ITEMS, isActive } from '@/module/shell/nav';

/**
 * The only client component in the shell, and only because marking the active
 * route needs the current pathname. Everything around it stays on the server.
 */
export function AppNav({ layout }: { layout: 'sidebar' | 'dock' }) {
  const pathname = usePathname();

  if (layout === 'dock') {
    return (
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-canvas-white brutal-border-2 border-b-0 border-l-0 border-r-0"
      >
        <ul className="flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-14 items-center justify-center whitespace-nowrap px-2',
                    'text-[13px] font-bold uppercase tracking-adora',
                    active ? 'bg-ink text-canvas-white' : 'text-ink/70 hover:bg-lush-green',
                  )}
                >
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center whitespace-nowrap px-4',
                  'text-[13px] font-bold uppercase tracking-adora',
                  // Transparent border on the inactive state so it does not sit
                  // 3px shorter than the active one at every width.
                  'border-[1.5px] border-transparent',
                  active
                    ? 'bg-ink text-canvas-white'
                    : 'text-ink/70 hover:border-ink hover:bg-lush-green',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
