import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
import type { Ledger, Witnesses } from './managed/auravote/contract/index.js';

export interface LocalVoterPrivateState {
  secretKey: Uint8Array;
  randomness: Uint8Array;
  choice: bigint;
  merklePath?: {
    leaf: Uint8Array;
    path: { sibling: { field: bigint }; goes_left: boolean }[];
  };
}

export function createAuraVoteWitnesses(): Witnesses<LocalVoterPrivateState> {
  return {
    voter_secret(context: __compactRuntime.WitnessContext<Ledger, LocalVoterPrivateState>): [LocalVoterPrivateState, Uint8Array] {
      return [context.privateState, context.privateState.secretKey];
    },

    voter_randomness(context: __compactRuntime.WitnessContext<Ledger, LocalVoterPrivateState>): [LocalVoterPrivateState, Uint8Array] {
      return [context.privateState, context.privateState.randomness];
    },

    get_voter_path(
      context: __compactRuntime.WitnessContext<Ledger, LocalVoterPrivateState>,
      commitment_0: Uint8Array
    ): [LocalVoterPrivateState, { leaf: Uint8Array; path: { sibling: { field: bigint }; goes_left: boolean }[] }] {
      if (context.privateState.merklePath) {
        return [context.privateState, context.privateState.merklePath];
      }

      // If in full ledger context, try to resolve from voterRegistry
      const resolved = context.ledger.voterRegistry?.findPathForLeaf?.(commitment_0);
      if (resolved) {
        return [context.privateState, {
          leaf: resolved.leaf,
          path: resolved.path.map(step => ({
            sibling: { field: (step.sibling as any).field ?? 0n },
            goes_left: step.goes_left
          }))
        }];
      }

      return [context.privateState, {
        leaf: commitment_0,
        path: []
      }];
    },

    voter_choice(context: __compactRuntime.WitnessContext<Ledger, LocalVoterPrivateState>): [LocalVoterPrivateState, bigint] {
      return [context.privateState, context.privateState.choice];
    }
  };
}
