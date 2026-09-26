import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CONTRACT_CHANGE_EVENT,
  NETWORK_STORAGE_KEY,
  contractStorageKey,
  getContractAddress,
  getNetwork,
  getExplorerContractUrl,
  setContractAddress,
  setNetwork,
} from '../config';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
}

describe('network-scoped configuration', () => {
  const originalWindow = globalThis.window;
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage(), dispatchEvent: () => true } });
  });
  afterEach(() => Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }));

  it('defaults to preview and isolates addresses by network', () => {
    expect(getNetwork()).toBe('preview');
    setContractAddress('11'.repeat(32), 'preview');
    setContractAddress('22'.repeat(32), 'preprod');
    expect(getContractAddress('preview')).toBe('11'.repeat(32));
    expect(getContractAddress('preprod')).toBe('22'.repeat(32));
  });

  it('persists a selected network and emits address changes', () => {
    const events: string[] = [];
    const dispatchEvent = (event: Event) => { events.push(event.type); return true; };
    Object.defineProperty(window, 'dispatchEvent', { configurable: true, value: dispatchEvent });
    setNetwork('preprod');
    setContractAddress('ab'.repeat(32));
    expect(window.localStorage.getItem(NETWORK_STORAGE_KEY)).toBe('preprod');
    expect(window.localStorage.getItem(contractStorageKey('preprod'))).toBe('ab'.repeat(32));
    expect(events).toContain(CONTRACT_CHANGE_EVENT);
  });

  it('uses the selected network in explorer URLs', () => {
    expect(getExplorerContractUrl('cd'.repeat(32), 'preprod')).toContain('network=preprod');
  });
});
