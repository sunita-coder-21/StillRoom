import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { getNetwork, setNetwork, type Network, CONFIG_CHANGE_EVENT } from '../config';
import { createConnectedSession, disconnectConnectedSession, type ConnectedSession } from '../lib/midnight';

export type WalletStatus = 'checking' | 'detected' | 'not-found';
export type WalletType = '1am' | 'lace' | 'other' | null;
export type WalletEntry = { id: string; name: string; api: InitialAPI };
type WalletContextValue = {
  address: string | null;
  isConnected: boolean;
  walletType: WalletType;
  walletName: string | null;
  walletStatus: WalletStatus;
  isConnecting: boolean;
  session: ConnectedSession | null;
  availableWallets: WalletEntry[];
  error: string | null;
  clearError: () => void;
  connect: (network?: Network, walletId?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
};
const WalletContext = createContext<WalletContextValue | null>(null);

function getWalletType(id: string): Exclude<WalletType, null> {
  const normalized = id.toLowerCase();
  return id === '1am' || normalized.includes('1am') ? '1am' : normalized.includes('lace') ? 'lace' : 'other';
}
export function listInjectedWallets(): WalletEntry[] {
  if (typeof window === 'undefined') return [];
  const injected = (window as Window & { midnight?: Record<string, InitialAPI> }).midnight;
  if (!injected || typeof injected !== 'object') return [];
  return Object.entries(injected).flatMap(([id, api]) => api && typeof api.connect === 'function' ? [{ id, api, name: api.name || id }] : []);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [availableWallets, setAvailableWallets] = useState<WalletEntry[]>([]);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connecting = useRef(false);
  const connectedSession = useRef<ConnectedSession | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const detect = useCallback((timeout = 6000) => {
    if (typeof window === 'undefined') return () => undefined;
    const started = Date.now();
    let timer: number | undefined;
    const check = () => {
      const wallets = listInjectedWallets();
      setAvailableWallets(wallets);
      if (wallets.length) {
        setWalletStatus('detected');
        if (!session) { setWalletName(wallets[0].name); setWalletType(getWalletType(wallets[0].id)); }
        return;
      }
      if (Date.now() - started > timeout) { setWalletStatus('not-found'); return; }
      timer = window.setTimeout(check, 250);
    };
    check();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [session]);

  useEffect(() => detect(), [detect]);
  const disconnect = useCallback(() => {
    const current = connectedSession.current;
    connectedSession.current = null;
    setSession(null); setAddress(null); setWalletName(null); setWalletType(null); setError(null); setWalletStatus('checking');
    // Invalidate local private state synchronously; an extension may not implement disconnect.
    if (current) void disconnectConnectedSession(current).catch(() => undefined);
    detect(3000);
  }, [detect]);

  useEffect(() => {
    const onConfigChange = () => {
      if (connectedSession.current && connectedSession.current.network !== getNetwork()) disconnect();
    };
    window.addEventListener(CONFIG_CHANGE_EVENT, onConfigChange);
    return () => window.removeEventListener(CONFIG_CHANGE_EVENT, onConfigChange);
  }, [disconnect]);

  const connect = useCallback(async (network: Network = getNetwork(), walletId?: string) => {
    if (connecting.current) return undefined;
    connecting.current = true; setIsConnecting(true); setError(null);
    try {
      if (network !== getNetwork()) setNetwork(network);
      const wallets = listInjectedWallets();
      setAvailableWallets(wallets);
      if (!wallets.length) throw new Error('Install a Midnight-compatible wallet such as 1AM or Lace first.');
      const chosen = wallets.find((item) => item.id === walletId);
      if (walletId && !chosen) throw new Error('The selected wallet is no longer available.');
      const selected = chosen ?? wallets[0];
      const api = await selected.api.connect(network) as ConnectedAPI;
      const connected = await createConnectedSession(api, network);
      const previous = connectedSession.current;
      if (previous) await disconnectConnectedSession(previous);
      connectedSession.current = connected;
      setSession(connected); setAddress(connected.unshieldedAddress); setWalletName(selected.name); setWalletType(getWalletType(selected.id)); setWalletStatus('detected');
      return connected;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      return undefined;
    } finally {
      connecting.current = false; setIsConnecting(false);
    }
  }, []);

  return <WalletContext.Provider value={{ address, isConnected: Boolean(session), walletType, walletName, walletStatus, isConnecting, session, availableWallets, error, clearError, connect, disconnect }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
