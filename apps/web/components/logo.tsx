import { cn } from '@hal/ui';

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-[1px] font-display font-bold tracking-adora text-rich-violet',
        className,
      )}
      aria-label="Hal"
    >
      <span className="leading-none">hal</span>
      <span className="leading-none text-action-violet">.</span>
    </span>
  );
}
