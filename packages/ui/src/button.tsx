import * as React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'ghost' | 'outline-nav';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center font-sans tracking-adora transition-all duration-200 will-change-transform select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-white';

const variants: Record<Variant, string> = {
  primary:
    'bg-action-violet text-canvas-white hover:brightness-110 active:translate-y-px shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_24px_-12px_rgba(89,46,255,0.55)]',
  ghost:
    'bg-transparent text-slate-text border border-cloud-mist hover:bg-soft-gray-fill/60',
  'outline-nav':
    'bg-transparent text-slate-text border border-slate-text/80 hover:bg-slate-text hover:text-canvas-white',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-[15px] rounded-buttons',
  lg: 'h-14 px-7 text-[17px] rounded-buttons',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
});

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </a>
  );
});
