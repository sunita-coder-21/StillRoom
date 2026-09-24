export const UINT64_MAX = (1n << 64n) - 1n;
export const UINT32_MAX = (1n << 32n) - 1n;

export function toHex(bytes: Uint8Array | readonly number[] | string): string {
  if (typeof bytes === 'string') return toHex(fromHex(bytes));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fromHex(value: string): Uint8Array {
  const hex = value.trim().replace(/^0x/i, '');
  if (!hex || hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) {
    throw new Error('Enter a valid hexadecimal value.');
  }
  return Uint8Array.from(hex.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
}

export function bytes32(value: string, label = 'Secret'): Uint8Array {
  const hex = value.trim().replace(/^0x/i, '');
  if (!/^[\da-f]{64}$/i.test(hex)) throw new Error(`${label} must contain exactly 64 hexadecimal characters (32 bytes).`);
  return fromHex(hex);
}

export function requireBytes32(value: Uint8Array, label = 'Pass'): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32) throw new Error(`${label} must be 32 bytes.`);
  return value;
}

export function normalizeContractAddress(address: string): string {
  return toHex(bytes32(address, 'Contract address'));
}

export function parseUnsigned(value: string, label: string, max = UINT64_MAX, min = 0n): bigint {
  const normalized = value.trim();
  if (!/^(0|[1-9]\d*)$/.test(normalized)) throw new Error(`${label} must be a whole decimal number.`);
  // Avoid allocating an enormous bigint from an untrusted pasted value.
  if (normalized.length > max.toString().length) throw new Error(`${label} must be between ${min} and ${max}.`);
  const parsed = BigInt(normalized);
  if (parsed < min || parsed > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return parsed;
}

export function screeningParameters(input: { threshold: string; limit: string; days: string }, now = Date.now()) {
  const threshold = parseUnsigned(input.threshold, 'Threshold');
  const limit = parseUnsigned(input.limit, 'Capacity', UINT32_MAX, 1n);
  // A bounded, integer duration is intentional: the public deadline must remain usable in browser dates.
  const days = parseUnsigned(input.days, 'Duration in days', 3650n, 1n);
  const deadline = BigInt(Math.floor(now / 1000)) + days * 86_400n;
  if (deadline < 1n || deadline > UINT64_MAX) throw new Error('Screening deadline is out of range.');
  return { threshold, limit, deadline };
}

export function randomBytes32(): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable. Open Stillroom in a secure browser context.');
  return globalThis.crypto.getRandomValues(new Uint8Array(32));
}

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
