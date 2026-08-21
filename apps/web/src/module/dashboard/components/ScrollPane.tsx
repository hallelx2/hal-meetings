'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@hal/ui';

/**
 * A scroll area that says so.
 *
 * A styled scrollbar fixes how the scroll *looks*; it does not fix the older
 * problem, which is that content clipped flush at a panel edge looks like
 * content that ended. The fade is the affordance — it appears only while there
 * is something past the edge, so it reads as "more below" rather than as
 * decoration, and disappears entirely when the content fits.
 *
 * Measured rather than assumed: a resize, a font swap or a longer description
 * all change whether the pane overflows, and `ResizeObserver` catches all
 * three where a mount-time measurement catches none.
 */
export function ScrollPane({
  children,
  className,
  fadeColor = 'from-canvas-white',
}: {
  children: ReactNode;
  className?: string;
  /** Tailwind gradient origin, so a pane on a tinted surface still fades to it. */
  fadeColor?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const { scrollTop, scrollHeight, clientHeight } = node;
    // A pixel of slack: sub-pixel layout means an element scrolled fully to the
    // bottom routinely lands a fraction short, which would leave the fade on
    // forever.
    const bottom = scrollHeight - clientHeight - scrollTop > 1;
    const top = scrollTop > 1;
    // Returning the same object when nothing changed keeps a scroll event per
    // frame from re-rendering the whole panel.
    setEdges((current) =>
      current.top === top && current.bottom === bottom ? current : { top, bottom },
    );
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // The content, not just the viewport: a description that wraps to more
    // lines changes scrollHeight without changing the pane's own box.
    for (const child of Array.from(node.children)) observer.observe(child);

    return () => observer.disconnect();
  }, [measure]);

  return (
    // Grows into whatever the parent flex column leaves it; `min-h-0` is what
    // lets it actually shrink instead of forcing the dialog taller than the
    // viewport.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        onScroll={measure}
        className={cn('brutal-scroll min-h-0 flex-1 overflow-y-auto', className)}
      >
        {children}
      </div>

      {/* Purely decorative, and never in the way of a click. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b to-transparent transition-opacity duration-150',
          fadeColor,
          edges.top ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent transition-opacity duration-150',
          fadeColor,
          edges.bottom ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
