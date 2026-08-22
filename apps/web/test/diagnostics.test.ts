import { describe, expect, it } from 'bun:test';
import { clip, formatElement, type ElementFact } from '../../agent/src/runtime/diagnostics';

function fact(partial: Partial<ElementFact> = {}): ElementFact {
  return {
    kind: 'button',
    text: 'Ask to join',
    aria: '',
    placeholder: '',
    visible: true,
    enabled: true,
    ...partial,
  };
}

describe('clip', () => {
  it('flattens whitespace so one element is one log line', () => {
    expect(clip('  Ask   to\n  join ', 40)).toBe('Ask to join');
  });

  it('truncates with an ellipsis and never exceeds the budget', () => {
    const out = clip('x'.repeat(100), 10);
    expect(out.length).toBe(10);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles null and undefined as empty', () => {
    expect(clip(null, 10)).toBe('');
    expect(clip(undefined, 10)).toBe('');
  });
});

describe('formatElement', () => {
  it('calls out visible-but-disabled explicitly', () => {
    // The exact state that cost an hour: the join button was rendered and
    // greyed out, and the failure said "could not find a join button".
    expect(formatElement(fact({ enabled: false }))).toContain('DISABLED');
  });

  it('marks a healthy element ok and a hidden one hidden', () => {
    expect(formatElement(fact())).toContain('[ok]');
    expect(formatElement(fact({ visible: false }))).toContain('[hidden]');
  });

  it('prefers the accessible name over the visible text', () => {
    // aria-label is what the selectors key on, so it is the more useful label
    // when the two differ.
    const line = formatElement(
      fact({ aria: 'Ask to join without microphone & camera', text: 'Ask to join' }),
    );
    expect(line).toContain('Ask to join without microphone');
  });

  it('keeps the visible text too when it differs from the aria label', () => {
    const line = formatElement(fact({ aria: 'Chat with everyone', text: 'chat_bubble' }));
    expect(line).toContain('Chat with everyone');
    expect(line).toContain('chat_bubble');
  });

  it('does not repeat the label when aria and text agree', () => {
    const line = formatElement(fact({ aria: 'Join now', text: 'Join now' }));
    expect(line.match(/Join now/g)).toHaveLength(1);
  });

  it('falls back to the placeholder, then to a marker', () => {
    expect(formatElement(fact({ kind: 'input', text: '', placeholder: 'Your name' }))).toContain(
      'Your name',
    );
    expect(formatElement(fact({ text: '', aria: '', placeholder: '' }))).toContain('(no label)');
  });

  it('names the element kind, so inputs and buttons are scannable apart', () => {
    expect(formatElement(fact({ kind: 'input' }))).toStartWith('input ');
    expect(formatElement(fact({ kind: 'button' }))).toStartWith('button ');
  });
});
