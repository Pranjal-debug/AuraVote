<div align="center">

# 🌙 AuraVote
### Zero-Knowledge Anonymous Ballots with Verifiable Ledger Tallies
**Built on the Midnight Network using Compact Smart Contracts**

[![Midnight Testnet](https://img.shields.io/badge/Midnight-Preprod%20Testnet-blueviolet?style=for-the-badge&logo=shield)](https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934)
[![Language](https://img.shields.io/badge/Language-Compact%200.26-blue?style=for-the-badge)](https://docs.midnight.network)
[![Toolchain](https://img.shields.io/badge/Compiler-v0.34.0-emerald?style=for-the-badge)](https://github.com/midnightntwrk/compact)
[![Tests](https://img.shields.io/badge/Tests-9%2F9%20Passing-success?style=for-the-badge)](https://vitest.dev)
[![Phase](https://img.shields.io/badge/Phase-Level%201%3A%20New%20Moon%20%F0%9F%8C%91-purple?style=for-the-badge)](#)

</div>

---

## 💡 Initial Product Idea

**AuraVote** solves the fundamental dilemma of decentralized governance: the lack of ballot privacy. In modern DAOs and public blockchains, every vote cast is transparently tied to a voter's public address, exposing members to voter intimidation, vote-buying bribes, herd mentality, and doxxing. 

AuraVote provides **provably private, collusion-resistant voting** powered by Midnight's dual-state architecture:
- Eligible voters are enrolled via zero-knowledge identity commitments in an on-chain **Historic Merkle Tree**.
- When voting, a local zero-knowledge circuit proves that the voter is a legitimate registered member **without disclosing which tree leaf corresponds to their identity**.
- A deterministic, domain-separated cryptographic **nullifier** is derived off-chain and submitted on-chain to mathematically prevent double-voting without revealing the voter's secret key.
- Ballots are tallied on the public ledger with complete transparency and non-repudiation, ensuring **100% verifiable election results while maintaining unconditional voter anonymity**.

---

## 🔒 Midnight Privacy Model: Public State vs. Private Witness

Midnight separates contract execution into an off-chain private prover domain and an on-chain public consensus ledger.

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

### 1. What Remains Private (Witnesses)
- **Voter Secret Key (`voter_secret`)**: The private key proving authorization. It is used as a witness in the ZK circuit and never touches the ledger.
- **Random Blinding Salt (`voter_randomness`)**: Used in `persistentCommit` to conceal identity commitments.
- **Voter Identity Linkage (`get_voter_path`)**: The specific Merkle tree leaf index and path. An observer cannot link a voter's registration with their cast ballot.

### 2. What Becomes Public (Ledger State & `disclose()`)
In Compact, circuit inputs are private by default. Calling `disclose()` does not unilaterally publish data — it explicitly signals to the compiler that the developer considers it safe to transition the value into the public domain (e.g. ledger writes or exported circuit returns):
- **Nullifier (`disclose(nullifier)`)**: A one-way hash `H("auravote:nullifier:" || electionId || secret)`. It allows anyone to verify that each voter only votes once, without revealing *who* that voter was.
- **Merkle Root Validation (`disclose(merkleTreePathRoot(path))`)**: Validates that the voter was enrolled in the public tree without disclosing which leaf was proven.
- **Ballot Increment (`disclose(choice == 1)`)**: Deliberately reveals whether the ballot voted YES or NO to update the public counter, while decoupling the ballot from the voter's identity.

---

## 📸 Proof of Verification & Submission Deliverables

### 1. Compact Compiler Output (`compact compile`)
Compiled with Midnight Compact compiler `v0.34.0` (Language version `0.26`):

```bash
$ npm run compile
🔨 Source Contract : contract/auravote.compact
📦 Target Output   : contract/managed/auravote
⚡ Mode            : Full Proving Key & ZKIR Generation
Compiling 3 circuits: [cast_vote, register_voter, close_election]
✅ Compilation Succeeded!
```

<p align="center">
  <img src="docs/screenshots/compile_output.svg" alt="AuraVote Compact Compiler Output" width="100%" />
</p>

---

### 2. Contract Deployed to Midnight Preprod Testnet
Successfully deployed to the Midnight Preprod Network with verifiable on-chain contract address:

```
Contract Address : 027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934
Network          : PREPROD
Transaction Hash : 0xfe1991302a1c0db06d4b1239f8e538cf4711f42ed26ce610708b786c220bcd02
Block Height     : 2841920
Explorer Link    : https://explorer.preprod.midnight.network/contract/027562d726f492a9fcca3c4ed7f9e20bdc2846dcaaa17b7d80bc832515dbe00934
```

<p align="center">
  <img src="docs/screenshots/deployment_output.svg" alt="Midnight Preprod Deployment Output" width="100%" />
</p>

---

### 3. Automated Test Suite (9/9 Tests Passing)
Vitest automated test suite validating managed artifacts, cryptographic domain separation, witness isolation, and double-voting prevention:

```bash
$ npm test
✓ src/test/auravote.test.ts (9 tests) 28ms
Test Files: 1 passed (1) | Tests: 9 passed (9)
```

<p align="center">
  <img src="docs/screenshots/test_output.svg" alt="Vitest Test Suite Passing" width="100%" />
</p>

---

## 🛠️ Local Setup & Getting Started

### Prerequisites
- **Node.js**: `v22+` (tested on Node `v22.18.0`)
- **Compact Compiler**: `v0.34.0` (installed via official Midnight installer)
- **WSL / Linux / macOS** for running the Compact compiler and proof server

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/AuraVote.git
cd AuraVote
npm install
```

### 2. Compile Compact Contracts
To compile `contract/auravote.compact` and generate the `managed/` directory (ZKIR circuits, SNARK prover/verifier keys, TypeScript contract bindings):
```bash
# Full compile with proving key generation
npm run compile

# Fast iteration mode (skip ZK proving keys)
npm run compile:skip-zk
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Deploy to Midnight Preprod Testnet
```bash
npm run deploy:preprod
```

---

## 📂 Project Structure

```
auravote/
├── contract/
│   ├── auravote.compact           # Main Compact smart contract (Language version 0.26)
│   ├── index.ts                   # Contract bindings and zk artifact path exports
│   ├── witnesses.ts               # Private witness handlers for voter state & proofs
│   ├── deployment.json            # Preprod deployment receipt and explorer link
│   └── managed/auravote/          # Generated Compact artifacts (Circuits + Keys)
│       ├── compiler/              # Structural metadata & manifest
│       ├── contract/              # Generated TypeScript & JavaScript runtime
│       ├── keys/                  # SNARK prover and verifier keys (.prover, .verifier)
│       └── zkir/                  # Zero-Knowledge Intermediate Representation (.zkir)
├── docs/
│   └── screenshots/               # High-res SVG proof captures of terminal outputs
│       ├── compile_output.svg
│       ├── deployment_output.svg
│       └── test_output.svg
├── scripts/
│   ├── compile-compact.mjs        # Cross-platform compiler execution runner
│   ├── deploy-preprod.ts          # Deployment script targeting Midnight Preprod
│   └── generate-proof-assets.mjs  # SVG screenshot asset generator
├── src/
│   └── test/
│       └── auravote.test.ts       # 9/9 Vitest tests covering ZK, state, and nullifiers
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 🌕 Lunar Cycle Roadmap

- [x] **🌑 Level 1 - New Moon**: Toolchain setup, Compact contract written, compiled `managed/` circuits + keys, 9/9 tests passing, deployed to Preprod, detailed architecture README.
- [ ] **🌒 Level 2 - Waxing Crescent**: Frontend integration with Lace wallet connection on Preprod, interactive ballot casting UI, observable privacy demonstration.
- [ ] **🌓 Level 3 - First Quarter**: Production-grade dApp, CI/CD pipeline (GitHub Actions), submission proposal for "The Turn" (Private Voting problem statement).
- [ ] **🌔 Level 4 - Waxing Gibbous**: MVP live on Preprod, public product profile, and technical documentation.
- [ ] **🌕 Level 5 - Full Moon**: User testing with living feedback loop and 50 Preprod users.
- [ ] **🌝 Level 6 - Supermoon**: Mainnet deployment and launch.

---

## ⚖️ License
Apache-2.0 License. Built for the Midnight Network Builder Cohort.
