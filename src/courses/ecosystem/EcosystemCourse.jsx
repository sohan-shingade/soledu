import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-python";

/* ===== MODULES DATA ===== */

const MODULES = [
  {
    id: "what-is-solana",
    num: "00",
    title: "What is Solana?",
    subtitle: "The blockchain that solved the clock problem",
    sections: [
      {
        type: "text",
        content: `**Solana** is a high-performance Layer 1 blockchain designed from the ground up to process thousands of transactions per second at sub-cent costs. Published in 2017 by Anatoly Yakovenko, a former Qualcomm engineer, the Solana whitepaper proposed a radical solution to blockchain's biggest bottleneck: agreeing on the order of events.\n\nBefore Solana, blockchains like Bitcoin and Ethereum required every node (computer in the network) to constantly message each other just to agree on what happened when. This messaging overhead — called **consensus overhead** — is what limited Ethereum to ~15 transactions per second. Solana's core insight was that if every node had a **cryptographic clock** that could independently prove the passage of time, most of that messaging could be eliminated.\n\nThe result: a blockchain that processes 3,600+ transactions per second in production, with ~400ms block times and fees under $0.01. As of 2026, Solana hosts $7B+ in DeFi TVL, $15B+ in stablecoin supply, and over 2,100 active applications.`
      },
      {
        type: "stats",
        items: [
          { label: "Block time", value: "~400ms" },
          { label: "Transaction fee", value: "<$0.01" },
          { label: "Sustained TPS", value: "3,600+" },
          { label: "DeFi TVL", value: "~$7B" },
          { label: "Stablecoin supply", value: "$15B+" },
          { label: "Active dApps", value: "2,100+" },
        ]
      },
      {
        type: "diagram",
        title: "How Solana compares",
        items: [
          { label: "Bitcoin", desc: "~7 TPS, 10-min blocks, $1-5 fees", color: "#EF9F27" },
          { label: "Ethereum", desc: "~15-30 TPS, 12s blocks, $2-50 fees", color: "#7F77DD" },
          { label: "Solana", desc: "3,600+ TPS, 400ms blocks, <$0.01 fees", color: "#5DCAA5" },
        ]
      },
      { type: "interactive", widget: "blockchain-race" },
      {
        type: "text",
        content: `This speed comes with a tradeoff: Solana validators require high-end hardware (256GB+ RAM, enterprise NVMe SSDs, 1Gbps+ bandwidth). This is a deliberate design choice — Solana scales with hardware improvements (Moore's Law), betting that server capabilities will continue to increase over time. The result is a blockchain optimized for high-frequency, low-cost applications: trading, payments, gaming, and decentralized physical infrastructure.`
      },
      {
        type: "quiz",
        question: "What is the core bottleneck Solana's design solves?",
        options: [
          "High energy consumption",
          "Consensus messaging overhead between nodes",
          "Limited programming languages",
          "Small block sizes",
        ],
        correct: 1,
        explanation: "Traditional blockchains require nodes to constantly exchange messages to agree on transaction ordering. Solana's Proof of History creates a cryptographic clock that lets each node independently verify timing, eliminating most of this messaging overhead."
      }
    ]
  },
  {
    id: "proof-of-history",
    num: "01",
    title: "Proof of History",
    subtitle: "A cryptographic clock for trustless time",
    sections: [
      {
        type: "text",
        content: `**Proof of History (PoH)** is a cryptographic technique that creates a verifiable record of time passing. It works by chaining SHA-256 hashes together in sequence — each hash takes the previous hash as input, creating a chain where every link proves it came after the one before it.\n\nA **hash function** (SHA-256) is a one-way mathematical function: feed it any data, and it produces a fixed-size "fingerprint." The same input always gives the same output, but there's no way to reverse it. PoH exploits this property — to produce hash #1000, a computer must first compute hashes #1 through #999. This means the sequence itself proves that real time elapsed.\n\nWhen a transaction arrives, it gets woven into the hash chain. This gives it an exact position in time relative to everything else — provably. No node needs to ask any other node "when did this happen?" because the answer is embedded in the math.`
      },
      {
        type: "code",
        title: "The PoH hash chain",
        language: "javascript",
        code: `// Proof of History: sequential SHA-256 hashing
// Each output becomes the next input

let state = hash("genesis_seed");      // Tick 0: a7f3...

state = SHA256(state);                 // Tick 1: b2e1...
state = SHA256(state);                 // Tick 2: c9d4...

// Transaction arrives — woven into the chain:
state = SHA256(state + transaction);   // Tick 3: d8a2... (tx is now timestamped)

state = SHA256(state);                 // Tick 4: e5f7...

// Key insight: Tick 4 could not exist without Ticks 0-3.
// The sequence IS the proof of time passing.

// Solana config:
// - Each tick = previous hash run through SHA-256 12,500 times
// - 64 ticks = 1 slot (~400ms of real wall-clock time)
// - 1 epoch = 432,000 slots (~2 days)`
      },
      { type: "interactive", widget: "hash-chain-explorer" },
      {
        type: "concepts",
        items: [
          { title: "Verifiable Delay Function (VDF)", body: "A function that takes a predictable amount of real time to compute but is quick to verify. PoH is effectively a VDF — producing the hash chain takes time (proving time passed), but verifying it is fast because verifiers can split the work across multiple cores.", icon: "⏱" },
          { title: "Tick", body: "One beat of the PoH clock. Each tick = the previous tick hashed 12,500 times via SHA-256. This is the smallest unit of time on Solana.", icon: "🔢" },
          { title: "Slot", body: "64 ticks = 1 slot. A slot is ~400ms and corresponds to one block. Each validator produces 4 consecutive slots when it is the 'leader.'", icon: "📦" },
          { title: "Epoch", body: "432,000 slots = 1 epoch (~2 days). Validator stake weights and the leader schedule are recalculated at epoch boundaries.", icon: "🔄" },
        ]
      },
      {
        type: "text",
        content: `PoH is not a consensus mechanism — it's a pre-consensus mechanism. It establishes ordering *before* validators vote, which dramatically reduces the amount of communication needed to reach agreement. Think of it as giving every node in the network a synchronized watch: when everyone agrees on the time, coordination becomes trivial.\n\nThis is why Solana can achieve sub-second finality. On Ethereum, validators need multiple rounds of voting to agree on block ordering. On Solana, PoH has already established the order — Tower BFT (the actual consensus mechanism) just needs to confirm it.`
      },
      {
        type: "quiz",
        question: "Why can't a malicious actor fake a PoH sequence?",
        options: [
          "The hashes are encrypted",
          "Producing hash N requires sequentially computing hashes 1 through N-1 (cannot be parallelized)",
          "The Solana Foundation controls the hash function",
          "PoH uses quantum-resistant cryptography",
        ],
        correct: 1,
        explanation: "SHA-256 hashing is inherently sequential — each hash depends on the previous one. To fake a sequence of 1 million hashes, an attacker would need to actually compute all 1 million hashes, which takes real time. This is what makes PoH a verifiable proof that time has passed."
      }
    ]
  },
  {
    id: "eight-innovations",
    num: "02",
    title: "The 8 Innovations",
    subtitle: "How Solana's architecture pipeline works",
    sections: [
      {
        type: "text",
        content: `Solana is not a single breakthrough — it's eight innovations working as a pipeline, each solving a different bottleneck. Together, they ensure that no single component becomes a chokepoint, much like a factory assembly line where different stations handle different tasks simultaneously.`
      },
      {
        type: "concepts",
        items: [
          { title: "Proof of History (PoH)", body: "A cryptographic clock that timestamps every event. Nodes agree on ordering without messaging each other. Covered in depth in Module 01.", icon: "01" },
          { title: "Tower BFT", body: "Solana's consensus algorithm — a variant of Practical Byzantine Fault Tolerance optimized for PoH. 'Byzantine Fault Tolerance' means the network can reach agreement even if up to 1/3 of participants are malicious. Tower BFT uses PoH as a shared clock, so validators vote on blocks with minimal back-and-forth. Votes have exponentially increasing lockout periods: the longer a validator has voted for a particular chain, the harder it is to switch — this is how finality is achieved.", icon: "02" },
          { title: "Gulf Stream", body: "A mempool-less transaction forwarding protocol. On Bitcoin and Ethereum, pending transactions sit in a 'mempool' (memory pool) waiting to be picked up by a block producer. Gulf Stream eliminates this waiting room by forwarding transactions directly to the next validator scheduled to produce a block. Result: reduced confirmation times and lower memory pressure.", icon: "03" },
          { title: "Turbine", body: "A block propagation protocol inspired by BitTorrent. Instead of one node sending the complete block to every other node, Turbine breaks blocks into small packets and distributes them across a tree of nodes. Each node shares its piece with peers, and the full block is reconstructed at every endpoint. Uses Reed-Solomon erasure coding so blocks can be rebuilt even if some packets are lost.", icon: "04" },
          { title: "Sealevel", body: "A parallel smart contract runtime — the first blockchain execution engine that can process thousands of transactions simultaneously. The key: every Solana transaction must declare upfront which accounts (data) it will read or write. The runtime analyzes these declarations and runs non-conflicting transactions across multiple CPU cores at the same time. Ethereum runs contracts sequentially (one at a time); Sealevel makes Solana multi-threaded.", icon: "05" },
          { title: "Pipelining", body: "A hardware optimization borrowed from CPU design. Transaction processing has four stages: (1) data fetching at the kernel level, (2) signature verification on the GPU, (3) banking/execution on the CPU, and (4) writing to the ledger at the kernel level. These four stages run simultaneously on different hardware, like an assembly line — while the GPU verifies signatures for transaction batch B, the CPU is executing batch A.", icon: "06" },
          { title: "Cloudbreak", body: "A custom-built accounts database optimized for concurrent reads and writes across SSDs. Solana stores all account state (token balances, program data, etc.) in this database. Cloudbreak uses memory-mapped files and supports the 32 concurrent threads that modern NVMe SSDs provide, allowing millions of accounts to be accessed in parallel without becoming a bottleneck.", icon: "07" },
          { title: "Archivers", body: "Lightweight storage nodes that keep historical blockchain data. The Solana ledger grows at 80-95 TB per year — too much for validators to store indefinitely. Archivers offload this burden, storing and serving old data so validators can focus on processing new transactions.", icon: "08" },
        ]
      },
      {
        type: "diagram",
        title: "Transaction pipeline flow",
        items: [
          { label: "Gulf Stream", desc: "Forwards tx to next leader (no mempool)", color: "#5DCAA5" },
          { label: "Proof of History", desc: "Leader timestamps and orders the tx", color: "#7F77DD" },
          { label: "Pipelining + Sealevel", desc: "4-stage assembly line + parallel execution", color: "#378ADD" },
          { label: "Cloudbreak", desc: "Reads/writes accounts across SSDs", color: "#EF9F27" },
          { label: "Turbine", desc: "Distributes block packets across network", color: "#D4537E" },
          { label: "Tower BFT", desc: "Validators vote — 2/3+ = finality", color: "#5DCAA5" },
        ]
      },
      { type: "interactive", widget: "innovation-pipeline" },
      {
        type: "stats",
        items: [
          { label: "Pipelining stages", value: "4" },
          { label: "Sealevel threads", value: "Thousands" },
          { label: "Turbine model", value: "BitTorrent" },
          { label: "Cloudbreak I/O", value: "32 threads" },
        ]
      },
      {
        type: "quiz",
        question: "What enables Sealevel to execute transactions in parallel?",
        options: [
          "Transactions are randomly assigned to cores",
          "Each transaction declares its account read/write set upfront",
          "Solana uses GPU-based execution",
          "Parallel execution is handled by Layer 2 networks",
        ],
        correct: 1,
        explanation: "Every Solana transaction must specify which accounts it will read from and write to. The Sealevel runtime analyzes these declarations and identifies which transactions don't conflict (don't touch the same writable accounts). Non-conflicting transactions can safely run at the same time across CPU cores."
      }
    ]
  },
  {
    id: "consensus-deep-dive",
    num: "03",
    title: "Consensus Deep Dive",
    subtitle: "PoH + Tower BFT — how Solana agrees on truth",
    sections: [
      {
        type: "text",
        content: `Consensus is the most fundamental problem in distributed systems: how do independent computers agree on a single version of truth without trusting each other?\n\nIn traditional networks, consensus requires rounds of messaging — every node must talk to every other node. With 100 nodes, that's 10,000 messages per round. This is why Bitcoin processes 7 transactions per second and Ethereum manages 15-30.\n\nSolana breaks this barrier with two interlocking mechanisms: **Proof of History (PoH)** provides a shared clock so nodes don't need to negotiate timing, and **Tower BFT** provides finality through exponentially increasing commitment. Together, they achieve consensus with a fraction of the communication overhead.`
      },
      {
        type: "text",
        content: `**Proof of History in depth.** PoH is a sequential SHA-256 hash chain where each output becomes the next input: hash(hash(hash(...))). This chain runs continuously on the leader validator, producing a verifiable record of elapsed time.\n\nThe critical property: producing hash N requires computing hashes 1 through N-1. There is no shortcut. But *verifying* the chain can be parallelized — split it into segments and check each on a different core. This asymmetry is the breakthrough: creating the timeline is sequential (proves time passed), verifying it is parallel (fast to confirm).\n\nWhen a transaction arrives, the leader inserts it into the hash chain at a specific position. That position is its timestamp — provable, unforgeable, and precise to within nanoseconds. No other node needs to be consulted.`
      },
      { type: "interactive", widget: "poh-chain-builder" },
      {
        type: "text",
        content: `**Tower BFT in depth.** Tower BFT is Solana's consensus mechanism — a variant of Practical Byzantine Fault Tolerance (PBFT) optimized to use PoH as a clock source.\n\nHere is how it works: validators vote on blocks. Each vote has an associated **lockout period** that doubles with each consecutive vote on the same fork. After 1 vote: locked for 2 slots. After 2 votes: locked for 4 slots. After 3: 8 slots. After 32 consecutive votes: locked for 2^32 slots (roughly 54 years) — effectively permanent commitment.\n\nThis exponential lockout is how finality emerges. A validator who has voted for the same fork 32 times in a row has essentially made an irreversible commitment. When 2/3+ of stake reaches this level of commitment, the block is finalized.\n\nThe PoH clock eliminates the need for timeout-based voting rounds that plague traditional BFT. Validators can cast votes asynchronously — they just need to reference the PoH slot number. This means Tower BFT achieves finality in ~400ms instead of the seconds or minutes required by classical consensus.`
      },
      { type: "interactive", widget: "tower-bft-simulator" },
      {
        type: "text",
        content: `**PoH + Tower BFT combined.** The two mechanisms serve complementary roles:\n\n• PoH provides **ordering** — a provable sequence of events that all validators can independently verify\n• Tower BFT provides **finality** — economic commitment from validators that the ordering is correct\n\nWithout PoH, Tower BFT would need expensive message-passing to agree on ordering. Without Tower BFT, PoH would provide ordering but no guarantee that validators agree on it. Together, they achieve both with minimal communication overhead.`
      },
      { type: "interactive", widget: "consensus-race" },
      {
        type: "stats",
        items: [
          { label: "Finality time", value: "~400ms" },
          { label: "Vote lockout growth", value: "2x per vote" },
          { label: "Max lockout", value: "2^32 slots" },
          { label: "Fault tolerance", value: "1/3 Byzantine" },
        ]
      },
      {
        type: "quiz",
        question: "What happens to a validator's lockout period after 5 consecutive votes for the same fork?",
        options: [
          "Lockout stays at 2 slots",
          "Lockout increases to 32 slots (2^5)",
          "Lockout resets to 0",
          "The validator is ejected from consensus",
        ],
        correct: 1,
        explanation: "Each consecutive vote on the same fork doubles the lockout period. After 5 votes: 2^5 = 32 slots. This exponential growth is how Tower BFT achieves finality — after ~32 votes, the lockout is so long that switching forks becomes effectively impossible."
      }
    ]
  },
  {
    id: "performance-deep-dive",
    num: "04",
    title: "Performance Deep Dive",
    subtitle: "Gulf Stream, Turbine, and Pipelining",
    sections: [
      {
        type: "text",
        content: `Solana's three performance innovations solve three different bottlenecks:\n\n• **Gulf Stream** eliminates the mempool, so transactions don't wait in a queue\n• **Turbine** solves block propagation, so new blocks reach the entire network in milliseconds\n• **Pipelining** maximizes hardware utilization, so the CPU, GPU, and kernel work simultaneously\n\nTogether, they form a performance trinity that turns raw hardware speed into blockchain throughput.`
      },
      {
        type: "text",
        content: `**Gulf Stream — mempool-less transaction forwarding.** On Ethereum, when you submit a transaction, it enters a "mempool" — a waiting room shared across the network. Miners pick transactions from this pool, prioritizing those with higher gas fees. This creates congestion, front-running opportunities, and wasted bandwidth as the same pending transactions get relayed between thousands of nodes.\n\nGulf Stream eliminates this entirely. Transactions are forwarded directly to the current and next few scheduled leaders. Since the leader schedule is known in advance (up to 2 epochs ahead), RPC nodes and validators can route transactions to the right place immediately. No waiting room, no gossip, no redundant propagation.`
      },
      { type: "interactive", widget: "gulf-stream" },
      {
        type: "text",
        content: `**Turbine — BitTorrent-inspired block propagation.** When a leader produces a block, it needs to reach all ~2,000 validators as fast as possible. Naively sending the full block to each validator would require enormous bandwidth (blocks can be several MB).\n\nTurbine solves this by breaking blocks into small packets called "shreds" (typically 1,280 bytes each) and organizing validators into a tree structure of "neighborhoods." The leader sends shreds to the first neighborhood layer, those nodes forward to the second layer, and so on. Each node only needs to send data to a handful of peers, but the entire network receives the block in log(N) hops.\n\nReed-Solomon erasure coding adds resilience: the leader generates extra "recovery" shreds so that any sufficiently large subset of shreds can reconstruct the original block. This means even if 30%+ of shreds are lost in transit, the block still arrives intact.`
      },
      { type: "interactive", widget: "turbine-propagation" },
      {
        type: "text",
        content: `**Pipelining — assembly-line transaction processing.** Modern hardware has specialized components: network cards fetch data, GPUs verify cryptographic signatures, CPUs execute program logic, and NVMe drives write to storage. Most blockchains use these resources sequentially — fetch, then verify, then execute, then write.\n\nSolana pipelines these stages so they overlap. While the CPU executes batch A, the GPU is already verifying batch B's signatures, and the network card is fetching batch C. This 4-stage pipeline multiplies throughput by up to 4x without needing faster hardware — just better utilization of existing hardware.`
      },
      { type: "interactive", widget: "pipeline-animator" },
      {
        type: "stats",
        items: [
          { label: "Turbine shred size", value: "1,280 bytes" },
          { label: "Propagation hops", value: "log(N)" },
          { label: "Pipeline stages", value: "4" },
          { label: "Gulf Stream lookahead", value: "2 epochs" },
        ]
      },
      {
        type: "quiz",
        question: "Why does Turbine use Reed-Solomon erasure coding?",
        options: [
          "To compress blocks for faster transmission",
          "To encrypt block data for privacy",
          "To reconstruct blocks even if some shreds are lost in transit",
          "To verify the leader's identity",
        ],
        correct: 2,
        explanation: "Reed-Solomon erasure coding generates redundant 'recovery' shreds alongside the original data shreds. If some shreds are lost during network propagation (packet loss), any sufficiently large subset of received shreds can reconstruct the full original block. This makes Turbine resilient to unreliable network conditions."
      }
    ]
  },
  {
    id: "execution-deep-dive",
    num: "05",
    title: "Execution Deep Dive",
    subtitle: "Sealevel + Cloudbreak — parallel everything",
    sections: [
      {
        type: "text",
        content: `Solana's execution layer is where all the performance innovations converge into actual transaction processing. Two innovations handle this:\n\n• **Sealevel** is the parallel runtime that executes smart contracts across multiple CPU cores simultaneously\n• **Cloudbreak** is the accounts database that supports the concurrent reads and writes Sealevel demands\n\nTogether, they allow Solana to process thousands of transactions per second on a single machine — no sharding, no Layer 2s, no rollups needed.`
      },
      {
        type: "text",
        content: `**Sealevel — parallel smart contract execution.** Every Solana transaction must declare upfront which accounts it will read and which it will write. This is not optional — it's enforced by the runtime.\n\nWhy? Because this declaration lets Sealevel build a dependency graph. If Transaction A writes to Account X and Transaction B writes to Account Y (different accounts), they can run in parallel on different CPU cores. If both write to Account X, they must run sequentially.\n\nThis is fundamentally different from Ethereum's EVM, which executes transactions one at a time because it can't know in advance which storage slots a contract will touch. Sealevel knows before execution begins, so it can schedule parallel execution safely.\n\nThe result: throughput scales with CPU cores. A 16-core machine runs 16x the work of a single core (for non-conflicting transactions). As hardware improves, Solana gets faster automatically.`
      },
      { type: "interactive", widget: "sealevel-parallel" },
      {
        type: "text",
        content: `**Cloudbreak — concurrent accounts database.** Sealevel can execute thousands of transactions in parallel, but they all need to read and write account data. If the database becomes a bottleneck, parallelism is wasted.\n\nCloudbreak is a custom-built accounts database using memory-mapped files. It's designed to support 32 concurrent I/O threads — matching the capabilities of modern NVMe SSDs. Account data is organized so that concurrent reads and writes to different accounts don't create lock contention.\n\nThe database also implements a "copy-on-write" approach: when a transaction modifies an account, the change is written to a new location rather than overwriting the original. This means reads and writes can happen simultaneously without locks, and the database can cleanly roll back failed transactions.`
      },
      { type: "interactive", widget: "cloudbreak-io" },
      {
        type: "stats",
        items: [
          { label: "Concurrent I/O threads", value: "32" },
          { label: "Account storage", value: "Memory-mapped" },
          { label: "Scaling model", value: "Linear with cores" },
          { label: "Accounts DB size", value: "~500GB+" },
        ]
      },
      {
        type: "quiz",
        question: "What must a Solana transaction declare upfront to enable parallel execution?",
        options: [
          "The amount of SOL it will spend",
          "The compute units it will consume",
          "Which accounts it will read from and write to",
          "Which validator should process it",
        ],
        correct: 2,
        explanation: "Every Solana transaction must specify its account read/write set before execution. Sealevel uses these declarations to identify non-conflicting transactions that can safely run in parallel across CPU cores. This upfront declaration is what makes Solana's parallel execution model possible."
      }
    ]
  },
  {
    id: "tx-lifecycle",
    num: "06",
    title: "Transaction Lifecycle",
    subtitle: "From wallet to finality in 400 milliseconds",
    sections: [
      {
        type: "text",
        content: `This module traces the complete lifecycle of a single transaction — from the moment a user taps "swap" in their wallet to the point it becomes irreversible on the blockchain. Understanding this flow is essential for developers, traders, and anyone building on Solana.`
      },
      {
        type: "diagram",
        title: "Lifecycle of a SOL/USDC swap",
        items: [
          { label: "User signs tx", desc: "Phantom wallet creates and signs a swap instruction", color: "#5DCAA5" },
          { label: "RPC provider", desc: "Helius/QuickNode forwards tx to the network via QUIC", color: "#7F77DD" },
          { label: "Gulf Stream", desc: "Routes tx directly to current leader validator", color: "#EF9F27" },
          { label: "PoH sequencing", desc: "Leader weaves tx into the hash chain with a timestamp", color: "#D4537E" },
          { label: "Sealevel execution", desc: "Swap program executes in parallel with non-conflicting txs", color: "#378ADD" },
          { label: "Turbine propagation", desc: "Block packets distributed to all validators", color: "#5DCAA5" },
          { label: "Tower BFT finality", desc: "Supermajority (2/3+) of stake votes to confirm", color: "#E24B4A" },
        ]
      },
      {
        type: "code",
        title: "Anatomy of a Solana transaction",
        language: "javascript",
        code: `// Every Solana transaction contains:
const transaction = {
  // 1. Recent blockhash — prevents replay attacks
  //    (tx expires if not included within ~60 seconds)
  recentBlockhash: "EzV5B3...",

  // 2. Fee payer — the account paying the transaction fee
  feePayer: "8xK4...",  // ~$0.001 in SOL

  // 3. Instructions — the actual operations to execute
  instructions: [
    {
      programId: "JUP6...",       // Jupiter program address
      keys: [
        { pubkey: "user_wallet", isSigner: true, isWritable: true },
        { pubkey: "sol_account",  isSigner: false, isWritable: true },
        { pubkey: "usdc_account", isSigner: false, isWritable: true },
        { pubkey: "raydium_pool", isSigner: false, isWritable: true },
        // ... more accounts
      ],
      data: Buffer.from("..."),   // Encoded swap parameters
    }
  ],

  // 4. Signatures — proves the fee payer authorized this
  signatures: ["3nK8..."]
};

// KEY INSIGHT: The "keys" array is what Sealevel uses
// to determine parallel execution. If two transactions
// don't share any writable accounts, they run simultaneously.`
      },
      {
        type: "concepts",
        items: [
          { title: "QUIC protocol", body: "Solana replaced UDP with QUIC (a Google-designed transport protocol) for transaction submission in 2022. QUIC provides built-in congestion control, encryption, and stream multiplexing. This fixed the network spam issues that caused outages in 2021-2022 by allowing validators to rate-limit incoming connections.", icon: "🔌" },
          { title: "Stake-weighted QoS (SWQoS)", body: "Transactions from staked connections get priority in the QUIC pipeline. If a transaction comes from an RPC provider that has staked SOL, it gets processed before unstaked connections. This creates an economic prioritization layer — important for MEV bots and high-frequency applications.", icon: "⚖️" },
          { title: "Compute units", body: "Every instruction consumes 'compute units' (CU) — Solana's measure of computational work. A simple transfer uses ~300 CU. A complex DeFi swap might use 200,000 CU. The max per transaction is 1,400,000 CU. Priority fees are priced per CU, creating a micro-fee-market within each block.", icon: "⚡" },
        ]
      },
      { type: "interactive", widget: "tx-journey" },
      {
        type: "stats",
        items: [
          { label: "Tx lifetime", value: "~60s" },
          { label: "Time to finality", value: "~400ms" },
          { label: "Max CU/tx", value: "1,400,000" },
          { label: "Base fee", value: "5,000 lamports" },
          { label: "Priority fee", value: "Variable" },
        ]
      },
      {
        type: "quiz",
        question: "Why must Solana transactions declare their account access upfront?",
        options: [
          "For billing purposes",
          "To enable Sealevel's parallel execution engine",
          "To prevent double-spending",
          "It's a Rust language requirement",
        ],
        correct: 1,
        explanation: "By declaring which accounts each transaction reads and writes, Sealevel can identify non-conflicting transactions and run them simultaneously across CPU cores. Without this declaration, the runtime would have to execute everything sequentially (like Ethereum) to avoid conflicts."
      }
    ]
  },
  {
    id: "network-infra",
    num: "07",
    title: "Network Infrastructure",
    subtitle: "Validators, RPC, MEV, and consensus upgrades",
    sections: [
      {
        type: "text",
        content: `The network infrastructure layer is Solana's foundation — the hardware, software, and protocols that produce blocks, reach consensus, and serve data to every application above. Understanding this layer reveals why Solana performs the way it does and what's changing in 2026.`
      },
      {
        type: "infra-stack",
        layers: [
          {
            name: "Validator clients",
            tier: "Block production",
            items: [
              { name: "Agave (Anza)", desc: "Maintained by Anza (formerly Solana Labs). The original reference client, written in Rust. Most validators run this.", cost: "Default" },
              { name: "Firedancer (Jump Crypto)", desc: "Written from scratch in C by Jump Crypto. Targets 1M+ TPS. Fully operational on mainnet.", cost: "Production" },
              { name: "Jito-Solana", desc: "Fork of Agave with MEV infrastructure — includes block engine integration and bundle processing.", cost: "92% adoption" },
              { name: "Sig (Syndica)", desc: "Written in Zig. Focused on deterministic builds and auditability. Still maturing.", cost: "Development" },
            ]
          },
          {
            name: "RPC providers",
            tier: "Data access",
            items: [
              { name: "Helius", desc: "Solana-native. Provides RPC, webhooks, DAS API, and the most popular developer tools.", cost: "Free tier" },
              { name: "QuickNode", desc: "Multi-chain provider with Solana support. Enterprise-grade SLAs.", cost: "$49+/mo" },
              { name: "Triton (RPC Pool)", desc: "Runs dedicated bare-metal infrastructure. Popular with MEV teams for low latency.", cost: "Paid" },
              { name: "Alchemy", desc: "Multi-chain provider. Solana support with enhanced APIs.", cost: "Free tier" },
            ]
          },
          {
            name: "MEV infrastructure",
            tier: "Transaction ordering",
            items: [
              { name: "Jito Block Engine", desc: "Receives bundles from searchers, runs sealed-bid auction, forwards winning bundles to validators.", cost: "Free (tips)" },
              { name: "Jito BAM", desc: "Next-gen: uses Trusted Execution Environments (TEEs) for encrypted mempool. Prevents sandwich attacks.", cost: "2026 rollout" },
            ]
          },
          {
            name: "Consensus upgrades",
            tier: "Protocol evolution",
            items: [
              { name: "Alpenglow", desc: "Next-generation consensus protocol. Stabilizes block production under heavy load. Approved by 98% validator vote.", cost: "In development" },
              { name: "IBRL", desc: "Umbrella initiative for bandwidth, scheduler, and latency improvements across the stack.", cost: "Ongoing" },
              { name: "DoubleZero", desc: "Dedicated fiber-optic network connecting major validators, bypassing public internet.", cost: "Infrastructure" },
            ]
          }
        ]
      },
      { type: "interactive", widget: "validator-network" },
      { type: "interactive", widget: "swqos-simulator" },
      {
        type: "text",
        content: `**Why client diversity matters:** If every validator runs the same software and that software has a bug, the entire network halts — this happened multiple times in 2021-2022. With Firedancer (C), Agave (Rust), and Sig (Zig) all producing valid blocks, a bug in one client doesn't affect the others. This is the same principle that makes airline safety work: redundant, independent systems. Firedancer's full mainnet deployment in 2025-2026 was a major milestone for Solana's operational resilience.`
      },
      {
        type: "quiz",
        question: "Why is Jito-Solana running on 92%+ of staked validators significant for MEV?",
        options: [
          "It means Jito controls Solana",
          "It means Jito bundles have near-guaranteed inclusion regardless of which validator is the current leader",
          "It reduces transaction fees",
          "It makes Solana faster",
        ],
        correct: 1,
        explanation: "Because 92%+ of stake runs Jito-Solana, any bundle submitted via the Jito block engine has a >92% chance of reaching a Jito-enabled leader in any given slot. This near-universal coverage is what makes Jito bundles the dominant transaction submission mechanism for MEV searchers and increasingly for regular applications that want atomic execution guarantees."
      }
    ]
  },
  {
    id: "core-protocols",
    num: "08",
    title: "Core Protocols & Middleware",
    subtitle: "Oracles, bridges, indexers, and developer tools",
    sections: [
      {
        type: "text",
        content: `Between the raw blockchain infrastructure and the applications users interact with sits a critical middleware layer: oracles that feed real-world data into smart contracts, bridges that connect Solana to other blockchains, indexers that make on-chain data searchable, and developer tools that make building possible. Every DeFi protocol, wallet, and dApp depends on this layer.`
      },
      {
        type: "concepts",
        items: [
          { title: "Oracles", body: "Smart contracts cannot access the internet — they can only read data already on the blockchain. An oracle is a service that feeds external data (asset prices, sports scores, weather, etc.) into on-chain programs. On Solana, Pyth Network is the dominant oracle, sourcing price data directly from institutional trading firms (Jane Street, CTC, Two Sigma) and pushing updates every 400 milliseconds. Switchboard offers a more decentralized, community-operated alternative. Without oracles, lending protocols could not determine collateral values, perpetual exchanges could not settle trades, and prediction markets could not resolve outcomes.", icon: "\uD83D\uDCE1" },
          { title: "Bridges", body: "A bridge moves tokens between different blockchains. When bridging USDC from Ethereum to Solana, the bridge locks the tokens on Ethereum and mints equivalent tokens on Solana. Wormhole (backed by Jump Crypto) connects 30+ chains and is the most widely used. deBridge uses multi-validator verification for security. Axelar goes further, enabling cross-chain smart contract calls — a program on Solana can trigger an action on Ethereum. Bridges are how external capital enters the Solana ecosystem.", icon: "\uD83C\uDF09" },
          { title: "Indexers", body: "The raw blockchain is a firehose of data — billions of transactions, account updates, and state changes. An indexer reads this data and organizes it into searchable databases. When Birdeye shows a token's price chart, when Phantom displays NFT collections, or when a DeFi dashboard shows TVL — they're all querying indexed data. Helius DAS (Digital Asset Standard) is the most widely used API for Solana assets. Flipside and Dune provide analytics platforms for researchers.", icon: "\uD83D\uDD0D" },
          { title: "Developer tools", body: "Anchor is Solana's most popular development framework — it simplifies writing on-chain programs in Rust by providing macros that handle serialization, account validation, and error handling. The Solana SDK provides lower-level access for programs that need maximum performance. Metaplex defines the token standards used by all NFTs and digital assets on Solana. Squads provides multi-signature wallet infrastructure so teams can require multiple approvals for treasury operations.", icon: "🔧" },
        ]
      },
      {
        type: "supply-chain",
        actors: [
          { role: "Price source", desc: "Institutional trading firms (Jane Street, CTC, Two Sigma, Virtu) generate real-time market data from their trading operations.", incentive: "Earn PYTH token rewards for providing accurate data", tools: "Proprietary trading systems, direct market data feeds" },
          { role: "Oracle network (Pyth)", desc: "Aggregates prices from 90+ institutional sources, applies confidence-weighted median, publishes on-chain every 400ms.", incentive: "Network fees, governance token value", tools: "Pyth Hermes, Pythnet appchain, pull-based price feeds" },
          { role: "DeFi protocol", desc: "Consumes oracle prices to operate: calculate collateral ratios, settle perp funding rates, execute liquidations, price LP positions.", incentive: "Protocol revenue from fees", tools: "Pyth SDK, Switchboard feeds, on-chain CPI calls" },
          { role: "Indexer / frontend", desc: "Reads on-chain data, organizes it, and serves it to user-facing dashboards, wallets, and analytics tools.", incentive: "API subscription revenue", tools: "Helius DAS, gRPC streams, Geyser plugins" },
        ]
      },
      { type: "interactive", widget: "oracle-price-feed" },
      {
        type: "stats",
        items: [
          { label: "Pyth price sources", value: "90+" },
          { label: "Pyth update freq", value: "400ms" },
          { label: "Wormhole chains", value: "30+" },
          { label: "Helius daily calls", value: "Billions" },
        ]
      },
      {
        type: "quiz",
        question: "Why do DeFi protocols need oracles?",
        options: [
          "To generate random numbers",
          "Smart contracts cannot access the internet — oracles feed external price data on-chain",
          "To encrypt transactions",
          "To speed up block production",
        ],
        correct: 1,
        explanation: "Smart contracts are sandboxed — they can only read data that already exists on the blockchain. They have no ability to make HTTP requests or access external APIs. Oracles solve this by continuously publishing real-world data (prices, event outcomes, etc.) on-chain where contracts can read it. A lending protocol needs to know that SOL = $150 to determine if a position should be liquidated — only an oracle can provide this."
      }
    ]
  },
  {
    id: "defi-protocols",
    num: "09",
    title: "DeFi Protocols",
    subtitle: "DEXs, AMMs, order books, perps, and lending",
    sections: [
      {
        type: "text",
        content: `**Decentralized Finance (DeFi)** is the set of financial services — trading, lending, borrowing, derivatives — built as smart contracts on a blockchain. Unlike traditional finance where banks and brokers act as intermediaries, DeFi protocols execute automatically: no company holds user funds, no approval process, no business hours. Trades settle in under a second rather than T+2 days.\n\nSolana's DeFi ecosystem has grown to over $7 billion in TVL (Total Value Locked — the total value of assets deposited into protocols). Its sub-second finality and sub-cent fees make it competitive with centralized exchanges for the first time, attracting institutional players like Goldman Sachs ($108M in SOL holdings) and BlackRock ($550M BUIDL fund on Solana).`
      },
      {
        type: "protocol-table",
        protocols: [
          { name: "Jupiter", role: "DEX aggregator + DeFi superapp", tvl: "$3B", keyMetric: "95% aggregator share, >50% total DEX volume", differentiator: "Scans 10,000+ pairs across Raydium, Orca, Meteora, Phoenix. Also offers perps (100x leverage), lending, JupUSD stablecoin, prediction markets (Polymarket integration), and token launchpad (LFG).", color: "#5DCAA5" },
          { name: "Raydium", role: "AMM + liquidity hub", tvl: "$500M+", keyMetric: "$500B+ cumulative trading volume", differentiator: "Solana's primary AMM with concentrated liquidity pools. Integrates with order book infrastructure. Backbone of on-chain liquidity.", color: "#378ADD" },
          { name: "Drift Protocol", role: "Perpetuals + spot trading", tvl: "$494M", keyMetric: "$145B+ cumulative volume", differentiator: "Three-tier liquidity: JIT Dutch auction, decentralized order book (DLOB maintained by keeper bots), and vAMM backstop. Up to 10x leverage on 40+ perp markets. Sub-400ms execution.", color: "#7F77DD" },
          { name: "Kamino", role: "Lending + yield optimization", tvl: "$1B+", keyMetric: "$1B+ RWA market size", differentiator: "Automated yield vaults, institutional PRIME market with RWA collateral (Gauntlet manages ~$140M). Fixed-rate loans and borrowing against digital + real-world assets.", color: "#EF9F27" },
          { name: "Orca", role: "Concentrated liquidity AMM", tvl: "$300M+", keyMetric: "Whirlpools CLMM", differentiator: "Clean UX, concentrated liquidity pools (Whirlpools) where LPs can focus their capital in specific price ranges for higher fee capture.", color: "#D4537E" },
          { name: "Phoenix", role: "On-chain CLOB", tvl: "N/A", keyMetric: "Fully on-chain order book", differentiator: "Central limit order book running entirely on Solana. Used by professional market makers and HFT firms. Works like a traditional stock exchange but on-chain.", color: "#E24B4A" },
        ]
      },
      { type: "interactive", widget: "amm-vs-clob" },
      { type: "interactive", widget: "jupiter-router" },
      {
        type: "concepts",
        items: [
          { title: "AMM vs CLOB", body: "An AMM (Automated Market Maker) uses a mathematical formula and a pool of tokens — traders swap against the pool, and the price adjusts automatically. A CLOB (Central Limit Order Book) matches individual buy and sell orders directly, like the Nasdaq. Solana is fast enough to run both on-chain. AMMs are simpler (anyone can provide liquidity); CLOBs are more capital-efficient (professional market makers).", icon: "⚖️" },
          { title: "Composability", body: "The ability for protocols to interact with each other in a single transaction. A user can stake SOL (Jito), use the receipt token as collateral (Kamino), borrow USDC, swap it (Jupiter), and provide liquidity (Meteora) — all atomically. This 'money lego' composability is DeFi's superpower and is only practical on chains fast and cheap enough to support it.", icon: "🧱" },
          { title: "Liquidation", body: "When a borrower's collateral value drops below the required ratio, their position is automatically closed ('liquidated') by a bot that repays the debt and claims a bonus (typically 5-10% of the collateral). This mechanism protects lenders from bad debt and creates MEV opportunities for liquidation bots.", icon: "⚠️" },
        ]
      },
      {
        type: "text",
        content: `**Why Jupiter dominates:** Jupiter's 95% aggregator market share is not a monopoly — it's product-market fit. Competing DEXs actually *route through* Jupiter's APIs rather than trying to compete against its aggregation. When a user swaps on Raydium's own frontend, the swap often routes through Jupiter's smart routing to find a better price. Jupiter has evolved from a simple aggregator into what it calls a "DeFi superapp" — a unified platform where most of Solana's retail DeFi activity occurs.`
      },
      {
        type: "quiz",
        question: "What is 'composability' in DeFi?",
        options: [
          "The ability to write smart contracts in multiple languages",
          "The ability for protocols to interact with each other in a single atomic transaction",
          "The ability to run on multiple blockchains",
          "The ability to compose music on-chain",
        ],
        correct: 1,
        explanation: "Composability means DeFi protocols can call each other within a single transaction. Stake SOL → use the LST as collateral → borrow stables → swap → provide liquidity: five protocol interactions, one atomic transaction, sub-cent fees. This is only practical on chains with sub-second finality and near-zero fees."
      }
    ]
  },
  {
    id: "staking-yield",
    num: "10",
    title: "Staking & Yield",
    subtitle: "Liquid staking, LSTs, and the composability loop",
    sections: [
      {
        type: "text",
        content: `**Staking** is the act of locking up SOL tokens to help secure the Solana network. Validators — the computers that produce blocks and vote on consensus — require staked SOL to participate. In return, stakers earn rewards (~6-8% APY). This is Solana's security model: the more SOL staked, the more expensive it is for an attacker to gain enough stake to disrupt the network.\n\n**Liquid staking** solves the biggest problem with traditional staking: locked capital. Instead of SOL sitting idle while staked, liquid staking protocols issue a **Liquid Staking Token (LST)** — a receipt that represents staked SOL and continuously accrues rewards. This LST can be traded, used as collateral in lending protocols, or deposited into liquidity pools — all while still earning staking yield.`
      },
      {
        type: "protocol-table",
        protocols: [
          { name: "Jito", role: "Liquid staking + MEV redistribution", tvl: "$1.9B staked", keyMetric: "Largest LST on Solana", differentiator: "JitoSOL earns staking rewards PLUS a share of MEV tips extracted by Jito validators. JTO governance token controls validator selection and reward distribution.", color: "#5DCAA5" },
          { name: "Marinade Finance", role: "Liquid staking (OG)", tvl: "$1B+", keyMetric: "mSOL", differentiator: "First liquid staking protocol on Solana. Distributes stake across hundreds of validators for decentralization. mSOL is widely accepted as collateral.", color: "#378ADD" },
          { name: "Sanctum", role: "LST infrastructure", tvl: "N/A", keyMetric: "Powers custom LSTs", differentiator: "Provides the infrastructure for anyone to create their own LST. Jupiter, Bonk, Drift, and others all have branded LSTs powered by Sanctum. Also enables instant swaps between any LSTs.", color: "#7F77DD" },
          { name: "BlazeStake", role: "Community staking", tvl: "$100M+", keyMetric: "bSOL", differentiator: "Community-governed stake pool focused on supporting smaller validators and increasing Solana's decentralization.", color: "#EF9F27" },
        ]
      },
      {
        type: "diagram",
        title: "The composability loop",
        items: [
          { label: "Stake SOL", desc: "Deposit SOL into Jito, receive JitoSOL (earns ~7% APY)", color: "#5DCAA5" },
          { label: "Collateralize", desc: "Deposit JitoSOL into Kamino as collateral", color: "#378ADD" },
          { label: "Borrow", desc: "Borrow USDC against the collateral", color: "#7F77DD" },
          { label: "Swap", desc: "Jupiter routes USDC→SOL across Raydium, Orca, Meteora", color: "#EF9F27" },
          { label: "LP", desc: "Provide SOL/USDC liquidity on Meteora, earn trading fees", color: "#D4537E" },
          { label: "Loop", desc: "LP tokens can go back as collateral in step 2", color: "#E24B4A" },
        ]
      },
      { type: "interactive", widget: "lst-builder" },
      {
        type: "text",
        content: `This loop illustrates Solana DeFi's composability in action. Each step interacts with a different protocol, yet the entire sequence can execute in seconds for under $0.01 in total fees. The user earns staking yield (Jito), borrowing enables leverage, swap fees generate returns, and LP positions earn trading fees — all stacked.\n\n**Risk note:** This composability cuts both ways. If SOL price drops sharply, the JitoSOL collateral loses value, potentially triggering liquidation in Kamino. The LP position may suffer impermanent loss. Leveraged composability amplifies both returns and risks.`
      },
      {
        type: "quiz",
        question: "What makes Sanctum unique in the staking ecosystem?",
        options: [
          "It offers the highest staking yield",
          "It provides infrastructure for anyone to create custom LSTs",
          "It runs its own validator client",
          "It's a centralized exchange",
        ],
        correct: 1,
        explanation: "Sanctum is infrastructure, not a competing LST. It provides the technical rails for any project to create their own branded liquid staking token — Jupiter has jupSOL, Bonk has bonkSOL, Drift has driftSOL, all powered by Sanctum's infrastructure. Sanctum also enables instant swaps between any LSTs, creating a unified liquidity layer."
      }
    ]
  },
  {
    id: "stablecoins-rwa",
    num: "11",
    title: "Stablecoins & Real-World Assets",
    subtitle: "The $15 billion bridge between TradFi and DeFi",
    sections: [
      {
        type: "text",
        content: `**Stablecoins** — tokens pegged to $1.00 — are the base currency of all DeFi activity. Every trading pair, every loan, every payment on Solana flows through stablecoins. The network's stablecoin supply surpassed $15 billion in early 2026, with over $900 million added in a single 24-hour period during peak activity.\n\n**Real-World Assets (RWAs)** take this further: traditional financial instruments — US Treasuries, equities, gold, real estate — tokenized and brought on-chain. This lets anyone trade a fraction of a Treasury bond 24/7 on a DEX, or use tokenized BlackRock fund shares as collateral in a lending protocol.`
      },
      {
        type: "protocol-table",
        protocols: [
          { name: "USDC (Circle)", role: "Dollar-backed stablecoin", tvl: "~$10B on Solana", keyMetric: "Dominant stablecoin", differentiator: "Backed 1:1 by US dollars and short-term Treasuries in regulated accounts. Circle publishes monthly attestation reports. Native on Solana (not bridged).", color: "#378ADD" },
          { name: "USDT (Tether)", role: "Dollar-backed stablecoin", tvl: "$2B+", keyMetric: "Largest globally", differentiator: "Backed by reserves including Treasuries, commercial paper, and other assets. Largest stablecoin by global market cap.", color: "#5DCAA5" },
          { name: "PYUSD (PayPal)", role: "Dollar-backed stablecoin", tvl: "$445M+", keyMetric: "112% QoQ growth", differentiator: "PayPal's stablecoin, natively issued on Solana. Represents traditional fintech's direct integration with Solana DeFi.", color: "#7F77DD" },
          { name: "JupUSD (Jupiter)", role: "DeFi-native stablecoin", tvl: "Growing", keyMetric: "Backed by BlackRock assets", differentiator: "Launched January 2026. Provides a dollar-denominated liquidity layer within Jupiter's ecosystem. Represents DeFi protocols issuing their own stable assets.", color: "#EF9F27" },
          { name: "BlackRock BUIDL", role: "Tokenized money market fund", tvl: "$550M on Solana", keyMetric: "Institutional RWA", differentiator: "BlackRock's tokenized USD Institutional Digital Liquidity Fund. Represents the largest traditional asset manager's direct presence on Solana.", color: "#D4537E" },
          { name: "xStocks", role: "Tokenized equities", tvl: "Growing", keyMetric: "US stocks on-chain", differentiator: "Tokenizes US equities (Apple, Nvidia) backed 1:1 by real shares. Enables 24/7 trading of fractional stock positions on DEXs.", color: "#E24B4A" },
        ]
      },
      {
        type: "text",
        content: `**Why this matters:** Goldman Sachs disclosed $108M in direct SOL holdings. BlackRock's BUIDL fund cleared $550M on Solana. Citigroup completed a full trade finance lifecycle on-chain. A nationally chartered US bank opened native Solana deposits. This is not speculative interest — it's institutional infrastructure deployment. The total value of real-world assets on Solana (excluding stablecoins) surpassed $930 million by early 2026, reflecting deep trust from professional market participants.`
      },
      { type: "interactive", widget: "stablecoin-peg" },
      {
        type: "stats",
        items: [
          { label: "Total stablecoin supply", value: "$15B+" },
          { label: "USDC on Solana", value: "~$10B" },
          { label: "RWAs (excl. stables)", value: "$930M+" },
          { label: "Goldman SOL holdings", value: "$108M" },
          { label: "BlackRock BUIDL", value: "$550M" },
          { label: "PYUSD growth (Q3 '25)", value: "+112% QoQ" },
        ]
      },
      {
        type: "quiz",
        question: "Why are stablecoins considered the 'base currency' of DeFi?",
        options: [
          "They have the highest market cap",
          "Almost every trading pair, loan, and payment is denominated in stablecoins",
          "They were the first tokens created",
          "They are required by Solana's protocol",
        ],
        correct: 1,
        explanation: "Stablecoins provide the stable unit of account that DeFi needs to function. SOL/USDC is the dominant trading pair. Lending protocols denominate loans in USDC. Payments settle in stablecoins. Without a stable reference currency, DeFi would be impractical — every interaction would carry exchange rate risk."
      }
    ]
  },
  {
    id: "consumer-layer",
    num: "12",
    title: "Consumer Layer",
    subtitle: "Wallets, NFTs, launchpads, and payments",
    sections: [
      {
        type: "text",
        content: `The consumer layer is where users actually interact with Solana. Wallets are the entry point — the app where tokens are held, transactions approved, and dApps connected. NFT marketplaces handle digital collectibles and identity. Token launchpads are where new projects and memecoins are born. Payment systems bring Solana into real-world commerce. This layer drives the transaction volume and fee revenue that sustains the entire stack below it.`
      },
      {
        type: "concepts",
        items: [
          { title: "Phantom", body: "The dominant Solana wallet with built-in swaps, staking, NFT display, and prediction markets (via Kalshi). Available as browser extension, mobile app, and desktop. Phantom's integration with Jupiter means users can swap tokens without leaving the wallet. Prediction markets launched in 2025 for eligible users.", icon: "👻" },
          { title: "Backpack", body: "Wallet + exchange hybrid built by the Mad Lads NFT team. Focuses on a unified trading and self-custody experience. The xNFT (executable NFT) standard lets NFTs contain actual applications — a game, a DeFi dashboard, a social feed — all running inside the wallet.", icon: "🎒" },
          { title: "Magic Eden", body: "The #1 NFT marketplace, originally Solana-native, now cross-chain (Ethereum, Bitcoin Ordinals, Polygon). Offers instant listings, collection offers, rarity tools, and creator royalty enforcement. Processes the majority of Solana NFT volume.", icon: "✨" },
          { title: "Pump.fun", body: "The memecoin factory — a platform for one-click token creation and bonding-curve-based initial trading. Responsible for extraordinary transaction volume on Solana. While controversial, it has onboarded millions of users who first encounter Solana through memecoin trading and later discover the broader DeFi ecosystem.", icon: "🚀" },
        ]
      },
      {
        type: "text",
        content: `**The memecoin onboarding funnel:** Pump.fun and similar launchpads drive the majority of Solana's raw transaction count. While many dismiss memecoins, the data tells a different story: Solana's low fees and high speed make it uniquely suited for high-frequency speculative trading. Users who arrive to trade memecoins often create their first non-custodial wallet, learn to use DEXs, discover staking, and eventually explore the broader DeFi ecosystem. It's an unconventional but measurably effective user acquisition engine.`
      },
      { type: "interactive", widget: "wallet-tx-flow" },
      {
        type: "diagram",
        title: "Consumer entry points",
        items: [
          { label: "Wallet (Phantom)", desc: "Hold tokens, sign txs, connect to dApps", color: "#5DCAA5" },
          { label: "DEX (Jupiter)", desc: "Swap tokens, trade perps, provide liquidity", color: "#378ADD" },
          { label: "Launchpad (Pump.fun)", desc: "Create and trade new tokens", color: "#EF9F27" },
          { label: "NFT marketplace", desc: "Buy/sell digital collectibles", color: "#D4537E" },
          { label: "Payments", desc: "Merchant payments, cross-border transfers", color: "#7F77DD" },
        ]
      },
      {
        type: "quiz",
        question: "Why has Pump.fun been significant for Solana's growth despite being a memecoin platform?",
        options: [
          "It generates the most developer activity",
          "It drives enormous transaction volume and onboards millions of first-time users to non-custodial wallets",
          "It provides the most secure trading experience",
          "It replaced all other DEXs",
        ],
        correct: 1,
        explanation: "Pump.fun is one of the single largest drivers of Solana transaction volume and fee revenue. More importantly, it serves as an onboarding funnel: users create their first Phantom wallet, learn to approve transactions, interact with DEXs, and many eventually explore the broader ecosystem. The network effects from millions of new wallet creations benefit every layer of the stack."
      }
    ]
  },
  {
    id: "depin",
    num: "13",
    title: "DePIN",
    subtitle: "Decentralized physical infrastructure networks",
    sections: [
      {
        type: "text",
        content: `**DePIN (Decentralized Physical Infrastructure Networks)** represents one of the most tangible blockchain use cases: regular people deploy real-world hardware — 5G hotspots, GPUs, dashcams, weather sensors — and earn token rewards for providing service. Instead of one company (AT&T, Google, Amazon) owning all the infrastructure, thousands of independent operators contribute to a shared network coordinated by a blockchain.\n\nSolana has become the dominant chain for DePIN because of one economic reality: micropayments. A DePIN network might need to distribute tiny reward payments to 100,000 hardware operators daily. On Ethereum, where each transaction costs $2-50, this would be economically impossible. On Solana, where transactions cost less than $0.01, distributing 100,000 micropayments costs under $1,000 total.`
      },
      {
        type: "protocol-table",
        protocols: [
          { name: "Helium", role: "Decentralized wireless (5G/WiFi)", tvl: "Major", keyMetric: "Largest DePIN by coverage", differentiator: "Anyone can buy a Helium hotspot (~$500), deploy it, and earn HNT/MOBILE tokens for providing wireless coverage. Migrated from its own L1 to Solana in 2023 because running a proprietary chain was too costly.", color: "#5DCAA5" },
          { name: "Render Network", role: "Decentralized GPU rendering", tvl: "Major", keyMetric: "Used by studios and AI researchers", differentiator: "Connects artists and AI researchers who need GPU compute with operators who have spare GPU capacity. Uses Solana for job settlement, payment distribution, and reputation tracking. Recently migrated from Ethereum.", color: "#7F77DD" },
          { name: "Hivemapper", role: "Decentralized mapping", tvl: "Growing", keyMetric: "Crowdsourced alternative to Google Maps", differentiator: "Drivers install Hivemapper dashcams, drive normally, and earn HONEY tokens. The dashcam footage builds a continuously-updated, street-level map of the world. Coverage already spans major cities globally.", color: "#EF9F27" },
          { name: "io.net", role: "Decentralized compute", tvl: "Growing", keyMetric: "GPU aggregation network", differentiator: "Aggregates unused GPU capacity from data centers, crypto miners, and individuals. Provides on-demand compute for AI training and inference at lower costs than centralized cloud.", color: "#378ADD" },
          { name: "Geodnet", role: "Precision GPS data", tvl: "Growing", keyMetric: "Decentralized reference stations", differentiator: "Network of GPS reference stations providing centimeter-level positioning accuracy. Useful for autonomous vehicles, precision agriculture, and surveying.", color: "#D4537E" },
        ]
      },
      { type: "interactive", widget: "depin-mapper" },
      {
        type: "text",
        content: `**Why DePIN chose Solana:** Several major DePIN projects (Helium, Render, Geodnet) migrated from other chains or their own L1s to Solana. The common reasons: (1) sub-cent transaction fees make micropayment distribution viable, (2) high throughput handles millions of reward transactions per epoch, (3) Solana's existing DeFi ecosystem means reward tokens immediately have trading venues and liquidity, (4) compressed NFTs (cNFTs) allow mapping devices 1:1 to on-chain identities at negligible cost, and (5) the existing Solana wallet ecosystem (Phantom, Solflare) means users don't need to install special software.`
      },
      {
        type: "quiz",
        question: "Why is Solana's sub-cent transaction fee critical for DePIN networks?",
        options: [
          "It makes the tokens cheaper",
          "DePIN networks need to distribute thousands of micropayments daily to hardware operators, which is only economically viable with near-zero fees",
          "It allows faster hardware deployment",
          "It reduces the cost of the hardware itself",
        ],
        correct: 1,
        explanation: "A DePIN network like Helium has hundreds of thousands of hotspot operators who each need to receive small token rewards. If each payment transaction cost $5 (Ethereum), distributing to 100,000 operators would cost $500,000 per cycle — making the economics impossible. At $0.001 per transaction (Solana), the same distribution costs $100."
      }
    ]
  },
  {
    id: "ai-agents",
    num: "14",
    title: "AI Agents",
    subtitle: "Autonomous systems operating on-chain",
    sections: [
      {
        type: "text",
        content: `**AI agents** on Solana are autonomous software programs that can read blockchain state, make decisions, and execute transactions without human intervention. Unlike a traditional bot that follows pre-programmed rules, AI agents use language models and reasoning to navigate complex, multi-step DeFi strategies — managing DAO governance, executing trades, rebalancing portfolios, and negotiating yields across protocols 24/7.\n\nThis is an emerging category that gained significant momentum in early 2026. The Solana Foundation and Colosseum hosted an AI Agent Hackathon (February 2026) where human participants were forbidden from writing code — AI agents built the submissions. 454 projects were submitted across five tracks.`
      },
      {
        type: "concepts",
        items: [
          { title: "Why Solana for agents", body: "AI agents require continuous micropayment loops — pinging order books, checking prices, submitting transactions hundreds of times per day. On Ethereum, where each operation costs $2-50, running an agent is economically prohibitive. On Solana, an agent can execute thousands of operations daily for pennies. Sub-second finality also means agents can react to market changes in real time.", icon: "⚡" },
          { title: "Agent-ready infrastructure", body: "Realms (Solana's DAO governance platform) became agent-ready in 2026, allowing AI agents to manage governance workflows — submitting proposals, voting, and executing approved actions. Helius released a CLI tool enabling agents to programmatically generate and fund their own API keys. These infrastructure pieces make autonomous on-chain operation practical.", icon: "🔧" },
          { title: "AI x DeFi strategies", body: "Agents can orchestrate multi-protocol strategies that would be tedious for humans: monitoring lending rates across Kamino, MarginFi, and Jupiter Lend simultaneously, moving capital to the highest yield; detecting arbitrage between DEXs and executing atomically via Jito bundles; managing LP positions by adjusting tick ranges based on volatility forecasting.", icon: "🤖" },
        ]
      },
      {
        type: "stats",
        items: [
          { label: "AI Hackathon submissions", value: "454" },
          { label: "Hackathon prize pool", value: "$100K USDC" },
          { label: "Cost per operation", value: "<$0.001" },
          { label: "Agent response time", value: "~400ms" },
        ]
      },
      { type: "interactive", widget: "agent-loop" },
      {
        type: "text",
        content: `**The long-term picture:** As AI agents become more capable, Solana's architecture positions it as the natural execution layer for autonomous economic activity. A world where thousands of AI agents continuously optimize capital allocation, provide liquidity, manage risk, and coordinate resources requires a blockchain that can handle millions of micropayments per day at negligible cost. Solana's combination of speed, cost, and composability makes this economically viable in a way that isn't possible on higher-fee chains.`
      },
      {
        type: "quiz",
        question: "What makes Solana's fee structure uniquely suited for AI agents?",
        options: [
          "AI agents get special fee discounts on Solana",
          "Agents require continuous micropayment loops (thousands of txs/day) that are only economically viable at sub-cent fees",
          "Solana has built-in AI capabilities",
          "AI agents don't pay fees on Solana",
        ],
        correct: 1,
        explanation: "An AI agent that monitors prices, checks lending rates, and rebalances positions might execute hundreds or thousands of transactions per day. At $0.001 per transaction on Solana, this costs cents. On Ethereum at $5+ per transaction, the same activity would cost thousands of dollars daily — making most agent-based strategies economically unviable."
      }
    ]
  },
  {
    id: "how-it-connects",
    num: "15",
    title: "How It All Connects",
    subtitle: "The complete ecosystem map and value flows",
    sections: [
      {
        type: "text",
        content: `This final module synthesizes everything from the course into a unified view of the Solana ecosystem. The key insight: Solana is not a collection of isolated protocols — it's a deeply composable system where every layer depends on and feeds into the others.`
      },
      {
        type: "ecosystem-layer",
        layers: [
          {
            layer: "Network Infrastructure (Layer 0)",
            roles: [
              { name: "Validator clients", desc: "Produce blocks, reach consensus", players: ["Agave", "Firedancer", "Jito-Solana", "Sig"] },
              { name: "RPC providers", desc: "API gateways for apps to access chain", players: ["Helius", "QuickNode", "Triton", "Alchemy"] },
              { name: "MEV infrastructure", desc: "Transaction ordering, bundle auctions", players: ["Jito Block Engine", "Jito BAM"] },
              { name: "Consensus upgrades", desc: "Protocol improvements", players: ["Alpenglow", "IBRL", "DoubleZero"] },
            ]
          },
          {
            layer: "Middleware (Layer 1)",
            roles: [
              { name: "Oracles", desc: "Real-world price data", players: ["Pyth Network", "Switchboard"] },
              { name: "Bridges", desc: "Cross-chain token transfers", players: ["Wormhole", "deBridge", "Axelar", "LayerZero"] },
              { name: "Indexers", desc: "Searchable blockchain data", players: ["Helius DAS", "Birdeye", "Flipside", "Dune"] },
              { name: "Developer tools", desc: "SDKs, frameworks", players: ["Anchor", "Solana SDK", "Metaplex", "Squads"] },
            ]
          },
          {
            layer: "DeFi (Layer 2)",
            roles: [
              { name: "DEX aggregator", desc: "Best-price routing", players: ["Jupiter"] },
              { name: "AMMs", desc: "Liquidity pools", players: ["Raydium", "Orca", "Meteora", "Lifinity"] },
              { name: "Order books", desc: "Professional trading", players: ["Phoenix", "OpenBook"] },
              { name: "Perpetuals", desc: "Leveraged derivatives", players: ["Drift", "Jupiter Perps", "Zeta Markets"] },
              { name: "Lending", desc: "Borrow/lend with collateral", players: ["Kamino", "MarginFi", "Save", "Jupiter Lend"] },
            ]
          },
          {
            layer: "Staking & Yield (Layer 3)",
            roles: [
              { name: "Liquid staking", desc: "Stake SOL, get tradable LST", players: ["Jito", "Marinade", "Sanctum", "BlazeStake"] },
              { name: "Yield optimization", desc: "Automated strategies", players: ["Kamino vaults", "Gauntlet"] },
            ]
          },
          {
            layer: "Stablecoins & RWAs (Layer 4)",
            roles: [
              { name: "Stablecoins", desc: "Dollar-pegged tokens", players: ["USDC", "USDT", "PYUSD", "JupUSD"] },
              { name: "Real-world assets", desc: "Tokenized TradFi instruments", players: ["BlackRock BUIDL", "Ondo", "xStocks"] },
            ]
          },
          {
            layer: "Consumer (Layer 5)",
            roles: [
              { name: "Wallets", desc: "User entry point", players: ["Phantom", "Backpack", "Solflare"] },
              { name: "NFTs", desc: "Digital collectibles", players: ["Magic Eden", "Tensor", "Metaplex"] },
              { name: "Launchpads", desc: "New token creation", players: ["Pump.fun", "Jupiter LFG", "Moonshot"] },
              { name: "Payments", desc: "Commerce and transfers", players: ["Solana Pay", "Stripe", "Tiplink"] },
            ]
          },
          {
            layer: "DePIN (Layer 6)",
            roles: [
              { name: "Wireless", desc: "Decentralized telecom", players: ["Helium", "Helium Mobile"] },
              { name: "Compute", desc: "GPU networks", players: ["Render", "io.net", "Nosana"] },
              { name: "Mapping", desc: "Crowdsourced data", players: ["Hivemapper", "Geodnet"] },
            ]
          },
          {
            layer: "AI Agents (Layer 7)",
            roles: [
              { name: "Agent frameworks", desc: "Autonomous on-chain operations", players: ["Realms", "Helius AI CLI", "ElizaOS"] },
              { name: "AI x DeFi", desc: "Automated financial strategies", players: ["Griffain", "Autonomous MMs"] },
            ]
          },
        ]
      },
      {
        type: "diagram",
        title: "Value flows between layers",
        items: [
          { label: "Users (wallets)", desc: "Enter via Phantom, Backpack. Create transactions.", color: "#5DCAA5" },
          { label: "RPC + validators", desc: "Process and finalize transactions (~400ms)", color: "#7F77DD" },
          { label: "Oracles + bridges", desc: "Feed prices, bring external capital", color: "#378ADD" },
          { label: "DeFi + staking", desc: "Trading, lending, yield (composable)", color: "#EF9F27" },
          { label: "Stablecoins", desc: "$15B+ base liquidity layer", color: "#D4537E" },
          { label: "DePIN + AI agents", desc: "Physical infra + autonomous systems", color: "#E24B4A" },
        ]
      },
      {
        type: "text",
        content: `**The fundamental insight:** Solana's ecosystem works because every layer is composable with every other layer. A stablecoin minted via a bridge (Layer 1) can be swapped on a DEX (Layer 2), used as collateral in a lending protocol (Layer 2), backed by staked SOL received from a liquid staking protocol (Layer 3), with prices fed by an oracle (Layer 1), all executed by an AI agent (Layer 7) running on compute from a DePIN network (Layer 6), settled by validators (Layer 0) in under a second.\n\nThis composability — enabled by sub-cent fees and sub-second finality — is what makes the Solana ecosystem more than the sum of its parts. It's not 80 individual protocols; it's a unified financial operating system where value, data, and logic flow freely across every layer.`
      },
      {
        type: "interactive",
        widget: "ecosystem-explorer"
      },
      {
        type: "interactive",
        widget: "composability-simulator"
      },
      {
        type: "interactive",
        widget: "ecosystem-flow"
      },
      {
        type: "roadmap",
        weeks: [
          {
            week: "Phase 1",
            title: "Foundations",
            tasks: [
              "Set up a Phantom wallet and explore the Solana Explorer",
              "Make a swap on Jupiter — observe the transaction on-chain",
              "Stake SOL via Jito and receive JitoSOL",
              "Read 3 Solana transaction details on Solscan — identify the programs, accounts, and compute units",
            ]
          },
          {
            week: "Phase 2",
            title: "DeFi exploration",
            tasks: [
              "Provide liquidity on Orca or Raydium with a small amount",
              "Supply assets to Kamino or MarginFi and observe yield accrual",
              "Use JitoSOL as collateral to borrow USDC — experience the composability loop",
              "Check Birdeye and Dune dashboards — explore Solana DeFi analytics",
            ]
          },
          {
            week: "Phase 3",
            title: "Ecosystem depth",
            tasks: [
              "Explore Helium's coverage map — understand DePIN economics",
              "Look at Pyth's price feeds on pyth.network — see which institutions provide data",
              "Bridge USDC from Ethereum to Solana using Wormhole — experience cross-chain",
              "Browse Jupiter's LFG launchpad — understand how new tokens enter the ecosystem",
            ]
          },
          {
            week: "Phase 4",
            title: "Builder path",
            tasks: [
              "Complete the Solana developer quickstart at solana.com/developers",
              "Deploy a simple program using Anchor framework on devnet",
              "Read Helius documentation — understand RPC, webhooks, and DAS APIs",
              "Explore Jito's documentation — understand bundles, tips, and the block engine",
            ]
          },
        ]
      },
      {
        type: "quiz",
        question: "What is the single most important property that makes Solana's ecosystem work as a unified system?",
        options: [
          "Marketing by the Solana Foundation",
          "Composability — the ability for every protocol to interact with every other in a single atomic transaction at sub-cent cost",
          "Having the most tokens",
          "Being the oldest blockchain",
        ],
        correct: 1,
        explanation: "Composability is DeFi's superpower, and Solana's speed + cost make it practically achievable. When staking, lending, trading, and bridging can all happen in one transaction for under a penny, the ecosystem becomes a unified financial operating system rather than a collection of isolated applications."
      }
    ]
  },
];

