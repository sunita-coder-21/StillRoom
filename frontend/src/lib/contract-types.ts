import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { Contract } from '../managed/contract/index.js';

export const PRIVATE_STATE_ID = 'stillroom-private-state' as const;
export type StillroomPrivateState = { secret: Uint8Array; score: bigint };
export type StillroomContract = Contract<StillroomPrivateState>;
export type StillroomCircuit = keyof StillroomContract['provableCircuits'];
export type StillroomProviders = MidnightProviders<StillroomCircuit, typeof PRIVATE_STATE_ID, StillroomPrivateState>;
