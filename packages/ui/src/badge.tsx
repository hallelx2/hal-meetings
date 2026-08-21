import * as React from 'react';
import { cn } from './cn';

type Tone = 'neon' | 'aqua' | 'electric' | 'violet';

const tones: Record<Tone, string> = {
  neon: 'text-neon-pink border-neon-pink/40',
  aqua: 'text-aqua-blue border-aqua-blue/40',
  electric: 'text-electric-green-ink border-electric-green/60',
  violet: 'text-action-violet border-action-violet/30',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ tone = 'neon', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-badges border bg-transparent px-3 py-1 font-sans text-[13px] font-medium tracking-adora uppercase',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'neon' && 'bg-neon-pink',
            tone === 'aqua' && 'bg-aqua-blue',
            tone === 'electric' && 'bg-electric-green',
            tone === 'violet' && 'bg-action-violet',
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
