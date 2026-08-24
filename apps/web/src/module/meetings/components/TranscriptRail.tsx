import { ScrollPane } from '@/module/dashboard/components/ScrollPane';
import type { MeetingLine } from '@/server/meeting';

/** `123456` → `2:03`. Null when the provider gave no offsets. */
function offset(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null;
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * The transcript as it arrives.
 *
 * Deliberately shows nothing rather than a placeholder when there are no lines
 * yet: an empty transcript with a spinner over it says "still coming", which is
 * true during a meeting and a lie after one. The empty state is written for
 * both cases and says which is which.
 */
export function TranscriptRail({
  lines,
  live,
}: {
  lines: MeetingLine[];
  live: boolean;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-2 bg-soft-gray-fill p-4 brutal-border">
        <p className="text-[11px] font-bold uppercase tracking-adora text-ink/45">Transcript</p>
        <p className="text-[14px] leading-relaxed text-ink/65">
          {live
            ? 'Nothing yet. Lines appear here within a second or two of being spoken.'
            : 'No transcript was captured for this meeting.'}
        </p>
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-adora text-ink/45">
          Transcript · {lines.length} {lines.length === 1 ? 'line' : 'lines'}
        </h2>
      </div>

      <ScrollPane className="max-h-[28rem] pr-2">
        <ol className="flex flex-col gap-3">
          {lines.map((line) => {
            const at = offset(line.startMs);
            return (
              <li key={line.seq} className="flex flex-col gap-0.5">
                {(line.speaker || at) && (
                  <p className="flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-adora text-ink/45">
                    {line.speaker ? <span>{line.speaker}</span> : null}
                    {at ? <span className="font-mono-grit font-normal">{at}</span> : null}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink/85">
                  {line.text}
                </p>
              </li>
            );
          })}
        </ol>
      </ScrollPane>
    </section>
  );
}
