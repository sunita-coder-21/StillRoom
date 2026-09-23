import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  get_eligibility_score(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  get_passphrase(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  steward_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  check_in(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  configure_screening(context: __compactRuntime.CircuitContext<PS>,
                      new_threshold_0: bigint,
                      new_pass_0: Uint8Array,
                      new_deadline_0: bigint,
                      new_curator_0: Uint8Array,
                      new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  check_in(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  configure_screening(context: __compactRuntime.CircuitContext<PS>,
                      new_threshold_0: bigint,
                      new_pass_0: Uint8Array,
                      new_deadline_0: bigint,
                      new_curator_0: Uint8Array,
                      new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  steward_public_key(sk_0: Uint8Array): Uint8Array;
  make_entry_nullifier(secret_0: Uint8Array, pass_0: Uint8Array): Uint8Array;
  credential_commitment(score_0: bigint,
                        secret_0: Uint8Array,
                        pass_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  check_in(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  configure_screening(context: __compactRuntime.CircuitContext<PS>,
                      new_threshold_0: bigint,
                      new_pass_0: Uint8Array,
                      new_deadline_0: bigint,
                      new_curator_0: Uint8Array,
                      new_limit_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_admissions(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  issue_credential(context: __compactRuntime.CircuitContext<PS>,
                   commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  steward_public_key(context: __compactRuntime.CircuitContext<PS>,
                     sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  make_entry_nullifier(context: __compactRuntime.CircuitContext<PS>,
                       secret_0: Uint8Array,
                       pass_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credential_commitment(context: __compactRuntime.CircuitContext<PS>,
                        score_0: bigint,
                        secret_0: Uint8Array,
                        pass_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly entry_threshold: bigint;
  readonly access_pass_id: Uint8Array;
  readonly entry_deadline: bigint;
  readonly curator_id: Uint8Array;
  readonly steward: Uint8Array;
  readonly gate_open: boolean;
  readonly total_entries: bigint;
  readonly screening_entries: bigint;
  readonly entry_limit: bigint;
  credentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  used_nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  entry_log: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly edition: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               threshold_0: bigint,
               pass_0: Uint8Array,
               deadline_0: bigint,
               curator_0: Uint8Array,
               steward_hash_0: Uint8Array,
               limit_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
