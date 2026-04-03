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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
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
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>BLOCKCHAIN COMPARISON RACE</div>;
}

function InteractiveHashChain() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>INTERACTIVE HASH CHAIN</div>;
}

function InnovationPipeline() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>INNOVATION PIPELINE</div>;
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
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>TURBINE PROPAGATION</div>;
}

function PipelineAnimator() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>PIPELINE ANIMATOR</div>;
}

function SealevelParallelViz() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>SEALEVEL PARALLEL VIZ</div>;
}

function CloudbreakIODemo() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>CLOUDBREAK IO DEMO</div>;
}

function TransactionJourney() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>TRANSACTION JOURNEY</div>;
}

function ValidatorNetworkMap() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>VALIDATOR NETWORK MAP</div>;
}

function StakeWeightedQoS() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>STAKE WEIGHTED QOS</div>;
}

function OraclePriceFeed() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>ORACLE PRICE FEED</div>;
}

function AMMvsCLOB() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>AMM VS CLOB</div>;
}

function JupiterRouteOptimizer() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>JUPITER ROUTE OPTIMIZER</div>;
}

function LSTComposabilityBuilder() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>LST COMPOSABILITY BUILDER</div>;
}

function StablecoinPegMechanism() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>STABLECOIN PEG MECHANISM</div>;
}

function WalletTransactionFlow() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>WALLET TRANSACTION FLOW</div>;
}

function DePINCoverageMapper() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>DEPIN COVERAGE MAPPER</div>;
}

function AgentDecisionLoop() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>AGENT DECISION LOOP</div>;
}

function FullEcosystemFlow() {
  return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>FULL ECOSYSTEM FLOW</div>;
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
