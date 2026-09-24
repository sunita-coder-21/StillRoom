import type { SigningKey } from '@midnight-ntwrk/compact-runtime';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export type MemoryPrivateStateProvider<Id extends string, State> = PrivateStateProvider<Id, State> & { dispose(): void };

/** No persistence, telemetry, or implicit export of witnesses or maintenance keys. */
export function createPrivateStateProvider<Id extends string = string, State = unknown>(): MemoryPrivateStateProvider<Id, State> {
  let scope = '';
  let disposed = false;
  const states = new Map<string, State>();
  const signingKeys = new Map<string, SigningKey>();
  const erase = (value: unknown, seen = new Set<object>()): void => {
    if (value instanceof Uint8Array) { value.fill(0); return; }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const child of Object.values(value as Record<string, unknown>)) erase(child, seen);
  };
  const eraseStates = () => {
    const seen = new Set<object>();
    for (const state of states.values()) erase(state, seen);
    for (const key of signingKeys.values()) erase(key, seen);
  };
  const assertActive = () => { if (disposed) throw new Error('The private session has been cleared. Reconnect your wallet.'); };
  const key = (id: Id) => {
    assertActive();
    if (!scope) throw new Error('Set the contract address before accessing private state.');
    return `${scope}:${id}`;
  };
  const unavailable = async (): Promise<never> => { throw new Error('Private state export/import is disabled; this session is memory-only.'); };
  return {
    setContractAddress(address) { assertActive(); scope = address; },
    async set(id, value) { states.set(key(id), value); },
    async get(id) { return states.get(key(id)) ?? null; },
    async remove(id) { states.delete(key(id)); },
    async clear() { eraseStates(); states.clear(); },
    async setSigningKey(address, value) { assertActive(); signingKeys.set(address, value); },
    async getSigningKey(address) { assertActive(); return signingKeys.get(address) ?? null; },
    async removeSigningKey(address) { signingKeys.delete(address); },
    async clearSigningKeys() { signingKeys.clear(); },
    exportPrivateStates: unavailable,
    importPrivateStates: unavailable,
    exportSigningKeys: unavailable,
    importSigningKeys: unavailable,
    dispose() { eraseStates(); states.clear(); signingKeys.clear(); scope = ''; disposed = true; },
  };
}
