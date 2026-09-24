import { pureCircuits } from '../managed/contract/index.js';
import { bytes32, fromHex, randomBytes32, toHex, requireBytes32 } from './validation';

export type PrivateIdentity = { secret: string };
let identitySecret: string | undefined;

function validateSecret(secret: string): string {
  return toHex(bytes32(secret, 'Secret'));
}

/** Returns the current browser-tab identity, creating it with Web Crypto when needed. */
export function getIdentity(): PrivateIdentity {
  if (!identitySecret) identitySecret = toHex(randomBytes32());
  return { secret: identitySecret };
}

/** Imports a user-held secret into memory. It is never written to localStorage or cookies. */
export function setIdentitySecret(secret: string): PrivateIdentity {
  identitySecret = validateSecret(secret);
  return { secret: identitySecret };
}

/** Clears the private identity held by this module. */
export function clearIdentity(): void {
  identitySecret = undefined;
}

/** Compatibility name for callers that explicitly import/replace an identity; storage remains memory-only. */
export function saveIdentity(identity: PrivateIdentity): PrivateIdentity {
  return setIdentitySecret(identity.secret);
}

export function publicFingerprint(secret: string): string {
  try {
    const nullifier = pureCircuits.make_entry_nullifier(fromHex(validateSecret(secret)), new Uint8Array(32));
    return toHex(nullifier);
  } catch {
    return '';
  }
}

export function sessionNullifier(secret: string, pass: Uint8Array): Uint8Array {
  return pureCircuits.make_entry_nullifier(fromHex(validateSecret(secret)), requireBytes32(pass, 'Pass'));
}

export function hasUsedPass(secret: string, state: { access_pass_id?: Uint8Array; used_nullifiers?: unknown } | null | undefined): boolean {
  if (!state?.access_pass_id) return false;
  try {
    const target = toHex(sessionNullifier(secret, state.access_pass_id));
    const nullifiers = state.used_nullifiers as ({ member?: (value: Uint8Array) => boolean } & Iterable<Uint8Array>) | undefined;
    if (nullifiers?.member?.(fromHex(target))) return true;
    const iterable = nullifiers as unknown as Iterable<Uint8Array> | undefined;
    if (iterable && typeof (iterable as any)[Symbol.iterator] === 'function') {
      for (const value of iterable) if (toHex(value) === target) return true;
    }
  } catch {
    return false;
  }
  return false;
}
