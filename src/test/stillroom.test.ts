import { beforeEach, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  sampleUserAddress,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../../contracts/managed/stillroom/contract/index.js';

const bytes = (seed?: number): Uint8Array => seed === undefined
  ? new Uint8Array(crypto.randomBytes(32))
  : Uint8Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff);

// These tests execute the generated Compact runtime bindings and local circuits;
// they are not mocks of the contract API.
describe('Stillroom screening eligibility gate', () => {
  let contract: Contract;
  let state: any;
  let blockTime: number | undefined;
  const contractAddress = dummyContractAddress();
  const userAddress = sampleUserAddress();
  const stewardSecret = bytes(11);
  const curator = bytes(21);
  const initialPass = bytes(31);
  const initialDeadline = BigInt(Math.floor(Date.now() / 1000) + 86_400);

  const credential = (score: bigint, secret: Uint8Array, pass = initialPass) =>
    pureCircuits.credential_commitment(score, secret, pass);

  const setWitnesses = (score: bigint, secret: Uint8Array, steward = stewardSecret) => {
    contract.witnesses = {
      get_eligibility_score: () => [{}, score],
      get_passphrase: () => [{}, secret],
      steward_secret: () => [{}, steward],
    } as any;
  };

  const call = (name: keyof Contract['circuits'], ...args: any[]) => {
    const context = createCircuitContext(contractAddress, userAddress, state, {}, undefined, undefined, blockTime);
    const result = (contract.circuits[name] as any)(context, ...args);
    state = result.context.currentQueryContext.state;
    return result;
  };

  const issue = (commitment: Uint8Array, steward = stewardSecret) => {
    setWitnesses(0n, bytes(201), steward);
    call('issue_credential', commitment);
  };

  const configure = (pass: Uint8Array, limit = 10n) => {
    call('configure_screening', 72n, pass, BigInt(Math.floor(Date.now() / 1000) + 86_400), bytes(41), limit);
  };

  beforeEach(() => {
    blockTime = undefined;
    const stewardHash = pureCircuits.steward_public_key(stewardSecret);
    contract = new Contract({
      get_eligibility_score: () => [{}, 88n],
      get_passphrase: () => [{}, bytes(51)],
      steward_secret: () => [{}, stewardSecret],
    } as any);
    state = contract.initialState(
      createConstructorContext({}, userAddress),
      72n,
      initialPass,
      initialDeadline,
      curator,
      stewardHash,
      10n,
    ).currentContractState.data;
  });

  it('initializes every public screening field', () => {
    const value = ledger(state);
    expect(value.entry_threshold).toBe(72n);
    expect(value.access_pass_id).toEqual(initialPass);
    expect(value.entry_deadline).toBe(initialDeadline);
    expect(value.curator_id).toEqual(curator);
    expect(value.steward).toHaveLength(32);
    expect(value.gate_open).toBe(true);
    expect(value.total_entries).toBe(0n);
    expect(value.screening_entries).toBe(0n);
    expect(value.entry_limit).toBe(10n);
    expect(value.edition).toEqual(new TextEncoder().encode('Stillroom:v1.0'.padEnd(32, '\0')));
  });

  it('requires positive capacity at construction', () => {
    const stewardHash = pureCircuits.steward_public_key(stewardSecret);
    expect(() => contract.initialState(
      createConstructorContext({}, userAddress), 1n, bytes(61), initialDeadline, curator, stewardHash, 0n,
    )).toThrow(/capacity must be positive/i);
  });

  it('rejects a deadline in the past at construction', () => {
    expect(() => contract.initialState(
      createConstructorContext({}, userAddress), 72n, initialPass, 0n, curator,
      pureCircuits.steward_public_key(stewardSecret), 10n,
    )).toThrow(/deadline must be in the future/i);
  });

  it('keeps credential issuance steward-only', () => {
    const commitment = credential(88n, bytes(71));
    expect(() => issue(commitment, bytes(81))).toThrow(/not authorized/i);
    expect(ledger(state).credentials.member(commitment)).toBe(false);
  });

  it('registers an eligible score-bound credential exactly once', () => {
    const commitment = credential(88n, bytes(91));
    issue(commitment);
    expect(ledger(state).credentials.member(commitment)).toBe(true);
    expect(() => issue(commitment)).toThrow(/already registered/i);
  });

  it('accepts a registered eligible private credential', () => {
    const secret = bytes(101);
    issue(credential(88n, secret));
    setWitnesses(88n, secret);
    call('check_in');
    expect(ledger(state).screening_entries).toBe(1n);
    expect(ledger(state).total_entries).toBe(1n);
  });

  it('rejects an unregistered credential', () => {
    const secret = bytes(111);
    issue(credential(88n, bytes(112)));
    setWitnesses(88n, secret);
    expect(() => call('check_in')).toThrow(/not registered/i);
  });

  it('accepts the exact eligibility threshold', () => {
    const secret = bytes(113);
    issue(credential(72n, secret));
    setWitnesses(72n, secret);
    call('check_in');
    expect(ledger(state).screening_entries).toBe(1n);
  });

  it('rejects check-in at or after the exclusive deadline', () => {
    const secret = bytes(114);
    issue(credential(88n, secret));
    setWitnesses(88n, secret);
    blockTime = Number(initialDeadline);
    expect(() => call('check_in')).toThrow(/deadline has passed/i);
    blockTime += 1;
    expect(() => call('check_in')).toThrow(/deadline has passed/i);
    expect(ledger(state).screening_entries).toBe(0n);
  });

  it('rejects a tampered score even when the secret is registered', () => {
    const secret = bytes(121);
    issue(credential(88n, secret));
    setWitnesses(89n, secret);
    expect(() => call('check_in')).toThrow(/not registered/i);
  });

  it('rejects a registered score below the threshold', () => {
    const secret = bytes(131);
    issue(credential(60n, secret));
    setWitnesses(60n, secret);
    expect(() => call('check_in')).toThrow(/threshold not met/i);
    expect(ledger(state).total_entries).toBe(0n);
  });

  it('rejects a repeated nullifier', () => {
    const secret = bytes(141);
    issue(credential(88n, secret));
    setWitnesses(88n, secret);
    call('check_in');
    expect(() => call('check_in')).toThrow(/already checked in/i);
    expect(ledger(state).total_entries).toBe(1n);
  });

  it('increments lifetime and screening counters separately', () => {
    const firstSecret = bytes(151);
    issue(credential(88n, firstSecret));
    setWitnesses(88n, firstSecret);
    call('check_in');
    const nextPass = bytes(161);
    configure(nextPass);
    const secondSecret = bytes(171);
    issue(credential(88n, secondSecret, nextPass));
    setWitnesses(88n, secondSecret);
    call('check_in');
    expect(ledger(state).total_entries).toBe(2n);
    expect(ledger(state).screening_entries).toBe(1n);
  });

  it('rejects unauthorized screening configuration', () => {
    const before = ledger(state);
    setWitnesses(0n, bytes(185), bytes(186));
    expect(() => configure(bytes(187))).toThrow(/not authorized/i);
    expect(ledger(state).access_pass_id).toEqual(before.access_pass_id);
    expect(ledger(state).entry_threshold).toBe(before.entry_threshold);
  });

  it('rejects invalid capacity and deadlines during rotation', () => {
    expect(() => call(
      'configure_screening',
      72n,
      bytes(188),
      BigInt(Math.floor(Date.now() / 1000) + 86_400),
      bytes(189),
      0n,
    )).toThrow(/capacity must be positive/i);
    expect(() => call(
      'configure_screening',
      72n,
      bytes(190),
      0n,
      bytes(191),
      10n,
    )).toThrow(/deadline must be in the future/i);
  });

  it('rejects reusing a previous screening identifier during rotation', () => {
    expect(() => configure(initialPass)).toThrow(/already been used/i);
  });

  it('rejects rotating back to any historical screening identifier', () => {
    const secondPass = bytes(192);
    configure(secondPass);
    configure(bytes(193));
    expect(() => configure(initialPass)).toThrow(/already been used/i);
    expect(() => configure(secondPass)).toThrow(/already been used/i);
  });

  it('rejects a credential from an old screening after rotation', () => {
    const secret = bytes(181);
    issue(credential(88n, secret));
    configure(bytes(191));
    setWitnesses(88n, secret);
    expect(() => call('check_in')).toThrow(/not registered/i);
  });

  it('enforces screening capacity', () => {
    const firstSecret = bytes(201);
    const secondSecret = bytes(211);
    issue(credential(88n, firstSecret));
    issue(credential(88n, secondSecret));
    setWitnesses(88n, firstSecret);
    call('check_in');
    setWitnesses(88n, secondSecret);
    expect(() => call('check_in')).not.toThrow();
    expect(ledger(state).screening_entries).toBe(2n);
    const limitedPass = bytes(221);
    configure(limitedPass, 1n);
    const thirdSecret = bytes(231);
    issue(credential(88n, thirdSecret, limitedPass));
    setWitnesses(88n, thirdSecret);
    call('check_in');
    const fourthSecret = bytes(241);
    issue(credential(88n, fourthSecret, limitedPass));
    setWitnesses(88n, fourthSecret);
    expect(() => call('check_in')).toThrow(/capacity reached/i);
  });

  it('pauses admissions only for the steward', () => {
    expect(() => call('pause_admissions')).not.toThrow();
    expect(ledger(state).gate_open).toBe(false);
    setWitnesses(0n, bytes(2), bytes(3));
    expect(() => call('resume_admissions')).toThrow(/not authorized/i);
  });

  it('rejects unauthorized pause without changing admissions', () => {
    setWitnesses(88n, bytes(6), bytes(7));
    expect(() => call('pause_admissions')).toThrow(/not authorized/i);
    expect(ledger(state).gate_open).toBe(true);
  });

  it('rejects resuming an expired screening', () => {
    call('pause_admissions');
    blockTime = Number(initialDeadline);
    expect(() => call('resume_admissions')).toThrow(/deadline has passed/i);
    expect(ledger(state).gate_open).toBe(false);
  });

  it('blocks check-in while paused and resumes only through the steward', () => {
    const secret = bytes(2);
    issue(credential(88n, secret));
    call('pause_admissions');
    setWitnesses(88n, secret);
    expect(() => call('check_in')).toThrow(/paused/i);
    setWitnesses(0n, bytes(3), stewardSecret);
    call('resume_admissions');
    setWitnesses(88n, secret);
    call('check_in');
    expect(ledger(state).total_entries).toBe(1n);
  });

  it('does not allow redundant pause or resume transitions', () => {
    expect(() => call('pause_admissions')).not.toThrow();
    setWitnesses(0n, bytes(4));
    expect(() => call('pause_admissions')).toThrow(/already paused/i);
    setWitnesses(0n, bytes(5));
    call('resume_admissions');
    expect(() => call('resume_admissions')).toThrow(/already open/i);
  });

  it('domain-separates steward keys, credentials, and nullifiers', () => {
    const secret = bytes(12);
    const pass = bytes(13);
    expect(pureCircuits.steward_public_key(secret)).not.toEqual(pureCircuits.make_entry_nullifier(secret, pass));
    expect(pureCircuits.credential_commitment(88n, secret, pass)).not.toEqual(pureCircuits.make_entry_nullifier(secret, pass));
  });

  it('binds score and screening identifier into credentials', () => {
    const secret = bytes(14);
    const pass = bytes(15);
    const commitment = pureCircuits.credential_commitment(88n, secret, pass);
    expect(commitment).not.toEqual(pureCircuits.credential_commitment(89n, secret, pass));
    expect(commitment).not.toEqual(pureCircuits.credential_commitment(88n, secret, bytes(16)));
  });

  it('binds screening identifier into nullifiers', () => {
    const secret = bytes(17);
    expect(pureCircuits.make_entry_nullifier(secret, bytes(18))).not.toEqual(
      pureCircuits.make_entry_nullifier(secret, bytes(19)),
    );
  });
});
