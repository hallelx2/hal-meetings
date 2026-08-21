import type { ReactNode } from 'react';

/**
 * Eyebrow + title + optional lede, the way every Adora section opens.
 *
 * Lives in the shell because it is chrome-adjacent: it is how a screen
 * announces itself, and two screens rendering their own subtly different
 * version is how a design system starts to drift.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-adora text-ink/50">{eyebrow}</p>
        <h1 className="text-[34px] leading-[0.95] md:text-[44px]">{title}</h1>
        {lede ? (
          <p className="max-w-[62ch] text-[16px] leading-relaxed text-ink/75">{lede}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