/* ===== COMPONENT LIBRARY ===== */

function TextBlock({ content }) {
  const parts = content.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)", marginBottom: 20 }}>
      {parts.map((p, i) => {
        if (p === "\n") return <br key={i} />;
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

function CodeBlock({ title, code, language }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const lang = language || "javascript";
  const grammar = Prism.languages[lang];
  const highlighted = grammar ? Prism.highlight(code, grammar, lang) : code;
  return (
    <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-code-header)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#14F195", fontFamily: "var(--mono)" }}>{title}</span>
        <button onClick={handleCopy} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", fontFamily: "var(--mono)" }}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px 20px", background: "var(--bg-code)", overflowX: "auto", fontSize: 12.5, lineHeight: 1.7, fontFamily: "var(--mono)", color: "var(--text-code)" }}>
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

function StatsGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
      {items.map((s, i) => (
        <div key={i} style={{ background: "var(--bg-card)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#14F195", fontFamily: "var(--mono)" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function DiagramFlow({ title, items }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 140, padding: "14px 12px", background: "var(--bg-card)", borderRadius: 10, border: `1.5px solid ${item.color}30`, position: "relative" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            {i < items.length - 1 && (
              <div style={{ width: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 16, flexShrink: 0 }}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptCards({ items }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
      {items.map((c, i) => (
        <div key={i} onClick={() => setExpanded(expanded === i ? null : i)}
          style={{ background: "var(--bg-card)", borderRadius: 10, padding: "14px 18px", border: "1px solid var(--border)", cursor: "pointer", transition: "border-color 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{c.title}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", transform: expanded === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </div>
          {expanded === i && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>{c.body}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProtocolTable({ protocols }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 8 }}>
      {protocols.map((p, i) => (
        <div key={i} onClick={() => setSelected(selected === i ? null : i)}
          style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${selected === i ? p.color + "60" : "var(--border)"}`, padding: "16px 18px", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 32, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{p.role}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#14F195", fontFamily: "var(--mono)" }}>{p.tvl}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: p.color, fontWeight: 600, fontFamily: "var(--mono)" }}>{p.keyMetric}</div>
          {selected === i && (
            <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {p.differentiator}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EcosystemLayerView({ layers }) {
  const [expandedLayer, setExpandedLayer] = useState(0);
  return (
    <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
      {layers.map((l, li) => (
        <div key={li} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div
            onClick={() => setExpandedLayer(expandedLayer === li ? null : li)}
            style={{ padding: "12px 18px", background: "var(--bg-card)", borderBottom: expandedLayer === li ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#14F19515", color: "#14F195", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "var(--mono)" }}>L{li}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{l.layer}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", transform: expandedLayer === li ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </div>
          {expandedLayer === li && (
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {l.roles.map((r, ri) => (
                <div key={ri} style={{ padding: "10px 14px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, lineHeight: 1.4 }}>{r.desc}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.players.map((player, pi) => (
                      <span key={pi} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "#14F19512", color: "#14F195", fontFamily: "var(--mono)" }}>{player}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SupplyChain({ actors }) {
  return (
    <div style={{ marginBottom: 24, position: "relative" }}>
      {actors.map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 16, marginBottom: i < actors.length - 1 ? 8 : 0, position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#14F195", border: "2px solid var(--bg-primary)", zIndex: 1 }} />
            {i < actors.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 2 }} />}
          </div>
          <div style={{ flex: 1, background: "var(--bg-card)", borderRadius: 10, padding: "14px 18px", border: "1px solid var(--border)", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{a.role}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{a.desc}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Incentive: <span style={{ color: "#14F195" }}>{a.incentive}</span></div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Tools: {a.tools}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfraStack({ layers }) {
  return (
    <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
      {layers.map((l, li) => (
        <div key={li} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", background: "var(--bg-card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#14F19515", color: "#14F195", textTransform: "uppercase", letterSpacing: 0.5 }}>{l.tier}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</span>
          </div>
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 8 }}>
            {l.items.map((item, ii) => (
              <div key={ii} style={{ padding: "10px 14px", background: "var(--bg-card)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#14F195", fontWeight: 600 }}>{item.cost}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Roadmap({ weeks }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {weeks.map((w, wi) => (
        <div key={wi} style={{ marginBottom: 16, display: "flex", gap: 16 }}>
          <div style={{ width: 80, flexShrink: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#14F195", fontFamily: "var(--mono)" }}>{w.week}</div>
          </div>
          <div style={{ flex: 1, borderLeft: "2px solid #14F19530", paddingLeft: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{w.title}</div>
            {w.tasks.map((t, ti) => (
              <div key={ti} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--border)", marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Quiz({ question, options, correct, explanation }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (i) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
  };

  return (
    <div style={{ marginBottom: 24, borderRadius: 10, border: "1px solid #14F19530", padding: "18px 20px", background: "var(--bg-card)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#14F195", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Knowledge check</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14, lineHeight: 1.5 }}>{question}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt, i) => {
          let bg = "var(--bg-primary)";
          let border = "var(--border)";
          let textColor = "var(--text-secondary)";
          if (revealed && i === correct) { bg = "#5DCAA515"; border = "#5DCAA560"; textColor = "#5DCAA5"; }
          else if (revealed && i === selected && i !== correct) { bg = "#E24B4A15"; border = "#E24B4A60"; textColor = "#E24B4A"; }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`, background: bg, cursor: revealed ? "default" : "pointer", transition: "all 0.15s", fontSize: 13, color: textColor, lineHeight: 1.4 }}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, marginRight: 8, opacity: 0.5 }}>{String.fromCharCode(65 + i)}</span>{opt}
            </div>
          );
        })}
      </div>
      {revealed && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: selected === correct ? "#5DCAA5" : "#E24B4A" }}>{selected === correct ? "Correct!" : "Not quite."}</strong>{" "}{explanation}
        </div>
      )}
    </div>
  );
}

/* ===== INTERACTIVE WIDGETS ===== */

function EcosystemExplorer() {
  const layerData = [
    { name: "Network Infrastructure", tag: "L0", color: "#5DCAA5", roles: [
      { name: "Validator clients", players: ["Agave", "Firedancer", "Jito-Solana", "Sig"] },
      { name: "RPC providers", players: ["Helius", "QuickNode", "Triton", "Alchemy"] },
      { name: "MEV infrastructure", players: ["Jito Block Engine", "Jito BAM"] },
    ]},
    { name: "Middleware", tag: "L1", color: "#7F77DD", roles: [
      { name: "Oracles", players: ["Pyth Network", "Switchboard"] },
      { name: "Bridges", players: ["Wormhole", "deBridge", "Axelar"] },
      { name: "Indexers", players: ["Helius DAS", "Birdeye", "Flipside"] },
      { name: "Dev tools", players: ["Anchor", "Metaplex", "Squads"] },
    ]},
    { name: "DeFi", tag: "L2", color: "#378ADD", roles: [
      { name: "DEX aggregator", players: ["Jupiter"] },
      { name: "AMMs", players: ["Raydium", "Orca", "Meteora"] },
      { name: "Perps", players: ["Drift", "Jupiter Perps", "Zeta"] },
      { name: "Lending", players: ["Kamino", "MarginFi", "Save"] },
    ]},
    { name: "Staking & Yield", tag: "L3", color: "#EF9F27", roles: [
      { name: "Liquid staking", players: ["Jito", "Marinade", "Sanctum"] },
      { name: "Yield", players: ["Kamino vaults", "Gauntlet"] },
    ]},
    { name: "Stablecoins & RWAs", tag: "L4", color: "#D4537E", roles: [
      { name: "Stablecoins", players: ["USDC", "USDT", "PYUSD", "JupUSD"] },
      { name: "RWAs", players: ["BlackRock BUIDL", "Ondo", "xStocks"] },
    ]},
    { name: "Consumer", tag: "L5", color: "#14F195", roles: [
      { name: "Wallets", players: ["Phantom", "Backpack", "Solflare"] },
      { name: "NFTs", players: ["Magic Eden", "Tensor"] },
      { name: "Launchpads", players: ["Pump.fun", "Jupiter LFG"] },
    ]},
    { name: "DePIN", tag: "L6", color: "#9945FF", roles: [
      { name: "Wireless", players: ["Helium"] },
      { name: "Compute", players: ["Render", "io.net"] },
      { name: "Mapping", players: ["Hivemapper", "Geodnet"] },
    ]},
    { name: "AI Agents", tag: "L7", color: "#E24B4A", roles: [
      { name: "Frameworks", players: ["Realms", "ElizaOS"] },
      { name: "AI x DeFi", players: ["Griffain", "Autonomous MMs"] },
    ]},
  ];

  const [activeLayer, setActiveLayer] = useState(null);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Ecosystem explorer</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {layerData.map((layer, i) => (
          <div key={i}>
            <div
              onClick={() => setActiveLayer(activeLayer === i ? null : i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                background: activeLayer === i ? `${layer.color}15` : "var(--bg-primary)",
                border: `1px solid ${activeLayer === i ? layer.color + "40" : "var(--border)"}`,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color: layer.color, width: 24 }}>{layer.tag}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{layer.name}</span>
              <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>{layer.roles.reduce((sum, r) => sum + r.players.length, 0)} players</span>
            </div>
            {activeLayer === i && (
              <div style={{ padding: "8px 12px 8px 46px", display: "flex", flexDirection: "column", gap: 6 }}>
                {layer.roles.map((role, ri) => (
                  <div key={ri}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4 }}>{role.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {role.players.map((p, pi) => (
                        <span key={pi} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: `${layer.color}15`, color: layer.color, fontFamily: "var(--mono)" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComposabilitySimulator() {
  const steps = [
    { label: "Stake SOL", protocol: "Jito", action: "Deposit 10 SOL, receive 10 JitoSOL", apy: 7.2, fee: 0.001, color: "#5DCAA5" },
    { label: "Collateralize", protocol: "Kamino", action: "Deposit JitoSOL as collateral (75% LTV)", apy: 0, fee: 0.001, color: "#378ADD" },
    { label: "Borrow USDC", protocol: "Kamino", action: "Borrow 1,125 USDC against collateral", apy: -5.5, fee: 0.001, color: "#7F77DD" },
    { label: "Swap to SOL", protocol: "Jupiter", action: "Swap 1,125 USDC → 7.5 SOL", apy: 0, fee: 0.002, color: "#EF9F27" },
    { label: "Provide LP", protocol: "Meteora", action: "Add SOL/USDC concentrated liquidity", apy: 24.0, fee: 0.001, color: "#D4537E" },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const cumulativeApy = steps.slice(0, currentStep + 1).reduce((sum, s) => sum + s.apy, 0);
  const totalFees = steps.slice(0, currentStep + 1).reduce((sum, s) => sum + s.fee, 0);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Composability simulator</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: currentStep === 0 ? "var(--border)" : "var(--text-tertiary)", cursor: currentStep === 0 ? "default" : "pointer", fontFamily: "var(--mono)" }}>
            ← prev
          </button>
          <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep === steps.length - 1}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${currentStep === steps.length - 1 ? "var(--border)" : "#14F19540"}`, background: currentStep === steps.length - 1 ? "transparent" : "#14F19515", color: currentStep === steps.length - 1 ? "var(--border)" : "#14F195", cursor: currentStep === steps.length - 1 ? "default" : "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
            next →
          </button>
        </div>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {steps.map((s, i) => (
          <div key={i} onClick={() => setCurrentStep(i)}
            style={{ flex: 1, height: 4, borderRadius: 2, background: i <= currentStep ? s.color : "var(--border)", cursor: "pointer", transition: "background 0.2s" }} />
        ))}
      </div>

      {/* Current step */}
      <div style={{ padding: "14px 16px", borderRadius: 8, border: `1.5px solid ${steps[currentStep].color}40`, background: `${steps[currentStep].color}08`, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: steps[currentStep].color, color: "#0C0C0F", fontFamily: "var(--mono)" }}>Step {currentStep + 1}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{steps[currentStep].label}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>via {steps[currentStep].protocol}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{steps[currentStep].action}</div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Net APY</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: cumulativeApy >= 0 ? "#5DCAA5" : "#E24B4A" }}>{cumulativeApy >= 0 ? "+" : ""}{cumulativeApy.toFixed(1)}%</div>
        </div>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total fees</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text-primary)" }}>${totalFees.toFixed(3)}</div>
        </div>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Protocols used</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: "#14F195" }}>{new Set(steps.slice(0, currentStep + 1).map(s => s.protocol)).size}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Click through each step to see how DeFi composability stacks yield across protocols. Total transaction cost: under $0.01.
      </div>
    </div>
  );
}

/* ===== INTERACTIVE WIDGET PLACEHOLDERS ===== */

function BlockchainComparisonRace() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);
  const [tpsLoad, setTpsLoad] = useState(100);
  const tpsRef = useRef(100);

  useEffect(() => { tpsRef.current = tpsLoad; }, [tpsLoad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const chains = [
      { name: "Bitcoin", color: "#EF9F27", blockTime: 15, tps: 7, fee: 2.50, confirm: 600 },
      { name: "Ethereum", color: "#7F77DD", blockTime: 3, tps: 30, fee: 5.00, confirm: 12 },
      { name: "Solana", color: "#5DCAA5", blockTime: 0.4, tps: 4000, fee: 0.001, confirm: 0.4 },
    ];

    if (!stateRef.current) {
      stateRef.current = {
        chains: chains.map(() => ({
          progress: 0,
          blocks: [],
          queue: [],
          absorbed: 0,
          queueOverflow: 0,
          blockCount: 0,
        })),
      };
    }
    const st = stateRef.current;

    const colW = W / 3;
    const barY = 80, barH = 24, barPad = 40;
    const stackBase = H - 40;
    const stackBlockH = 12, stackBlockW = 60;
    const maxStackBlocks = Math.floor((stackBase - barY - barH - 60) / (stackBlockH + 2));

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);

      const load = tpsRef.current;

      for (let ci = 0; ci < 3; ci++) {
        const chain = chains[ci];
        const cs = st.chains[ci];
        const cx = ci * colW + colW / 2;

        // Chain name
        ctx.fillStyle = chain.color;
        ctx.font = "bold 16px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(chain.name, cx, 16);

        // Block progress bar background
        const bx = cx - stackBlockW;
        const bw = stackBlockW * 2;
        ctx.fillStyle = "#1A1A22";
        roundRect(bx, barY, bw, barH, 6);
        ctx.fill();

        // Advance progress
        cs.progress += (1 / 60) / chain.blockTime;

        // Add queued tx dots based on load
        const txPerFrame = load / 60;
        const fractional = txPerFrame - Math.floor(txPerFrame);
        let txToAdd = Math.floor(txPerFrame);
        if (Math.random() < fractional) txToAdd++;
        for (let t = 0; t < txToAdd; t++) {
          cs.queue.push({ age: 0, overflow: false });
        }

        // Block completes
        if (cs.progress >= 1) {
          cs.progress = 0;
          cs.blockCount++;
          // Absorb transactions
          const canAbsorb = Math.floor(chain.tps * chain.blockTime);
          const toAbsorb = Math.min(cs.queue.length, canAbsorb);
          cs.absorbed += toAbsorb;
          cs.queue.splice(0, toAbsorb);
          // Add block to stack
          cs.blocks.push({ glow: 1.0 });
          if (cs.blocks.length > maxStackBlocks) cs.blocks.shift();
        }

        // Queue overflow: if queue > tps*10, mark overflow
        const maxQueue = chain.tps * 10;
        while (cs.queue.length > maxQueue) {
          cs.queueOverflow++;
          cs.queue.pop();
        }

        // Draw progress fill
        ctx.fillStyle = chain.color;
        const fillW = Math.min(cs.progress, 1) * bw;
        if (fillW > 0) {
          roundRect(bx, barY, Math.max(fillW, 12), barH, 6);
          ctx.fill();
        }

        // Progress text
        ctx.fillStyle = "#0A0A0E";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.floor(cs.progress * 100) + "%", cx, barY + barH / 2);

        // Draw queue dots
        const queueY = barY + barH + 14;
        const dotR = 3, dotGap = 9;
        const maxVisibleDots = Math.floor(bw / dotGap);
        const visibleQueue = Math.min(cs.queue.length, maxVisibleDots);
        for (let d = 0; d < visibleQueue; d++) {
          const isOverloaded = cs.queue.length > chain.tps * 5;
          ctx.fillStyle = isOverloaded ? "#E24B4A" : chain.color;
          ctx.globalAlpha = isOverloaded ? 0.6 + 0.4 * Math.sin(Date.now() / 200 + d) : 0.8;
          ctx.beginPath();
          ctx.arc(bx + d * dotGap + dotGap / 2, queueY, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (cs.queue.length > maxVisibleDots) {
          ctx.fillStyle = "#9B9990";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.textAlign = "right";
          ctx.fillText("+" + (cs.queue.length - maxVisibleDots), bx + bw, queueY + 3);
        }

        // Draw block stack
        for (let b = 0; b < cs.blocks.length; b++) {
          const block = cs.blocks[b];
          const by = stackBase - (b + 1) * (stackBlockH + 2);
          if (by < barY + barH + 30) continue;
          if (block.glow > 0) {
            ctx.shadowBlur = 10 * block.glow;
            ctx.shadowColor = chain.color;
            block.glow = Math.max(0, block.glow - 0.02);
          }
          ctx.fillStyle = chain.color;
          ctx.globalAlpha = 0.5 + 0.5 * (b / Math.max(cs.blocks.length, 1));
          roundRect(cx - stackBlockW / 2, by, stackBlockW, stackBlockH, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }

        // Stats at bottom
        const statsY = stackBase + 8;
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillStyle = chain.color;
        ctx.fillText("TPS: " + chain.tps.toLocaleString(), cx, statsY);
        ctx.fillStyle = "#9B9990";
        ctx.fillText("Fee: $" + chain.fee.toFixed(chain.fee < 0.01 ? 3 : 2), cx, statsY + 14);
        ctx.fillText("Confirm: " + (chain.confirm >= 1 ? chain.confirm + "s" : chain.confirm * 1000 + "ms"), cx, statsY + 28);

        // Column divider lines
        if (ci < 2) {
          ctx.strokeStyle = "#222228";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo((ci + 1) * colW, 10);
          ctx.lineTo((ci + 1) * colW, H - 10);
          ctx.stroke();
        }
      }

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Blockchain Comparison Race</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Transaction Load:</span>
        <input type="range" min={10} max={10000} step={10} value={tpsLoad} onChange={e => setTpsLoad(Number(e.target.value))} style={{ flex: 1, maxWidth: 300, accentColor: "#14F195" }} />
        <span style={{ fontSize: 11, color: "#14F195", fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>{tpsLoad.toLocaleString()} TPS</span>
      </div>
    </div>
  );
}

function InteractiveHashChain() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    hashes: [],
    offset: 0,
    insertTx: false,
    verifying: false,
    verifyStart: 0,
    verifyDone: false,
    verifyFade: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const hexChars = "0123456789abcdef";
    function randHex() {
      let s = "";
      for (let i = 0; i < 6; i++) s += hexChars[Math.floor(Math.random() * 16)];
      return s;
    }

    const nodeW = 50, nodeH = 25, gap = 24, centerY = H / 2;
    const segmentColors = ["#5DCAA5", "#7F77DD", "#EF9F27", "#D4537E"];

    function addHash(isTx) {
      const idx = st.hashes.length;
      st.hashes.push({
        hex: randHex(),
        isTx: isTx,
        x: idx * (nodeW + gap) + 30,
        glow: 1.0,
      });
    }

    if (st.hashes.length === 0) {
      for (let i = 0; i < 6; i++) addHash(false);
    }

    let frameCount = 0;

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      frameCount++;

      // Auto-add hash every ~12 frames (~200ms)
      if (frameCount % 12 === 0) {
        const doTx = st.insertTx;
        if (doTx) st.insertTx = false;
        addHash(doTx);
      }

      // Auto-scroll
      const last = st.hashes[st.hashes.length - 1];
      if (last) {
        const rightEdge = last.x + nodeW - st.offset;
        if (rightEdge > W - 60) {
          st.offset += (rightEdge - (W - 60)) * 0.12;
        }
      }

      // Verification state
      const now = performance.now();
      let verifySegments = null;
      if (st.verifying) {
        const elapsed = now - st.verifyStart;
        if (elapsed < 1000) {
          // Highlight 4 segments
          verifySegments = [];
          const total = st.hashes.length;
          const segSize = Math.ceil(total / 4);
          for (let s = 0; s < 4; s++) {
            verifySegments.push({ start: s * segSize, end: Math.min((s + 1) * segSize, total), color: segmentColors[s] });
          }
        } else if (elapsed < 2000) {
          // Show checkmarks
          verifySegments = [];
          const total = st.hashes.length;
          const segSize = Math.ceil(total / 4);
          for (let s = 0; s < 4; s++) {
            verifySegments.push({ start: s * segSize, end: Math.min((s + 1) * segSize, total), color: segmentColors[s], check: true });
          }
          st.verifyDone = true;
        } else if (elapsed < 3000) {
          st.verifyFade = 1 - (elapsed - 2000) / 1000;
          verifySegments = [];
          const total = st.hashes.length;
          const segSize = Math.ceil(total / 4);
          for (let s = 0; s < 4; s++) {
            verifySegments.push({ start: s * segSize, end: Math.min((s + 1) * segSize, total), color: segmentColors[s], check: true, fade: st.verifyFade });
          }
        } else {
          st.verifying = false;
          st.verifyDone = false;
          st.verifyFade = 0;
        }
      }

      // Draw arrows
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 1.5;
      for (let i = 1; i < st.hashes.length; i++) {
        const prev = st.hashes[i - 1];
        const curr = st.hashes[i];
        const px = prev.x + nodeW - st.offset;
        const cx2 = curr.x - st.offset;
        if (px > W + 30 || cx2 < -30) continue;
        ctx.beginPath();
        ctx.moveTo(px, centerY);
        ctx.lineTo(cx2, centerY);
        ctx.stroke();
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.moveTo(cx2, centerY);
        ctx.lineTo(cx2 - 5, centerY - 3);
        ctx.lineTo(cx2 - 5, centerY + 3);
        ctx.closePath();
        ctx.fill();
      }

      // Draw hash boxes
      for (let i = 0; i < st.hashes.length; i++) {
        const h = st.hashes[i];
        const dx = h.x - st.offset;
        if (dx > W + 30 || dx + nodeW < -30) continue;

        let color = h.isTx ? "#14F195" : "#7F77DD";
        let alpha = 1;

        // Apply verification coloring
        if (verifySegments) {
          for (const seg of verifySegments) {
            if (i >= seg.start && i < seg.end) {
              color = seg.color;
              alpha = seg.fade !== undefined ? seg.fade : 1;
              break;
            }
          }
        }

        if (h.glow > 0) {
          ctx.shadowBlur = 12 * h.glow;
          ctx.shadowColor = color;
          h.glow = Math.max(0, h.glow - 0.02);
        }

        ctx.globalAlpha = Math.max(0.3, alpha);
        ctx.fillStyle = color;
        roundRect(dx, centerY - nodeH / 2, nodeW, nodeH, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#0A0A0E";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(h.isTx ? "TX" : h.hex, dx + nodeW / 2, centerY);

        // TX label
        if (h.isTx) {
          ctx.fillStyle = "#14F195";
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.fillText("TX", dx + nodeW / 2, centerY - nodeH / 2 - 10);
        }

        // Verify checkmarks
        if (verifySegments) {
          for (const seg of verifySegments) {
            if (seg.check && i === seg.start) {
              const midX = ((st.hashes[Math.min(seg.end - 1, st.hashes.length - 1)].x + st.hashes[seg.start].x) / 2) + nodeW / 2 - st.offset;
              ctx.fillStyle = seg.color;
              ctx.globalAlpha = seg.fade !== undefined ? seg.fade : 1;
              ctx.font = "bold 18px 'DM Sans', sans-serif";
              ctx.fillText("\u2713", midX, centerY + nodeH / 2 + 22);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const handleInsertTx = useCallback(() => { stateRef.current.insertTx = true; }, []);
  const handleVerify = useCallback(() => {
    const st = stateRef.current;
    if (st.verifying) return;
    st.verifying = true;
    st.verifyStart = performance.now();
    st.verifyDone = false;
    st.verifyFade = 0;
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>PoH Hash Chain</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 350, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleInsertTx} style={btnStyle}>Insert TX</button>
        <button onClick={handleVerify} style={btnStyle}>Verify</button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Hash chain auto-generates — insert TXs or verify in parallel</span>
      </div>
    </div>
  );
}

function InnovationPipeline() {
  const [currentStage, setCurrentStage] = useState(0);
  const [tooltip, setTooltip] = useState(null);

  const innovations = [
    { num: "01", name: "PoH", desc: "Cryptographic clock for ordering", module: "03", animType: "spin" },
    { num: "02", name: "Tower BFT", desc: "PoH-optimized consensus voting", module: "03", animType: "pulse" },
    { num: "03", name: "Gulf Stream", desc: "Mempool-less tx forwarding", module: "04", animType: "arrow" },
    { num: "04", name: "Turbine", desc: "Block propagation protocol", module: "04", animType: "branch" },
    { num: "05", name: "Sealevel", desc: "Parallel smart contract runtime", module: "05", animType: "parallel" },
    { num: "06", name: "Pipelining", desc: "Transaction processing pipeline", module: "04", animType: "stagger" },
    { num: "07", name: "Cloudbreak", desc: "Horizontally-scaled accounts DB", module: "05", animType: "disk" },
    { num: "08", name: "Archivers", desc: "Distributed ledger storage", module: "05", animType: "stack" },
  ];

  useEffect(() => {
    const id = setInterval(() => setCurrentStage(s => (s + 1) % 8), 2000);
    return () => clearInterval(id);
  }, []);

  // Inject CSS animations once
  useEffect(() => {
    const styleId = "innovation-pipeline-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes ip-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes ip-pulse { 0%, 100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
      @keyframes ip-arrow { 0% { transform: translateX(-8px); opacity: 0.3; } 100% { transform: translateX(8px); opacity: 1; } }
      @keyframes ip-slide { 0% { transform: translateX(-6px); } 50% { transform: translateX(6px); } 100% { transform: translateX(-6px); } }
      @keyframes ip-stagger1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes ip-stagger2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes ip-diskio { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      @keyframes ip-stackup { 0%, 100% { transform: translateY(2px); } 50% { transform: translateY(-2px); } }
      @keyframes ip-glow { 0%, 100% { box-shadow: 0 0 8px #14F195; } 50% { box-shadow: 0 0 20px #14F195; } }
    `;
    document.head.appendChild(style);
  }, []);

  function renderIcon(animType) {
    const iconBase = { display: "flex", alignItems: "center", justifyContent: "center", height: 36, marginTop: 6 };
    switch (animType) {
      case "spin":
        return <div style={iconBase}><div style={{ width: 20, height: 20, border: "2px solid #5DCAA5", borderTop: "2px solid transparent", borderRadius: "50%", animation: "ip-spin 1s linear infinite" }} /></div>;
      case "pulse":
        return <div style={{ ...iconBase, gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#7F77DD", animation: `ip-pulse 1.2s ease ${i * 0.3}s infinite` }} />)}</div>;
      case "arrow":
        return <div style={iconBase}><div style={{ fontSize: 18, color: "#EF9F27", animation: "ip-arrow 0.8s ease-in-out infinite alternate" }}>&rarr;</div></div>;
      case "branch":
        return <div style={{ ...iconBase, flexDirection: "column", gap: 2 }}><div style={{ width: 20, height: 2, background: "#378ADD" }} /><div style={{ display: "flex", gap: 4 }}><div style={{ width: 8, height: 2, background: "#378ADD" }} /><div style={{ width: 8, height: 2, background: "#378ADD" }} /></div><div style={{ display: "flex", gap: 2 }}>{[0,1,2,3].map(i => <div key={i} style={{ width: 4, height: 2, background: "#378ADD" }} />)}</div></div>;
      case "parallel":
        return <div style={{ ...iconBase, flexDirection: "column", gap: 3 }}><div style={{ width: 24, height: 3, borderRadius: 2, background: "#D4537E", animation: "ip-slide 1.5s ease infinite" }} /><div style={{ width: 24, height: 3, borderRadius: 2, background: "#D4537E", animation: "ip-slide 1.5s ease 0.4s infinite" }} /></div>;
      case "stagger":
        return <div style={{ ...iconBase, gap: 2 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 12, height: 8, borderRadius: 2, background: "#5DCAA5", opacity: 0.5 + i * 0.25, animation: `ip-stagger1 1s ease ${i * 0.2}s infinite` }} />)}</div>;
      case "disk":
        return <div style={{ ...iconBase, position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #EF9F27" }} /><div style={{ position: "absolute", top: 9, left: "calc(50% - 16px)", fontSize: 10, color: "#EF9F27", animation: "ip-diskio 1s ease infinite" }}>&larr;</div><div style={{ position: "absolute", top: 9, left: "calc(50% + 8px)", fontSize: 10, color: "#EF9F27", animation: "ip-diskio 1s ease 0.5s infinite" }}>&rarr;</div></div>;
      case "stack":
        return <div style={{ ...iconBase, flexDirection: "column", gap: 1 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 16 + i * 4, height: 5, borderRadius: 2, background: "#7F77DD", animation: `ip-stackup 1.2s ease ${i * 0.2}s infinite` }} />)}</div>;
      default: return null;
    }
  }

  const cardStyle = (idx) => ({
    width: 160, minHeight: 120, borderRadius: 10,
    background: "#141419",
    border: `1px solid ${currentStage === idx ? "#14F195" : "#222228"}`,
    padding: "12px 10px",
    cursor: "pointer",
    transition: "border-color 0.3s, box-shadow 0.3s",
    boxShadow: currentStage === idx ? "0 0 12px rgba(20,241,149,0.25)" : "none",
    position: "relative",
    overflow: "hidden",
    animation: currentStage === idx ? "ip-glow 2s ease infinite" : "none",
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Innovation Pipeline</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid var(--border)", padding: 24, minHeight: 500 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, maxWidth: 720, margin: "0 auto" }}>
          {innovations.map((inn, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={cardStyle(idx)}
                onClick={() => setTooltip(tooltip === idx ? null : idx)}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9B9990", marginBottom: 2 }}>{inn.num}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#E8E6E1", marginBottom: 2 }}>{inn.name}</div>
                {renderIcon(inn.animType)}
                <div style={{ fontSize: 10, color: "#9B9990", marginTop: 6, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>{inn.desc}</div>
                {currentStage === idx && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 12, height: 12, borderRadius: "50%", background: "#14F195", boxShadow: "0 0 8px #14F195" }} />
                )}
              </div>
              {tooltip === idx && (
                <div style={{
                  marginTop: 8, padding: "6px 10px", borderRadius: 6,
                  background: "#1A1A22", border: "1px solid #222228",
                  fontSize: 10, color: "#9B9990",
                  fontFamily: "'JetBrains Mono', monospace",
                  textAlign: "center",
                  maxWidth: 160,
                }}>
                  Deep dive &rarr; Module {inn.module}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>
          A transaction flows through all 8 innovations &mdash; currently at: <span style={{ color: "#14F195" }}>{innovations[currentStage].name}</span>
        </div>
      </div>
    </div>
  );
}

function PoHChainBuilder() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    hashes: [],
    particles: [],
    offset: 0,
    txCount: 0,
    hashCounter: 0,
    lastHashTime: 0,
    hashesPerSec: 0,
    recentHashes: 0,
    lastSecond: 0,
    insertTx: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const hexChars = "0123456789abcdef";
    function randHex() {
      let s = "";
      for (let i = 0; i < 4; i++) s += hexChars[Math.floor(Math.random() * 16)];
      return s + "...";
    }

    const nodeW = 64, nodeH = 32, gap = 30, startY = H / 2;

    function addHash(isTx) {
      const idx = st.hashes.length;
      st.hashes.push({
        hex: randHex(),
        isTx: isTx,
        txNum: isTx ? ++st.txCount : 0,
        glow: 1.0,
        x: idx * (nodeW + gap) + 40,
      });
      st.hashCounter++;
      st.recentHashes++;
      if (isTx) {
        const hx = idx * (nodeW + gap) + 40 + nodeW / 2 - st.offset;
        const hy = startY;
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 2.5;
          st.particles.push({
            x: hx, y: hy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0, maxLife: 1.0,
            color: "#14F195",
          });
        }
      }
    }

    // Seed initial hashes
    if (st.hashes.length === 0) {
      for (let i = 0; i < 8; i++) addHash(false);
    }

    let frameCount = 0;

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      frameCount++;

      // Add hash every ~6 frames (~100ms at 60fps)
      if (frameCount % 6 === 0) {
        const doTx = st.insertTx;
        if (doTx) st.insertTx = false;
        addHash(doTx);
      }

      // Hashes per second counter
      const now = performance.now();
      if (now - st.lastSecond > 1000) {
        st.hashesPerSec = st.recentHashes;
        st.recentHashes = 0;
        st.lastSecond = now;
      }

      // Auto-scroll to keep latest hashes visible
      const lastHash = st.hashes[st.hashes.length - 1];
      if (lastHash) {
        const rightEdge = lastHash.x + nodeW - st.offset;
        if (rightEdge > W - 80) {
          st.offset += (rightEdge - (W - 80)) * 0.15;
        }
      }

      // Draw connection lines
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 2;
      for (let i = 1; i < st.hashes.length; i++) {
        const prev = st.hashes[i - 1];
        const curr = st.hashes[i];
        const px = prev.x + nodeW - st.offset;
        const cx = curr.x - st.offset;
        if (px > W + 50 || cx < -50) continue;
        ctx.beginPath();
        ctx.moveTo(px, startY);
        ctx.lineTo(cx, startY);
        ctx.stroke();
        // Arrow head
        ctx.fillStyle = "#333333";
        ctx.beginPath();
        ctx.moveTo(cx, startY);
        ctx.lineTo(cx - 6, startY - 4);
        ctx.lineTo(cx - 6, startY + 4);
        ctx.closePath();
        ctx.fill();
      }

      // Draw hash nodes
      for (let i = 0; i < st.hashes.length; i++) {
        const h = st.hashes[i];
        const drawX = h.x - st.offset;
        if (drawX > W + 50 || drawX + nodeW < -50) continue;

        const baseColor = h.isTx ? "#14F195" : "#7F77DD";

        // Glow effect for new hashes
        if (h.glow > 0) {
          ctx.shadowBlur = 15 * h.glow;
          ctx.shadowColor = baseColor;
          h.glow = Math.max(0, h.glow - 0.015);
        }

        // Rounded rectangle
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        const r = 6;
        ctx.moveTo(drawX + r, startY - nodeH / 2);
        ctx.arcTo(drawX + nodeW, startY - nodeH / 2, drawX + nodeW, startY + nodeH / 2, r);
        ctx.arcTo(drawX + nodeW, startY + nodeH / 2, drawX, startY + nodeH / 2, r);
        ctx.arcTo(drawX, startY + nodeH / 2, drawX, startY - nodeH / 2, r);
        ctx.arcTo(drawX, startY - nodeH / 2, drawX + nodeW, startY - nodeH / 2, r);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hash text
        ctx.fillStyle = "#0A0A0E";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(h.hex, drawX + nodeW / 2, startY);

        // TX label above
        if (h.isTx) {
          ctx.fillStyle = "#14F195";
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillText("TX #" + h.txNum, drawX + nodeW / 2, startY - nodeH / 2 - 12);
        }
      }

      // Draw particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 0.02;
        if (p.life <= 0) { st.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // HUD: hashes/sec
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(st.hashesPerSec + " hashes/sec", W - 16, 16);

      // HUD: total hashes
      ctx.fillStyle = "#9B9990";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText("total: " + st.hashCounter, W - 16, 36);

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const handleInsertTx = useCallback(() => {
    stateRef.current.insertTx = true;
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>PoH Hash Chain</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleInsertTx} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Insert Transaction</button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Click to weave a TX into the hash chain</span>
      </div>
    </div>
  );
}

function TowerBFTSimulator() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [round, setRound] = useState(0);
  const [malicious, setMalicious] = useState(new Set());
  const [votes, setVotes] = useState(() => Array.from({ length: 12 }, () => ({ depth: 0 })));
  const stateRef = useRef({
    particles: [],
    finalized: false,
    finalizedBurst: false,
    ringPulses: Array.from({ length: 12 }, () => 0),
    blockPulse: 0,
  });

  const advanceRound = useCallback(() => {
    setRound(r => r + 1);
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const cx = W / 2, cy = H / 2 - 40;
    const radius = Math.min(W, H) * 0.28;

    st.blockPulse = 1.0;

    setVotes(prev => {
      const next = prev.map((v, i) => {
        if (malicious.has(i)) return { depth: v.depth };
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const vx = cx + Math.cos(angle) * radius;
        const vy = cy + Math.sin(angle) * radius;
        // Emit vote particles toward center
        for (let p = 0; p < 3; p++) {
          st.particles.push({
            x: vx, y: vy,
            tx: cx + (Math.random() - 0.5) * 10,
            ty: cy + (Math.random() - 0.5) * 10,
            progress: 0,
            speed: 0.025 + Math.random() * 0.015,
            color: "#7F77DD",
            type: "vote",
          });
        }
        st.ringPulses[i] = 1.0;
        return { depth: Math.min(v.depth + 1, 32) };
      });

      // Check finalization
      const highDepth = next.filter(v => v.depth >= 32).length;
      if (highDepth >= 8 && !st.finalized) {
        st.finalized = true;
        st.finalizedBurst = true;
        // Burst particles
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          st.particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0, maxLife: 1.0,
            color: "#14F195",
            type: "burst",
          });
        }
      }
      return next;
    });
  }, [malicious]);

  const toggleMalicious = useCallback(() => {
    setMalicious(prev => {
      const next = new Set(prev);
      if (next.has(11)) next.delete(11);
      else next.add(11);
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const cx = W / 2, cy = H / 2 - 40;
    const radius = Math.min(W, H) * 0.28;
    const st = stateRef.current;
    const barAreaTop = H - 100;

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);

      // Draw connection lines from validators to center
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const vx = cx + Math.cos(angle) * radius;
        const vy = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }

      // Draw center block
      if (st.blockPulse > 0) {
        ctx.shadowBlur = 20 * st.blockPulse;
        ctx.shadowColor = "#14F195";
        st.blockPulse = Math.max(0, st.blockPulse - 0.02);
      }
      ctx.fillStyle = "#141419";
      ctx.strokeStyle = "#14F195";
      ctx.lineWidth = 2;
      const bw = 90, bh = 40;
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#14F195";
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Block #" + round, cx, cy);

      // Draw validators
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const vx = cx + Math.cos(angle) * radius;
        const vy = cy + Math.sin(angle) * radius;
        const isMal = malicious.has(i);
        const depth = votes[i].depth;

        // Lockout rings
        if (depth > 0 && !isMal) {
          const rings = Math.min(depth, 10);
          for (let r = 0; r < rings; r++) {
            const ringRadius = 22 + r * 4;
            const alpha = Math.min(1, depth * 0.08) * (1 - r * 0.08);
            ctx.strokeStyle = `rgba(127, 119, 221, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(vx, vy, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Ring pulse animation
        if (st.ringPulses[i] > 0) {
          const pulseR = 18 + (1 - st.ringPulses[i]) * 30;
          ctx.strokeStyle = `rgba(127, 119, 221, ${st.ringPulses[i] * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(vx, vy, pulseR, 0, Math.PI * 2);
          ctx.stroke();
          st.ringPulses[i] = Math.max(0, st.ringPulses[i] - 0.02);
        }

        // Validator circle
        const vColor = isMal ? "#E24B4A" : "#7F77DD";
        ctx.shadowBlur = 10;
        ctx.shadowColor = vColor;
        ctx.fillStyle = vColor;
        ctx.beginPath();
        ctx.arc(vx, vy, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = "#0A0A0E";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("V" + (i + 1), vx, vy);

        // Malicious label
        if (isMal) {
          ctx.fillStyle = "#E24B4A";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.fillText("MALICIOUS", vx, vy + 28);
        }
      }

      // Draw vote particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        if (p.type === "vote") {
          p.progress += p.speed;
          if (p.progress >= 1) { st.particles.splice(i, 1); continue; }
          const px = p.x + (p.tx - p.x) * p.progress;
          const py = p.y + (p.ty - p.y) * p.progress;
          ctx.globalAlpha = 1 - p.progress * 0.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.type === "burst") {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= 0.015;
          if (p.life <= 0) { st.particles.splice(i, 1); continue; }
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;

      // Tally HUD
      const honestCount = 12 - malicious.size;
      const votingCount = votes.filter((v, i) => !malicious.has(i) && v.depth > 0).length;
      const avgDepth = votingCount > 0 ? votes.reduce((s, v, i) => s + (malicious.has(i) ? 0 : v.depth), 0) / honestCount : 0;
      const stakePercent = Math.round((votingCount / 12) * 100);

      ctx.fillStyle = "#E8E6E1";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Round ${round} | ${votingCount}/12 validators voted | ${stakePercent}% stake committed`, 16, 16);

      if (avgDepth > 0) {
        ctx.fillStyle = "#9B9990";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText(`Avg lockout depth: ${avgDepth.toFixed(1)}/32`, 16, 34);
      }

      // Finalized text
      if (st.finalized) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#14F195";
        ctx.fillStyle = "#14F195";
        ctx.font = "bold 24px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("FINALIZED", cx, cy + radius + 60);
        ctx.shadowBlur = 0;
      }

      // Bar chart of lockout depths
      ctx.fillStyle = "#9B9990";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Lockout Depth per Validator", W / 2, barAreaTop - 4);

      const barW = Math.min(24, (W - 80) / 12 - 4);
      const barMaxH = 60;
      const barStartX = (W - (barW + 4) * 12) / 2;
      for (let i = 0; i < 12; i++) {
        const bx = barStartX + i * (barW + 4);
        const depth = votes[i].depth;
        const barH = (depth / 32) * barMaxH;
        const isMal = malicious.has(i);

        // Background bar
        ctx.fillStyle = "#1a1a22";
        ctx.fillRect(bx, barAreaTop, barW, barMaxH);

        // Filled bar
        ctx.fillStyle = isMal ? "#E24B4A" : (depth >= 32 ? "#14F195" : "#7F77DD");
        ctx.fillRect(bx, barAreaTop + barMaxH - barH, barW, barH);

        // Label
        ctx.fillStyle = "#5F5E58";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("V" + (i + 1), bx + barW / 2, barAreaTop + barMaxH + 4);

        // Depth number
        if (depth > 0) {
          ctx.fillStyle = "#9B9990";
          ctx.textBaseline = "bottom";
          ctx.fillText(depth.toString(), bx + barW / 2, barAreaTop + barMaxH - barH - 2);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [round, malicious, votes]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Tower BFT Consensus Simulator</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={advanceRound} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Advance Round</button>
        <button onClick={toggleMalicious} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: malicious.has(11) ? "1px solid #E24B4A" : "1px solid var(--border)", background: malicious.has(11) ? "#E24B4A" : "var(--bg-card)", color: malicious.has(11) ? "#0C0C0F" : "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Toggle V12 Malicious</button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>
          {stateRef.current.finalized ? "Consensus finalized! Lockout depth 32 reached." : `Round ${round} — advance to build lockout depth toward finalization at 32`}
        </span>
      </div>
    </div>
  );
}

function ConsensusRace() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [nodeCount, setNodeCount] = useState(12);
  const stateRef = useRef({ needsReset: true });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const midX = W / 2;
    const N = nodeCount;

    // Generate node positions
    const leftNodes = [], rightNodes = [];
    const margin = 50, nodeArea = H - 120;
    for (let i = 0; i < N; i++) {
      leftNodes.push({
        x: margin + Math.random() * (midX - margin * 2 - 20),
        y: 60 + Math.random() * nodeArea,
        pulse: Math.random() * Math.PI * 2,
      });
      rightNodes.push({
        x: midX + margin + Math.random() * (midX - margin * 2 - 20),
        y: 60 + Math.random() * nodeArea,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Message particles
    let leftMessages = [];
    let rightMessages = [];
    let leftProgress = 0;
    let rightProgress = 0;
    let leftMsgCount = 0;
    let rightMsgCount = 0;
    let rightDone = false;
    let leftDone = false;
    let frame = 0;

    // Left finality rate: slower with more nodes (N^2 effect)
    const leftRate = 0.0008 / (N / 12);
    // Right finality rate: barely changes with nodes
    const rightRate = 0.005;

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Divider line
      ctx.strokeStyle = "#222228";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.fillStyle = "#9B9990";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Traditional BFT", midX / 2, 12);
      ctx.fillText("PoH + Tower BFT", midX + midX / 2, 12);

      // Message count labels
      const msgsPerRound = N * (N - 1);
      ctx.fillStyle = "#5F5E58";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`${N}\u00D7${N - 1} = ${msgsPerRound} msgs/round`, midX / 2, 30);
      ctx.fillText(`${N} nodes, ~${N} msgs/round`, midX + midX / 2, 30);

      // LEFT SIDE: Traditional BFT - lots of cross-messages
      // Spawn message particles between random pairs
      if (!leftDone && frame % 2 === 0) {
        const pairsPerFrame = Math.min(Math.ceil(N * 0.4), 12);
        for (let p = 0; p < pairsPerFrame; p++) {
          const a = Math.floor(Math.random() * N);
          let b = Math.floor(Math.random() * N);
          if (b === a) b = (a + 1) % N;
          leftMessages.push({
            x: leftNodes[a].x, y: leftNodes[a].y,
            tx: leftNodes[b].x, ty: leftNodes[b].y,
            progress: 0,
            speed: 0.02 + Math.random() * 0.02,
          });
          leftMsgCount++;
        }
      }

      // RIGHT SIDE: PoH - sparse voting
      if (!rightDone && frame % 60 === 0) {
        const voter = Math.floor(Math.random() * N);
        const centerX = midX + midX / 2;
        const centerY = H / 2;
        rightMessages.push({
          x: rightNodes[voter].x, y: rightNodes[voter].y,
          tx: centerX, ty: centerY,
          progress: 0,
          speed: 0.03,
        });
        rightMsgCount++;
      }

      // Update and draw left messages
      for (let i = leftMessages.length - 1; i >= 0; i--) {
        const m = leftMessages[i];
        m.progress += m.speed;
        if (m.progress >= 1) { leftMessages.splice(i, 1); continue; }
        const px = m.x + (m.tx - m.x) * m.progress;
        const py = m.y + (m.ty - m.y) * m.progress;
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#E24B4A";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update and draw right messages
      for (let i = rightMessages.length - 1; i >= 0; i--) {
        const m = rightMessages[i];
        m.progress += m.speed;
        if (m.progress >= 1) { rightMessages.splice(i, 1); continue; }
        const px = m.x + (m.tx - m.x) * m.progress;
        const py = m.y + (m.ty - m.y) * m.progress;
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#14F195";
        ctx.fillStyle = "#14F195";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Draw left nodes
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = "#EF9F27";
        ctx.beginPath();
        ctx.arc(leftNodes[i].x, leftNodes[i].y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw right nodes with PoH pulse
      for (let i = 0; i < N; i++) {
        const n = rightNodes[i];
        n.pulse += 0.05;
        const pulseAlpha = 0.3 + 0.3 * Math.sin(n.pulse);
        ctx.fillStyle = "#5DCAA5";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // PoH tick indicator
        ctx.globalAlpha = pulseAlpha;
        ctx.strokeStyle = "#5DCAA5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Update progress bars
      if (!leftDone) {
        leftProgress = Math.min(1, leftProgress + leftRate);
        if (leftProgress >= 1) leftDone = true;
      }
      if (!rightDone) {
        rightProgress = Math.min(1, rightProgress + rightRate);
        if (rightProgress >= 1) rightDone = true;
      }

      // Draw progress bars
      const barY = H - 45, barH = 14, barPad = 30;

      // Left progress bar
      const leftBarW = midX - barPad * 2;
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.roundRect(barPad, barY, leftBarW, barH, 4);
      ctx.fill();
      if (leftProgress > 0) {
        ctx.fillStyle = leftDone ? "#14F195" : "#EF9F27";
        ctx.beginPath();
        ctx.roundRect(barPad, barY, leftBarW * leftProgress, barH, 4);
        ctx.fill();
      }
      ctx.fillStyle = "#9B9990";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`Finality: ${Math.round(leftProgress * 100)}%`, midX / 2, barY + barH + 4);

      // Right progress bar
      const rightBarX = midX + barPad;
      const rightBarW = midX - barPad * 2;
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.roundRect(rightBarX, barY, rightBarW, barH, 4);
      ctx.fill();
      if (rightProgress > 0) {
        ctx.fillStyle = "#14F195";
        ctx.beginPath();
        ctx.roundRect(rightBarX, barY, rightBarW * rightProgress, barH, 4);
        ctx.fill();
      }
      ctx.fillStyle = "#9B9990";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`Finality: ${Math.round(rightProgress * 100)}%`, midX + midX / 2, barY + barH + 4);

      // Right side done checkmark
      if (rightDone) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#14F195";
        ctx.fillStyle = "#14F195";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2713", midX + midX / 2, barY - 14);
        ctx.shadowBlur = 0;

        if (!leftDone) {
          ctx.fillStyle = "#5F5E58";
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillText("PoH finalized! BFT still working...", midX + midX / 2, barY - 30);
        }
      }

      if (leftDone) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#14F195";
        ctx.fillStyle = "#14F195";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2713", midX / 2, barY - 14);
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [nodeCount]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Consensus Race: Traditional BFT vs PoH</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Nodes:</span>
        <input type="range" min={4} max={40} value={nodeCount} onChange={e => setNodeCount(Number(e.target.value))} style={{ width: 160, accentColor: "#14F195" }} />
        <span style={{ fontSize: 12, color: "#E8E6E1", fontFamily: "'JetBrains Mono', monospace", minWidth: 24 }}>{nodeCount}</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>More nodes = exponentially more BFT messages, PoH barely affected</span>
      </div>
    </div>
  );
}

function GulfStreamForwarding() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [mode, setMode] = useState("gulf-stream");
  const stateRef = useRef({
    particles: [],
    mempoolParticles: [],
    currentLeader: 0,
    rotateTimer: 0,
    emitTimer: 0,
    leaderPulse: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    st.particles = [];
    st.mempoolParticles = [];
    st.rotateTimer = 0;
    st.emitTimer = 0;

    // Layout positions
    const walletX = 60, rpcX = W * 0.38, leaderX = W - 90;
    const wallets = [
      { x: walletX, y: H * 0.25 },
      { x: walletX, y: H * 0.5 },
      { x: walletX, y: H * 0.75 },
    ];
    const rpcs = [
      { x: rpcX, y: H * 0.2 },
      { x: rpcX, y: H * 0.4 },
      { x: rpcX, y: H * 0.6 },
      { x: rpcX, y: H * 0.8 },
    ];
    const leaders = [
      { x: leaderX, y: H * 0.2, label: "Current" },
      { x: leaderX, y: H * 0.38, label: "+1" },
      { x: leaderX, y: H * 0.56, label: "+2" },
      { x: leaderX, y: H * 0.74, label: "+3" },
    ];
    const mempoolPos = { x: W * 0.62, y: H * 0.5 };
    const isGulf = mode === "gulf-stream";

    let frame = 0;

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      frame++;
      st.leaderPulse += 0.06;

      // Rotate leaders every ~240 frames (~4s)
      st.rotateTimer++;
      if (st.rotateTimer >= 240) {
        st.rotateTimer = 0;
        st.currentLeader = (st.currentLeader + 1) % 4;
      }

      // Draw connection lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#1a1a22";
      // Wallets -> RPCs
      for (const w of wallets) {
        for (const r of rpcs) {
          ctx.beginPath();
          ctx.moveTo(w.x + 12, w.y);
          ctx.lineTo(r.x - 12, r.y);
          ctx.stroke();
        }
      }
      if (isGulf) {
        // RPCs -> leaders
        for (const r of rpcs) {
          for (const l of leaders) {
            ctx.beginPath();
            ctx.moveTo(r.x + 12, r.y);
            ctx.lineTo(l.x - 16, l.y);
            ctx.stroke();
          }
        }
      } else {
        // RPCs -> mempool
        for (const r of rpcs) {
          ctx.beginPath();
          ctx.moveTo(r.x + 12, r.y);
          ctx.lineTo(mempoolPos.x - 30, mempoolPos.y);
          ctx.stroke();
        }
        // Mempool -> current leader
        ctx.beginPath();
        ctx.moveTo(mempoolPos.x + 30, mempoolPos.y);
        ctx.lineTo(leaders[st.currentLeader].x - 16, leaders[st.currentLeader].y);
        ctx.stroke();
      }

      // Emit transaction particle every ~90 frames (~1.5s)
      st.emitTimer++;
      if (st.emitTimer >= 90) {
        st.emitTimer = 0;
        const walletIdx = Math.floor(Math.random() * 3);
        const rpcIdx = Math.floor(Math.random() * 4);
        const w = wallets[walletIdx];
        const r = rpcs[rpcIdx];

        if (isGulf) {
          // Phase 1: wallet -> rpc
          st.particles.push({
            x: w.x + 12, y: w.y,
            tx: r.x - 12, ty: r.y,
            progress: 0, speed: 0.025,
            phase: "to-rpc",
            rpcIdx: rpcIdx,
            color: "#7F77DD",
            alpha: 1,
          });
        } else {
          // Phase 1: wallet -> rpc -> mempool
          st.particles.push({
            x: w.x + 12, y: w.y,
            tx: r.x - 12, ty: r.y,
            progress: 0, speed: 0.025,
            phase: "to-rpc-mempool",
            rpcIdx: rpcIdx,
            color: "#7F77DD",
            alpha: 1,
          });
        }
      }

      // Slowly pull from mempool in traditional mode
      if (!isGulf && frame % 120 === 0 && st.mempoolParticles.length > 0) {
        const mp = st.mempoolParticles.shift();
        const leader = leaders[st.currentLeader];
        st.particles.push({
          x: mempoolPos.x + 30, y: mempoolPos.y,
          tx: leader.x - 16, ty: leader.y,
          progress: 0, speed: 0.015,
          phase: "mempool-to-leader",
          color: "#EF9F27",
          alpha: 0.8,
        });
      }

      // Update particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          if (p.phase === "to-rpc" && isGulf) {
            // Spawn two particles: one to current leader, one to next
            const r = rpcs[p.rpcIdx];
            const currLeader = leaders[st.currentLeader];
            const nextLeader = leaders[(st.currentLeader + 1) % 4];
            st.particles.push({
              x: r.x + 12, y: r.y,
              tx: currLeader.x - 16, ty: currLeader.y,
              progress: 0, speed: 0.02,
              phase: "to-leader",
              color: "#14F195",
              alpha: 1,
            });
            st.particles.push({
              x: r.x + 12, y: r.y,
              tx: nextLeader.x - 16, ty: nextLeader.y,
              progress: 0, speed: 0.02,
              phase: "to-leader",
              color: "#14F195",
              alpha: 0.35,
            });
            st.particles.splice(i, 1);
          } else if (p.phase === "to-rpc-mempool") {
            // Send to mempool
            const r = rpcs[p.rpcIdx];
            st.particles.push({
              x: r.x + 12, y: r.y,
              tx: mempoolPos.x - 30, ty: mempoolPos.y,
              progress: 0, speed: 0.02,
              phase: "rpc-to-mempool",
              color: "#EF9F27",
              alpha: 0.7,
            });
            st.particles.splice(i, 1);
          } else if (p.phase === "rpc-to-mempool") {
            // Add to mempool swirl
            st.mempoolParticles.push({
              angle: Math.random() * Math.PI * 2,
              radius: 8 + Math.random() * 18,
              speed: 0.02 + Math.random() * 0.02,
            });
            st.particles.splice(i, 1);
          } else {
            st.particles.splice(i, 1);
          }
          continue;
        }

        // Draw particle
        const px = p.x + (p.tx - p.x) * p.progress;
        const py = p.y + (p.ty - p.y) * p.progress;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Draw mempool (traditional mode)
      if (!isGulf) {
        ctx.strokeStyle = "#EF9F27";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mempoolPos.x, mempoolPos.y, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#0A0A0E";
        ctx.fill();

        // Swirling particles in mempool
        for (const mp of st.mempoolParticles) {
          mp.angle += mp.speed;
          const mx = mempoolPos.x + Math.cos(mp.angle) * mp.radius;
          const my = mempoolPos.y + Math.sin(mp.angle) * mp.radius;
          ctx.fillStyle = "#EF9F27";
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#EF9F27";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("mempool", mempoolPos.x, mempoolPos.y + 36);
        ctx.fillText(`(${st.mempoolParticles.length} txs)`, mempoolPos.x, mempoolPos.y + 48);
      }

      // Draw wallets
      for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        ctx.fillStyle = "#7F77DD";
        ctx.fillRect(w.x - 10, w.y - 10, 20, 20);
        ctx.fillStyle = "#7F77DD";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Wallet " + (i + 1), w.x, w.y + 14);
      }

      // Draw RPCs
      for (let i = 0; i < rpcs.length; i++) {
        const r = rpcs[i];
        ctx.fillStyle = "#5DCAA5";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0A0A0E";
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("RPC", r.x, r.y);
      }

      // Draw leaders
      for (let i = 0; i < leaders.length; i++) {
        const l = leaders[i];
        const isCurrent = i === st.currentLeader;
        const brightness = isCurrent ? 1 : 0.3 + (i === (st.currentLeader + 1) % 4 ? 0.2 : 0);
        const baseColor = "#C8F06E";

        if (isCurrent) {
          const pulseR = 20 + Math.sin(st.leaderPulse) * 4;
          ctx.shadowBlur = 15;
          ctx.shadowColor = baseColor;
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(l.x, l.y, pulseR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = brightness;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0A0A0E";
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isCurrent ? "LDR" : "+" + ((i - st.currentLeader + 4) % 4 || 4), l.x, l.y);
        ctx.globalAlpha = brightness;
        ctx.fillStyle = baseColor;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textBaseline = "top";
        const slotLabel = isCurrent ? "Current" : "+" + ((i - st.currentLeader + 4) % 4);
        ctx.fillText(slotLabel, l.x, l.y + 20);
        ctx.globalAlpha = 1;
      }

      // Column labels
      ctx.fillStyle = "#5F5E58";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Wallets", walletX, 25);
      ctx.fillText("RPC Nodes", rpcX, 25);
      ctx.fillText("Leader Schedule", leaderX, 25);

      // Bottom label
      ctx.fillStyle = isGulf ? "#14F195" : "#EF9F27";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const label = isGulf
        ? "Gulf Stream: txs reach leader in ~50ms"
        : "Mempool: txs wait ~2-6s for pickup";
      ctx.fillText(label, W / 2, H - 12);

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [mode]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Transaction Forwarding</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setMode("gulf-stream")} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: mode === "gulf-stream" ? "1px solid #14F195" : "1px solid var(--border)", background: mode === "gulf-stream" ? "#14F195" : "var(--bg-card)", color: mode === "gulf-stream" ? "#0C0C0F" : "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Gulf Stream</button>
        <button onClick={() => setMode("mempool")} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: mode === "mempool" ? "1px solid #EF9F27" : "1px solid var(--border)", background: mode === "mempool" ? "#EF9F27" : "var(--bg-card)", color: mode === "mempool" ? "#0C0C0F" : "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Traditional Mempool</button>
      </div>
    </div>
  );
}

function TurbinePropagation() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [packetLoss, setPacketLoss] = useState(0);
  const stateRef = useRef({
    propagating: false,
    frame: 0,
    shreds: [],
    nodes: [],
    stats: { time: 0, total: 12, lost: 0, recovered: 0 },
    initialized: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const shredColors = ["#C8F06E", "#14F195", "#7F77DD", "#378ADD", "#5DCAA5", "#EF9F27"];

    // Build node layout
    if (!st.initialized) {
      st.initialized = true;
      const leader = { x: W / 2, y: 60, r: 24, label: "LEADER", layer: -1, progress: 1, received: 12, color: "#C8F06E", active: true };
      st.nodes = [leader];
      const layers = [3, 9, 18];
      const layerY = [180, 330, 500];
      const layerR = [16, 12, 8];
      layers.forEach((count, li) => {
        const spread = Math.min(W - 40, (li + 1) * 200 + 100);
        for (let i = 0; i < count; i++) {
          const x = W / 2 - spread / 2 + (count > 1 ? (i / (count - 1)) * spread : 0);
          st.nodes.push({ x, y: layerY[li], r: layerR[li], label: `N${li + 1}.${i + 1}`, layer: li, progress: 0, received: 0, color: "#333", active: false });
        }
      });
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);

      const st2 = stateRef.current;
      if (st2.propagating) st2.frame++;

      // Draw faint connection lines between layers
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      const leader = st2.nodes[0];
      const layerStart = [1, 4, 13];
      const layerCount = [3, 9, 18];
      // Leader to layer 0
      for (let i = layerStart[0]; i < layerStart[0] + layerCount[0]; i++) {
        const n = st2.nodes[i];
        ctx.beginPath(); ctx.moveTo(leader.x, leader.y + leader.r); ctx.lineTo(n.x, n.y - n.r); ctx.stroke();
      }
      // Layer 0 to layer 1
      for (let i = layerStart[1]; i < layerStart[1] + layerCount[1]; i++) {
        const n = st2.nodes[i];
        const srcIdx = layerStart[0] + Math.floor((i - layerStart[1]) / 3);
        const src = st2.nodes[srcIdx];
        ctx.beginPath(); ctx.moveTo(src.x, src.y + src.r); ctx.lineTo(n.x, n.y - n.r); ctx.stroke();
      }
      // Layer 1 to layer 2
      for (let i = layerStart[2]; i < layerStart[2] + layerCount[2]; i++) {
        const n = st2.nodes[i];
        const srcIdx = layerStart[1] + Math.floor((i - layerStart[2]) / 2);
        const src = st2.nodes[Math.min(srcIdx, layerStart[1] + layerCount[1] - 1)];
        ctx.beginPath(); ctx.moveTo(src.x, src.y + src.r); ctx.lineTo(n.x, n.y - n.r); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Propagation logic: spawn shreds at phase boundaries
      if (st2.propagating) {
        const f = st2.frame;
        const loss = packetLoss / 100;
        // Phase 1: leader -> layer 0 (frames 1-5)
        if (f >= 1 && f <= 5 && f === Math.floor(f)) {
          for (let i = layerStart[0]; i < layerStart[0] + layerCount[0]; i++) {
            const target = st2.nodes[i];
            for (let s = 0; s < 4; s++) {
              const lost = Math.random() < loss;
              st2.shreds.push({
                x: leader.x + (Math.random() - 0.5) * 10,
                y: leader.y + leader.r,
                tx: target.x + (Math.random() - 0.5) * 8,
                ty: target.y - target.r,
                progress: 0, speed: 0.02 + Math.random() * 0.015,
                color: shredColors[Math.floor(Math.random() * shredColors.length)],
                targetIdx: i, lost, dead: false, trail: [],
              });
            }
          }
        }
        // Phase 2: layer 0 -> layer 1 (frames 40-45)
        if (f >= 40 && f <= 44 && f === Math.floor(f)) {
          for (let i = layerStart[1]; i < layerStart[1] + layerCount[1]; i++) {
            const target = st2.nodes[i];
            const srcIdx = layerStart[0] + Math.floor((i - layerStart[1]) / 3);
            const src = st2.nodes[srcIdx];
            if (!src.active) continue;
            for (let s = 0; s < 2; s++) {
              const lost = Math.random() < loss;
              st2.shreds.push({
                x: src.x + (Math.random() - 0.5) * 6,
                y: src.y + src.r,
                tx: target.x + (Math.random() - 0.5) * 6,
                ty: target.y - target.r,
                progress: 0, speed: 0.02 + Math.random() * 0.015,
                color: shredColors[Math.floor(Math.random() * shredColors.length)],
                targetIdx: i, lost, dead: false, trail: [],
              });
            }
          }
        }
        // Phase 3: layer 1 -> layer 2 (frames 80-85)
        if (f >= 80 && f <= 84 && f === Math.floor(f)) {
          for (let i = layerStart[2]; i < layerStart[2] + layerCount[2]; i++) {
            const target = st2.nodes[i];
            const srcIdx = layerStart[1] + Math.floor((i - layerStart[2]) / 2);
            const src = st2.nodes[Math.min(srcIdx, layerStart[1] + layerCount[1] - 1)];
            if (!src.active) continue;
            const lost = Math.random() < loss;
            st2.shreds.push({
              x: src.x + (Math.random() - 0.5) * 4,
              y: src.y + src.r,
              tx: target.x + (Math.random() - 0.5) * 4,
              ty: target.y - target.r,
              progress: 0, speed: 0.02 + Math.random() * 0.015,
              color: shredColors[Math.floor(Math.random() * shredColors.length)],
              targetIdx: i, lost, dead: false, trail: [],
            });
          }
        }
        // Stop propagation after phase 3 completes
        if (f > 140) {
          st2.propagating = false;
          // Calculate stats
          let lostCount = 0, totalNodes = st2.nodes.length - 1;
          let recoveredCount = 0;
          for (let i = 1; i < st2.nodes.length; i++) {
            const n = st2.nodes[i];
            if (n.received > 0 && n.received < 6 && n.active) recoveredCount++;
            if (!n.active) lostCount++;
          }
          st2.stats = { time: Math.round(f * 6.6), total: 12, lost: lostCount, recovered: recoveredCount };
        }
      }

      // Update shreds
      for (let i = st2.shreds.length - 1; i >= 0; i--) {
        const s = st2.shreds[i];
        if (s.dead) { st2.shreds.splice(i, 1); continue; }
        s.progress += s.speed;
        s.trail.push({ x: s.x + (s.tx - s.x) * s.progress, y: s.y + (s.ty - s.y) * s.progress });
        if (s.trail.length > 6) s.trail.shift();
        // If lost, die at 50% progress
        if (s.lost && s.progress > 0.3 + Math.random() * 0.3) {
          s.dead = true;
          continue;
        }
        if (s.progress >= 1) {
          // Deliver to target node
          const target = st2.nodes[s.targetIdx];
          if (target) {
            target.received++;
            // Node becomes active if it received enough shreds (Reed-Solomon: need ~50%)
            if (target.received >= 2) {
              target.active = true;
              target.color = "#14F195";
            } else if (target.received > 0) {
              target.color = "#EF9F27";
            }
            target.progress = Math.min(1, target.received / 6);
          }
          s.dead = true;
        }
      }

      // Draw shreds with trails
      for (const s of st2.shreds) {
        if (s.dead) continue;
        const cx2 = s.x + (s.tx - s.x) * s.progress;
        const cy2 = s.y + (s.ty - s.y) * s.progress;
        // Trail
        for (let t = 0; t < s.trail.length; t++) {
          const alpha = (t + 1) / s.trail.length * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = s.lost ? "#E24B4A" : s.color;
          ctx.fillRect(s.trail[t].x - 1.5, s.trail[t].y - 1.5, 3, 3);
        }
        ctx.globalAlpha = 1;
        // Shred particle (small square with glow)
        ctx.shadowBlur = 8;
        ctx.shadowColor = s.lost ? "#E24B4A" : s.color;
        ctx.fillStyle = s.lost ? "#E24B4A" : s.color;
        ctx.fillRect(cx2 - 2, cy2 - 2, 4, 4);
        ctx.shadowBlur = 0;
      }

      // Draw nodes
      for (let i = 0; i < st2.nodes.length; i++) {
        const n = st2.nodes[i];
        const isLeader = i === 0;
        // Glow
        if (n.active || isLeader) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = n.color;
        }
        // Circle
        ctx.fillStyle = isLeader ? "#C8F06E" : (n.active ? "#14F195" : (n.received > 0 ? "#EF9F27" : "#222228"));
        ctx.strokeStyle = isLeader ? "#C8F06E" : (n.active ? "#14F19555" : "#333");
        ctx.lineWidth = isLeader ? 3 : 1.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Progress bar inside node (only for non-leader nodes with progress)
        if (!isLeader && n.progress > 0 && n.progress < 1) {
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(n.x - n.r + 2, n.y + n.r * 0.4, (n.r - 2) * 2, 3);
          ctx.fillStyle = n.active ? "#14F195" : "#EF9F27";
          ctx.fillRect(n.x - n.r + 2, n.y + n.r * 0.4, (n.r - 2) * 2 * n.progress, 3);
        }

        // Label
        ctx.fillStyle = isLeader ? "#0A0A0E" : (n.active ? "#0A0A0E" : "#9B9990");
        ctx.font = `bold ${isLeader ? 11 : (n.r > 10 ? 8 : 6)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isLeader ? "LEADER" : n.label, n.x, n.y - ((!isLeader && n.progress > 0 && n.progress < 1) ? 2 : 0));
      }

      // Layer labels
      ctx.fillStyle = "#5F5E58";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("Neighborhood 1", 12, 175);
      ctx.fillText("Neighborhood 2", 12, 325);
      ctx.fillText("Neighborhood 3", 12, 495);

      // Stats overlay
      const s2 = st2.stats;
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`Propagation: ${s2.time}ms | Shreds: ${s2.total} | Lost: ${s2.lost} | Recovery: ${s2.total > 0 ? Math.round((1 - s2.lost / Math.max(1, st2.nodes.length - 1)) * 100) : 100}%`, W - 12, H - 16);

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [packetLoss]);

  const handlePropagate = useCallback(() => {
    const st = stateRef.current;
    // Reset nodes
    for (let i = 1; i < st.nodes.length; i++) {
      st.nodes[i].progress = 0;
      st.nodes[i].received = 0;
      st.nodes[i].active = false;
      st.nodes[i].color = "#333";
    }
    st.shreds = [];
    st.frame = 0;
    st.propagating = true;
    st.stats = { time: 0, total: 12, lost: 0, recovered: 0 };
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Turbine Block Propagation</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handlePropagate} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Propagate Block</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Packet Loss: {packetLoss}%</span>
          <input type="range" min={0} max={50} value={packetLoss} onChange={e => setPacketLoss(Number(e.target.value))} style={{ width: 120, accentColor: "#E24B4A" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Shreds cascade through neighborhoods with Reed-Solomon recovery</span>
      </div>
    </div>
  );
}

function PipelineAnimator() {
  const stages = [
    { name: "Fetch (Kernel)", color: "#378ADD" },
    { name: "SigVerify (GPU)", color: "#7F77DD" },
    { name: "Execute (CPU)", color: "#5DCAA5" },
    { name: "Write (Kernel)", color: "#EF9F27" },
  ];
  const batchLabels = ["A", "B", "C", "D", "E", "F"];
  const batchColors = ["#378ADD", "#7F77DD", "#5DCAA5", "#EF9F27", "#D4537E", "#C8F06E"];
  const totalPositions = 6; // positions within each stage lane

  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sequential, setSequential] = useState(false);
  const intervalRef = useRef(null);

  // Each batch: { id, stage (0-3), pos (0-totalPositions-1), done }
  const [batches, setBatches] = useState(() => {
    return batchLabels.slice(0, 4).map((label, i) => ({
      id: i, label, stage: -1, pos: 0, done: false, waiting: true,
    }));
  });

  const advanceTick = useCallback(() => {
    setTick(t => t + 1);
    setBatches(prev => {
      const next = prev.map(b => ({ ...b }));
      if (sequential) {
        // Sequential: only one batch moves at a time
        const active = next.find(b => !b.done && !b.waiting);
        if (!active) {
          // Start next waiting batch
          const waiting = next.find(b => b.waiting);
          if (waiting) { waiting.waiting = false; waiting.stage = 0; waiting.pos = 0; }
        } else {
          active.pos++;
          if (active.pos >= totalPositions) {
            active.pos = 0;
            active.stage++;
            if (active.stage >= 4) { active.done = true; active.stage = 3; active.pos = totalPositions - 1; }
          }
        }
      } else {
        // Pipelined: advance all active batches, feed new ones
        for (const b of next) {
          if (b.done || b.waiting) continue;
          b.pos++;
          if (b.pos >= totalPositions) {
            b.pos = 0;
            b.stage++;
            if (b.stage >= 4) { b.done = true; b.stage = 3; b.pos = totalPositions - 1; }
          }
        }
        // Feed next waiting batch when stage 0 is clear
        const stage0Occupied = next.some(b => !b.done && !b.waiting && b.stage === 0 && b.pos < 2);
        if (!stage0Occupied) {
          const waiting = next.find(b => b.waiting);
          if (waiting) { waiting.waiting = false; waiting.stage = 0; waiting.pos = 0; }
        }
      }
      return next;
    });
  }, [sequential]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advanceTick, 300);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, advanceTick]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setTick(0);
    setBatches(batchLabels.slice(0, 4).map((label, i) => ({
      id: i, label, stage: -1, pos: 0, done: false, waiting: true,
    })));
  }, []);

  const completedCount = batches.filter(b => b.done).length;
  const activeBatches = batches.filter(b => !b.done && !b.waiting);
  const pipelineCycles = tick;
  const seqEstimate = 4 * totalPositions * 4; // 4 batches * positions * stages
  const pipeEstimate = totalPositions * 4 + 3 * totalPositions; // pipeline fill + drain

  const laneHeight = 60;
  const laneGap = 16;
  const labelWidth = 130;
  const containerHeight = stages.length * (laneHeight + laneGap) + 100;

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Transaction Processing Pipeline</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid var(--border)", padding: 24, minHeight: containerHeight, position: "relative", overflow: "hidden" }}>
        {/* Stage lanes */}
        {stages.map((stage, si) => {
          const top = si * (laneHeight + laneGap) + 12;
          return (
            <div key={si} style={{ position: "relative", height: laneHeight, marginBottom: laneGap }}>
              {/* Stage label */}
              <div style={{ position: "absolute", left: 0, top: 0, width: labelWidth, height: laneHeight, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, fontFamily: "'JetBrains Mono', monospace" }}>{stage.name}</div>
                  <div style={{ fontSize: 9, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>Stage {si + 1}</div>
                </div>
              </div>
              {/* Lane track */}
              <div style={{ position: "absolute", left: labelWidth, right: 12, top: laneHeight / 2 - 1, height: 2, background: "#1a1a22", borderRadius: 1 }} />
              {/* Lane background */}
              <div style={{ position: "absolute", left: labelWidth, right: 12, top: 8, bottom: 8, background: `${stage.color}08`, borderRadius: 8, border: `1px solid ${stage.color}15` }} />
              {/* Batches in this stage */}
              {batches.filter(b => b.stage === si && !b.waiting).map(b => {
                const laneWidth = typeof window !== 'undefined' ? Math.max(400, window.innerWidth * 0.4) : 500;
                const posX = labelWidth + 12 + (b.pos / totalPositions) * (laneWidth - 60);
                return (
                  <div key={b.id} style={{
                    position: "absolute",
                    left: posX,
                    top: laneHeight / 2 - 16,
                    width: 48, height: 32,
                    background: batchColors[b.id % batchColors.length],
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#0A0A0E",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "left 0.25s ease, top 0.25s ease",
                    boxShadow: `0 0 12px ${batchColors[b.id % batchColors.length]}66`,
                    opacity: b.done ? 0.4 : 1,
                    zIndex: 10,
                  }}>{b.label}</div>
                );
              })}
            </div>
          );
        })}

        {/* Waiting queue */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <div style={{ fontSize: 9, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>QUEUE</div>
          {batches.filter(b => b.waiting).map(b => (
            <div key={b.id} style={{
              width: 28, height: 20, background: batchColors[b.id % batchColors.length] + "44",
              borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, color: batchColors[b.id % batchColors.length],
              fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${batchColors[b.id % batchColors.length]}33`,
            }}>{b.label}</div>
          ))}
        </div>

        {/* Throughput display */}
        <div style={{ marginTop: 16, display: "flex", gap: 24, alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: sequential ? "#5F5E58" : "#14F195" }}>
            Pipeline: 4 batches / {Math.ceil(totalPositions * 4 + 3 * totalPositions / 4)} cycles
          </div>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: sequential ? "#EF9F27" : "#5F5E58" }}>
            Sequential: 4 batches / {totalPositions * 4 * 4} cycles
          </div>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#9B9990" }}>
            Tick: {tick} | Done: {completedCount}/4
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setPlaying(!playing)} style={btnStyle}>{playing ? "Pause" : "Play"}</button>
        <button onClick={advanceTick} style={btnStyle}>Step</button>
        <button onClick={handleReset} style={btnStyle}>Reset</button>
        <button onClick={() => { setSequential(!sequential); handleReset(); }} style={{ ...btnStyle, background: sequential ? "#EF9F2722" : "#141419", borderColor: sequential ? "#EF9F27" : "#222228", color: sequential ? "#EF9F27" : "#E8E6E1" }}>
          {sequential ? "Sequential ON" : "Sequential OFF"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>
          {sequential ? "One batch at a time — no overlap" : "Batches overlap across stages simultaneously"}
        </span>
      </div>
    </div>
  );
}

function SealevelParallelViz() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [cores, setCores] = useState(4);
  const stateRef = useRef({ initialized: false, queue: [], lanes: [], completed: 0, blocked: 0, frame: 0, particles: [], tps: 0, tpsWindow: [], lastTpsUpdate: 0 });

  const txNames = ["SOL Transfer", "Jupiter Swap", "Raydium LP", "Marinade Stake", "Orca Whirl", "Tensor Bid", "Drift Perp", "Pyth Update", "Jito Tip", "Mango Liq", "Phoenix Limit", "Meteora Deposit", "Helium IoT", "wSOL Wrap", "Bonk Burn", "USDC Send", "Kamino Vault", "Sanctum LST", "Squads Multi", "Switchboard"];
  const accountColors = { A: "#E24B4A", B: "#378ADD", C: "#5DCAA5", D: "#EF9F27", E: "#D4537E", F: "#7F77DD" };
  const accountKeys = Object.keys(accountColors);

  function generateTx(id) {
    const numAccounts = 1 + Math.floor(Math.random() * 3);
    const accs = [];
    const used = new Set();
    for (let i = 0; i < numAccounts; i++) {
      let a;
      do { a = accountKeys[Math.floor(Math.random() * accountKeys.length)]; } while (used.has(a));
      used.add(a);
      accs.push({ key: a, write: Math.random() < 0.6 });
    }
    return {
      id, name: txNames[id % txNames.length], accounts: accs,
      progress: 0, duration: 80 + Math.floor(Math.random() * 100),
      lane: -1, state: "queued", conflict: false, glow: 0,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    if (!st.initialized) {
      st.initialized = true;
      st.queue = [];
      for (let i = 0; i < 20; i++) st.queue.push(generateTx(i));
      st.lanes = Array.from({ length: 16 }, () => null);
      st.completed = 0;
      st.nextId = 20;
    }

    const queueX = 12, queueW = 130, laneStartX = queueX + queueW + 20;
    const laneH = 40, laneGap = 6, topPad = 50;

    function getWriteAccounts(tx) {
      return tx.accounts.filter(a => a.write).map(a => a.key);
    }

    function hasConflict(tx, activeTxs) {
      const txWrites = new Set(getWriteAccounts(tx));
      const txAll = new Set(tx.accounts.map(a => a.key));
      for (const other of activeTxs) {
        if (!other) continue;
        const otherWrites = new Set(getWriteAccounts(other));
        const otherAll = new Set(other.accounts.map(a => a.key));
        // Write-write conflict or write-read conflict
        for (const w of txWrites) { if (otherAll.has(w)) return true; }
        for (const w of otherWrites) { if (txAll.has(w)) return true; }
      }
      return false;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      st.frame++;

      const numLanes = cores;

      // Try to schedule from queue every 60 frames
      if (st.frame % 30 === 0 && st.queue.length > 0) {
        const activeTxs = st.lanes.slice(0, numLanes).filter(Boolean);
        for (let qi = 0; qi < st.queue.length; qi++) {
          const tx = st.queue[qi];
          if (hasConflict(tx, activeTxs)) {
            tx.conflict = true;
            continue;
          }
          tx.conflict = false;
          // Find free lane
          let placed = false;
          for (let l = 0; l < numLanes; l++) {
            if (!st.lanes[l]) {
              tx.lane = l;
              tx.state = "running";
              tx.progress = 0;
              tx.glow = 1;
              st.lanes[l] = tx;
              st.queue.splice(qi, 1);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }

      // Update running txs
      for (let l = 0; l < numLanes; l++) {
        const tx = st.lanes[l];
        if (!tx) continue;
        tx.progress += 1 / tx.duration;
        if (tx.glow > 0) tx.glow -= 0.02;
        if (tx.progress >= 1) {
          tx.state = "done";
          st.completed++;
          st.tpsWindow.push(st.frame);
          // Completion particles
          const laneY = topPad + l * (laneH + laneGap);
          const endX = laneStartX + (W - laneStartX - 20) * tx.progress;
          for (let p = 0; p < 8; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            st.particles.push({ x: endX, y: laneY + laneH / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: "#14F195" });
          }
          st.lanes[l] = null;
          // Replenish queue
          if (st.queue.length < 15) {
            st.queue.push(generateTx(st.nextId++));
          }
        }
      }

      // Compute TPS
      const now = st.frame;
      st.tpsWindow = st.tpsWindow.filter(f => now - f < 180); // 3-second window at 60fps
      const tps = Math.round(st.tpsWindow.length / 3);

      // Draw lane backgrounds
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Execution Lanes", laneStartX, 16);

      for (let l = 0; l < numLanes; l++) {
        const y = topPad + l * (laneH + laneGap);
        // Lane bg
        ctx.fillStyle = "#111116";
        roundRect(laneStartX, y, W - laneStartX - 12, laneH, 6);
        ctx.fill();
        ctx.strokeStyle = "#222228";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Lane label
        ctx.fillStyle = "#5F5E58";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`Core ${l}`, laneStartX + 4, y + laneH / 2);

        // Running tx
        const tx = st.lanes[l];
        if (tx) {
          const barW = (W - laneStartX - 60) * tx.progress;
          // Progress fill
          ctx.fillStyle = tx.conflict ? "#EF9F2733" : "#14F19520";
          roundRect(laneStartX + 40, y + 4, barW, laneH - 8, 4);
          ctx.fill();
          // Border
          if (tx.glow > 0) { ctx.shadowBlur = 8; ctx.shadowColor = "#14F195"; }
          ctx.strokeStyle = tx.conflict ? "#EF9F27" : "#14F195";
          ctx.lineWidth = 1.5;
          roundRect(laneStartX + 40, y + 4, Math.max(barW, 80), laneH - 8, 4);
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Tx name
          ctx.fillStyle = "#E8E6E1";
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(tx.name, laneStartX + 46, y + laneH / 2 - 6);
          // Account dots
          let dotX = laneStartX + 46;
          for (const acc of tx.accounts) {
            ctx.fillStyle = accountColors[acc.key];
            ctx.beginPath();
            ctx.arc(dotX + 4, y + laneH / 2 + 8, 4, 0, Math.PI * 2);
            ctx.fill();
            if (acc.write) {
              ctx.strokeStyle = "#E8E6E1";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            dotX += 14;
          }
        }
      }

      // Draw queue
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("TX Queue", queueX, 16);

      const maxVisible = Math.min(st.queue.length, Math.floor((H - topPad - 20) / 32));
      for (let qi = 0; qi < maxVisible; qi++) {
        const tx = st.queue[qi];
        const y = topPad + qi * 32;
        // Tx box
        ctx.fillStyle = tx.conflict ? "#1a1510" : "#111116";
        roundRect(queueX, y, queueW, 28, 5);
        ctx.fill();
        ctx.strokeStyle = tx.conflict ? "#EF9F27" : "#222228";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Tx name
        ctx.fillStyle = tx.conflict ? "#EF9F27" : "#9B9990";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const displayName = tx.name.length > 12 ? tx.name.slice(0, 11) + ".." : tx.name;
        ctx.fillText((tx.conflict ? "\u{1F512} " : "") + displayName, queueX + 6, y + 10);
        // Account dots
        let dotX = queueX + 6;
        for (const acc of tx.accounts) {
          ctx.fillStyle = accountColors[acc.key];
          ctx.beginPath();
          ctx.arc(dotX + 3, y + 22, 3, 0, Math.PI * 2);
          ctx.fill();
          dotX += 10;
        }
      }

      // Draw particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= 0.025;
        if (p.life <= 0) { st.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(`${tps} tx/sec`, W - 16, 16);
      ctx.fillStyle = "#9B9990";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText(`completed: ${st.completed}`, W - 16, 36);

      // Account legend at bottom
      const legendY = H - 28;
      ctx.fillStyle = "#5F5E58";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("Accounts:", queueX, legendY);
      let lx = queueX + 65;
      for (const [key, color] of Object.entries(accountColors)) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lx, legendY + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9B9990";
        ctx.fillText(key, lx + 8, legendY);
        lx += 30;
      }
      ctx.fillStyle = "#5F5E58";
      ctx.fillText("(outlined = write lock)", lx + 4, legendY);

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [cores]);

  const handleAddConflict = useCallback(() => {
    const st = stateRef.current;
    // Find a write account from a running tx
    const running = st.lanes.filter(Boolean);
    if (running.length === 0) return;
    const target = running[0];
    const writeAcc = target.accounts.find(a => a.write);
    if (!writeAcc) return;
    const tx = generateTx(st.nextId++);
    tx.name = "CONFLICT TX";
    tx.accounts = [{ key: writeAcc.key, write: true }, ...tx.accounts.filter(a => a.key !== writeAcc.key).slice(0, 1)];
    tx.conflict = true;
    st.queue.unshift(tx);
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Sealevel Parallel Execution</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handleAddConflict} style={btnStyle}>Add Conflict</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Cores: {cores}</span>
          <input type="range" min={1} max={16} value={cores} onChange={e => {
            setCores(Number(e.target.value));
            stateRef.current.initialized = false;
            stateRef.current.lanes = Array.from({ length: 16 }, () => null);
            stateRef.current.queue = [];
            for (let i = 0; i < 20; i++) stateRef.current.queue.push(generateTx(i));
            stateRef.current.completed = 0;
            stateRef.current.tpsWindow = [];
            stateRef.current.nextId = 20;
          }} style={{ width: 120, accentColor: "#14F195" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Non-conflicting txs run in parallel across cores</span>
      </div>
    </div>
  );
}

function CloudbreakIODemo() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [load, setLoad] = useState(50);
  const [concurrent, setConcurrent] = useState(true);
  const stateRef = useRef({ threads: [], frame: 0, iopsDisplay: 0, iopsTarget: 0, seqActive: 0, seqTimer: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const cx = W / 2, cy = H / 2;
    const dbW = 120, dbH = 50;
    const spokeLen = Math.min(W, H) * 0.32;
    const totalThreads = 32;

    // Initialize threads
    if (st.threads.length === 0) {
      for (let i = 0; i < totalThreads; i++) {
        const angle = (i / totalThreads) * Math.PI * 2 - Math.PI / 2;
        st.threads.push({
          angle, active: false,
          dotProgress: Math.random(), dotSpeed: 0.008 + Math.random() * 0.008,
          dotDir: 1, isWrite: Math.random() < 0.35,
          endX: cx + Math.cos(angle) * spokeLen,
          endY: cy + Math.sin(angle) * spokeLen,
        });
      }
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      st.frame++;

      const activeCount = Math.round((load / 100) * totalThreads);

      // Update thread active states
      if (concurrent) {
        for (let i = 0; i < totalThreads; i++) {
          st.threads[i].active = i < activeCount;
        }
        st.iopsTarget = 500 * activeCount;
      } else {
        // Sequential: cycle through one at a time
        st.seqTimer++;
        if (st.seqTimer > 30) {
          st.seqTimer = 0;
          st.seqActive = (st.seqActive + 1) % totalThreads;
          // Randomize read/write on switch
          st.threads[st.seqActive].isWrite = Math.random() < 0.35;
        }
        for (let i = 0; i < totalThreads; i++) {
          st.threads[i].active = i === st.seqActive;
        }
        st.iopsTarget = 500;
      }

      // Smooth IOPS counter
      const diff = st.iopsTarget - st.iopsDisplay;
      st.iopsDisplay += diff * 0.06;
      const displayIops = Math.round(st.iopsDisplay);

      // Draw spokes (thread lanes)
      for (let i = 0; i < totalThreads; i++) {
        const t = st.threads[i];
        const startDist = 38; // start a bit away from center
        const sx = cx + Math.cos(t.angle) * startDist;
        const sy = cy + Math.sin(t.angle) * startDist;

        // Thread line
        ctx.strokeStyle = t.active ? "#14F19544" : "#1a1a22";
        ctx.lineWidth = t.active ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(t.endX, t.endY);
        ctx.stroke();

        // Glow for active threads
        if (t.active) {
          ctx.strokeStyle = "#14F19522";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(t.endX, t.endY);
          ctx.stroke();
        }

        // Traveling dot on active threads
        if (t.active) {
          t.dotProgress += t.dotSpeed * t.dotDir;
          if (t.dotProgress >= 1) { t.dotProgress = 1; t.dotDir = -1; t.isWrite = Math.random() < 0.35; }
          if (t.dotProgress <= 0) { t.dotProgress = 0; t.dotDir = 1; }

          const dx = sx + (t.endX - sx) * t.dotProgress;
          const dy = sy + (t.endY - sy) * t.dotProgress;

          ctx.shadowBlur = 8;
          ctx.shadowColor = "#14F195";
          ctx.fillStyle = "#14F195";
          ctx.beginPath();
          ctx.arc(dx, dy, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Endpoint indicator
        const eSize = 5;
        if (t.active) {
          ctx.fillStyle = t.isWrite ? "#EF9F27" : "#14F195";
          ctx.shadowBlur = 6;
          ctx.shadowColor = t.isWrite ? "#EF9F27" : "#14F195";
        } else {
          ctx.fillStyle = "#222228";
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(t.endX - eSize / 2, t.endY - eSize / 2, eSize, eSize);
        ctx.shadowBlur = 0;
      }

      // Draw center database
      ctx.shadowBlur = concurrent ? 16 : 6;
      ctx.shadowColor = "#7F77DD";
      ctx.fillStyle = "#7F77DD";
      roundRect(cx - dbW / 2, cy - dbH / 2, dbW, dbH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // DB label
      ctx.fillStyle = "#0A0A0E";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Accounts DB", cx, cy - 6);
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText("(Cloudbreak)", cx, cy + 8);

      // IOPS counter
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 18px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(displayIops.toLocaleString() + " IOPS", cx, 16);
      ctx.fillStyle = "#9B9990";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText(`${activeCount}/${totalThreads} threads active`, cx, 40);

      // Mode indicator
      ctx.fillStyle = concurrent ? "#14F195" : "#EF9F27";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(concurrent ? "CONCURRENT" : "SEQUENTIAL", cx, H - 12);

      // Legend
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#14F195";
      ctx.fillRect(12, H - 26, 8, 8);
      ctx.fillStyle = "#9B9990";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText("Read", 24, H - 18);
      ctx.fillStyle = "#EF9F27";
      ctx.fillRect(56, H - 26, 8, 8);
      ctx.fillStyle = "#9B9990";
      ctx.fillText("Write", 68, H - 18);

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, [load, concurrent]);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Cloudbreak I/O Concurrency</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 350, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setConcurrent(false)} style={{ ...btnStyle, background: !concurrent ? "#EF9F2722" : "#141419", borderColor: !concurrent ? "#EF9F27" : "#222228", color: !concurrent ? "#EF9F27" : "#E8E6E1" }}>Sequential</button>
        <button onClick={() => setConcurrent(true)} style={{ ...btnStyle, background: concurrent ? "#14F19522" : "#141419", borderColor: concurrent ? "#14F195" : "#222228", color: concurrent ? "#14F195" : "#E8E6E1" }}>Concurrent</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Load: {load}%</span>
          <input type="range" min={0} max={100} value={load} onChange={e => setLoad(Number(e.target.value))} style={{ width: 120, accentColor: "#7F77DD" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Memory-mapped I/O across {32} threads</span>
      </div>
    </div>
  );
}

function TransactionJourney() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    currentStage: -1,
    progress: 0,
    mode: "auto",
    particles: [],
    stageArrivalTime: 0,
    paused: false,
    burstDone: false,
    resetTimer: 0,
  });
  const [, forceUpdate] = useState(0);

  const stages = [
    { name: "Wallet Sign", color: "#5DCAA5", time: "~10ms" },
    { name: "QUIC to Leader", color: "#7F77DD", time: "~30ms" },
    { name: "PoH Timestamp", color: "#D4537E", time: "~50ms" },
    { name: "Sealevel Execute", color: "#378ADD", time: "~200ms" },
    { name: "Tower BFT Vote", color: "#EF9F27", time: "~300ms" },
    { name: "Turbine Propagate", color: "#5DCAA5", time: "~350ms" },
    { name: "Finalized", color: "#14F195", time: "~400ms" },
  ];

  const advanceStage = useCallback(() => {
    const st = stateRef.current;
    if (st.currentStage >= 6) return;
    st.currentStage++;
    st.progress = st.currentStage;
    st.stageArrivalTime = performance.now();
    st.paused = true;
    st.burstDone = false;
    forceUpdate(n => n + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const nodeR = 22;
    const arcCenterY = H * 0.35;
    const arcAmplitude = 40;
    const timelineY = H - 80;
    const padX = 60;

    function getNodePos(i) {
      const x = padX + (i / 6) * (W - padX * 2);
      const t = i / 6;
      const y = arcCenterY + Math.sin(t * Math.PI) * arcAmplitude;
      return { x, y };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // Start auto mode
    if (st.currentStage === -1) {
      st.currentStage = 0;
      st.progress = 0;
      st.stageArrivalTime = performance.now();
      st.paused = true;
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();

      // Auto-advance after 1s pause at each stage
      if (st.mode === "auto" && st.paused) {
        if (now - st.stageArrivalTime > 1000) {
          if (st.currentStage < 6) {
            st.paused = false;
          } else if (!st.burstDone) {
            // Final burst
            const pos = getNodePos(6);
            for (let i = 0; i < 15; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 3;
              st.particles.push({ x: pos.x, y: pos.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: "#14F195" });
            }
            st.burstDone = true;
            st.resetTimer = now;
          } else if (now - st.resetTimer > 2000) {
            // Reset
            st.currentStage = 0;
            st.progress = 0;
            st.stageArrivalTime = now;
            st.paused = true;
            st.burstDone = false;
            st.particles = [];
          }
        }
      }

      // Animate travel between stages
      if (!st.paused && st.currentStage < 6) {
        st.progress += 0.015;
        if (st.progress >= st.currentStage + 1) {
          st.currentStage++;
          st.progress = st.currentStage;
          st.stageArrivalTime = now;
          st.paused = true;
          // Emit arrival particles
          const pos = getNodePos(st.currentStage);
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            st.particles.push({ x: pos.x, y: pos.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: stages[st.currentStage].color });
          }
        }
      }

      // Draw connection curves
      for (let i = 0; i < 6; i++) {
        const a = getNodePos(i);
        const b = getNodePos(i + 1);
        ctx.strokeStyle = "#222228";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cpY = (a.y + b.y) / 2 - 15;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2, cpY, b.x, b.y);
        ctx.stroke();
      }

      // Draw nodes
      for (let i = 0; i < 7; i++) {
        const pos = getNodePos(i);
        const isActive = i === st.currentStage && st.paused;
        const isPast = i < st.currentStage || (i === st.currentStage && !st.paused && i === Math.floor(st.progress));
        const r = isActive ? nodeR + 4 : nodeR;

        // Glow
        if (isActive) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = stages[i].color;
        }

        ctx.fillStyle = (isPast || isActive) ? stages[i].color : "#1A1A22";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (!isPast && !isActive) {
          ctx.strokeStyle = stages[i].color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Label below
        ctx.fillStyle = isActive ? stages[i].color : "#9B9990";
        ctx.font = (isActive ? "bold " : "") + "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(stages[i].name, pos.x, pos.y + r + 8);

        // Timing text when active
        if (isActive) {
          ctx.fillStyle = "#E8E6E1";
          ctx.font = "bold 11px 'JetBrains Mono', monospace";
          ctx.fillText(stages[i].time, pos.x, pos.y + r + 22);
        }

        // Node index number
        ctx.fillStyle = (isPast || isActive) ? "#0A0A0E" : stages[i].color;
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), pos.x, pos.y);
      }

      // Draw traveling particle
      if (!st.paused && st.currentStage < 6) {
        const fromIdx = Math.floor(st.progress);
        const toIdx = fromIdx + 1;
        const t = st.progress - fromIdx;
        const a = getNodePos(fromIdx);
        const b = getNodePos(toIdx);
        const cpY = (a.y + b.y) / 2 - 15;
        // Quadratic bezier interpolation
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * ((a.x + b.x) / 2) + t * t * b.x;
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cpY + t * t * b.y;

        ctx.shadowBlur = 15;
        ctx.shadowColor = "#14F195";
        ctx.fillStyle = "#14F195";
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Timeline bar at bottom
      const tlY = timelineY;
      const tlLeft = padX;
      const tlRight = W - padX;
      const tlW = tlRight - tlLeft;

      ctx.fillStyle = "#1A1A22";
      ctx.fillRect(tlLeft, tlY, tlW, 4);

      // Progress fill
      const progressFrac = Math.min(st.progress / 6, 1);
      ctx.fillStyle = "#14F195";
      ctx.fillRect(tlLeft, tlY, tlW * progressFrac, 4);

      // Timeline markers and labels
      const timings = [0, 10, 30, 50, 200, 300, 350, 400];
      for (let i = 0; i < 7; i++) {
        const mx = tlLeft + (i / 6) * tlW;
        ctx.fillStyle = i <= st.currentStage ? stages[i].color : "#333333";
        ctx.beginPath();
        ctx.arc(mx, tlY + 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#9B9990";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(timings[i] + "ms", mx, tlY + 18);
      }

      // Title
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Transaction Lifecycle: 0ms → 400ms", padX, tlY + 32);

      // Draw particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.02;
        if (p.life <= 0) { st.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  const handleMode = useCallback((mode) => {
    const st = stateRef.current;
    st.mode = mode;
    if (mode === "auto") {
      st.currentStage = 0;
      st.progress = 0;
      st.stageArrivalTime = performance.now();
      st.paused = true;
      st.burstDone = false;
      st.particles = [];
    }
    forceUpdate(n => n + 1);
  }, []);

  const handleStep = useCallback(() => {
    const st = stateRef.current;
    st.mode = "step";
    if (st.currentStage >= 6) {
      // Reset
      st.currentStage = 0;
      st.progress = 0;
      st.paused = true;
      st.burstDone = false;
      st.particles = [];
      st.stageArrivalTime = performance.now();
    } else if (st.paused) {
      st.paused = false;
    }
    forceUpdate(n => n + 1);
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Transaction Journey</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => handleMode("auto")} style={{ ...btnStyle, borderColor: stateRef.current.mode === "auto" ? "#14F195" : "#222228", color: stateRef.current.mode === "auto" ? "#14F195" : "#E8E6E1" }}>Auto</button>
        <button onClick={handleStep} style={btnStyle}>Step</button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>Follow a transaction through all 7 stages</span>
      </div>
    </div>
  );
}

function ValidatorNetworkMap() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);
  const [attackMode, setAttackMode] = useState(false);
  const attackRef = useRef(false);

  useEffect(() => { attackRef.current = attackMode; }, [attackMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    // Seeded random for consistent positions
    function seededRand(seed) {
      let s = seed;
      return function () {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
      };
    }

    // Generate 30 nodes with pre-computed positions
    const rng = seededRand(42);
    const padX = 80, padY = 80;
    const nodes = [];
    const tiers = [];
    for (let i = 0; i < 30; i++) {
      // 0-14: small, 15-24: medium, 25-29: large
      let tier, r, stake;
      if (i < 15) { tier = 0; r = 6; stake = 1 + rng() * 3; }
      else if (i < 25) { tier = 1; r = 10; stake = 5 + rng() * 10; }
      else { tier = 2; r = 15; stake = 15 + rng() * 25; }
      tiers.push(tier);

      // Organic circular layout with clustering
      const angle = (i / 30) * Math.PI * 2 + rng() * 0.5;
      const dist = 100 + rng() * Math.min(W, H) * 0.28;
      const cx = W / 2 + Math.cos(angle) * dist + (rng() - 0.5) * 60;
      const cy = H / 2 + Math.sin(angle) * dist + (rng() - 0.5) * 60;

      nodes.push({
        x: Math.max(padX, Math.min(W - padX, cx)),
        y: Math.max(padY, Math.min(H - padY, cy)),
        r, tier, stake,
      });
    }

    // Pre-compute connections (distance < 150px)
    const connections = [];
    for (let i = 0; i < 30; i++) {
      for (let j = i + 1; j < 30; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) connections.push({ a: i, b: j, dist });
      }
    }

    // Attacked node indices (consistent set)
    const attackedNodes = new Set();
    const shuffled = Array.from({ length: 30 }, (_, i) => i).sort(() => rng() - 0.5);
    for (let i = 0; i < 10; i++) attackedNodes.add(shuffled[i]);

    if (!stateRef.current) {
      stateRef.current = {
        leader: 0,
        lastLeaderChange: 0,
        quicParticles: [],
      };
    }
    const st = stateRef.current;

    const totalStake = nodes.reduce((s, n) => s + n.stake, 0);

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();
      const attack = attackRef.current;

      // Leader rotation every 4s
      if (now - st.lastLeaderChange > 4000) {
        let newLeader;
        do {
          newLeader = Math.floor(rng() * 30);
        } while (attack && attackedNodes.has(newLeader));
        st.leader = newLeader;
        st.lastLeaderChange = now;
      }

      // Spawn QUIC traffic particles toward leader
      if (Math.random() < 0.15) {
        const sourceConns = connections.filter(c => c.a === st.leader || c.b === st.leader);
        if (sourceConns.length > 0) {
          for (let k = 0; k < Math.min(3, sourceConns.length); k++) {
            const conn = sourceConns[Math.floor(Math.random() * sourceConns.length)];
            const src = conn.a === st.leader ? conn.b : conn.a;
            if (attack && attackedNodes.has(src)) continue;
            st.quicParticles.push({
              fromX: nodes[src].x, fromY: nodes[src].y,
              toX: nodes[st.leader].x, toY: nodes[st.leader].y,
              progress: 0,
              speed: 0.02 + Math.random() * 0.02,
            });
          }
        }
      }

      // Draw connections
      for (const conn of connections) {
        const dimmed = attack && (attackedNodes.has(conn.a) || attackedNodes.has(conn.b));
        ctx.strokeStyle = dimmed ? "#111115" : "#222228";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[conn.a].x, nodes[conn.a].y);
        ctx.lineTo(nodes[conn.b].x, nodes[conn.b].y);
        ctx.stroke();
      }

      // Draw QUIC particles
      for (let i = st.quicParticles.length - 1; i >= 0; i--) {
        const p = st.quicParticles[i];
        p.progress += p.speed;
        if (p.progress >= 1) { st.quicParticles.splice(i, 1); continue; }
        const px = p.fromX + (p.toX - p.fromX) * p.progress;
        const py = p.fromY + (p.toY - p.fromY) * p.progress;
        ctx.fillStyle = "#C8F06E";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw nodes
      for (let i = 0; i < 30; i++) {
        const n = nodes[i];
        const isLeader = i === st.leader;
        const isAttacked = attack && attackedNodes.has(i);

        let color = "#5DCAA5";
        if (isAttacked) color = "#E24B4A";
        if (isLeader && !isAttacked) color = "#C8F06E";

        // Leader glow
        if (isLeader && !isAttacked) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 300);
          ctx.shadowBlur = 15 + pulse * 10;
          ctx.shadowColor = "#C8F06E";
        }

        if (isAttacked) {
          ctx.globalAlpha = 0.4;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Leader label
        if (isLeader && !isAttacked) {
          ctx.fillStyle = "#C8F06E";
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText("LEADER", n.x, n.y - n.r - 4);
        }
      }

      // Stake info
      const onlineCount = attack ? 20 : 30;
      const onlineStake = attack
        ? nodes.filter((_, i) => !attackedNodes.has(i)).reduce((s, n) => s + n.stake, 0)
        : totalStake;
      const stakePercent = Math.round((onlineStake / totalStake) * 100);

      ctx.fillStyle = "#E8E6E1";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Total validators: 30  |  Online: ${onlineCount}  |  Stake online: ${stakePercent}%`, 16, 16);

      // Attack banner
      if (attack) {
        const bannerText = `Network healthy: ${stakePercent}% stake online > 66% threshold`;
        ctx.fillStyle = stakePercent > 66 ? "#14F195" : "#E24B4A";
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(bannerText, W / 2, H - 30);
      }

      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Validator Network Map</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, borderRadius: 10, border: "1px solid var(--border)", background: "#0A0A0E", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setAttackMode(a => !a)}
          style={{ ...btnStyle, borderColor: attackMode ? "#E24B4A" : "#222228", color: attackMode ? "#E24B4A" : "#E8E6E1" }}
        >
          {attackMode ? "Stop Attack" : "Simulate Attack"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'JetBrains Mono', monospace" }}>
          {attackMode ? "10 nodes offline — Byzantine fault tolerance in action" : "Leader rotates every 4s — toggle attack to test fault tolerance"}
        </span>
      </div>
    </div>
  );
}

function StakeWeightedQoS() {
  const [congestion, setCongestion] = useState(20);
  const [stake, setStake] = useState(50);
  const [dots, setDots] = useState([]);
  const idRef = useRef(0);
  const statsRef = useRef({ prioritySent: 0, priorityDone: 0, regularSent: 0, regularDone: 0 });

  useEffect(() => {
    const spawn = setInterval(() => {
      setDots(prev => {
        const id1 = ++idRef.current;
        const id2 = ++idRef.current;
        statsRef.current.prioritySent++;
        statsRef.current.regularSent++;
        return [
          ...prev,
          { id: id1, lane: "priority", x: 0, speed: 1.8 + Math.random() * 0.4, rejected: false, size: 6 + (stake / 100) * 6 },
          { id: id2, lane: "regular", x: 0, speed: 1.8 + Math.random() * 0.4, rejected: false, size: 6 },
        ];
      });
    }, 200);
    return () => clearInterval(spawn);
  }, [stake]);

  useEffect(() => {
    const tick = setInterval(() => {
      setDots(prev => {
        const cong = congestion / 100;
        return prev.map(d => {
          if (d.x >= 100) return d;
          if (d.rejected) return { ...d, x: d.x + 0.3 };
          if (d.lane === "regular") {
            const slowdown = 1 - cong * 0.85;
            const newX = d.x + d.speed * slowdown;
            if (cong > 0.3 && Math.random() < cong * 0.012) {
              return { ...d, x: newX, rejected: true };
            }
            return { ...d, x: newX };
          }
          return { ...d, x: d.x + d.speed };
        }).filter(d => {
          if (d.x >= 100 && !d.rejected) {
            if (d.lane === "priority") statsRef.current.priorityDone++;
            else statsRef.current.regularDone++;
            return false;
          }
          if (d.rejected && d.x > 20) return false;
          return d.x < 110;
        });
      });
    }, 30);
    return () => clearInterval(tick);
  }, [congestion]);

  const s = statsRef.current;
  const priInc = s.prioritySent > 5 ? Math.round((s.priorityDone / s.prioritySent) * 100) : 100;
  const regInc = s.regularSent > 5 ? Math.round((s.regularDone / s.regularSent) * 100) : 100;

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };
  const laneStyle = (isPriority) => ({
    position: "relative", height: 80, borderRadius: 8, overflow: "hidden", marginBottom: 8,
    background: isPriority ? "rgba(20, 241, 149, 0.06)" : "rgba(255,255,255,0.02)",
    border: isPriority ? "1px solid rgba(20, 241, 149, 0.15)" : "1px solid #222228",
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Stake-Weighted QoS Simulator</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", padding: 24, height: 350, display: "flex", flexDirection: "column" }}>
        {/* Priority Lane */}
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#14F195", marginBottom: 4, fontWeight: 700 }}>PRIORITY (STAKED)</div>
        <div style={laneStyle(true)}>
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: "60%", background: "#14F195", borderRadius: "0 4px 4px 0" }} />
          <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: "60%", background: "#14F195", borderRadius: "4px 0 0 4px" }} />
          {dots.filter(d => d.lane === "priority").map(d => (
            <div key={d.id} style={{
              position: "absolute",
              left: `${d.x}%`, top: "50%",
              transform: "translate(-50%, -50%)",
              width: d.size, height: d.size,
              borderRadius: "50%",
              background: "#14F195",
              boxShadow: "0 0 6px rgba(20,241,149,0.5)",
              transition: "left 0.03s linear",
            }} />
          ))}
        </div>

        {/* Regular Lane */}
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#9B9990", marginBottom: 4, fontWeight: 700 }}>REGULAR (UNSTAKED)</div>
        <div style={laneStyle(false)}>
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: "60%", background: "#5F5E58", borderRadius: "0 4px 4px 0" }} />
          <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: "60%", background: "#5F5E58", borderRadius: "4px 0 0 4px" }} />
          {dots.filter(d => d.lane === "regular").map(d => (
            <div key={d.id} style={{
              position: "absolute",
              left: `${d.x}%`, top: "50%",
              transform: "translate(-50%, -50%)",
              width: d.size, height: d.size,
              borderRadius: "50%",
              background: d.rejected ? "#E24B4A" : "#9B9990",
              opacity: d.rejected ? 0.6 : 0.8,
              boxShadow: d.rejected ? "0 0 6px rgba(226,75,74,0.5)" : "none",
              transition: "left 0.03s linear, opacity 0.3s",
            }} />
          ))}
        </div>

        {/* Stats */}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", gap: 32 }}>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#14F195" }}>Priority inclusion: {priInc}%</span>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: congestion > 50 ? "#E24B4A" : "#9B9990" }}>Regular inclusion: {regInc}%</span>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>Congestion: {congestion}%</span>
        <input type="range" min={0} max={100} value={congestion} onChange={e => setCongestion(Number(e.target.value))} style={{ width: 160, accentColor: "#E24B4A" }} />
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>Stake: {stake}%</span>
        <input type="range" min={10} max={100} value={stake} onChange={e => setStake(Number(e.target.value))} style={{ width: 160, accentColor: "#14F195" }} />
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
          Higher congestion drops unstaked txns. More stake = bigger priority dots.
        </span>
      </div>
    </div>
  );
}

function OraclePriceFeed() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    publishers: [
      { basePrice: 150.00, weight: 1.0, price: 150.00 },
      { basePrice: 150.10, weight: 1.0, price: 150.10 },
      { basePrice: 149.80, weight: 0.5, price: 149.80 },
      { basePrice: 150.20, weight: 0.5, price: 150.20 },
      { basePrice: 149.95, weight: 0.5, price: 149.95 },
    ],
    dragging: -1,
    dragStartY: 0,
    dragStartPrice: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;
    const pubX = 90, aggX = W / 2, consX = W - 90;
    const pubSpacing = (H - 120) / 4;
    const pubYs = Array.from({ length: 5 }, (_, i) => 80 + i * pubSpacing);
    let frame = 0;

    function getMousePos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onMouseDown(e) {
      const pos = getMousePos(e);
      for (let i = 0; i < 5; i++) {
        const r = st.publishers[i].weight >= 1.0 ? 20 : 12;
        const dx = pos.x - pubX, dy = pos.y - pubYs[i];
        if (dx * dx + dy * dy < (r + 10) * (r + 10)) {
          st.dragging = i;
          st.dragStartY = pos.y;
          st.dragStartPrice = st.publishers[i].basePrice;
          break;
        }
      }
    }
    function onMouseMove(e) {
      if (st.dragging < 0) return;
      const pos = getMousePos(e);
      const dy = pos.y - st.dragStartY;
      st.publishers[st.dragging].basePrice = st.dragStartPrice - dy * 0.05;
    }
    function onMouseUp() { st.dragging = -1; }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Jitter publisher prices
      for (let i = 0; i < 5; i++) {
        if (st.dragging !== i) {
          const jitter = (Math.random() - 0.5) * 0.4;
          st.publishers[i].price = st.publishers[i].basePrice + jitter;
        } else {
          st.publishers[i].price = st.publishers[i].basePrice;
        }
      }

      // Compute weighted average
      let totalW = 0, wSum = 0;
      let minP = Infinity, maxP = -Infinity;
      for (const p of st.publishers) {
        wSum += p.price * p.weight;
        totalW += p.weight;
        minP = Math.min(minP, p.price);
        maxP = Math.max(maxP, p.price);
      }
      const aggPrice = wSum / totalW;
      const spread = maxP - minP;
      const confNorm = Math.min(spread / 5, 1);

      // Draw animated dashed lines from publishers to aggregator
      for (let i = 0; i < 5; i++) {
        const r = st.publishers[i].weight >= 1.0 ? 20 : 12;
        ctx.save();
        ctx.strokeStyle = "#5DCAA5";
        ctx.lineWidth = st.publishers[i].weight >= 1.0 ? 2 : 1;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -frame * 0.8;
        ctx.beginPath();
        ctx.moveTo(pubX + r + 4, pubYs[i]);
        ctx.lineTo(aggX - 34, H / 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw line from aggregator to consumer
      ctx.save();
      ctx.strokeStyle = "#378ADD";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -frame * 0.8;
      ctx.beginPath();
      ctx.moveTo(aggX + 34, H / 2);
      ctx.lineTo(consX - 24, H / 2);
      ctx.stroke();
      ctx.restore();

      // Draw confidence band behind aggregator
      const bandH = 8 + confNorm * 60;
      const bandColor = confNorm > 0.4 ? "#EF9F27" : "#14F195";
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = bandColor;
      ctx.fillRect(aggX - 60, H / 2 - bandH / 2, 120, bandH);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = bandColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(aggX - 60, H / 2 - bandH / 2, 120, bandH);
      ctx.restore();

      // Draw publisher nodes
      for (let i = 0; i < 5; i++) {
        const p = st.publishers[i];
        const r = p.weight >= 1.0 ? 20 : 12;
        const glow = st.dragging === i ? 12 : 0;
        ctx.save();
        if (glow) {
          ctx.shadowColor = "#14F195";
          ctx.shadowBlur = glow;
        }
        ctx.beginPath();
        ctx.arc(pubX, pubYs[i], r, 0, Math.PI * 2);
        ctx.fillStyle = p.weight >= 1.0 ? "#1a2a1f" : "#1a1a22";
        ctx.fill();
        ctx.strokeStyle = p.weight >= 1.0 ? "#5DCAA5" : "#444";
        ctx.lineWidth = p.weight >= 1.0 ? 2 : 1;
        ctx.stroke();
        ctx.restore();

        // Label
        ctx.fillStyle = "#9B9990";
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Pub ${i + 1}`, pubX, pubYs[i] - r - 10);

        // Price
        ctx.fillStyle = "#E8E6E1";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText(`$${p.price.toFixed(2)}`, pubX, pubYs[i] + r + 14);

        // Weight indicator
        ctx.fillStyle = "#5F5E58";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText(p.weight >= 1.0 ? "w=1.0" : "w=0.5", pubX, pubYs[i] + r + 26);
      }

      // Draw aggregator node
      ctx.beginPath();
      ctx.arc(aggX, H / 2, 30, 0, Math.PI * 2);
      ctx.fillStyle = "#141419";
      ctx.fill();
      ctx.strokeStyle = "#14F195";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#14F195";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AGGREGATOR", aggX, H / 2 - 12);
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillText(`$${aggPrice.toFixed(2)}`, aggX, H / 2 + 6);

      // Confidence label
      ctx.fillStyle = bandColor;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(confNorm > 0.4 ? "LOW CONF" : "HIGH CONF", aggX, H / 2 + 50);
      ctx.fillStyle = "#5F5E58";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText(`spread: $${spread.toFixed(2)}`, aggX, H / 2 + 64);

      // Draw consumer node
      ctx.beginPath();
      ctx.arc(consX, H / 2, 20, 0, Math.PI * 2);
      ctx.fillStyle = "#141419";
      ctx.fill();
      ctx.strokeStyle = "#378ADD";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#378ADD";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillText("DeFi", consX, H / 2 - 6);
      ctx.fillText("Protocol", consX, H / 2 + 6);

      // Instruction text
      ctx.fillStyle = "#5F5E58";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Click & drag publishers to adjust price", W / 2, H - 16);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      obs.disconnect();
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
    };
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Oracle Price Aggregation</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block" }} />
      <div style={{ marginTop: 8, fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
        Weighted average from 5 publishers. Larger nodes have more weight. Drag a publisher far from others to widen the confidence band.
      </div>
    </div>
  );
}

function AMMvsCLOB() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [tradeSize, setTradeSize] = useState(10);
  const tradeSizeRef = useRef(10);

  useEffect(() => { tradeSizeRef.current = tradeSize; }, [tradeSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    // AMM: xy = k, k = 10000, x from 10 to 200
    const K = 10000;
    const ammLeft = 20, ammRight = W / 2 - 20;
    const ammTop = 60, ammBottom = H - 140;
    const ammW = ammRight - ammLeft, ammH = ammBottom - ammTop;

    // CLOB: order book
    const clobLeft = W / 2 + 20, clobRight = W - 20;
    const clobW = clobRight - clobLeft;
    const clobMidX = clobLeft + clobW / 2;

    // Base order book levels
    const baseBids = [
      { price: 99.5, depth: 50 }, { price: 99.0, depth: 80 },
      { price: 98.5, depth: 120 }, { price: 98.0, depth: 60 },
      { price: 97.5, depth: 90 }, { price: 97.0, depth: 40 },
      { price: 96.5, depth: 70 }, { price: 96.0, depth: 110 },
      { price: 95.5, depth: 30 }, { price: 95.0, depth: 55 },
    ];
    const baseAsks = [
      { price: 100.5, depth: 45 }, { price: 101.0, depth: 75 },
      { price: 101.5, depth: 100 }, { price: 102.0, depth: 55 },
      { price: 102.5, depth: 85 }, { price: 103.0, depth: 35 },
      { price: 103.5, depth: 65 }, { price: 104.0, depth: 95 },
      { price: 104.5, depth: 25 }, { price: 105.0, depth: 50 },
    ];

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      const ts = tradeSizeRef.current;

      // === Divider ===
      ctx.strokeStyle = "#222228";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // === Labels ===
      ctx.fillStyle = "#9B9990";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("AMM (xy = k)", (ammLeft + ammRight) / 2, 12);
      ctx.fillText("CLOB (Order Book)", clobMidX, 12);

      // === AMM Side ===
      // Draw axes
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ammLeft, ammBottom);
      ctx.lineTo(ammRight, ammBottom);
      ctx.moveTo(ammLeft, ammBottom);
      ctx.lineTo(ammLeft, ammTop);
      ctx.stroke();

      ctx.fillStyle = "#5F5E58";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Token A reserves", (ammLeft + ammRight) / 2, ammBottom + 14);
      ctx.save();
      ctx.translate(ammLeft - 12, (ammTop + ammBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Token B reserves", 0, 0);
      ctx.restore();

      // Draw curve
      const xMin = 20, xMax = 200;
      ctx.beginPath();
      ctx.strokeStyle = "#7F77DD";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 100; i++) {
        const x = xMin + (i / 100) * (xMax - xMin);
        const y = K / x;
        const px = ammLeft + ((x - xMin) / (xMax - xMin)) * ammW;
        const py = ammBottom - ((y - (K / xMax)) / (K / xMin - K / xMax)) * ammH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Starting point: x0=100
      const x0 = 100;
      const y0 = K / x0;
      const px0 = ammLeft + ((x0 - xMin) / (xMax - xMin)) * ammW;
      const py0 = ammBottom - ((y0 - K / xMax) / (K / xMin - K / xMax)) * ammH;

      // Trade: buy Token B by adding ts Token A
      const x1 = x0 + ts;
      const y1 = K / x1;
      const tokensOut = y0 - y1;
      const idealPrice = y0 / x0; // ideal exchange rate
      const idealOut = ts * idealPrice;
      const slippage = idealOut > 0 ? ((idealOut - tokensOut) / idealOut) * 100 : 0;
      const priceImpact = x0 > 0 ? (ts / x0) * 100 : 0;

      const px1 = ammLeft + ((Math.min(x1, xMax) - xMin) / (xMax - xMin)) * ammW;
      const py1 = ammBottom - ((y1 - K / xMax) / (K / xMin - K / xMax)) * ammH;

      // Highlight slippage region
      if (ts > 0) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#E24B4A";
        ctx.beginPath();
        // Draw area between curve and ideal line from x0 to x1
        const idealPy1 = py0 - (px1 - px0) * (idealPrice / ((K / xMin - K / xMax) / ammH * (xMax - xMin) / ammW));
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.lineTo(px1, Math.min(py0, Math.max(ammTop, py0 - ((px1 - px0) / ammW) * ammH * 0.5)));
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Arrow showing trade
        ctx.strokeStyle = "#EF9F27";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.stroke();
        ctx.setLineDash([]);

        // End point
        ctx.beginPath();
        ctx.arc(px1, py1, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#EF9F27";
        ctx.fill();
      }

      // Start point
      ctx.beginPath();
      ctx.arc(px0, py0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#14F195";
      ctx.fill();

      // AMM stats
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Price impact: ${priceImpact.toFixed(1)}%`, ammLeft + 8, ammBottom + 34);
      ctx.fillText(`Slippage: ${slippage.toFixed(2)}%`, ammLeft + 8, ammBottom + 50);
      ctx.fillStyle = "#7F77DD";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText(`x₀=${x0}  y₀=${y0.toFixed(1)}  out=${tokensOut.toFixed(2)}`, ammLeft + 8, ammBottom + 68);

      // === CLOB Side ===
      const levelH = 22;
      const bookTop = 80;
      const maxBarW = clobW / 2 - 30;
      const maxDepth = 130;

      // Compute CLOB consumption
      let remaining = ts * 5; // scale for order book
      const consumedAsks = baseAsks.map(a => {
        const consumed = Math.min(a.depth, remaining);
        remaining = Math.max(0, remaining - consumed);
        return { ...a, consumed, remaining: a.depth - consumed };
      });
      const totalConsumed = consumedAsks.reduce((s, a) => s + a.consumed, 0);
      const avgAskPrice = totalConsumed > 0 ? consumedAsks.reduce((s, a) => s + a.consumed * a.price, 0) / totalConsumed : baseAsks[0].price;
      const clobSlippage = totalConsumed > 0 ? ((avgAskPrice - baseAsks[0].price) / baseAsks[0].price) * 100 : 0;
      const clobImpact = totalConsumed > 0 ? ((consumedAsks.findLast(a => a.consumed > 0)?.price || baseAsks[0].price) - baseAsks[0].price) / baseAsks[0].price * 100 : 0;

      // Spread line
      ctx.strokeStyle = "#5F5E58";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(clobMidX, bookTop);
      ctx.lineTo(clobMidX, bookTop + 20 * levelH);
      ctx.stroke();

      ctx.fillStyle = "#E8E6E1";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("SPREAD", clobMidX, bookTop - 14);

      // Draw bid bars (left, green)
      ctx.textAlign = "right";
      for (let i = 0; i < baseBids.length; i++) {
        const b = baseBids[i];
        const y = bookTop + i * levelH;
        const barW = (b.depth / maxDepth) * maxBarW;
        ctx.fillStyle = "rgba(93, 202, 165, 0.3)";
        ctx.fillRect(clobMidX - 4 - barW, y + 2, barW, levelH - 4);
        ctx.strokeStyle = "#5DCAA5";
        ctx.lineWidth = 1;
        ctx.strokeRect(clobMidX - 4 - barW, y + 2, barW, levelH - 4);
        ctx.fillStyle = "#5DCAA5";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${b.price.toFixed(1)}`, clobMidX - 8 - barW, y + levelH / 2 + 3);
        ctx.textAlign = "left";
        ctx.fillStyle = "#5F5E58";
        ctx.fillText(`${b.depth}`, clobMidX - barW + 4, y + levelH / 2 + 3);
      }

      // Draw ask bars (right, red) with consumption
      for (let i = 0; i < consumedAsks.length; i++) {
        const a = consumedAsks[i];
        const y = bookTop + i * levelH;
        const origBarW = (a.remaining / maxDepth) * maxBarW;
        const consumedBarW = (a.consumed / maxDepth) * maxBarW;

        // Remaining depth
        if (a.remaining > 0) {
          ctx.fillStyle = "rgba(226, 75, 74, 0.3)";
          ctx.fillRect(clobMidX + 4, y + 2, origBarW, levelH - 4);
          ctx.strokeStyle = "#E24B4A";
          ctx.lineWidth = 1;
          ctx.strokeRect(clobMidX + 4, y + 2, origBarW, levelH - 4);
        }
        // Consumed portion (flash)
        if (a.consumed > 0) {
          ctx.fillStyle = "rgba(226, 75, 74, 0.1)";
          ctx.fillRect(clobMidX + 4 + origBarW, y + 2, consumedBarW, levelH - 4);
          ctx.strokeStyle = "rgba(226, 75, 74, 0.3)";
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(clobMidX + 4 + origBarW, y + 2, consumedBarW, levelH - 4);
          ctx.setLineDash([]);
        }

        ctx.fillStyle = "#E24B4A";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        const totalBarW = origBarW + consumedBarW;
        ctx.fillText(`${a.price.toFixed(1)}`, clobMidX + 8 + totalBarW, y + levelH / 2 + 3);
        ctx.textAlign = "right";
        ctx.fillStyle = "#5F5E58";
        ctx.fillText(`${a.remaining}/${a.depth | 0}`, clobMidX + totalBarW + 2, y + levelH / 2 + 3);
      }

      // CLOB stats
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Price impact: ${clobImpact.toFixed(1)}%`, clobLeft + 8, ammBottom + 34);
      ctx.fillText(`Slippage: ${clobSlippage.toFixed(2)}%`, clobLeft + 8, ammBottom + 50);

      // Bottom comparison
      ctx.fillStyle = "#9B9990";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const compY = H - 20;
      ctx.fillStyle = "#7F77DD";
      ctx.fillText(`AMM slippage: ${slippage.toFixed(2)}%`, W / 4, compY);
      ctx.fillStyle = "#E24B4A";
      ctx.fillText(`CLOB slippage: ${clobSlippage.toFixed(2)}%`, W * 3 / 4, compY);
      const winner = slippage < clobSlippage ? "AMM" : clobSlippage < slippage ? "CLOB" : "TIE";
      ctx.fillStyle = "#14F195";
      ctx.fillText(`Better: ${winner}`, W / 2, compY);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>AMM vs CLOB Comparison</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>Trade Size: {tradeSize}</span>
        <input type="range" min={1} max={80} value={tradeSize} onChange={e => setTradeSize(Number(e.target.value))} style={{ flex: 1, maxWidth: 300, accentColor: "#7F77DD" }} />
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
          AMM slippage grows quadratically. CLOB grows more linearly as levels are consumed.
        </span>
      </div>
    </div>
  );
}

function JupiterRouteOptimizer() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [amount, setAmount] = useState(1000);
  const [singleMode, setSingleMode] = useState(false);
  const [routing, setRouting] = useState(false);
  const [routed, setRouted] = useState(false);
  const stateRef = useRef({ frame: 0, scanStart: 0, particles: [], routeResult: null });

  const amountRef = useRef(1000);
  const singleRef = useRef(false);
  const routingRef = useRef(false);
  const routedRef = useRef(false);

  useEffect(() => { amountRef.current = amount; }, [amount]);
  useEffect(() => { singleRef.current = singleMode; }, [singleMode]);
  useEffect(() => { routingRef.current = routing; }, [routing]);
  useEffect(() => { routedRef.current = routed; }, [routed]);

  const computeRoute = useCallback((amt, single) => {
    // Split route: better rates through distribution
    const slippageBase = Math.min(amt / 50000, 0.08);
    const splitRate = 6.82 * (amt / 1000) * (1 - slippageBase * 0.3);
    const singleRate = 6.82 * (amt / 1000) * (1 - slippageBase);
    const saved = singleRate > 0 ? ((splitRate - singleRate) / singleRate * 100) : 0;

    const splits = single
      ? [{ dex: 0, pct: 100, amount: amt }]
      : [
        { dex: 0, pct: 55, amount: Math.round(amt * 0.55) },
        { dex: 1, pct: 30, amount: Math.round(amt * 0.30) },
        { dex: 2, pct: 15, amount: Math.round(amt * 0.15) },
      ];

    return { splitRate: splitRate.toFixed(2), singleRate: singleRate.toFixed(2), saved: saved.toFixed(1), splits };
  }, []);

  const handleFindRoute = useCallback(() => {
    if (routingRef.current) return;
    setRouted(false);
    setRouting(true);
    const st = stateRef.current;
    st.scanStart = st.frame;
    st.particles = [];
    st.routeResult = computeRoute(amountRef.current, singleRef.current);
    setTimeout(() => {
      setRouting(false);
      setRouted(true);
    }, 2000);
  }, [computeRoute]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const st = stateRef.current;

    const usdcNode = { x: 80, y: H / 2, r: 28, label: `USDC`, color: "#378ADD" };
    const solNode = { x: W - 80, y: H / 2, r: 28, label: "SOL", color: "#14F195" };
    const dexNodes = [
      { x: W / 2, y: H / 2 - 100, r: 20, label: "Raydium", color: "#5DCAA5" },
      { x: W / 2 + 120, y: H / 2, r: 20, label: "Orca", color: "#7F77DD" },
      { x: W / 2, y: H / 2 + 100, r: 20, label: "Meteora", color: "#EF9F27" },
      { x: W / 2 - 120, y: H / 2, r: 20, label: "Phoenix", color: "#D4537E" },
    ];

    function drawNode(n, glow) {
      ctx.save();
      if (glow) { ctx.shadowColor = n.color; ctx.shadowBlur = 12; }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "#141419";
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = n.color;
      ctx.font = `bold ${n.r > 22 ? 11 : 9}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y);
    }

    function drawLine(from, to, style, width, dash, dashOffset) {
      ctx.save();
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOffset || 0; }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      st.frame++;
      const isRouting = routingRef.current;
      const isRouted = routedRef.current;
      const amt = amountRef.current;

      // Draw faint connections always
      for (const dex of dexNodes) {
        drawLine(usdcNode, dex, "#222228", 1, [4, 8], 0);
        drawLine(dex, solNode, "#222228", 1, [4, 8], 0);
      }

      // Scanning animation
      if (isRouting) {
        const scanProgress = (st.frame - st.scanStart) / 120; // ~2s at 60fps
        for (const dex of dexNodes) {
          const pulse = Math.sin(st.frame * 0.1) * 0.3 + 0.7;
          drawLine(usdcNode, dex, dex.color, 2, [6, 6], -st.frame * 2);
          ctx.save();
          ctx.globalAlpha = pulse * 0.3;
          ctx.beginPath();
          ctx.arc(dex.x, dex.y, dex.r + 8 + Math.sin(st.frame * 0.15) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = dex.color;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Routed: show active paths with particles
      if (isRouted && st.routeResult) {
        const result = st.routeResult;
        for (const split of result.splits) {
          const dex = dexNodes[split.dex];
          // Solid lines for active routes
          drawLine(usdcNode, dex, dex.color, 2 + split.pct / 30, null, 0);
          drawLine(dex, solNode, dex.color, 2 + split.pct / 30, null, 0);

          // Amount labels on paths
          const midX1 = (usdcNode.x + dex.x) / 2;
          const midY1 = (usdcNode.y + dex.y) / 2 - 10;
          ctx.fillStyle = dex.color;
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${split.amount}`, midX1, midY1);

          // Particles flowing along paths
          const phase1 = ((st.frame * 0.02) % 1);
          const phase2 = ((st.frame * 0.02 + 0.5) % 1);
          for (const p of [phase1, phase2]) {
            // USDC -> DEX
            const px1 = usdcNode.x + (dex.x - usdcNode.x) * p;
            const py1 = usdcNode.y + (dex.y - usdcNode.y) * p;
            ctx.beginPath();
            ctx.arc(px1, py1, 3, 0, Math.PI * 2);
            ctx.fillStyle = dex.color;
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;

            // DEX -> SOL
            const px2 = dex.x + (solNode.x - dex.x) * p;
            const py2 = dex.y + (solNode.y - dex.y) * p;
            ctx.beginPath();
            ctx.arc(px2, py2, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#14F195";
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }

        // Result display under SOL node
        const single = singleRef.current;
        ctx.fillStyle = "#E8E6E1";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(single ? `${result.singleRate} SOL` : `${result.splitRate} SOL`, solNode.x, solNode.y + solNode.r + 20);

        if (!single) {
          ctx.fillStyle = "#9B9990";
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillText(`Split: ${result.splitRate} | Single: ${result.singleRate} | Saved: ${result.saved}%`, W / 2, H - 20);
        }
      }

      // Draw nodes on top
      drawNode(usdcNode, isRouted);
      drawNode(solNode, isRouted);
      for (let i = 0; i < dexNodes.length; i++) {
        const isActive = isRouted && st.routeResult && st.routeResult.splits.some(s => s.dex === i);
        drawNode(dexNodes[i], isActive);
      }

      // USDC amount label
      ctx.fillStyle = "#378ADD";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${amt.toLocaleString()}`, usdcNode.x, usdcNode.y + usdcNode.r + 16);

      // Status text
      if (isRouting) {
        ctx.fillStyle = "#EF9F27";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("Scanning DEX routes...", W / 2, H - 20);
      } else if (!isRouted) {
        ctx.fillStyle = "#5F5E58";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("Click 'Find Route' to optimize", W / 2, H - 20);
      }

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Jupiter Route Optimizer</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handleFindRoute} disabled={routing} style={{ ...btnStyle, background: routing ? "#222228" : "#14F19522", borderColor: "#14F195", color: "#14F195" }}>
          {routing ? "Scanning..." : "Find Route"}
        </button>
        <button onClick={() => { setSingleMode(!singleMode); setRouted(false); }} style={{ ...btnStyle, background: singleMode ? "#D4537E22" : "#141419", borderColor: singleMode ? "#D4537E" : "#222228", color: singleMode ? "#D4537E" : "#E8E6E1" }}>
          {singleMode ? "Single DEX ON" : "Single DEX OFF"}
        </button>
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>Amount: {amount.toLocaleString()} USDC</span>
        <input type="range" min={100} max={100000} step={100} value={amount} onChange={e => { setAmount(Number(e.target.value)); setRouted(false); }} style={{ width: 160, accentColor: "#378ADD" }} />
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>Larger amounts show bigger savings from split routing</span>
      </div>
    </div>
  );
}

function LSTComposabilityBuilder() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [animDot, setAnimDot] = useState(-1);

  const steps = [
    { action: "Stake SOL", protocol: "Jito", desc: "10 SOL \u2192 10 JitoSOL", yieldLabel: "APY", yieldValue: "+7.2%", color: "#14F195", yieldNum: 7.2 },
    { action: "Collateralize", protocol: "Kamino", desc: "Lock 10 JitoSOL", yieldLabel: "Borrow power", yieldValue: "$1,500", color: "#5DCAA5", yieldNum: 0 },
    { action: "Borrow USDC", protocol: "MarginFi", desc: "Borrow 1,125 USDC (75% LTV)", yieldLabel: "Rate", yieldValue: "-4.1%", color: "#E24B4A", yieldNum: -4.1 },
    { action: "Swap to SOL", protocol: "Jupiter", desc: "1,125 USDC \u2192 7.5 SOL", yieldLabel: "Fee", yieldValue: "0.2%", color: "#378ADD", yieldNum: 0 },
    { action: "Provide LP", protocol: "Meteora", desc: "7.5 SOL \u2192 SOL/USDC LP", yieldLabel: "APY", yieldValue: "+12.4%", color: "#EF9F27", yieldNum: 12.4 },
  ];

  const handleNext = useCallback(() => {
    if (currentStep >= 4) return;
    const nextStep = currentStep + 1;
    setAnimDot(currentStep);
    setTimeout(() => {
      setAnimDot(-1);
      setCurrentStep(nextStep);
    }, 400);
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(-1);
    setAnimDot(-1);
  }, []);

  // Compute running yield
  const yieldLayers = [];
  let netApy = 0;
  for (let i = 0; i <= Math.min(currentStep, 4); i++) {
    const s = steps[i];
    if (s.yieldNum !== 0) {
      yieldLayers.push({ label: `${s.protocol}: ${s.yieldValue}`, value: s.yieldNum });
      netApy += s.yieldNum;
    }
  }

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>LST Composability Builder</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", padding: 24, minHeight: 500, display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Left: Step Cards */}
        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            const isDimmed = i > currentStep;
            return (
              <div key={i} style={{
                position: "relative",
                padding: "14px 16px",
                borderRadius: 10,
                border: `1px solid ${isActive ? "#14F195" : isCompleted ? "#14F19544" : "#222228"}`,
                background: isActive ? "rgba(20, 241, 149, 0.05)" : "#141419",
                boxShadow: isActive ? "0 0 20px rgba(20, 241, 149, 0.1)" : "none",
                opacity: isDimmed ? 0.4 : 1,
                transition: "all 0.3s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Step indicator */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCompleted ? "#14F195" : isActive ? "rgba(20, 241, 149, 0.2)" : "#1a1a22",
                    color: isCompleted ? "#0A0A0E" : isActive ? "#14F195" : "#5F5E58",
                    fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {isCompleted ? "\u2713" : i + 1}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E1", fontFamily: "'JetBrains Mono', monospace" }}>{step.action}</span>
                      <span style={{ fontSize: 10, color: step.color, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: `${step.color}15`, borderRadius: 4 }}>{step.protocol}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{step.desc}</div>
                    <div style={{ fontSize: 10, color: step.color, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{step.yieldLabel}: {step.yieldValue}</div>
                  </div>
                </div>

                {/* Animated dot flowing to next step */}
                {animDot === i && i < 4 && (
                  <div style={{
                    position: "absolute",
                    left: 26, bottom: -12,
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: "#14F195",
                    boxShadow: "0 0 8px rgba(20, 241, 149, 0.6)",
                    animation: "none",
                    zIndex: 10,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Summary Panel */}
        <div style={{ width: 220, minWidth: 200, flexShrink: 0, padding: "16px", background: "#141419", borderRadius: 10, border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#5F5E58", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>Yield Summary</div>

          <div style={{ fontSize: 11, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #222228" }}>
            Starting: 10 SOL ($1,500)
          </div>

          {yieldLayers.map((layer, i) => (
            <div key={i} style={{
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              color: layer.value > 0 ? "#14F195" : "#E24B4A",
              marginBottom: 8,
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{layer.label.split(":")[0]}</span>
              <span>{layer.value > 0 ? "+" : ""}{layer.value}%</span>
            </div>
          ))}

          {currentStep >= 0 && (
            <div style={{
              marginTop: 16, paddingTop: 12, borderTop: "1px solid #222228",
              fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: netApy > 0 ? "#14F195" : "#E24B4A",
            }}>
              Net APY: {netApy > 0 ? "+" : ""}{netApy.toFixed(1)}%
            </div>
          )}

          {currentStep >= 4 && (
            <div style={{
              marginTop: 12, padding: "8px 10px", borderRadius: 8,
              background: "rgba(20, 241, 149, 0.08)", border: "1px solid rgba(20, 241, 149, 0.2)",
            }}>
              <div style={{ fontSize: 9, color: "#14F195", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>Breakdown</div>
              <div style={{ fontSize: 10, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                7.2% staking<br />
                +12.4% LP yield<br />
                -4.1% borrow cost<br />
                <span style={{ color: "#14F195", fontWeight: 700 }}>=15.5% net</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleNext} disabled={currentStep >= 4} style={{ ...btnStyle, background: currentStep >= 4 ? "#222228" : "#14F19522", borderColor: "#14F195", color: "#14F195", opacity: currentStep >= 4 ? 0.5 : 1 }}>
          {currentStep < 0 ? "Start" : currentStep >= 4 ? "Complete" : "Next Step"}
        </button>
        <button onClick={handleReset} style={btnStyle}>Reset</button>
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
          {currentStep < 0 ? "Walk through a 5-layer DeFi yield stack" : `Step ${currentStep + 1} of 5`}
        </span>
      </div>
    </div>
  );
}

function StablecoinPegMechanism() {
  const [price, setPrice] = useState(1.00);
  const [supply, setSupply] = useState(25.0);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const returningRef = useRef(null);

  // Animate price back toward $1.00 when released
  useEffect(() => {
    if (dragging) {
      if (returningRef.current) { clearInterval(returningRef.current); returningRef.current = null; }
      return;
    }
    if (Math.abs(price - 1.00) < 0.001) return;
    returningRef.current = setInterval(() => {
      setPrice(prev => {
        const diff = 1.00 - prev;
        if (Math.abs(diff) < 0.002) { clearInterval(returningRef.current); returningRef.current = null; return 1.00; }
        return prev + diff * 0.08;
      });
    }, 30);
    return () => { if (returningRef.current) clearInterval(returningRef.current); };
  }, [dragging]);

  // Supply changes with price deviation
  useEffect(() => {
    if (price > 1.005) setSupply(s => Math.min(30.0, s + 0.005));
    else if (price < 0.995) setSupply(s => Math.max(20.0, s - 0.005));
  }, [price]);

  const getXFromPrice = (p) => {
    const pct = (p - 0.90) / 0.20; // 0.90 to 1.10 range
    return pct * 100;
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newPrice = 0.90 + x * 0.20;
    setPrice(Math.max(0.90, Math.min(1.10, newPrice)));
  }, [dragging]);

  const handleMouseUp = useCallback(() => { setDragging(false); }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const deviation = price - 1.00;
  const isAbove = deviation > 0.005;
  const isBelow = deviation < -0.005;
  const dotX = getXFromPrice(price);

  const arrowKeyframes = `@keyframes flowRight { 0% { transform: translateX(-10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(10px); opacity: 0; } }`;

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{arrowKeyframes}</style>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Stablecoin Peg Mechanism</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", padding: 24, height: 350, display: "flex", flexDirection: "column", justifyContent: "space-between", userSelect: "none" }}>
        {/* Status text */}
        <div style={{ textAlign: "center", minHeight: 48 }}>
          {isAbove && (
            <div style={{ fontSize: 13, color: "#EF9F27", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              Arbitrageurs mint new USDC at $1.00 and sell at ${price.toFixed(3)}, pushing price down
            </div>
          )}
          {isBelow && (
            <div style={{ fontSize: 13, color: "#14F195", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              Arbitrageurs buy USDC at ${price.toFixed(3)} and redeem at $1.00, pushing price up
            </div>
          )}
          {!isAbove && !isBelow && (
            <div style={{ fontSize: 13, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              Drag the price dot left or right to see arbitrage in action
            </div>
          )}
        </div>

        {/* Arrow flow visualization */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, minHeight: 50, flexWrap: "wrap" }}>
          {isAbove && (
            <>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#EF9F2720", border: "1px solid #EF9F2740", color: "#EF9F27", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Mint USDC</div>
              <div style={{ color: "#EF9F27", fontSize: 18, animation: "flowRight 1s infinite" }}>→</div>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#EF9F2720", border: "1px solid #EF9F2740", color: "#EF9F27", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Sell on market</div>
              <div style={{ color: "#EF9F27", fontSize: 18, animation: "flowRight 1s infinite 0.3s" }}>→</div>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#EF9F2720", border: "1px solid #EF9F2740", color: "#EF9F27", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Price pushed ↓</div>
            </>
          )}
          {isBelow && (
            <>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#14F19520", border: "1px solid #14F19540", color: "#14F195", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Buy USDC</div>
              <div style={{ color: "#14F195", fontSize: 18, animation: "flowRight 1s infinite" }}>→</div>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#14F19520", border: "1px solid #14F19540", color: "#14F195", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Redeem for $1</div>
              <div style={{ color: "#14F195", fontSize: 18, animation: "flowRight 1s infinite 0.3s" }}>→</div>
              <div style={{ padding: "6px 12px", borderRadius: 6, background: "#14F19520", border: "1px solid #14F19540", color: "#14F195", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Price pushed ↑</div>
            </>
          )}
        </div>

        {/* Price line */}
        <div ref={containerRef} style={{ position: "relative", height: 60, margin: "0 20px", cursor: dragging ? "grabbing" : "default" }}>
          {/* Horizontal line */}
          <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: 2, background: "#222228" }} />
          {/* Center dashed line ($1.00) */}
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", height: 40, width: 0, borderLeft: "2px dashed #5F5E58" }} />
          <div style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>$1.00</div>
          {/* Price labels at edges */}
          <div style={{ position: "absolute", top: 52, left: 0, fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>$0.90</div>
          <div style={{ position: "absolute", top: 52, right: 0, fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>$1.10</div>
          {/* Draggable dot */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              top: 18,
              left: `${dotX}%`,
              transform: "translateX(-50%)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: isAbove ? "#EF9F27" : isBelow ? "#14F195" : "#E8E6E1",
              boxShadow: `0 0 12px ${isAbove ? "#EF9F2780" : isBelow ? "#14F19580" : "#E8E6E140"}`,
              cursor: "grab",
              zIndex: 10,
              transition: dragging ? "none" : "left 0.05s",
            }}
          />
          {/* Price label above dot */}
          <div style={{
            position: "absolute",
            top: 0,
            left: `${dotX}%`,
            transform: "translateX(-50%)",
            fontSize: 12,
            fontWeight: 700,
            color: isAbove ? "#EF9F27" : isBelow ? "#14F195" : "#E8E6E1",
            fontFamily: "'JetBrains Mono', monospace",
            transition: dragging ? "none" : "left 0.05s",
          }}>
            ${price.toFixed(3)}
          </div>
        </div>

        {/* Supply counter */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>USDC Supply</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#E8E6E1", fontFamily: "'JetBrains Mono', monospace" }}>
              {supply.toFixed(1)}B
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>Action</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: isAbove ? "#EF9F27" : isBelow ? "#14F195" : "#5F5E58" }}>
              {isAbove ? "MINTING ↑" : isBelow ? "BURNING ↓" : "STABLE"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>Deviation</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: Math.abs(deviation) > 0.005 ? "#D4537E" : "#14F195" }}>
              {deviation >= 0 ? "+" : ""}{(deviation * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
        Drag the price dot to see how mint/burn arbitrage keeps USDC pegged to $1.00. Release to watch it snap back.
      </div>
    </div>
  );
}

function WalletTransactionFlow() {
  const [currentStage, setCurrentStage] = useState(-1);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef(null);

  const stages = [
    { name: "Phantom Wallet", desc: "Signs swap instruction", icon: "🔐", color: "#7F77DD" },
    { name: "Jupiter API", desc: "Finds optimal route across DEXs", icon: "🔀", color: "#EF9F27" },
    { name: "RPC Node (Helius)", desc: "Forwards tx via QUIC", icon: "📡", color: "#378ADD" },
    { name: "Validator (Leader)", desc: "Sequences in PoH, executes in Sealevel", icon: "⚡", color: "#14F195" },
    { name: "Network (Turbine)", desc: "Propagates block to all validators", icon: "🌐", color: "#5DCAA5" },
    { name: "Confirmed", desc: "2/3+ stake votes, tx is final", icon: "✅", color: "#C8F06E" },
  ];

  const timings = ["~50ms", "~30ms", "~100ms", "~200ms", "~20ms"];

  const startAnimation = useCallback(() => {
    setComplete(false);
    setCurrentStage(0);
    let stage = 0;
    timerRef.current = setInterval(() => {
      stage++;
      if (stage >= 6) {
        clearInterval(timerRef.current);
        setComplete(true);
        return;
      }
      setCurrentStage(stage);
    }, 1500);
  }, []);

  const handleReplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStage(-1);
    setComplete(false);
    setTimeout(startAnimation, 200);
  }, [startAnimation]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const pulseKeyframes = `@keyframes walletPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(20, 241, 149, 0.3); } 50% { box-shadow: 0 0 20px 4px rgba(20, 241, 149, 0.15); } }`;
  const fadeInKeyframes = `@keyframes walletFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`;

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <style>{pulseKeyframes}{fadeInKeyframes}</style>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Wallet Transaction Flow</div>
      <div style={{ background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", padding: 24, minHeight: 500 }}>
        {/* Stage grid: 2 rows of 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: "0 4px", alignItems: "start", marginBottom: 16 }}>
          {stages.slice(0, 3).map((stage, i) => {
            const isActive = currentStage === i;
            const isPast = currentStage > i;
            const isFuture = currentStage < i;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: "16px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${isActive ? stage.color : isPast ? stage.color + "60" : "#222228"}`,
                  background: isActive ? stage.color + "10" : "#141419",
                  opacity: isFuture && currentStage >= 0 ? 0.35 : 1,
                  transition: "all 0.4s ease",
                  animation: isActive ? "walletPulse 1.5s infinite" : "none",
                  textAlign: "center",
                  minWidth: 0,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{stage.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? stage.color : isPast ? stage.color : "#E8E6E1", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, wordBreak: "break-word" }}>{stage.name}</div>
                  <div style={{
                    fontSize: 10, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5,
                    opacity: isActive || isPast ? 1 : 0,
                    animation: isActive ? "walletFadeIn 0.4s ease" : "none",
                    minHeight: 30,
                  }}>
                    {(isActive || isPast) ? stage.desc : ""}
                  </div>
                </div>
                {i < 2 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 6px 0", minWidth: 50 }}>
                    <div style={{ fontSize: 16, color: isPast || (isActive && i < currentStage) ? stages[i].color : "#5F5E58", transition: "color 0.3s" }}>→</div>
                    <div style={{ fontSize: 9, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{timings[i]}</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Arrow connecting row 1 to row 2 */}
        <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 16, color: currentStage >= 3 ? "#14F195" : "#5F5E58", transition: "color 0.3s" }}>↓</div>
            <div style={{ fontSize: 9, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>{timings[2]}</div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: "0 4px", alignItems: "start", marginBottom: 20 }}>
          {stages.slice(3).map((stage, idx) => {
            const i = idx + 3;
            const isActive = currentStage === i;
            const isPast = currentStage > i;
            const isFuture = currentStage < i;
            return (
              <React.Fragment key={i}>
                <div style={{
                  padding: "16px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${isActive ? stage.color : isPast ? stage.color + "60" : "#222228"}`,
                  background: isActive ? stage.color + "10" : "#141419",
                  opacity: isFuture && currentStage >= 0 ? 0.35 : 1,
                  transition: "all 0.4s ease",
                  animation: isActive ? "walletPulse 1.5s infinite" : "none",
                  textAlign: "center",
                  minWidth: 0,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{stage.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? stage.color : isPast ? stage.color : "#E8E6E1", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, wordBreak: "break-word" }}>{stage.name}</div>
                  <div style={{
                    fontSize: 10, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5,
                    opacity: isActive || isPast ? 1 : 0,
                    animation: isActive ? "walletFadeIn 0.4s ease" : "none",
                    minHeight: 30,
                  }}>
                    {(isActive || isPast) ? stage.desc : ""}
                  </div>
                </div>
                {idx < 2 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 6px 0", minWidth: 50 }}>
                    <div style={{ fontSize: 16, color: isPast || (isActive && i < currentStage) ? stages[i].color : "#5F5E58", transition: "color 0.3s" }}>→</div>
                    <div style={{ fontSize: 9, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{timings[i - 1]}</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Total time */}
        <div style={{
          textAlign: "center", padding: "12px 16px", borderRadius: 8,
          background: complete ? "#14F19510" : "#141419",
          border: `1px solid ${complete ? "#14F19540" : "#222228"}`,
          transition: "all 0.5s ease",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: complete ? "#14F195" : "#E8E6E1" }}>
            {complete ? "✓ Total: ~400ms from tap to finality" : currentStage >= 0 ? `Stage ${currentStage + 1} of 6...` : "Tap \"Start\" to trace a swap through the stack"}
          </div>
        </div>

        {/* Narration */}
        {currentStage >= 0 && (
          <div style={{
            textAlign: "center", fontSize: 12, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace",
            animation: "walletFadeIn 0.3s ease", minHeight: 20,
          }}>
            {stages[Math.min(currentStage, 5)].desc}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        {currentStage < 0 && (
          <button onClick={startAnimation} style={{ ...btnStyle, background: "#14F19522", borderColor: "#14F195", color: "#14F195" }}>
            Start
          </button>
        )}
        {(complete || currentStage >= 0) && (
          <button onClick={handleReplay} style={{ ...btnStyle, background: "#14F19522", borderColor: "#14F195", color: "#14F195" }}>
            Replay
          </button>
        )}
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
          Step-by-step: what happens when you tap &quot;Swap&quot; in Phantom
        </span>
      </div>
    </div>
  );
}

function DePINCoverageMapper() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const deployedRef = useRef(new Set());
  const particlesRef = useRef([]);
  const [redrawCount, setRedrawCount] = useState(0);

  const COLS = 8, ROWS = 6;
  const HEX_W = 44;
  const HEX_H = HEX_W * Math.sqrt(3) / 2;
  const TOTAL_HEXES = COLS * ROWS;

  const hexKey = (c, r) => `${c},${r}`;

  const getHexCenter = useCallback((col, row, offsetX, offsetY) => {
    const x = offsetX + col * HEX_W * 0.75 + HEX_W / 2;
    const y = offsetY + row * HEX_H + (col % 2 ? HEX_H / 2 : 0) + HEX_H / 2;
    return { x, y };
  }, []);

  const getAdjacentKeys = useCallback((col, row) => {
    const adj = [];
    const dirs = col % 2
      ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, 1]]
      : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]];
    for (const [dc, dr] of dirs) {
      const nc = col + dc, nr = row + dr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) adj.push(hexKey(nc, nr));
    }
    return adj;
  }, []);

  const handleReset = useCallback(() => {
    deployedRef.current = new Set();
    particlesRef.current = [];
    setRedrawCount(c => c + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const gridW = COLS * HEX_W * 0.75 + HEX_W * 0.25;
    const gridH = ROWS * HEX_H + HEX_H / 2;
    const offX = (W - gridW) / 2;
    const offY = (H - gridH) / 2 + 20;

    function drawHex(cx, cy, r, fill, stroke, lw) {
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const angle = Math.PI / 180 * (60 * a);
        const hx = cx + r * Math.cos(angle);
        const hy = cy + r * Math.sin(angle);
        if (a === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }

    function hitTest(mx, my) {
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const center = getHexCenter(c, r, offX, offY);
          const dx = mx - center.x, dy = my - center.y;
          if (dx * dx + dy * dy < (HEX_W / 2 - 2) * (HEX_W / 2 - 2)) return { col: c, row: r };
        }
      }
      return null;
    }

    function onClick(e) {
      const rect2 = canvas.getBoundingClientRect();
      const mx = e.clientX - rect2.left, my = e.clientY - rect2.top;
      const hit = hitTest(mx, my);
      if (!hit) return;
      const key = hexKey(hit.col, hit.row);
      if (deployedRef.current.has(key)) return;
      deployedRef.current.add(key);
      // Burst particles
      const center = getHexCenter(hit.col, hit.row, offX, offY);
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
        particlesRef.current.push({
          x: center.x, y: center.y,
          vx: Math.cos(angle) * (1.5 + Math.random() * 2),
          vy: Math.sin(angle) * (1.5 + Math.random() * 2),
          life: 1.0,
        });
      }
      setRedrawCount(c => c + 1);
    }

    canvas.addEventListener("click", onClick);

    function getCoveredSet() {
      const covered = new Set();
      for (const key of deployedRef.current) {
        const [c, r] = key.split(",").map(Number);
        covered.add(key);
        for (const ak of getAdjacentKeys(c, r)) covered.add(ak);
      }
      return covered;
    }

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);

      const deployed = deployedRef.current;
      const covered = getCoveredSet();

      // Compute stats
      const hotspotCount = deployed.size;
      const coveragePct = Math.round((covered.size / TOTAL_HEXES) * 100);
      let totalReward = 0, rewardCount = 0;
      for (const key of deployed) {
        const [c, r] = key.split(",").map(Number);
        const adjKeys = getAdjacentKeys(c, r);
        const neighborDeployed = adjKeys.filter(k => deployed.has(k) && k !== key).length;
        const mult = neighborDeployed > 0 ? 0.5 : 1.0;
        totalReward += mult;
        rewardCount++;
      }
      const avgReward = rewardCount > 0 ? (totalReward / rewardCount).toFixed(2) : "0.00";

      // Stats bar
      ctx.fillStyle = "#E8E6E1";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Hotspots: ${hotspotCount}  |  Coverage: ${coveragePct}%  |  Avg reward: ${avgReward} tokens/epoch`, 16, 14);

      // Draw hexes
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const center = getHexCenter(c, r, offX, offY);
          const key = hexKey(c, r);
          const isDeployed = deployed.has(key);
          const isCovered = covered.has(key) && !isDeployed;

          if (isDeployed) {
            drawHex(center.x, center.y, HEX_W / 2 - 1, "#14F195", "#14F195", 2);
            // Multiplier
            const adjKeys = getAdjacentKeys(c, r);
            const neighborDeployed = adjKeys.filter(k => deployed.has(k)).length;
            const mult = neighborDeployed > 0 ? "0.5x" : "1.0x";
            ctx.fillStyle = "#0A0A0E";
            ctx.font = "bold 10px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(mult, center.x, center.y);
          } else if (isCovered) {
            drawHex(center.x, center.y, HEX_W / 2 - 1, "rgba(20, 241, 149, 0.12)", "#14F19540", 1);
          } else {
            drawHex(center.x, center.y, HEX_W / 2 - 1, null, "#222228", 1);
          }
        }
      }

      // Draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.025;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = "#14F195";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Instruction text
      ctx.fillStyle = "#5F5E58";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Click hexes to deploy hotspots. Adjacent hotspots get reduced rewards.", W / 2, H - 14);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      obs.disconnect();
      canvas.removeEventListener("click", onClick);
    };
  }, [redrawCount, getHexCenter, getAdjacentKeys]);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>DePIN Coverage Mapper</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block", cursor: "pointer" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleReset} style={btnStyle}>Reset</button>
        <span style={{ fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
          Deploy hotspots to maximize coverage and rewards. Overlapping coverage reduces earnings.
        </span>
      </div>
    </div>
  );
}

function AgentDecisionLoop() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);
  const [marketMode, setMarketMode] = useState("volatile");
  const marketRef = useRef("volatile");
  const [stats, setStats] = useState({ cycles: 0, opportunities: 0, profit: 0 });
  const statsRef = useRef({ cycles: 0, opportunities: 0, profit: 0 });

  useEffect(() => { marketRef.current = marketMode; }, [marketMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.28;

    const stageNodes = [
      { label: "Observe", color: "#378ADD", angle: -Math.PI / 2 },
      { label: "Evaluate", color: "#7F77DD", angle: 0 },
      { label: "Execute", color: "#EF9F27", angle: Math.PI / 2 },
      { label: "Collect", color: "#14F195", angle: Math.PI },
    ];

    for (const node of stageNodes) {
      node.x = cx + Math.cos(node.angle) * radius;
      node.y = cy + Math.sin(node.angle) * radius;
    }

    if (!stateRef.current) {
      stateRef.current = {
        agentStage: 0,
        stageTimer: 0,
        stageDuration: 700,
        agentProgress: 0,
        lastExecuteResult: null,
        priceParticles: [],
        profitParticles: [],
        textFlash: null,
        textFlashTimer: 0,
        executeParticle: null,
      };
    }
    const st = stateRef.current;

    function drawCurvedArrow(from, to, color) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const perpX = -dy * 0.15, perpY = dx * 0.15;
      const cpx = midX + perpX, cpy = midY + perpY;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cpx, cpy, to.x, to.y);
      ctx.stroke();
      ctx.restore();

      // Arrowhead
      const t = 0.85;
      const ax = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cpx + t * t * to.x;
      const ay = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cpy + t * t * to.y;
      const t2 = 0.87;
      const bx = (1 - t2) * (1 - t2) * from.x + 2 * (1 - t2) * t2 * cpx + t2 * t2 * to.x;
      const by = (1 - t2) * (1 - t2) * from.y + 2 * (1 - t2) * t2 * cpy + t2 * t2 * to.y;
      const arrAngle = Math.atan2(by - ay, bx - ax);
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(arrAngle) * 8, ay + Math.sin(arrAngle) * 8);
      ctx.lineTo(ax + Math.cos(arrAngle + 2.5) * 6, ay + Math.sin(arrAngle + 2.5) * 6);
      ctx.lineTo(ax + Math.cos(arrAngle - 2.5) * 6, ay + Math.sin(arrAngle - 2.5) * 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function getPositionOnCurve(from, to, t) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = to.x - from.x, dy = to.y - from.y;
      const perpX = -dy * 0.15, perpY = dx * 0.15;
      const cpx = midX + perpX, cpy = midY + perpY;
      const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cpx + t * t * to.x;
      const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cpy + t * t * to.y;
      return { x, y };
    }

    let lastTime = performance.now();

    function loop(now) {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      const dt = now - lastTime;
      lastTime = now;
      ctx.clearRect(0, 0, W, H);

      const isVolatile = marketRef.current === "volatile";
      st.stageDuration = isVolatile ? 700 : 1500;

      // Draw arrows between stages
      for (let i = 0; i < 4; i++) {
        const from = stageNodes[i];
        const to = stageNodes[(i + 1) % 4];
        drawCurvedArrow(from, to, "#5F5E58");
      }

      // Draw center target
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#141419";
      ctx.fill();
      ctx.strokeStyle = "#5F5E58";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#5F5E58";
      ctx.font = "bold 7px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ON-", cx, cy - 4);
      ctx.fillText("CHAIN", cx, cy + 4);

      // Draw stage nodes
      for (let i = 0; i < 4; i++) {
        const node = stageNodes[i];
        const isActive = st.agentStage === i;

        ctx.save();
        if (isActive) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? node.color + "20" : "#141419";
        ctx.fill();
        ctx.strokeStyle = isActive ? node.color : node.color + "60";
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = isActive ? node.color : node.color + "AA";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label.toUpperCase(), node.x, node.y);
      }

      // Stage-specific effects
      if (st.agentStage === 0) {
        // Observe: streaming price numbers from the right
        if (Math.random() < 0.15) {
          const node = stageNodes[0];
          st.priceParticles.push({
            x: node.x + 60 + Math.random() * 40,
            y: node.y - 15 + Math.random() * 30,
            text: "$" + (140 + Math.random() * 20).toFixed(1),
            life: 1.0,
          });
        }
        for (let i = st.priceParticles.length - 1; i >= 0; i--) {
          const p = st.priceParticles[i];
          p.x -= 0.8;
          p.life -= 0.02;
          if (p.life <= 0) { st.priceParticles.splice(i, 1); continue; }
          ctx.globalAlpha = p.life * 0.6;
          ctx.fillStyle = "#378ADD";
          ctx.font = "9px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
          ctx.globalAlpha = 1;
        }
      } else {
        st.priceParticles = [];
      }

      if (st.agentStage === 1) {
        // Evaluate: decision branch
        const node = stageNodes[1];
        ctx.fillStyle = "#7F77DD";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("Profitable?", node.x + 44, node.y - 10);
        ctx.fillStyle = "#14F195";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("Yes ↓", node.x + 44, node.y + 4);
        ctx.fillStyle = "#E24B4A";
        ctx.fillText("No →", node.x + 44, node.y + 16);
      }

      if (st.agentStage === 2 && st.lastExecuteResult !== null) {
        const node = stageNodes[2];
        if (st.lastExecuteResult) {
          // Execute particle toward center
          if (!st.executeParticle) {
            st.executeParticle = { x: node.x, y: node.y, progress: 0 };
          }
          st.executeParticle.progress += 0.03;
          if (st.executeParticle.progress <= 1) {
            const px = node.x + (cx - node.x) * st.executeParticle.progress;
            const py = node.y + (cy - node.y) * st.executeParticle.progress;
            ctx.save();
            ctx.shadowColor = "#EF9F27";
            ctx.shadowBlur = 8;
            ctx.fillStyle = "#EF9F27";
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        } else {
          ctx.fillStyle = "#E24B4A";
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("PASS", node.x, node.y + 40);
        }
      }

      if (st.agentStage === 3 && st.lastExecuteResult) {
        // Collect: gold particles flowing to agent
        if (Math.random() < 0.2) {
          const node = stageNodes[3];
          st.profitParticles.push({
            x: cx + (Math.random() - 0.5) * 20,
            y: cy + (Math.random() - 0.5) * 20,
            tx: node.x, ty: node.y,
            progress: 0,
          });
        }
        for (let i = st.profitParticles.length - 1; i >= 0; i--) {
          const p = st.profitParticles[i];
          p.progress += 0.03;
          if (p.progress >= 1) { st.profitParticles.splice(i, 1); continue; }
          const px = p.x + (p.tx - p.x) * p.progress;
          const py = p.y + (p.ty - p.y) * p.progress;
          ctx.globalAlpha = 1 - p.progress;
          ctx.fillStyle = "#EF9F27";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (st.agentStage !== 3) {
        st.profitParticles = [];
      }

      // Text flash
      if (st.textFlash && st.textFlashTimer > 0) {
        st.textFlashTimer -= dt;
        ctx.globalAlpha = Math.min(1, st.textFlashTimer / 300);
        ctx.fillStyle = st.textFlash.color;
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.textFlash.text, cx, cy + 40);
        ctx.globalAlpha = 1;
      }

      // Agent dot traveling between stages
      st.stageTimer += dt;
      if (st.stageTimer >= st.stageDuration) {
        st.stageTimer = 0;
        const prevStage = st.agentStage;
        st.executeParticle = null;

        if (prevStage === 1) {
          // Decide outcome at Evaluate
          const yesChance = isVolatile ? 0.7 : 0.2;
          st.lastExecuteResult = Math.random() < yesChance;
        }

        if (prevStage === 3) {
          // End of cycle
          const s = statsRef.current;
          s.cycles++;
          if (st.lastExecuteResult) {
            s.opportunities++;
            const p = isVolatile ? 0.02 + Math.random() * 0.08 : 0.01 + Math.random() * 0.03;
            s.profit += p;
          }
          setStats({ ...s });
          st.lastExecuteResult = null;
        }

        st.agentStage = (st.agentStage + 1) % 4;
        st.agentProgress = 0;
      }

      // Draw agent dot traveling on curve
      st.agentProgress = st.stageTimer / st.stageDuration;
      const fromNode = stageNodes[st.agentStage];
      const toNode = stageNodes[(st.agentStage + 1) % 4];
      const agentPos = st.agentProgress < 0.3
        ? { x: fromNode.x, y: fromNode.y }
        : getPositionOnCurve(fromNode, toNode, (st.agentProgress - 0.3) / 0.7);

      ctx.save();
      ctx.shadowColor = "#14F195";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#14F195";
      ctx.beginPath();
      ctx.arc(agentPos.x, agentPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Agent Decision Loop</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block" }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setMarketMode(m => m === "volatile" ? "stable" : "volatile")}
          style={{
            ...btnStyle,
            background: marketMode === "volatile" ? "#EF9F2722" : "#378ADD22",
            borderColor: marketMode === "volatile" ? "#EF9F27" : "#378ADD",
            color: marketMode === "volatile" ? "#EF9F27" : "#378ADD",
          }}
        >
          {marketMode === "volatile" ? "Volatile Market" : "Stable Market"}
        </button>
        <span style={{ fontSize: 11, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace" }}>
          Cycles: {stats.cycles} | Opportunities: {stats.opportunities} | Profit: {stats.profit.toFixed(3)} SOL
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: "#5F5E58", fontFamily: "'JetBrains Mono', monospace" }}>
        {marketMode === "volatile" ? "70% chance of profitable opportunity, faster cycles" : "20% chance of profitable opportunity, slower cycles"}
      </div>
    </div>
  );
}

function FullEcosystemFlow() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);
  const [narration, setNarration] = useState("Press \"Swap 100 USDC → SOL\" to begin");
  const [animating, setAnimating] = useState(false);
  const [complete, setComplete] = useState(false);
  const animatingRef = useRef(false);

  const layers = [
    { name: "Wallet Layer", protocols: "Phantom", color: "#7F77DD", narration: "Phantom signs the swap transaction..." },
    { name: "RPC / Infrastructure", protocols: "Helius, QuickNode", color: "#378ADD", narration: "Helius forwards via QUIC to the current leader..." },
    { name: "Consensus", protocols: "PoH, Tower BFT", color: "#D4537E", narration: "Proof of History timestamps the transaction..." },
    { name: "Execution", protocols: "Sealevel, Cloudbreak", color: "#5DCAA5", narration: "Sealevel executes in parallel across CPU cores..." },
    { name: "Protocol", protocols: "Jupiter, Raydium", color: "#EF9F27", narration: "Jupiter splits the route across multiple DEXs..." },
    { name: "Data", protocols: "Pyth Oracle", color: "#7F77DD", narration: "Pyth provides real-time SOL/USDC price data..." },
    { name: "Finality", protocols: "Turbine, Validators", color: "#14F195", narration: "Block propagated via Turbine, 2/3+ stake confirms..." },
  ];

  const startAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setAnimating(true);
    setComplete(false);
    const st = stateRef.current;
    if (st) {
      st.activeLayer = -1;
      st.particleY = 0;
      st.litLayers = new Set();
      st.splitParticles = [];
      st.finalBurst = [];
      st.animPhase = "start";
      st.phaseTimer = 0;
    }
  }, []);

  const handleReplay = useCallback(() => {
    setComplete(false);
    setNarration("Press \"Swap 100 USDC → SOL\" to begin");
    animatingRef.current = false;
    setAnimating(false);
    const st = stateRef.current;
    if (st) {
      st.activeLayer = -1;
      st.litLayers = new Set();
      st.splitParticles = [];
      st.finalBurst = [];
      st.animPhase = "idle";
      st.dimTimer = 0;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    const layerH = 72;
    const layerGap = 12;
    const topPad = 30;
    const sidePad = 30;

    if (!stateRef.current) {
      stateRef.current = {
        activeLayer: -1,
        particleY: 0,
        litLayers: new Set(),
        splitParticles: [],
        finalBurst: [],
        animPhase: "idle",
        phaseTimer: 0,
        dimTimer: 0,
      };
    }
    const st = stateRef.current;

    function getLayerRect(i) {
      const y = topPad + i * (layerH + layerGap);
      return { x: sidePad, y, w: W - sidePad * 2, h: layerH };
    }

    let lastTime = performance.now();
    const LAYER_PAUSE = 600; // ms per layer

    function loop(now) {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      const dt = now - lastTime;
      lastTime = now;
      ctx.clearRect(0, 0, W, H);

      // Draw all layers
      for (let i = 0; i < 7; i++) {
        const r = getLayerRect(i);
        const layer = layers[i];
        const isLit = st.litLayers.has(i);
        const isActive = st.activeLayer === i;

        ctx.save();
        // Background
        ctx.fillStyle = isActive ? layer.color + "15" : "#141419";
        ctx.strokeStyle = isLit ? layer.color + (isActive ? "FF" : "80") : "#222228";
        ctx.lineWidth = isActive ? 2 : 1;

        if (isActive) {
          ctx.shadowColor = layer.color;
          ctx.shadowBlur = 12;
        }

        // Rounded rect
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(r.x + radius, r.y);
        ctx.lineTo(r.x + r.w - radius, r.y);
        ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + radius, radius);
        ctx.lineTo(r.x + r.w, r.y + r.h - radius);
        ctx.arcTo(r.x + r.w, r.y + r.h, r.x + r.w - radius, r.y + r.h, radius);
        ctx.lineTo(r.x + radius, r.y + r.h);
        ctx.arcTo(r.x, r.y + r.h, r.x, r.y + r.h - radius, radius);
        ctx.lineTo(r.x, r.y + radius);
        ctx.arcTo(r.x, r.y, r.x + radius, r.y, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Layer name on left
        ctx.fillStyle = isLit ? layer.color : "#9B9990";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.name, r.x + 14, r.y + r.h / 2 - 8);

        // Layer number
        ctx.fillStyle = "#5F5E58";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText(`Layer ${i + 1}`, r.x + 14, r.y + r.h / 2 + 8);

        // Protocol names on right
        ctx.fillStyle = isLit ? "#E8E6E1" : "#5F5E58";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(layer.protocols, r.x + r.w - 14, r.y + r.h / 2);
      }

      // Animation logic
      if (animatingRef.current) {
        st.phaseTimer += dt;

        if (st.animPhase === "start") {
          st.activeLayer = 0;
          st.litLayers.add(0);
          setNarration(layers[0].narration);
          st.animPhase = "traversing";
          st.phaseTimer = 0;
        } else if (st.animPhase === "traversing") {
          if (st.phaseTimer >= LAYER_PAUSE) {
            st.phaseTimer = 0;
            const nextLayer = st.activeLayer + 1;
            if (nextLayer < 7) {
              st.activeLayer = nextLayer;
              st.litLayers.add(nextLayer);
              setNarration(layers[nextLayer].narration);

              // At Protocol layer (4), spawn split particles
              if (nextLayer === 4) {
                const r = getLayerRect(4);
                for (let p = 0; p < 3; p++) {
                  st.splitParticles.push({
                    x: r.x + r.w * 0.3 + p * r.w * 0.2,
                    y: r.y + r.h / 2,
                    vx: (p - 1) * 0.5,
                    vy: 0,
                    life: 1.0,
                    color: ["#EF9F27", "#5DCAA5", "#D4537E"][p],
                  });
                }
              }
            } else {
              // Animation complete
              st.animPhase = "finalized";
              st.phaseTimer = 0;
              st.activeLayer = -1;
              // Burst at bottom
              const r = getLayerRect(6);
              for (let p = 0; p < 24; p++) {
                const angle = (Math.PI * 2 * p) / 24;
                st.finalBurst.push({
                  x: r.x + r.w / 2,
                  y: r.y + r.h / 2,
                  vx: Math.cos(angle) * (2 + Math.random() * 3),
                  vy: Math.sin(angle) * (2 + Math.random() * 3),
                  life: 1.0,
                  color: "#14F195",
                });
              }
              setNarration("FINALIZED — 100 USDC swapped to SOL in ~400ms");
              animatingRef.current = false;
              setAnimating(false);
              setComplete(true);
            }
          }

          // Draw particle traveling between layers
          if (st.activeLayer >= 0 && st.activeLayer < 7) {
            const r = getLayerRect(st.activeLayer);
            const progress = st.phaseTimer / LAYER_PAUSE;
            const particleX = r.x + r.w / 2;
            const particleY = r.y + r.h * progress;

            ctx.save();
            ctx.shadowColor = layers[st.activeLayer].color;
            ctx.shadowBlur = 16;
            ctx.fillStyle = layers[st.activeLayer].color;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Split particles at Protocol layer
            if (st.activeLayer === 4 && st.splitParticles.length > 0) {
              for (const sp of st.splitParticles) {
                sp.x += sp.vx;
                ctx.save();
                ctx.shadowColor = sp.color;
                ctx.shadowBlur = 8;
                ctx.fillStyle = sp.color;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y + r.h * progress * 0.3, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
            }
          }
        }

        // Dim timer for after completion
        if (st.animPhase === "finalized") {
          st.dimTimer += dt;
        }
      }

      // Final burst particles
      for (let i = st.finalBurst.length - 1; i >= 0; i--) {
        const p = st.finalBurst[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.02;
        if (p.life <= 0) { st.finalBurst.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // "FINALIZED" text
      if (st.animPhase === "finalized" && st.dimTimer < 3000) {
        const r = getLayerRect(6);
        const alpha = Math.min(1, st.dimTimer / 400);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#14F195";
        ctx.font = "bold 16px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("FINALIZED", r.x + r.w / 2, r.y + r.h / 2);
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); obs.disconnect(); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E58", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Full Ecosystem Flow</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 700, background: "#0A0A0E", borderRadius: 10, border: "1px solid #222228", display: "block" }} />
      <div style={{ marginTop: 8, padding: "8px 14px", borderRadius: 8, background: "#141419", border: "1px solid #222228", minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: complete ? "#14F195" : "#9B9990", fontFamily: "'JetBrains Mono', monospace", fontWeight: complete ? 700 : 400 }}>
          {narration}
        </span>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        {!animating && !complete && (
          <button onClick={startAnimation} style={{ ...btnStyle, background: "#14F19522", borderColor: "#14F195", color: "#14F195" }}>
            Swap 100 USDC → SOL
          </button>
        )}
        {complete && (
          <button onClick={handleReplay} style={{ ...btnStyle, background: "#14F19522", borderColor: "#14F195", color: "#14F195" }}>
            Replay
          </button>
        )}
        {animating && (
          <span style={{ fontSize: 11, color: "#EF9F27", fontFamily: "'JetBrains Mono', monospace" }}>
            Tracing through 7 ecosystem layers...
          </span>
        )}
      </div>
    </div>
  );
}

/* ===== SECTION DISPATCHER ===== */

function Section({ section }) {
  switch (section.type) {
    case "text": return <TextBlock content={section.content} />;
    case "code": return <CodeBlock title={section.title} code={section.code} language={section.language} />;
    case "stats": return <StatsGrid items={section.items} />;
    case "diagram": return <DiagramFlow title={section.title} items={section.items} />;
    case "concepts": return <ConceptCards items={section.items} />;
    case "protocol-table": return <ProtocolTable protocols={section.protocols} />;
    case "ecosystem-layer": return <EcosystemLayerView layers={section.layers} />;
    case "supply-chain": return <SupplyChain actors={section.actors} />;
    case "infra-stack": return <InfraStack layers={section.layers} />;
    case "roadmap": return <Roadmap weeks={section.weeks} />;
    case "quiz": return <Quiz {...section} />;
    case "interactive":
      if (section.widget === "ecosystem-explorer") return <EcosystemExplorer />;
      if (section.widget === "composability-simulator") return <ComposabilitySimulator />;
      if (section.widget === "blockchain-race") return <BlockchainComparisonRace />;
      if (section.widget === "hash-chain-explorer") return <InteractiveHashChain />;
      if (section.widget === "innovation-pipeline") return <InnovationPipeline />;
      if (section.widget === "poh-chain-builder") return <PoHChainBuilder />;
      if (section.widget === "tower-bft-simulator") return <TowerBFTSimulator />;
      if (section.widget === "consensus-race") return <ConsensusRace />;
      if (section.widget === "gulf-stream") return <GulfStreamForwarding />;
      if (section.widget === "turbine-propagation") return <TurbinePropagation />;
      if (section.widget === "pipeline-animator") return <PipelineAnimator />;
      if (section.widget === "sealevel-parallel") return <SealevelParallelViz />;
      if (section.widget === "cloudbreak-io") return <CloudbreakIODemo />;
      if (section.widget === "tx-journey") return <TransactionJourney />;
      if (section.widget === "validator-network") return <ValidatorNetworkMap />;
      if (section.widget === "swqos-simulator") return <StakeWeightedQoS />;
      if (section.widget === "oracle-price-feed") return <OraclePriceFeed />;
      if (section.widget === "amm-vs-clob") return <AMMvsCLOB />;
      if (section.widget === "jupiter-router") return <JupiterRouteOptimizer />;
      if (section.widget === "lst-builder") return <LSTComposabilityBuilder />;
      if (section.widget === "stablecoin-peg") return <StablecoinPegMechanism />;
      if (section.widget === "wallet-tx-flow") return <WalletTransactionFlow />;
      if (section.widget === "depin-mapper") return <DePINCoverageMapper />;
      if (section.widget === "agent-loop") return <AgentDecisionLoop />;
      if (section.widget === "ecosystem-flow") return <FullEcosystemFlow />;
      return null;
    default: return null;
  }
}

/* ===== MAIN COURSE COMPONENT ===== */

const PROGRESS_KEY = "soledu-ecosystem-progress";

export default function EcosystemCourse() {
  const [activeModule, setActiveModule] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [progress, setProgress] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      return new Set(Array.isArray(saved) ? saved : []);
    } catch { return new Set(); }
  });
  const contentRef = useRef(null);

  const handleModuleSelect = useCallback((i) => {
    setActiveModule(i);
    setSidebarOpen(false);
    setProgress(prev => {
      const next = new Set(prev);
      next.add(i);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
      return next;
    });
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  const mod = MODULES[activeModule];
  const accent = "#14F195";
  const accentDim = "rgba(20, 241, 149, 0.12)";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--body)",
      display: "flex",
      position: "relative",
    }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90 }} />}

      {/* Sidebar */}
      <nav style={{
        width: 280, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg-primary)",
        display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: sidebarOpen ? 0 : -280,
        zIndex: 100, transition: "left 0.2s ease",
        ...(typeof window !== "undefined" && window.innerWidth > 800 ? { position: "sticky", left: 0, top: 0, height: "100vh" } : {})
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
          <Link to="/" style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: "var(--mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2, display: "block" }}>← SOLEDU</Link>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>Ecosystem Deep Dive</div>
          <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(progress.size / MODULES.length) * 100}%`, background: accent, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "var(--mono)" }}>{progress.size}/{MODULES.length} modules explored</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {MODULES.map((m, i) => (
            <div key={i} onClick={() => handleModuleSelect(i)}
              style={{
                padding: "10px 20px", cursor: "pointer", transition: "all 0.1s", display: "flex", alignItems: "center", gap: 12,
                background: i === activeModule ? accentDim : "transparent",
                borderRight: i === activeModule ? `2px solid ${accent}` : "2px solid transparent",
              }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: progress.has(i) ? accent : "var(--border)",
                color: progress.has(i) ? "var(--bg-primary)" : "var(--text-tertiary)",
              }}>{m.num}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: i === activeModule ? 700 : 500, color: i === activeModule ? accent : "var(--text-primary)" }}>{m.title}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{m.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
          a deep dive into the Solana ecosystem
        </div>
      </nav>

      {/* Main content */}
      <main ref={contentRef} style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
        {/* Mobile header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-primary)", zIndex: 50 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", padding: 4, display: "flex" }}>☰</button>
          <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: accent, fontWeight: 700 }}>{mod.num}</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{mod.title}</span>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* Module header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "var(--mono)", color: accent, opacity: 0.15, lineHeight: 1 }}>{mod.num}</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginTop: -10, marginBottom: 6, lineHeight: 1.2 }}>{mod.title}</h1>
            <p style={{ fontSize: 15, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{mod.subtitle}</p>
          </div>

          {/* Sections */}
          {mod.sections.map((section, i) => <Section key={`${activeModule}-${i}`} section={section} />)}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            {activeModule > 0 ? (
              <button onClick={() => handleModuleSelect(activeModule - 1)}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontFamily: "var(--body)" }}>
                ← {MODULES[activeModule - 1].title}
              </button>
            ) : <div />}
            {activeModule < MODULES.length - 1 ? (
              <button onClick={() => handleModuleSelect(activeModule + 1)}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${accent}40`, background: accentDim, color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--body)" }}>
                {MODULES[activeModule + 1].title} →
              </button>
            ) : (
              <div style={{ padding: "10px 20px", borderRadius: 8, background: accentDim, color: accent, fontSize: 13, fontWeight: 600 }}>
                Course complete ✓
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
