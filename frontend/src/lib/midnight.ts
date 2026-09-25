import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProofProvider, type MidnightProvider, type ProofProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { Transaction, type FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import { MidnightBech32m, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk/address-format';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { getNetwork, getNetworkConfig, type Network } from '../config';
import { type StillroomCircuit, type StillroomPrivateState, type StillroomProviders, PRIVATE_STATE_ID } from './contract-types';
import { createPrivateStateProvider, type MemoryPrivateStateProvider } from './private-state';
import { bytes32, fromHex, toHex } from './validation';

export { fromHex, toHex } from './validation';
export { createPrivateStateProvider } from './private-state';
export type { StillroomProviders } from './contract-types';

// Some Connector v4 wallets omit proving but expose a compatible HTTP proof server.
export type BrowserWalletAPI = Omit<ConnectedAPI, 'getProvingProvider'> & {
  getProvingProvider?: ConnectedAPI['getProvingProvider'];
  disconnect?: () => Promise<void> | void;
};
type WalletConfiguration = Awaited<ReturnType<ConnectedAPI['getConfiguration']>>;
export type ConnectedSession = {
  api: BrowserWalletAPI;
  config: WalletConfiguration;
  network: Network;
  unshieldedAddress: string;
  proofMode: 'wallet' | 'http';
  providers: StillroomProviders;
  readonly active: boolean;
  dispose(): void;
};

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  // SDK 4.1 handles the current indexer schema; no lossy bespoke GraphQL adapter.
  return indexerPublicDataProvider(queryUrl, subscriptionUrl);
}

export function assertWalletNetwork(actual: string, expected: Network): void {
  if (actual !== expected) throw new Error(`Wallet network mismatch: connected to ${actual || 'an unknown network'}, expected ${expected}. Switch the wallet network and reconnect.`);
}
export function assertSessionNetwork(session: ConnectedSession, expected: Network = getNetwork()): void {
  if (!session.active) throw new Error('This wallet session was disconnected. Reconnect before submitting.');
  assertWalletNetwork(session.network, expected);
  assertWalletNetwork(session.config.networkId, expected);
}

/** Revalidate after asynchronous wallet prompts and before every transaction boundary. */
export async function validateSession(session: ConnectedSession): Promise<void> {
  assertSessionNetwork(session);
  const configuration = await session.api.getConfiguration();
  assertSessionNetwork(session);
  assertWalletNetwork(configuration.networkId, session.network);
  setNetworkId(session.network);
}

export function transactionIdentifier(tx: Pick<FinalizedTransaction, 'identifiers'>): string {
  const identifier = tx.identifiers()[0];
  if (typeof identifier !== 'string' || !identifier) throw new Error('The finalized transaction has no identifier. It was not submitted.');
  return identifier;
}

function endpoint(url: string, protocols: readonly string[], label: string): string {
  const parsed = new URL(url);
  if (!protocols.includes(parsed.protocol)) throw new Error(`${label} uses an unsupported protocol.`);
  return parsed.toString();
}
function publicKey(value: string, kind: 'coin' | 'encryption', network: Network): string {
  // Connector v4 specifies Bech32m; older compatible wallets return raw hex.
  if (/^(0x)?[\da-f]{64}$/i.test(value)) return toHex(bytes32(value, 'Wallet public key'));
  const encoded = MidnightBech32m.parse(value);
  return kind === 'coin'
    ? ShieldedCoinPublicKey.codec.decode(network, encoded).toHexString()
    : ShieldedEncryptionPublicKey.codec.decode(network, encoded).toHexString();
}

/** Full Midnight.js providers, with memory-only private state and a real submission relay. */
export async function createConnectedSession(api: BrowserWalletAPI, expectedNetwork: Network = getNetwork()): Promise<ConnectedSession> {
  const config = await api.getConfiguration();
  assertWalletNetwork(config.networkId, expectedNetwork);
  if (getNetwork() !== expectedNetwork) throw new Error('The selected network changed. Reconnect on the selected network.');
  setNetworkId(expectedNetwork);
  const [unshielded, shielded] = await Promise.all([api.getUnshieldedAddress(), api.getShieldedAddresses()]);
  const unshieldedAddress = unshielded.unshieldedAddress;
  MidnightBech32m.parse(unshieldedAddress).decode(UnshieldedAddress, expectedNetwork);
  const coinPublicKey = publicKey(shielded.shieldedCoinPublicKey, 'coin', expectedNetwork);
  const encryptionPublicKey = publicKey(shielded.shieldedEncryptionPublicKey, 'encryption', expectedNetwork);

  const zkConfigProvider = new FetchZkConfigProvider<StillroomCircuit>(new URL('/managed', window.location.origin).toString());
  let proofProvider: ProofProvider | undefined;
  let proofMode: ConnectedSession['proofMode'] | undefined;
  let provingError: unknown;
  if (typeof api.getProvingProvider === 'function') {
    try {
      proofProvider = createProofProvider(await api.getProvingProvider(zkConfigProvider));
      proofMode = 'wallet';
    } catch (cause) {
      provingError = cause;
    }
  }
  if (!proofProvider) {
    const proofServer = getNetworkConfig(expectedNetwork).proofServerUri || config.proverServerUri;
    if (!proofServer) {
      const detail = provingError instanceof Error ? `: ${provingError.message}` : '';
      throw new Error(`This wallet has no usable proving provider. Configure a trusted VITE_PROOF_SERVER_URL, or use a wallet with proving support${detail}.`);
    }
    // This explicitly configured service receives private proving inputs. It is not a privacy-preserving relay.
    proofProvider = httpClientProofProvider(endpoint(proofServer, ['https:', 'http:'], 'Proof server'), zkConfigProvider);
    proofMode = 'http';
  }

  let active = true;
  const witnessBuffers = new Set<Uint8Array>();
  const privateStateProvider: MemoryPrivateStateProvider<typeof PRIVATE_STATE_ID, StillroomPrivateState> = createPrivateStateProvider();
  const baseSet = privateStateProvider.set.bind(privateStateProvider);
  privateStateProvider.set = async (id, state) => { witnessBuffers.add(state.secret); await baseSet(id, state); };
  const baseClear = privateStateProvider.clear.bind(privateStateProvider);
  privateStateProvider.clear = async () => {
    for (const secret of witnessBuffers) secret.fill(0);
    witnessBuffers.clear();
    await baseClear();
  };
  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    async balanceTx(tx) {
      await validateSession(session);
      const balanced = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      assertSessionNetwork(session);
      if (!balanced?.tx) throw new Error('The wallet could not balance this transaction.');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
    },
  };
  const midnightProvider: MidnightProvider = {
    async submitTx(tx) {
      await validateSession(session);
      const txId = transactionIdentifier(tx);
      await api.submitTransaction(toHex(tx.serialize()));
      // Connector v4 returns void; only a successful relay call may return this ledger identifier.
      return txId;
    },
  };
  const session: ConnectedSession = {
    api, config, network: expectedNetwork, unshieldedAddress, proofMode: proofMode!,
    get active() { return active; },
    dispose() {
      active = false;
      for (const secret of witnessBuffers) secret.fill(0);
      witnessBuffers.clear();
      privateStateProvider.dispose();
    },
    providers: {
      privateStateProvider,
      publicDataProvider: createPatchedPublicDataProvider(endpoint(config.indexerUri, ['https:', 'http:'], 'Indexer'), endpoint(config.indexerWsUri, ['wss:', 'ws:'], 'Indexer WebSocket')),
      zkConfigProvider,
      proofProvider: {
        async proveTx(tx, options) {
          await validateSession(session);
          const proven = await proofProvider!.proveTx(tx, options);
          assertSessionNetwork(session);
          return proven;
        },
      },
      walletProvider,
      midnightProvider,
    },
  };
  await validateSession(session);
  return session;
}

/** Local invalidation is immediate even if the optional extension disconnect fails. */
export async function disconnectConnectedSession(session: ConnectedSession): Promise<void> {
  session.dispose();
  if (typeof session.api.disconnect === 'function') await session.api.disconnect();
}
