import { useCallback, useEffect, useState } from 'react';
import { ledger } from '../managed/contract/index.js';
import { CONFIG_CHANGE_EVENT, CONTRACT_CHANGE_EVENT, getContractAddress, getNetwork, getNetworkConfig } from '../config';
import { createPatchedPublicDataProvider } from '../lib/midnight';

const providers = new Map<string, ReturnType<typeof createPatchedPublicDataProvider>>();
function getProvider() {
  const config = getNetworkConfig(getNetwork());
  const key = `${config.indexerUri}|${config.indexerWsUri}`;
  const cached = providers.get(key);
  if (cached) return cached;
  const next = createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);
  providers.set(key, next);
  return next;
}

export function useContractState(interval = 5000, requestedAddress?: string) {
  const [version, setVersion] = useState(0);
  const [ledgerState, setLedgerState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const address = requestedAddress || getContractAddress();

  useEffect(() => {
    const refresh = () => { setLedgerState(null); setIsLoading(true); setVersion(value => value + 1); };
    window.addEventListener(CONFIG_CHANGE_EVENT, refresh);
    window.addEventListener(CONTRACT_CHANGE_EVENT, refresh);
    return () => { window.removeEventListener(CONFIG_CHANGE_EVENT, refresh); window.removeEventListener(CONTRACT_CHANGE_EVENT, refresh); };
  }, []);

  const refetch = useCallback(async () => {
    if (!address) { setIsLoading(false); setLedgerState(null); setError(null); return; }
    try {
      setIsLoading(true);
      const state = await getProvider().queryContractState(address);
      setLedgerState(state?.data ? ledger(state.data) : null);
      setError(null); setLastUpdate(new Date());
    } catch (cause: any) {
      setError(cause?.message || 'Unable to read the Midnight indexer.');
    } finally { setIsLoading(false); }
  }, [address, version]);

  useEffect(() => { void refetch(); const timer = window.setInterval(() => void refetch(), interval); return () => window.clearInterval(timer); }, [refetch, interval]);
  return { ledgerState, isLoading, error, lastUpdate, refetch };
}
