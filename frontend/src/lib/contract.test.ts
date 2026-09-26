import { describe, expect, it } from 'vitest';
import { getCredentialCommitment } from './contract';

describe('contract service pure helpers', () => {
  it('computes a fixed-size credential commitment without exposing inputs', () => {
    const commitment = getCredentialCommitment('72', '11'.repeat(32), new Uint8Array(32).fill(9));
    expect(commitment).toMatch(/^[\da-f]{64}$/);
    expect(() => getCredentialCommitment('-1', '11'.repeat(32), new Uint8Array(32))).toThrow();
    expect(() => getCredentialCommitment('72', '11', new Uint8Array(32))).toThrow();
    expect(() => getCredentialCommitment('72', '11'.repeat(32), new Uint8Array(31))).toThrow();
  });
});
