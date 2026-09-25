# 🌓 AuraVote — The Turn: Idea Submission & Architectural Specification

**Phase**: Level 3 (First Quarter) — Idea Submission ("The Turn")  
**Project Name**: AuraVote  
**Track**: Privacy-Preserving Applications on Midnight  
**Selected Problem Statement**: **Private Voting — anonymous ballots with publicly verifiable tallies**  
**Live Preprod Contract**: `027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934`  
**Explorer Link**: [https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934](https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934)  
**GitHub Repository**: [https://github.com/Pranjal-debug/AuraVote](https://github.com/Pranjal-debug/AuraVote)  
**Walkthrough Demo Video**: [`docs/media/auravote-demo.webp`](./docs/media/auravote-demo.webp)  

---

## 1. Executive Summary & Problem Statement

Decentralized governance in Web3 suffers from a fundamental paradox: **total ledger transparency destroys democratic integrity**.

In existing DAOs on transparent blockchains (Ethereum, Cardano, Solana):
1. **Voter Intimidation & Retaliation**: Every vote cast is publicly traceable to a wallet address. Delegates and individual voters face social harassment, commercial blacklisting, and protocol retaliation based on their voting history.
2. **Vote-Buying & Bribery**: Because an observer can verify exactly who cast which vote, malicious actors can implement provable on-chain bribes and kickbacks.
3. **Herd Mentality & Early-Voter Bias**: Transparent real-time tallies cause late voters to blindly follow whales or top token holders rather than voting their true convictions.
4. **Physical & Financial Doxxing**: Public voting records connect real-world organizational decisions to the voter's entire financial ledger history.

### The Solution: AuraVote
**AuraVote** is a privacy-first, zero-knowledge voting protocol built in **Compact** on the **Midnight Network**. AuraVote combines:
- **Zero-Knowledge Membership Proofs**: Proving a voter belongs to an authorized voter registry without exposing their identity or leaf position.
- **Single-Use Cryptographic Nullifiers**: Preventing double-voting mathematically without revealing the underlying private key.
- **Verifiable Public Tallies**: Ensuring that every legitimate ballot is correctly incremented on-chain for 100% non-repudiation and transparency.

---

## 2. Midnight Dual-State Architectural Design

Midnight separates execution into an **off-chain private prover domain** and an **on-chain public consensus ledger**.

```
┌────────────────────────────────────────────────────────┐
│             OFF-CHAIN PRIVATE WITNESS DOMAIN           │
│           (Runs locally on voter's device)             │
│                                                        │
│  • voter_secret()      : 32-byte private key (NEVER LEAKS)│
│  • voter_randomness()  : Salt for voter commitment     │
│  • voter_choice()      : 0 (NO) or 1 (YES) ballot      │
│  • get_voter_path()    : Merkle membership path proof  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Zero-Knowledge Proof (ZKIR)
                           ▼
┌────────────────────────────────────────────────────────┐
│             ON-CHAIN PUBLIC LEDGER STATE               │
│               (Midnight Network Preprod)               │
│                                                        │
│  • electionId          : Identifies current ballot     │
│  • voterRegistry       : HistoricMerkleTree (Depth 10) │
│  • usedNullifiers      : Set<Bytes<32>> (1-person-1-vote)│
│  • yesVotes / noVotes  : Public tallied Counters       │
│  • totalBallots        : Total votes cast              │
│  • isClosed            : Election operational status   │
└────────────────────────────────────────────────────────┘
```

### Protocol Workflow:

1. **Voter Registration & Enrollment**:
   - The coordinator or voter derives an identity commitment off-chain:
     $$\text{commitment} = \text{persistentCommit}([\text{"auravote:voter:"}, \text{secret}], \text{randomness})$$
   - The commitment is inserted into the on-chain `HistoricMerkleTree`.
   - The voter's private `secret` and `randomness` never leave their local device.

2. **Zero-Knowledge Ballot Casting (`cast_vote`)**:
   - The voter selects their choice ($1$ for YES, $0$ for NO).
   - The local prover generates a Merkle membership proof demonstrating that $\text{commitment} \in \text{voterRegistry}$.
   - The circuit derives the election-specific nullifier:
     $$\text{nullifier} = \text{persistentHash}([\text{"auravote:nullifier:"}, \text{electionId}, \text{secret}])$$
   - The circuit verifies that $\text{nullifier} \notin \text{usedNullifiers}$.
   - The circuit asserts validity and invokes `disclose()` **only** on:
     - `disclose(nullifier)`: Added to `usedNullifiers` to consume voting eligibility.
     - `disclose(choice == 1)`: Increments `yesVotes` or `noVotes` counter.
   - The voter's secret, identity, and leaf position remain hidden in zero knowledge.

---

## 3. Comprehensive Privacy Analysis: What an Observer Learns vs. Cannot Learn

| Data Property | Can Ledger / Observer Learn? | Cryptographic Mechanism |
|---|:---:|---|
| **Voter Wallet Address** | ❌ **NEVER** | The transaction proof is evaluated locally; no sender identity is linked to the ballot. |
| **Voter Private Key / Secret** | ❌ **NEVER** | Supplied strictly as a private witness to the local WASM prover. |
| **Merkle Tree Leaf Index** | ❌ **NEVER** | Membership is proven in zero-knowledge using `merkleTreePathRoot(path)`. |
| **Cross-Election Linkage** | ❌ **NEVER** | Domain-separated hash includes `electionId`; nullifiers across different elections are completely uncorrelated. |
| **Ballot Validity** | ✅ **YES** | Verified mathematically by Midnight consensus nodes using Groth16 verification keys. |
| **Double-Voting Attempt** | ✅ **YES** | Duplicate nullifier causes atomic transaction revert on the ledger. |
| **Total Election Tallies** | ✅ **YES** | `yesVotes`, `noVotes`, and `totalBallots` counters increment transparently on-chain. |

---

## 4. Technical Deliverables & Production Hardening

### 1. Compact Smart Contract
- File: [`contract/auravote.compact`](./contract/auravote.compact)
- Language Version: `0.26` (Compiler `v0.34.0`)
- Exported Circuits: `cast_vote`, `register_voter`, `close_election`
- Prover & Verifier SNARK Keys: Fully compiled in [`contract/managed/auravote/keys/`](./contract/managed/auravote/keys/)

### 2. Automated Test Suite (16/16 Tests Passing)
- Unit & Protocol Tests: [`src/test/auravote.test.ts`](./src/test/auravote.test.ts) (9 tests)
- End-to-End Integration Tests: [`src/test/integration.test.ts`](./src/test/integration.test.ts) (7 tests)
- Total Passing: **16/16 passing tests** across ZK domain separation, nullifiers, witness isolation, and double-voting prevention.

### 3. Continuous Integration / Continuous Deployment (CI/CD)
- Workflow File: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
- Automated verification on every push and PR:
  - Toolchain installer validation
  - Compact circuit compilation
  - TypeScript strict typecheck (`npm run typecheck`)
  - Vitest test suite execution (`npm test`)
  - Production frontend bundle build (`npm run build:frontend`)

### 4. Interactive Frontend dApp
- UI Design: **Obsidian Cipher** design system built with Vite, Tailwind CSS, and Stitch.
- Wallet Integration: Full **Lace Wallet** connection on Midnight Preprod testnet with live DUST & tNIGHT balances.
- Client-Side ZK Prover: 4-stage interactive Groth16 synthesis execution with transaction receipts.

---

## 5. Mainnet Launch Roadmap (Levels 4 – 6)

1. **Level 4 — Waxing Gibbous (MVP Live)**:
   - Host public interface on Vercel / Netlify with custom domain.
   - Deploy multi-referendum coordination smart contracts.
   - Establish public X (Twitter) profile and developer documentation.
2. **Level 5 — Full Moon (Community Beta)**:
   - Onboard 50 Preprod beta users.
   - Collect user feedback on ZK proof generation latency and wallet signing UX.
   - Implement quadratic voting and multi-choice ballot extensions.
3. **Level 6 — Supermoon (Midnight Mainnet Launch)**:
   - Formal security audit of Compact circuits.
   - Deploy to Midnight Mainnet.
   - Onboard 20 real governance communities and DAOs.
