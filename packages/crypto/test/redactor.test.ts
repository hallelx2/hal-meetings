import { describe, it, expect } from 'bun:test';
import { redactString, redactDeep } from '../src/redactor';

describe('redactString', () => {
  it('redacts Bearer tokens', () => {
    const out = redactString('Authorization: Bearer eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjMifQ.abc123def456');
    expect(out).not.toContain('eyJ');
    expect(out).toContain('<redacted>');
  });

  it('redacts Google ya29 access tokens', () => {
    const out = redactString('access=ya29.A0AfH6SMC_thisisahugeoauthtokenvalue123456');
    expect(out).not.toContain('ya29.A0');
  });

  it('redacts JWT-shaped strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4abc';
    const out = redactString(`token=${jwt}`);
    expect(out).toContain('<jwt-redacted>');
    expect(out).not.toContain('eyJzdWIiOiI');
  });

  it('redacts hex blobs', () => {
    const hex = 'a'.repeat(64);
    const out = redactString(`master=${hex}`);
    expect(out).toContain('<hex-blob-redacted>');
  });
});

describe('redactDeep', () => {
  it('replaces sensitive field values', () => {
    const obj = {
      user: 'halleluyah',
      access_token: 'shouldnotleak',
      nested: {
        refresh_token: 'alsohidden',
        ok: 'this stays',
      },
    };
    const out = redactDeep(obj);
    expect(out.access_token).toBe('<redacted>');
    expect(out.nested.refresh_token).toBe('<redacted>');
    expect(out.nested.ok).toBe('this stays');
    expect(out.user).toBe('halleluyah');
  });

  it('handles arrays', () => {
    const out = redactDeep([{ password: 'x' }, { ok: 'y' }]) as unknown as Array<Record<string, string>>;
    expect(out[0]!.password).toBe('<redacted>');
    expect(out[1]!.ok).toBe('y');
  });

  it('redacts Uint8Array values', () => {
    const out = redactDeep({ blob: new Uint8Array([1, 2, 3]) }) as unknown as { blob: string };
    expect(out.blob).toBe('<bytes-redacted>');
  });
});
