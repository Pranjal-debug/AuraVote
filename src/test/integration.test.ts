import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { zkProver, type PublicLedgerState } from '../frontend/zk-prover.js';
import { laceConnector } from '../frontend/wallet.js';

describe('AuraVote End-to-End Integration Suite — Level 3 (First Quarter)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. Wallet Connector Lifecycle', () => {
    it('should initialize disconnected by default and connect with Preprod addresses', async () => {
      const initial = laceConnector.getState();
      expect(initial.network).toBe('preprod');

      const connected = await laceConnector.connect();
      expect(connected.isConnected).toBe(true);
      expect(connected.address).toContain('addr_preprod1');
      expect(connected.dustBalance).toContain('DUST');
      expect(connected.tnightBalance).toContain('tNIGHT');
    });

    it('should handle wallet disconnection cleanly', async () => {
      await laceConnector.connect();
      expect(laceConnector.getState().isConnected).toBe(true);

      const disconnected = laceConnector.disconnect();
      expect(disconnected.isConnected).toBe(false);
      expect(laceConnector.getState().isConnected).toBe(false);
    });
  });

  describe('2. Client-Side ZK Prover & Circuit Pipeline', () => {
    it('should generate valid deterministic nullifiers with domain separation', () => {
      const secret = 'voter-secret-xyz-123';
      const nullifier1 = zkProver.deriveNullifier(secret);
      const nullifier2 = zkProver.deriveNullifier(secret);

      // Determinism
      expect(nullifier1).toBe(nullifier2);
      expect(nullifier1.startsWith('0x8e2f')).toBe(true);
      expect(nullifier1.length).toBe(42);

      // Unlinkability for different secret
      const secretB = 'voter-secret-abc-999';
      const nullifierB = zkProver.deriveNullifier(secretB);
      expect(nullifier1).not.toBe(nullifierB);
    });

    it('should derive identity commitments for enrollment into the Merkle tree', () => {
      const secret = 'voter-seed-alpha';
      const salt = 'random-salt-beta';
      const commitment = zkProver.deriveCommitment(secret, salt);

      expect(commitment.startsWith('0x9d01f')).toBe(true);
      expect(commitment.length).toBe(42);

      // Changing salt produces a distinct commitment
      const commitmentDifferentSalt = zkProver.deriveCommitment(secret, 'different-salt');
      expect(commitment).not.toBe(commitmentDifferentSalt);
    });

    it('should execute end-to-end ballot casting circuit with live progress notifications', async () => {
      const stepsLogged: number[] = [];
      const voterSecret = 'integration-test-voter-secret-' + Date.now();

      const initialLedger = zkProver.getLedgerState();
      const initialYes = initialLedger.yesVotes;
      const initialTotal = initialLedger.totalBallots;

      const result = await zkProver.executeCastVoteCircuit('YES', voterSecret, (step, msg) => {
        stepsLogged.push(step);
      });

      // Verify all 4 circuit synthesis stages were executed
      expect(stepsLogged).toEqual([1, 2, 3, 4]);
      expect(result.txHash.startsWith('0x')).toBe(true);
      expect(result.nullifier.startsWith('0x')).toBe(true);

      // Verify ledger increment
      const updatedLedger = zkProver.getLedgerState();
      expect(updatedLedger.yesVotes).toBe(initialYes + 1);
      expect(updatedLedger.totalBallots).toBe(initialTotal + 1);
      expect(updatedLedger.usedNullifiers[0]).toBe(result.nullifier);

      // Verify transaction log
      const txs = zkProver.getTransactions();
      expect(txs[0].choice).toBe('YES');
      expect(txs[0].proofCircuit).toBe('Groth16 / BN254');
    });

    it('should enforce double-voting rejection when the same secret attempts to vote again', async () => {
      const voterSecret = 'double-spend-test-seed-42';
      
      // First ballot succeeds
      await zkProver.executeCastVoteCircuit('NO', voterSecret, () => {});

      // Second ballot with the exact same voter secret MUST throw an error
      await expect(
        zkProver.executeCastVoteCircuit('NO', voterSecret, () => {})
      ).rejects.toThrow(/Double voting prevented/);
    });
  });

  describe('3. Allowlist Registration & Merkle Tree Growth', () => {
    it('should enroll new voter commitments into the Historic Merkle Tree', () => {
      const initialLeaves = zkProver.getLedgerState().merkleTreeLeaves;
      const commitment = '0x9d01f99999999999999999999999999999999999';

      const res = zkProver.registerVoter(commitment);
      expect(res.success).toBe(true);
      expect(res.leafIndex).toBe(initialLeaves + 1);

      const updatedLeaves = zkProver.getLedgerState().merkleTreeLeaves;
      expect(updatedLeaves).toBe(initialLeaves + 1);
    });
  });
});
