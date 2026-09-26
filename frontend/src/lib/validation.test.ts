import { describe, expect, it } from 'vitest';
import { bytes32, fromHex, parseUnsigned, screeningParameters, toHex, UINT32_MAX, UINT64_MAX } from './validation';

describe('Stillroom input validation', () => {
  it('round-trips bytes and enforces 32-byte secrets', () => {
    const value = bytes32('ab'.repeat(32));
    expect(toHex(value)).toBe('ab'.repeat(32));
    expect(fromHex('0x00ff')).toEqual(new Uint8Array([0, 255]));
    expect(() => bytes32('ab')).toThrow(/32 bytes/);
    expect(() => fromHex('nope')).toThrow(/hexadecimal/);
  });

  it('rejects malformed and out-of-range unsigned input', () => {
    expect(parseUnsigned('0', 'Score')).toBe(0n);
    expect(parseUnsigned(UINT64_MAX.toString(), 'Score')).toBe(UINT64_MAX);
    expect(parseUnsigned(UINT32_MAX.toString(), 'Capacity', UINT32_MAX, 1n)).toBe(UINT32_MAX);
    expect(() => parseUnsigned('', 'Score')).toThrow();
    expect(() => parseUnsigned('-1', 'Score')).toThrow();
    expect(() => parseUnsigned((UINT64_MAX + 1n).toString(), 'Score')).toThrow();
    expect(() => parseUnsigned('0', 'Capacity', UINT32_MAX, 1n)).toThrow();
  });

  it('converts duration to a future Uint64 deadline', () => {
    expect(screeningParameters({ threshold: '72', limit: '144', days: '2' }, 1_700_000_000_000)).toEqual({
      threshold: 72n,
      limit: 144n,
      deadline: 1_700_172_800n,
    });
    expect(() => screeningParameters({ threshold: '1', limit: '1', days: '0' })).toThrow();
  });
});
