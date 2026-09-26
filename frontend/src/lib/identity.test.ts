import { beforeEach, describe, expect, it } from 'vitest';
import { clearIdentity, getIdentity, publicFingerprint, setIdentitySecret } from './identity';

describe('browser-tab identity', () => {
  beforeEach(() => clearIdentity());

  it('keeps generated identity in memory only and can import a secret', () => {
    const first = getIdentity();
    expect(first.secret).toMatch(/^[\da-f]{64}$/);
    expect(getIdentity().secret).toBe(first.secret);
    expect(setIdentitySecret('12'.repeat(32)).secret).toBe('12'.repeat(32));
    expect(publicFingerprint('12'.repeat(32))).toMatch(/^[\da-f]{64}$/);
  });

  it('rejects malformed imported secrets and regenerates after clear', () => {
    expect(() => setIdentitySecret('not-a-secret')).toThrow(/32 bytes/);
    const first = getIdentity().secret;
    clearIdentity();
    expect(getIdentity().secret).not.toBe(first);
  });
});
