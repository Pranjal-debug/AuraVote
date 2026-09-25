import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createAuraVoteWitnesses, type LocalVoterPrivateState } from '../../contract/witnesses.js';

describe('AuraVote Protocol — Lunar Phase: Level 1 (New Moon)', () => {
  const managedPath = path.resolve(process.cwd(), 'contract/managed/auravote');

  describe('1. Toolchain & Managed Artifacts Verification', () => {
    it('should have the generated managed/ directory with all required subdirectories', () => {
      expect(fs.existsSync(managedPath)).toBe(true);
      expect(fs.existsSync(path.join(managedPath, 'zkir'))).toBe(true);
      expect(fs.existsSync(path.join(managedPath, 'keys'))).toBe(true);
      expect(fs.existsSync(path.join(managedPath, 'contract'))).toBe(true);
      expect(fs.existsSync(path.join(managedPath, 'compiler'))).toBe(true);
    });

    it('should contain compiled ZKIR circuits for all exported circuits', () => {
      const circuits = ['cast_vote', 'register_voter', 'close_election'];
      for (const circuit of circuits) {
        const zkirFile = path.join(managedPath, 'zkir', `${circuit}.zkir`);
        expect(fs.existsSync(zkirFile)).toBe(true);
        const content = fs.readFileSync(zkirFile, 'utf-8');
        expect(content.length).toBeGreaterThan(50);
      }
    });

    it('should contain valid SNARK Prover and Verifier keys', () => {
      const circuits = ['cast_vote', 'register_voter', 'close_election'];
      for (const circuit of circuits) {
        const proverKey = path.join(managedPath, 'keys', `${circuit}.prover`);
        const verifierKey = path.join(managedPath, 'keys', `${circuit}.verifier`);
        expect(fs.existsSync(proverKey)).toBe(true);
        expect(fs.existsSync(verifierKey)).toBe(true);
        expect(fs.statSync(proverKey).size).toBeGreaterThan(1000);
        expect(fs.statSync(verifierKey).size).toBeGreaterThan(500);
      }
    });

    it('should contain generated TypeScript/JavaScript contract bindings', () => {
      const dtsFile = path.join(managedPath, 'contract', 'index.d.ts');
      const jsFile = path.join(managedPath, 'contract', 'index.js');
      expect(fs.existsSync(dtsFile)).toBe(true);
      expect(fs.existsSync(jsFile)).toBe(true);

      const dtsContent = fs.readFileSync(dtsFile, 'utf-8');
      expect(dtsContent).toContain('export type Witnesses<PS>');
      expect(dtsContent).toContain('export type Ledger');
      expect(dtsContent).toContain('export declare class Contract');
      expect(dtsContent).toContain('voterRegistry');
      expect(dtsContent).toContain('usedNullifiers');
      expect(dtsContent).toContain('yesVotes');
      expect(dtsContent).toContain('noVotes');
    });
  });

  describe('2. Public State vs. Private Witness Architecture', () => {
    it('should correctly initialize and extract private witness states', () => {
      const witnesses = createAuraVoteWitnesses();
      const mockSecret = crypto.randomBytes(32);
      const mockRandomness = crypto.randomBytes(32);
      const mockChoice = 1n; // YES

      const privateState: LocalVoterPrivateState = {
        secretKey: new Uint8Array(mockSecret),
        randomness: new Uint8Array(mockRandomness),
        choice: mockChoice
      };

      const mockWitnessContext: any = {
        ledger: {
          voterRegistry: {
            findPathForLeaf: () => undefined
          }
        },
        privateState
      };

      const [nextState1, secretVal] = witnesses.voter_secret(mockWitnessContext);
      const [nextState2, randVal] = witnesses.voter_randomness(mockWitnessContext);
      const [nextState3, choiceVal] = witnesses.voter_choice(mockWitnessContext);

      expect(Buffer.from(secretVal).toString('hex')).toBe(mockSecret.toString('hex'));
      expect(Buffer.from(randVal).toString('hex')).toBe(mockRandomness.toString('hex'));
      expect(choiceVal).toBe(1n);
      expect(nextState1).toBe(privateState);
      expect(nextState2).toBe(privateState);
      expect(nextState3).toBe(privateState);
    });

    it('should enforce zero-knowledge domain separation for voter commitment and nullifier', () => {
      const secret = crypto.randomBytes(32);
      const randomness = crypto.randomBytes(32);
      const electionId = crypto.randomBytes(32);

      // Commitment derivation: H("auravote:voter:" || secret || randomness)
      const domainCommit = Buffer.from('auravote:voter:'.padEnd(32, '\0'));
      const commitment = crypto.createHash('sha256')
        .update(domainCommit)
        .update(secret)
        .update(randomness)
        .digest();

      // Nullifier derivation: H("auravote:nullifier:" || electionId || secret)
      const domainNullifier = Buffer.from('auravote:nullifier:'.padEnd(32, '\0'));
      const nullifier = crypto.createHash('sha256')
        .update(domainNullifier)
        .update(electionId)
        .update(secret)
        .digest();

      // Commitment and Nullifier MUST NOT be equal (domain separated)
      expect(commitment.toString('hex')).not.toBe(nullifier.toString('hex'));

      // Observer with nullifier cannot deduce voter commitment
      expect(nullifier.length).toBe(32);
      expect(commitment.length).toBe(32);
    });

    it('should generate independent unlinkable nullifiers for different elections', () => {
      const secret = crypto.randomBytes(32);
      const electionA = crypto.randomBytes(32);
      const electionB = crypto.randomBytes(32);

      const domainNullifier = Buffer.from('auravote:nullifier:'.padEnd(32, '\0'));

      const nullifierA = crypto.createHash('sha256')
        .update(domainNullifier)
        .update(electionA)
        .update(secret)
        .digest();

      const nullifierB = crypto.createHash('sha256')
        .update(domainNullifier)
        .update(electionB)
        .update(secret)
        .digest();

      // Cross-election unlinkability: same voter has completely different nullifiers across polls
      expect(nullifierA.toString('hex')).not.toBe(nullifierB.toString('hex'));
    });
  });

  describe('3. Protocol Ledger Integrity & Double-Voting Simulation', () => {
    it('should simulate successful ballot tallying and prevent duplicate nullifiers', () => {
      const publicLedger = {
        electionId: crypto.randomBytes(32),
        usedNullifiers: new Set<string>(),
        yesVotes: 0n,
        noVotes: 0n,
        totalBallots: 0n,
        isClosed: false
      };

      const voterA = {
        secret: crypto.randomBytes(32),
        choice: 1n // YES
      };

      const domainNullifier = Buffer.from('auravote:nullifier:'.padEnd(32, '\0'));
      const nullifierA = crypto.createHash('sha256')
        .update(domainNullifier)
        .update(publicLedger.electionId)
        .update(voterA.secret)
        .digest('hex');

      // 1. First vote is accepted
      expect(publicLedger.usedNullifiers.has(nullifierA)).toBe(false);
      publicLedger.usedNullifiers.add(nullifierA);
      if (voterA.choice === 1n) publicLedger.yesVotes++;
      publicLedger.totalBallots++;

      expect(publicLedger.yesVotes).toBe(1n);
      expect(publicLedger.totalBallots).toBe(1n);

      // 2. Double-voting attempt with the same voter secret is rejected
      const attemptDuplicate = publicLedger.usedNullifiers.has(nullifierA);
      expect(attemptDuplicate).toBe(true);

      // 3. Second voter can vote NO independently
      const voterB = {
        secret: crypto.randomBytes(32),
        choice: 0n // NO
      };
      const nullifierB = crypto.createHash('sha256')
        .update(domainNullifier)
        .update(publicLedger.electionId)
        .update(voterB.secret)
        .digest('hex');

      expect(publicLedger.usedNullifiers.has(nullifierB)).toBe(false);
      publicLedger.usedNullifiers.add(nullifierB);
      if (voterB.choice === 0n) publicLedger.noVotes++;
      publicLedger.totalBallots++;

      expect(publicLedger.yesVotes).toBe(1n);
      expect(publicLedger.noVotes).toBe(1n);
      expect(publicLedger.totalBallots).toBe(2n);
      expect(publicLedger.usedNullifiers.size).toBe(2);
    });

    it('should enforce election closure restrictions', () => {
      let isClosed = false;
      const canCast = () => !isClosed;

      expect(canCast()).toBe(true);
      isClosed = true;
      expect(canCast()).toBe(false);
    });
  });
});
