import { cn } from '@hal/ui';

/**
 * The Hal wordmark — Anton (super-condensed display) in ink, with a small electric-green
 * doodle accent. Mirrors the neo-brutalist energy of stamped marks like Roomote/Cash App.
 */
export function HalWordmark({
  className,
  size = 'md',
  invert = false,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  invert?: boolean;
}) {
  const sizes = {
    sm: 'text-[28px]',
    md: 'text-[40px]',
    lg: 'text-[72px]',
    xl: 'text-[120px] sm:text-[160px] lg:text-[200px]',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-start font-wordmark tracking-compress leading-[0.85] uppercase',
        invert ? 'text-canvas-white' : 'text-[#0b0b0b]',
        sizes,
        className,
      )}
      aria-label="Hal"
    >
      <span className="relative">
        HAL
        <span
          className={cn(
            'absolute -top-[0.18em] -right-[0.22em] inline-block h-[0.18em] w-[0.18em] rounded-full',
            invert ? 'bg-electric-green' : 'bg-action-violet',
          )}
          aria-hidden
        />
      </span>
    </span>
  );
}
