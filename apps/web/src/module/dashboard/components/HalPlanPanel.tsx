import { cn } from '@hal/ui';
import type { HalPlan, HalStage, StageState } from '@/module/dashboard/hal-plan';

/**
 * The marker beside each stage.
 *
 * Shape and glyph carry the state, not colour alone — the four states have to
 * be distinguishable in greyscale, on a projector, and to a colourblind reader.
 * Colour is the third encoding here, never the first.
 */
const MARKERS: Record<StageState, { glyph: string; className: string; label: string }> = {
  done: { glyph: '✓', className: 'bg-lush-green', label: 'Done' },
  active: { glyph: '●', className: 'bg-air-blue', label: 'Running now' },
  pending: { glyph: '', className: 'bg-canvas-white', label: 'Not started' },
  blocked: { glyph: '✕', className: 'bg-soft-gray-fill text-ink/40', label: 'Will not run' },
};

function Stage({ stage, index, isLast }: { stage: HalStage; index: number; isLast: boolean }) {
  const marker = MARKERS[stage.state];

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center gap-1">
        <span
          aria-hidden
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-bold leading-none brutal-border',
            marker.className,
          )}
        >
          {marker.glyph || index + 1}
        </span>
        {/* The rail that makes seven items read as one sequence. It stops at
            the last marker rather than trailing off below it. */}
        {isLast ? null : <span aria-hidden className="w-px flex-1 bg-ink/15" />}
      </div>

      <div className={cn('flex min-w-0 flex-col gap-0.5 pb-4', stage.state === 'blocked' && 'opacity-55')}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h4 className="text-[14px] leading-snug">{stage.title}</h4>
          <span className="text-[10px] font-bold uppercase tracking-adora text-ink/45">
            {marker.label}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-ink/70">{stage.detail}</p>
      </div>
    </li>
  );
}

/**
 * What Hal does for this meeting, and where it has got to.
 *
 * The value of this panel is that it is checkable. Every line describes a step
 * the agent actually runs, so a user who is being asked to let a bot into their
 * calls can read the whole of what it will do before saying yes.
 */
export function HalPlanPanel({ plan }: { plan: HalPlan }) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 bg-soft-gray-fill p-4 brutal-border">
        <p className="text-[11px] font-bold uppercase tracking-adora text-ink/45">Hal on this meeting</p>
        <p className="text-[15px] leading-snug">{plan.headline}</p>
        {plan.reason ? (
          <p className="text-[13px] leading-relaxed text-ink/65">{plan.reason}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-adora text-ink/45">
          {plan.posture === 'done' ? 'What Hal did' : 'What Hal does, start to finish'}
        </p>
        <ol className="flex flex-col">
          {plan.stages.map((stage, index) => (
            <Stage
              key={stage.key}
              stage={stage}
              index={index}
              isLast={index === plan.stages.length - 1}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
