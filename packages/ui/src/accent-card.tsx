import * as React from 'react';
import { cn } from './cn.js';

type Accent = 'air-blue' | 'lush-green' | 'sunset-pink' | 'soft-gray';

const accents: Record<Accent, string> = {
  'air-blue': 'bg-air-blue',
  'lush-green': 'bg-lush-green',
  'sunset-pink': 'bg-sunset-pink',
  'soft-gray': 'bg-soft-gray-fill',
};

export interface AccentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: Accent;
  rounded?: 'cards' | 'accent';
}

export function AccentCard({
  accent = 'air-blue',
  rounded = 'accent',
  className,
  children,
  ...rest
}: AccentCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-[40px] md:p-[48px]',
        accents[accent],
        rounded === 'accent' ? 'rounded-accent-card' : 'rounded-cards',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
