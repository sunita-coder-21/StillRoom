import { normalizeContractAddress } from './lib/validation';

export type Network = 'preview' | 'preprod';
export const CONFIG_CHANGE_EVENT = 'stillroom:config-change';
export const CONTRACT_CHANGE_EVENT = 'stillroom:contract-change';
export const NETWORK_STORAGE_KEY = 'stillroom:v1:network';
export const contractStorageKey = (network: Network) => `stillroom:v1:${network}:contract-address`;
export const isNetwork = (value: unknown): value is Network => value === 'preview' || value === 'preprod';
const fallbackStorage = new Map<string, string>();

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key) ?? fallbackStorage.get(key) ?? null; }
  catch { return fallbackStorage.get(key) ?? null; }
}
function writeStorage(key: string, value: string): void {
  fallbackStorage.set(key, value);
  try { window.localStorage.setItem(key, value); } catch { /* Public configuration still works in memory. */ }
}
function notify(name: string, detail: { network: Network; address?: string }): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail }));
}
function configuredNetwork(): Network {
  const value = import.meta.env.VITE_NETWORK;
  return isNetwork(value) ? value : 'preview';
}
function assertNetwork(network: Network): void {
  if (!isNetwork(network)) throw new Error('Choose Preview or Preprod.');
}

export function getNetwork(): Network {
  const saved = readStorage(NETWORK_STORAGE_KEY);
  return isNetwork(saved) ? saved : configuredNetwork();
}
export function setNetwork(network: Network): void {
  assertNetwork(network);
  writeStorage(NETWORK_STORAGE_KEY, network);
  notify(CONFIG_CHANGE_EVENT, { network });
}

export function getContractAddress(network: Network = getNetwork()): string {
  assertNetwork(network);
  // Never migrate the old, unscoped address: it cannot be attributed safely to a network.
  const stored = readStorage(contractStorageKey(network));
  const networkEnv = network === 'preview' ? import.meta.env.VITE_PREVIEW_CONTRACT_ADDRESS : import.meta.env.VITE_PREPROD_CONTRACT_ADDRESS;
  const address = stored ?? networkEnv ?? (network === configuredNetwork() ? import.meta.env.VITE_CONTRACT_ADDRESS : '') ?? '';
  if (!address) return '';
  try { return normalizeContractAddress(address); } catch { return ''; }
}
export function setContractAddress(address: string, network: Network = getNetwork()): void {
  assertNetwork(network);
  const normalized = address.trim() ? normalizeContractAddress(address) : '';
  writeStorage(contractStorageKey(network), normalized);
  notify(CONTRACT_CHANGE_EVENT, { network, address: normalized });
  notify(CONFIG_CHANGE_EVENT, { network, address: normalized });
}

export const INDEXER_URL = getNetworkConfig('preview').indexerUri;
export const INDEXER_WS = getNetworkConfig('preview').indexerWsUri;

export function getNetworkConfig(network: Network = getNetwork()) {
  assertNetwork(network);
  const useEnvironment = network === configuredNetwork();
  return {
    networkId: network,
    indexerUri: (useEnvironment && import.meta.env.VITE_INDEXER_URL) || `https://indexer.${network}.midnight.network/api/v4/graphql`,
    indexerWsUri: (useEnvironment && import.meta.env.VITE_INDEXER_WS) || `wss://indexer.${network}.midnight.network/api/v4/graphql/ws`,
    proofServerUri: (useEnvironment && import.meta.env.VITE_PROOF_SERVER_URL) || '',
  };
}

export function getExplorerContractUrl(address?: string, network: Network = getNetwork()): string {
  assertNetwork(network);
  const target = address ?? getContractAddress(network);
  return target
    ? `https://explorer.1am.xyz/contract/${encodeURIComponent(normalizeContractAddress(target))}?network=${network}`
    : `https://explorer.1am.xyz/?network=${network}`;
}
export function getExplorerTxUrl(tx: string, network: Network = getNetwork()): string {
  assertNetwork(network);
  return `https://explorer.1am.xyz/tx/${encodeURIComponent(tx)}?network=${network}`;
}

export const DEFAULT_GATE_THRESHOLD = 72n;
export const DEFAULT_ENTRY_LIMIT = 144n;
