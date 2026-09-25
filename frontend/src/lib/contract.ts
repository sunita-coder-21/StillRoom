import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTx, createUnprovenDeployTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/ledger-v8';
import { Contract, ledger, pureCircuits, type Ledger, type Witnesses } from '../managed/contract/index.js';
import { getContractAddress, getNetwork, setContractAddress, type Network } from '../config';
import { assertSessionNetwork, type ConnectedSession } from './midnight';
import { PRIVATE_STATE_ID, type StillroomPrivateState } from './contract-types';
import { bytes32, fromHex, normalizeContractAddress, parseUnsigned, screeningParameters, toHex, UINT64_MAX } from './validation';

export type ScreeningSession = ConnectedSession;
export type DeployScreeningInput = { secret: string; threshold: string; limit: string; days: string };
export type CheckInInput = { secret: string; score: string };
export type ManageScreeningInput = { secret: string; action: 'pause' | 'resume' | 'rotate'; threshold: string; limit: string; days: string };
export type IssueCredentialInput = { secret: string; commitment: string };
export type SubmittedTransaction = { txId: string; /** Present only on the deployScreening result. */ address?: string };

function requireSession(session: ScreeningSession): Network {
  const network = getNetwork();
  assertSessionNetwork(session, network);
  return network;
}
function witnesses(secret: Uint8Array, score: bigint): Witnesses<StillroomPrivateState> {
  return {
    get_eligibility_score: ({ privateState }) => [privateState, score],
    get_passphrase: ({ privateState }) => [privateState, secret],
    steward_secret: ({ privateState }) => [privateState, secret],
  };
}
function compiled(secret: Uint8Array, score = 0n) {
  return CompiledContract.make('Stillroom', Contract).pipe(
    CompiledContract.withWitnesses(witnesses(secret, score)),
    CompiledContract.withCompiledFileAssets(new URL('/managed', window.location.origin).toString()),
  );
}
async function setPrivateState(session: ScreeningSession, address: string, secret: Uint8Array, score = 0n): Promise<void> {
  session.providers.privateStateProvider.setContractAddress(address);
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, { secret, score });
}
async function submit(session: ScreeningSession, unprovenTx: unknown, circuitId?: string): Promise<string> {
  const txId = await submitTxAsync(session.providers as never, {
    unprovenTx: unprovenTx as never,
    ...(circuitId ? { circuitId } : {}),
  } as never);
  if (typeof txId !== 'string' || !txId.trim()) throw new Error('The wallet did not return a transaction identifier.');
  return txId;
}
async function call(session: ScreeningSession, address: string, circuitId: string, args: readonly unknown[], secret: Uint8Array, score = 0n): Promise<string> {
  // Keep the provider's copy separately so the temporary witness closure can be erased as soon as proving/submission ends.
  await setPrivateState(session, address, new Uint8Array(secret), score);
  try {
    const data = await createUnprovenCallTx(session.providers as never, {
      compiledContract: compiled(secret, score),
      contractAddress: address,
      circuitId,
      privateStateId: PRIVATE_STATE_ID,
      args,
    } as never);
    return await submit(session, data.private.unprovenTx, circuitId);
  } finally {
    secret.fill(0);
  }
}

export async function deployScreening(session: ScreeningSession, input: DeployScreeningInput): Promise<{ address: string; txId: string }> {
  requireSession(session);
  const secret = bytes32(input.secret, 'Steward secret');
  const stateSecret = new Uint8Array(secret);
  const { threshold, limit, deadline } = screeningParameters(input);
  const pass = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const curator = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const stewardHash = pureCircuits.steward_public_key(secret);
  try {
    const data = await createUnprovenDeployTx(session.providers as never, {
      compiledContract: compiled(secret),
      initialPrivateState: { secret: stateSecret, score: 0n },
      args: [threshold, pass, deadline, curator, stewardHash, limit],
      signingKey: sampleSigningKey(),
    } as never);
    const address = normalizeContractAddress(String(data.public.contractAddress));
    const txId = await submit(session, data.private.unprovenTx);
    // The address is scoped to the selected network and is persisted only after submission succeeds.
    setContractAddress(address, getNetwork());
    await setPrivateState(session, address, new Uint8Array(stateSecret));
    return { address, txId };
  } finally {
    secret.fill(0);
    stateSecret.fill(0);
  }
}

export async function checkIn(session: ScreeningSession, input: CheckInInput): Promise<SubmittedTransaction> {
  requireSession(session);
  const secret = bytes32(input.secret, 'Member secret');
  const score = parseUnsigned(input.score, 'Score', UINT64_MAX);
  const address = getRequiredAddress();
  return { txId: await call(session, address, 'check_in', [], secret, score) };
}

export async function manageScreening(session: ScreeningSession, input: ManageScreeningInput): Promise<SubmittedTransaction> {
  requireSession(session);
  const secret = bytes32(input.secret, 'Steward secret');
  const address = getRequiredAddress();
  if (input.action === 'pause') return { txId: await call(session, address, 'pause_admissions', [], secret) };
  if (input.action === 'resume') return { txId: await call(session, address, 'resume_admissions', [], secret) };
  if (input.action !== 'rotate') throw new Error('Management action must be pause, resume, or rotate.');
  const { threshold, limit, deadline } = screeningParameters(input);
  const current = await session.providers.publicDataProvider.queryContractState(address);
  if (!current) throw new Error('The screening contract is not indexed on this network.');
  const currentLedger = ledger(current.data);
  return {
    txId: await call(session, address, 'configure_screening', [threshold, globalThis.crypto.getRandomValues(new Uint8Array(32)), deadline, currentLedger.curator_id, limit], secret),
  };
}

export async function issueCredential(session: ScreeningSession, input: IssueCredentialInput): Promise<SubmittedTransaction> {
  requireSession(session);
  const secret = bytes32(input.secret, 'Steward secret');
  const commitment = bytes32(input.commitment, 'Credential commitment');
  return { txId: await call(session, getRequiredAddress(), 'issue_credential', [commitment], secret) };
}

export function getCredentialCommitment(score: string, secret: string, pass: Uint8Array): string {
  const parsedScore = parseUnsigned(score, 'Score', UINT64_MAX);
  if (!(pass instanceof Uint8Array) || pass.length !== 32) throw new Error('Screening pass must be 32 bytes.');
  return toHex(pureCircuits.credential_commitment(parsedScore, bytes32(secret, 'Member secret'), pass));
}

function getRequiredAddress(): string {
  const address = getContractAddress();
  if (!address) throw new Error('No screening contract is configured for the selected network.');
  return normalizeContractAddress(address);
}

/** Waits for indexer inclusion explicitly; submission helpers intentionally do not claim confirmation. */
export async function waitForConfirmation(session: ScreeningSession, txId: string, timeoutMs = 120_000) {
  requireSession(session);
  if (!txId.trim()) throw new Error('Transaction identifier is required.');
  const pending = session.providers.publicDataProvider.watchForTxData(txId);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return pending;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Confirmation is still pending.')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type ScreeningLedger = Ledger;
export { bytes32, fromHex, normalizeContractAddress, parseUnsigned, screeningParameters, toHex } from './validation';
