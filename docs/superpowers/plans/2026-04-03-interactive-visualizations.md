# Interactive Visualizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 36 interactive widgets (23 ecosystem, 13 MEV) and 3 new deep-dive modules to transform both courses from static text into hands-on learning experiences.

**Architecture:** All widgets are self-contained React function components using Canvas 2D API (for particle/physics animations) or SVG+CSS (for structured step-throughs). Widgets live inline in the course files alongside existing components. No external dependencies — vanilla Canvas, SVG, and React hooks only.

**Tech Stack:** React 18, HTML5 Canvas, SVG, CSS transitions, requestAnimationFrame, IntersectionObserver

**Spec:** `docs/superpowers/specs/2026-04-03-interactive-visualizations-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/courses/ecosystem/EcosystemCourse.jsx` | Modify | All ecosystem widgets + 3 new modules + updated Section dispatcher |
| `ecosystem_course/solana-ecosystem-deep-dive.html` | Modify | HTML mirror of ecosystem JSX (synced after JSX validated) |
| `src/courses/mev/MevCourse.jsx` | Modify | All MEV widgets + updated Section dispatcher |
| `mev_course/solana-mev-masterclass.html` | Modify | HTML mirror of MEV JSX (synced after JSX validated) |

All widget code goes into the existing course files — no new files created. Widgets are defined above the Section dispatcher, between the existing components and the dispatcher.

---

## Shared Patterns

Every canvas widget in this plan follows this exact template. Subagents should use this as the base.

```jsx
function WidgetName() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [someParam, setSomeParam] = useState(defaultVal);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Scale for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    // State for animation
    let particles = [];

    // IntersectionObserver to pause off-screen
    let visible = true;
    const obs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);

    function loop() {
      if (!visible) { animRef.current = requestAnimationFrame(loop); return; }
      ctx.clearRect(0, 0, W, H);
      // ... draw logic ...
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      obs.disconnect();
    };
  }, [someParam]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
        WIDGET LABEL
      </div>
      <canvas ref={canvasRef}
        style={{ width: "100%", height: 500, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", display: "block" }} />
      {/* Controls */}
    </div>
  );
}
```

**Particle helper pattern** (copy into each canvas widget that needs particles):
```jsx
function createParticle(x, y, vx, vy, color, life) {
  return { x, y, vx, vy, color, life, maxLife: life, size: 2 + Math.random() * 2, active: true };
}
function updateParticles(particles, ctx) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
```

**Glow circle helper:**
```jsx
function drawGlow(ctx, x, y, r, color) {
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}
```

**Glow line helper:**
```jsx
function drawGlowLine(ctx, x1, y1, x2, y2, color, width) {
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
```

**Standard control button style:**
```jsx
const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", fontFamily: "var(--mono)" };
const btnActiveStyle = { ...btnStyle, background: "var(--accent)", color: "#0C0C0F", borderColor: "var(--accent)" };
```

**Standard slider style:**
```jsx
<input type="range" min={0} max={100} value={val} onChange={e => setVal(+e.target.value)}
  style={{ width: "100%", accentColor: "var(--accent)" }} />
```

---

## Phase 1: Foundation — New Modules + Numbering Migration

### Task 1: Add 3 new deep-dive modules and renumber existing modules

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` (MODULES array and Section dispatcher)

This task adds the 3 new module data entries (with text sections and interactive placeholders) and updates the `num` field on all subsequent modules.

- [ ] **Step 1: Insert 3 new modules into the MODULES array after index 2 (after "eight-innovations")**

Find the closing `}` of the module with `id: "eight-innovations"` and insert these 3 new modules immediately after it. Each new module starts with text sections and interactive section stubs (the widget components will be built in later tasks).

```jsx
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
```

- [ ] **Step 2: Update `num` fields on all modules after the 3 new ones**

After the 3 new modules (indices 3, 4, 5), modules that were at indices 3-12 are now at indices 6-15. Update their `num` field:
- `tx-lifecycle`: num "03" → "06"
- `network-infra`: num "04" → "07"
- `core-protocols`: num "05" → "08"
- `defi-protocols`: num "06" → "09"
- `staking-yield`: num "07" → "10"
- `stablecoins-rwa`: num "08" → "11"
- `consumer-layer`: num "09" → "12"
- `depin`: num "10" → "13"
- `ai-agents`: num "11" → "14"
- `how-it-connects`: num "12" → "15"

- [ ] **Step 3: Add interactive section entries to existing modules**

Add `{ type: "interactive", widget: "<widget-id>" }` entries to every existing module that needs new widgets. Insert them after relevant text sections (typically after the explanatory text, before quizzes). Refer to the spec for which widget goes in which module. For modules getting multiple widgets, add both entries.

Module 00 (`what-is-solana`): Add `{ type: "interactive", widget: "blockchain-race" }` after the diagram section.

Module 01 (`proof-of-history`): Add `{ type: "interactive", widget: "hash-chain-explorer" }` after the code section.

Module 02 (`eight-innovations`): Add `{ type: "interactive", widget: "innovation-pipeline" }` after the diagram section.

Module 06 (`tx-lifecycle`): Add `{ type: "interactive", widget: "tx-journey" }` after the concepts section.

Module 07 (`network-infra`): Add `{ type: "interactive", widget: "validator-network" }` and `{ type: "interactive", widget: "swqos-simulator" }` after the infra-stack section.

Module 08 (`core-protocols`): Add `{ type: "interactive", widget: "oracle-price-feed" }` after the supply-chain section.

Module 09 (`defi-protocols`): Add `{ type: "interactive", widget: "amm-vs-clob" }` and `{ type: "interactive", widget: "jupiter-router" }` after the protocol-table section.

Module 10 (`staking-yield`): Add `{ type: "interactive", widget: "lst-builder" }` after the diagram section.

Module 11 (`stablecoins-rwa`): Add `{ type: "interactive", widget: "stablecoin-peg" }` after the second text section.

Module 12 (`consumer-layer`): Add `{ type: "interactive", widget: "wallet-tx-flow" }` after the second text section.

Module 13 (`depin`): Add `{ type: "interactive", widget: "depin-mapper" }` after the protocol-table section.

Module 14 (`ai-agents`): Add `{ type: "interactive", widget: "agent-loop" }` after the stats section.

Module 15 (`how-it-connects`): Add `{ type: "interactive", widget: "ecosystem-flow" }` before the roadmap section (after the existing composability-simulator).

- [ ] **Step 4: Update the Section dispatcher to handle all new widget IDs**

In the `Section` function, extend the `case "interactive":` block with all new widget names. For now, each will return a placeholder `<div>` with the widget name (actual implementations come in subsequent tasks):

```jsx
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
```

- [ ] **Step 5: Add placeholder widget components**

Above the Section dispatcher, add stub functions for every new widget so the course renders without errors:

```jsx
/* ===== INTERACTIVE WIDGETS ===== */
function BlockchainComparisonRace() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>BLOCKCHAIN COMPARISON RACE — COMING SOON</div>; }
function InteractiveHashChain() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>INTERACTIVE HASH CHAIN — COMING SOON</div>; }
function InnovationPipeline() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>INNOVATION PIPELINE — COMING SOON</div>; }
function PoHChainBuilder() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>POH CHAIN BUILDER — COMING SOON</div>; }
function TowerBFTSimulator() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>TOWER BFT SIMULATOR — COMING SOON</div>; }
function ConsensusRace() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>CONSENSUS RACE — COMING SOON</div>; }
function GulfStreamForwarding() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>GULF STREAM FORWARDING — COMING SOON</div>; }
function TurbinePropagation() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>TURBINE PROPAGATION — COMING SOON</div>; }
function PipelineAnimator() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>PIPELINE ANIMATOR — COMING SOON</div>; }
function SealevelParallelViz() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>SEALEVEL PARALLEL VIZ — COMING SOON</div>; }
function CloudbreakIODemo() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>CLOUDBREAK IO DEMO — COMING SOON</div>; }
function TransactionJourney() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>TRANSACTION JOURNEY — COMING SOON</div>; }
function ValidatorNetworkMap() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>VALIDATOR NETWORK MAP — COMING SOON</div>; }
function StakeWeightedQoS() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>STAKE WEIGHTED QOS — COMING SOON</div>; }
function OraclePriceFeed() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>ORACLE PRICE FEED — COMING SOON</div>; }
function AMMvsCLOB() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>AMM VS CLOB — COMING SOON</div>; }
function JupiterRouteOptimizer() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>JUPITER ROUTE OPTIMIZER — COMING SOON</div>; }
function LSTComposabilityBuilder() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>LST COMPOSABILITY BUILDER — COMING SOON</div>; }
function StablecoinPegMechanism() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>STABLECOIN PEG MECHANISM — COMING SOON</div>; }
function WalletTransactionFlow() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>WALLET TRANSACTION FLOW — COMING SOON</div>; }
function DePINCoverageMapper() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>DEPIN COVERAGE MAPPER — COMING SOON</div>; }
function AgentDecisionLoop() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>AGENT DECISION LOOP — COMING SOON</div>; }
function FullEcosystemFlow() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>FULL ECOSYSTEM FLOW — COMING SOON</div>; }
```

- [ ] **Step 6: Verify the app builds and renders**

Run: `cd /Users/sohan/Documents/soledu && npx vite build 2>&1 | tail -5`
Expected: Build succeeds. Open in browser and verify all 16 modules appear in sidebar with correct numbering, and placeholder boxes appear for each new widget.

- [ ] **Step 7: Commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): add 3 deep-dive modules, renumber, add widget placeholders"
```

---

## Phase 2: Ecosystem Deep-Dive Widgets (Modules 03-05)

These are the showpiece widgets — the richest animations in the course.

### Task 2: PoHChainBuilder widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace PoHChainBuilder placeholder

- [ ] **Step 1: Implement PoHChainBuilder**

Replace the placeholder `PoHChainBuilder` function with a full canvas widget. Key behavior:
- Canvas size: 500px tall (Tall)
- A horizontal hash chain grows from left to right. Each hash is a small rounded rectangle with truncated hex text (e.g., "a7f3...").
- New hashes append every ~100ms with a glow pulse animation.
- A "hashes/sec" counter in the top-right updates in real-time.
- An "Insert Transaction" button below the canvas. When clicked, the next hash gets a special color (accent green) and a label showing "TX #N inserted at hash #M".
- Transaction-bearing hashes have a slightly larger glow radius and emit 5-10 particles.
- The chain auto-scrolls left as it grows, keeping the newest hashes visible.
- Uses the shared canvas template, particle helper, and glow helpers from the Shared Patterns section.

Design tokens: chain background = var(--bg-code), hash nodes = #7F77DD, tx-bearing hashes = #14F195, connection lines = #333, glow = matching node color.

- [ ] **Step 2: Test in browser**

Run: `npx vite dev` and navigate to Module 03. Verify the hash chain animates, transactions insert correctly, and the counter updates.

- [ ] **Step 3: Commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement PoHChainBuilder widget"
```

### Task 3: TowerBFTSimulator widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace TowerBFTSimulator placeholder

- [ ] **Step 1: Implement TowerBFTSimulator**

Replace placeholder with full canvas widget. Key behavior:
- Canvas size: 700px tall (Showcase)
- 12 validator nodes arranged in a circle (evenly spaced). Each node is a circle with a label ("V1"-"V12") and a stake indicator (size proportional to stake).
- Center of the circle shows the current block being voted on, with a round counter.
- "Advance Round" button below canvas. Each click triggers a voting round:
  - Glowing pulse particles travel from each validator toward the center.
  - After pulses arrive, validators that voted "for" get a lockout ring drawn around them. Ring color intensity increases with lockout depth.
  - Lockout periods shown as concentric rings: 1 ring = lockout 2, 2 rings = lockout 4, etc. Rings have increasing opacity/glow.
  - Running tally shows "X/12 validators committed, Y% stake finalized".
- "Toggle Malicious" button: click to mark one validator as malicious (turns red, stops voting). Shows consensus still achieves finality with <1/3 malicious.
- After 32 rounds of consistent voting, a "FINALIZED" banner appears with a particle burst celebration.
- Lockout depth for each validator shown in a small HUD below the circle.

Design tokens: validator nodes = #5DCAA5, malicious = #E24B4A, lockout rings = #7F77DD with increasing alpha, vote pulses = #14F195, finality burst = #C8F06E.

- [ ] **Step 2: Test in browser**

Navigate to Module 03. Verify voting rounds animate, lockout rings accumulate, malicious toggle works, and finality triggers correctly.

- [ ] **Step 3: Commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement TowerBFTSimulator widget"
```

### Task 4: ConsensusRace widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace ConsensusRace placeholder

- [ ] **Step 1: Implement ConsensusRace**

Replace placeholder with canvas widget. Key behavior:
- Canvas size: 500px tall (Tall)
- Split screen: left half = "Traditional BFT", right half = "PoH + Tower BFT". Divider line down the middle.
- Each side has N nodes (controlled by a slider: 4 to 50, default 10) arranged in a loose cluster.
- Left side (Traditional BFT): nodes send O(n^2) messages to each other. Each message = a particle traveling between two random nodes. Message count display: "N*(N-1) = X messages/round". As node count increases, the left side becomes a chaotic web of particles. A "time to finality" counter ticks up slowly.
- Right side (PoH + Tower BFT): nodes each have a small PoH ticker (hash animation). Occasionally a vote pulse goes to the center (minimal messaging). Message count: "~N messages/round". Finality counter reaches zero much faster.
- Both sides race. When the right side finishes, it gets a green checkmark glow. Left side is still churning.
- Node count slider below canvas. As user increases it, the contrast becomes dramatic.

Design tokens: left nodes = #EF9F27, right nodes = #5DCAA5, messages = #E24B4A (left) / #14F195 (right), background split = slightly different shades of bg-card.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement ConsensusRace widget"
```

### Task 5: GulfStreamForwarding widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace GulfStreamForwarding placeholder

- [ ] **Step 1: Implement GulfStreamForwarding**

Canvas widget, 500px tall. Key behavior:
- Network of ~15 nodes arranged in a horizontal layout. 4 nodes highlighted as upcoming leaders (labeled "Leader Now", "Leader +1", "+2", "+3") in the leader schedule, shown at the top.
- User wallets on the left emit transaction particles.
- Particles flow through RPC nodes → directly to the current leader AND pre-forwarded to upcoming leaders (dotted path lines glow as particles travel them).
- Contrast mode: toggle button switches to "Traditional Mempool" view where all transactions go to a central mempool pool (particles swirl in a circle), then the leader picks from it. Noticeably slower.
- Each leader has a small queue indicator showing buffered transactions.

Design tokens: leader nodes = #C8F06E, regular nodes = #5DCAA5, user wallets = #7F77DD, mempool = #E24B4A swirl.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement GulfStreamForwarding widget"
```

### Task 6: TurbinePropagation widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace TurbinePropagation placeholder

- [ ] **Step 1: Implement TurbinePropagation**

Canvas widget, 700px tall (Showcase). The visual showpiece. Key behavior:
- Leader node at top center. Below it, 3 layers of "neighborhood" nodes arranged in expanding rows (layer 1: 3 nodes, layer 2: 9 nodes, layer 3: 27 nodes — simplified to fit).
- "Propagate Block" button. When clicked:
  - Leader "shatters" a block into shreds (small colored squares burst outward).
  - Shreds flow as particles from leader → layer 1 nodes (glowing connection lines animate).
  - Layer 1 nodes redistribute shreds → layer 2.
  - Layer 2 → layer 3.
  - Each propagation hop has a slight delay for dramatic cascading effect.
  - Nodes light up green as they receive enough shreds to reconstruct the block.
- "Packet Loss" slider (0%-50%). Red X marks appear on some shreds mid-flight. Receiving nodes show partial progress (e.g., "18/24 shreds"). Reed-Solomon recovery kicks in — nodes that have enough shreds still reconstruct (turn green). Nodes below threshold stay amber.
- Stats overlay: propagation time, shreds sent, shreds lost, recovery rate.

Design tokens: leader = #C8F06E, shred particles = rainbow of course colors, received nodes = #14F195, partial = #EF9F27, failed = #E24B4A.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement TurbinePropagation widget"
```

### Task 7: PipelineAnimator widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace PipelineAnimator placeholder

- [ ] **Step 1: Implement PipelineAnimator**

SVG + CSS widget (no canvas), 500px tall. Key behavior:
- 4 horizontal lanes representing pipeline stages: "Fetch (Kernel)", "SigVerify (GPU)", "Execute (CPU)", "Write (Kernel)".
- Each lane is a colored bar. Transaction batches (labeled rectangles: "Batch A", "Batch B", "Batch C", "Batch D") flow through the stages.
- Animation: Batch A enters Fetch → moves to SigVerify → Execute → Write. While Batch A is in SigVerify, Batch B enters Fetch. While A is in Execute, B is in SigVerify, C enters Fetch. Etc.
- At any given frame, all 4 stages are occupied by different batches (color-coded).
- Controls: "Play/Pause" button and "Step" button (advances one stage transition at a time).
- A "Sequential Mode" toggle that shows what it looks like WITHOUT pipelining: batches go one at a time through all 4 stages. Throughput counter shows the 4x difference.
- Throughput comparison display: "Pipeline: 4 batches/cycle" vs "Sequential: 1 batch/cycle"

Design tokens: stage colors: Fetch = #378ADD, SigVerify = #7F77DD, Execute = #5DCAA5, Write = #EF9F27.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement PipelineAnimator widget"
```

### Task 8: SealevelParallelViz widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace SealevelParallelViz placeholder

- [ ] **Step 1: Implement SealevelParallelViz**

Canvas widget, 700px tall (Showcase). Key behavior:
- Multiple horizontal "execution lanes" (default 4, adjustable via "Core Count" slider: 1-16).
- Transaction blocks (colored rectangles with labels like "SOL Transfer", "Jupiter Swap", "Raydium LP") queue on the left.
- Each transaction has an "account set" shown as small colored dots (e.g., Account A = red, Account B = blue).
- Transactions automatically schedule into lanes. If a transaction's write accounts don't conflict with any currently executing transaction, it runs in parallel (green border). If there's a conflict (same write account), it waits (amber border with a lock icon).
- Execution animates: transactions slide from left to right through their lane, with a progress bar fill. When complete, they disappear with a small particle burst.
- A "Throughput" counter shows transactions/second, updating in real-time.
- "Add Conflict" button: injects a transaction that conflicts with a running one, demonstrating the sequential fallback.
- "Reset" button clears and starts a fresh batch.

Design tokens: parallel tx = #14F195 border, conflicting tx = #EF9F27 border, lock icon = #E24B4A, lanes = alternating bg-card/bg-code.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement SealevelParallelViz widget"
```

### Task 9: CloudbreakIODemo widget

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace CloudbreakIODemo placeholder

- [ ] **Step 1: Implement CloudbreakIODemo**

Canvas widget, 350px tall (Standard). Key behavior:
- Visualization of a disk (rounded rectangle) in the center with 32 I/O thread "lanes" emanating from it.
- Threads shown as animated dotted lines flowing in/out. Active threads glow, idle ones dim.
- A "Load" slider (0%-100%) controls how many threads are active.
- Two mode toggle: "Sequential" (only 1 thread active at a time, slow IOPS counter) vs "Concurrent" (all 32 threads, fast IOPS counter).
- IOPS counter animates between the two values when toggling.
- Account read/write indicators: small colored squares appear at thread endpoints representing account data being accessed.

Design tokens: active threads = #14F195, idle = #333, disk = #7F77DD, IOPS counter = var(--accent).

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement CloudbreakIODemo widget"
```

---

## Phase 3: Ecosystem Existing Module Widgets (Modules 00-02, 06-15)

### Task 10: BlockchainComparisonRace (Module 00)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace BlockchainComparisonRace placeholder

- [ ] **Step 1: Implement BlockchainComparisonRace**

Canvas widget, 700px tall (Showcase). Three vertical columns: Bitcoin (orange #EF9F27), Ethereum (purple #7F77DD), Solana (green #5DCAA5).

Each column has:
- Chain name and icon at top
- A "block progress" bar that fills at the chain's block time (BTC: 10min scaled to ~20s animation, ETH: 12s scaled to ~4s, SOL: 400ms scaled to ~0.5s)
- When a block completes, it drops into a growing stack with a small animation
- A transaction queue on the left — incoming transactions (dots) queue up. As blocks form, transactions get included
- Counters: TPS (rolling average), Fee (per tx), Confirmation time

A "Transaction Load" slider (10-10,000 TPS) below. At low loads all chains handle it. At high loads BTC and ETH queues overflow while Solana stays clear.

Auto-plays on visibility, resets every ~30s.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement BlockchainComparisonRace widget"
```

### Task 11: InteractiveHashChain (Module 01)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace InteractiveHashChain placeholder

- [ ] **Step 1: Implement InteractiveHashChain**

Canvas widget, 350px tall (Standard). Simplified version of PoHChainBuilder:
- Horizontal chain of hash boxes flowing left to right
- Auto-generates a new hash every 200ms
- "Insert TX" button adds a transaction-stamped hash (highlighted in accent color)
- "Verify" button: chain splits into 4 colored segments, each gets a checkmark simultaneously (showing parallel verification), then recombines. Simple but effective visual.
- No particle effects — cleaner, lighter. This is the teaser, not the deep dive.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement InteractiveHashChain widget"
```

### Task 12: InnovationPipeline (Module 02)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace InnovationPipeline placeholder

- [ ] **Step 1: Implement InnovationPipeline**

SVG + CSS widget, 500px tall. Uses React state, no canvas.
- 8 stages arranged as a horizontal pipeline (wraps to 2 rows on narrow screens: 4 per row).
- Each stage is a rounded card with the innovation name, a small icon/number, and a mini-animation:
  - PoH: spinning hash icon
  - Tower BFT: pulsing vote circles
  - Gulf Stream: flowing arrow
  - Turbine: branching tree lines
  - Sealevel: parallel bars
  - Pipelining: overlapping rectangles
  - Cloudbreak: disk I/O arrows
  - Archivers: stacking blocks
- A glowing particle (the "transaction") travels through all 8 stages sequentially, pausing briefly at each.
- Click any stage → tooltip overlay with 2-sentence summary + "Deep Dive →" link that sets activeModule to the corresponding deep-dive module (Modules 03/04/05). Link uses an `onClick` that calls a passed `onNavigate` prop (or reads from context).
- The stage links: PoH → Module 03, Tower BFT → Module 03, Gulf Stream → Module 04, Turbine → Module 04, Pipelining → Module 04, Sealevel → Module 05, Cloudbreak → Module 05, Archivers → null (no deep dive).

Note: The `onNavigate` prop needs to be threaded. The Section component should pass it to InnovationPipeline. Read the existing code to see how `handleModuleSelect` is defined in EcosystemCourse and pass it through: `<InnovationPipeline onNavigate={handleModuleSelect} />`. Update the Section component signature to accept and forward a `navigate` prop for this widget.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement InnovationPipeline widget"
```

### Task 13: TransactionJourney (Module 06)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace TransactionJourney placeholder

- [ ] **Step 1: Implement TransactionJourney**

Canvas widget, 700px tall (Showcase).
- 7-stage horizontal pipeline with curved connections: Wallet Sign → QUIC to Leader → PoH Timestamp → Sealevel Execute → Tower BFT Vote → Turbine Propagate → Finalized.
- Each stage is a labeled circle/card with an icon.
- A glowing particle (the transaction) travels along the path. Current stage is highlighted with glow and scale-up.
- Timeline bar at the bottom: 0ms to 400ms, with markers at each stage's typical timing.
- "Auto" mode: particle travels continuously at realistic timing ratios. "Step" mode: user clicks to advance to next stage, with explanatory text appearing below each stage.
- Each stage emits 3-5 particles when the transaction arrives.

Design tokens: stages cycle through the standard color palette (#5DCAA5, #7F77DD, #EF9F27, #378ADD, #D4537E, #5DCAA5, #14F195).

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement TransactionJourney widget"
```

### Task 14: ValidatorNetworkMap (Module 07)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace ValidatorNetworkMap placeholder

- [ ] **Step 1: Implement ValidatorNetworkMap**

Canvas widget, 700px tall (Showcase).
- ~30 validator nodes positioned in a force-directed-like layout (pre-computed positions, not real physics sim — just aesthetically spread).
- Each node: circle sized by stake weight (3 size tiers: small, medium, large). Labeled with "V1"-"V30".
- Current leader: pulses with glow, labeled "LEADER". Leader rotates every ~3 seconds to the next validator.
- QUIC connections: when leader is active, animated dashed lines flow from random nodes toward it (transaction submission). Lines glow with accent color.
- "Attack Scenario" toggle: 10 nodes turn red and disconnect (lines fade). Remaining 20 nodes (>2/3) continue operating. A banner shows "Network healthy: 67% stake online > 66% threshold".
- Stake distribution pie chart in corner showing the ratio.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement ValidatorNetworkMap widget"
```

### Task 15: StakeWeightedQoS (Module 07)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace StakeWeightedQoS placeholder

- [ ] **Step 1: Implement StakeWeightedQoS**

SVG + CSS widget, 350px tall (Standard). Uses React state, no canvas.
- Two horizontal lanes: "Priority (Staked)" at top, "Regular (Unstaked)" at bottom.
- Animated dots (transactions) flow left to right through each lane.
- Under normal conditions, both lanes flow smoothly.
- "Congestion" slider (0% to 100%). As congestion increases:
  - Regular lane slows down (dots bunch up, some turn red and drop out = "rejected")
  - Priority lane maintains flow (dots stay green)
- "Stake Amount" slider for the priority lane. Higher stake = bigger dots, faster flow even at max congestion.
- Counters: "Inclusion rate: Priority X% / Regular Y%"

Design tokens: priority lane = #14F195 background tint, regular = default. Priority dots = #14F195, regular = #7F77DD, rejected = #E24B4A.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement StakeWeightedQoS widget"
```

### Task 16: OraclePriceFeed (Module 08)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace OraclePriceFeed placeholder

- [ ] **Step 1: Implement OraclePriceFeed**

Canvas widget, 500px tall (Tall).
- 5 "publisher" nodes on the left, each with a price label that jitters randomly around a base price (~$150 SOL).
- Animated lines flow from each publisher → center "aggregator" node.
- Center node computes weighted average (shown as large number). A confidence band (±range) visualized as a shaded region.
- User can click-drag individual publisher prices up or down. When publishers disagree, the confidence band widens visually. When they agree, it narrows.
- A "DeFi Protocol" consumer node on the right reads the aggregated price, shown with a flowing connection line.
- Publisher weights shown as circle sizes (larger = more weight in the aggregate).

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement OraclePriceFeed widget"
```

### Task 17: AMMvsCLOB (Module 09)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace AMMvsCLOB placeholder

- [ ] **Step 1: Implement AMMvsCLOB**

Canvas widget, 700px tall (Showcase). Split screen.

**Left half (AMM):**
- xy=k constant product curve drawn as a smooth line
- Current position marked with a dot on the curve
- When user clicks "Buy" or inputs a trade size, an animated dot slides along the curve showing the new position
- Slippage = visible distance between initial and final price, highlighted in red
- Price impact percentage displayed

**Right half (CLOB):**
- Order book visualization: bid bars (green) going left, ask bars (red) going right, spread in the middle
- When user clicks "Buy", the trade eats through ask orders from best to worst (animated consumption)
- Spread widens or narrows based on liquidity depth

Controls below: "Trade Size" slider (small to large). As trade size increases, AMM slippage grows dramatically while CLOB impact grows more linearly (for deep books). Comparison stats: "AMM slippage: X% | CLOB slippage: Y%"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement AMMvsCLOB widget"
```

### Task 18: JupiterRouteOptimizer (Module 09)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace JupiterRouteOptimizer placeholder

- [ ] **Step 1: Implement JupiterRouteOptimizer**

Canvas widget, 500px tall (Tall).
- Left: "1000 USDC" input node. Right: "SOL" output node.
- Between them: 4 DEX nodes (Raydium, Orca, Meteora, Phoenix) arranged in a diamond/spread pattern.
- "Find Route" button. When clicked:
  - Pathfinding animation: dotted lines extend from USDC to each DEX, evaluating (pulsing). Some paths light up brighter (better rates).
  - Final route: 2-3 paths are chosen with proportional amounts (e.g., 60% via Raydium, 30% via Orca, 10% via Meteora). Amounts shown on each path.
  - Flowing particles travel along the chosen paths simultaneously.
  - Output node shows total SOL received.
- "Single Route" toggle: forces all through one DEX. Shows worse output. Comparison: "Split: 6.82 SOL | Single: 6.71 SOL | Saved: 0.11 SOL (1.6%)"
- Swap amount slider (100 USDC to 100,000 USDC). Larger amounts make split routing more impactful.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement JupiterRouteOptimizer widget"
```

### Task 19: LSTComposabilityBuilder (Module 10)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace LSTComposabilityBuilder placeholder

- [ ] **Step 1: Implement LSTComposabilityBuilder**

SVG + CSS widget, 500px tall (Tall). React state-driven step-through.
- 5 steps in a vertical pipeline: Stake SOL → Receive LST → Collateralize → Borrow USDC → Provide LP
- Each step has a protocol logo placeholder (text: "Jito", "Kamino", "MarginFi", "Jupiter", "Meteora"), an action description, and APY/fee numbers.
- User clicks "Next Step" to advance. Current step highlights with accent border and glow.
- A running sidebar shows:
  - Starting: "10 SOL"
  - After stake: "10 JitoSOL (earning 7.2% APY)"
  - After collateralize: "10 JitoSOL locked, $1,500 borrowing power"
  - After borrow: "1,125 USDC borrowed (75% LTV)"
  - After LP: "Earning 7.2% + 12.4% - 4.1% borrow = 15.5% net APY"
- Animated token flow: when advancing a step, colored dots flow from one step card to the next.
- "Reset" button returns to step 0.

This is a richer version of the existing ComposabilitySimulator but with animated token flows and protocol branding.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement LSTComposabilityBuilder widget"
```

### Task 20: StablecoinPegMechanism (Module 11)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace StablecoinPegMechanism placeholder

- [ ] **Step 1: Implement StablecoinPegMechanism**

SVG + CSS widget, 350px tall (Standard).
- A horizontal price line showing $1.00 as a dashed center line.
- Current market price shown as a draggable dot. User drags it above or below $1.
- When price > $1.00:
  - "Mint" arrow animation: new USDC tokens appear (minting), flow to "Market" (selling), pushing price down
  - Arrow labeled "Arbitrageurs mint + sell"
  - Price dot animates back toward $1.00
- When price < $1.00:
  - "Burn" arrow animation: USDC flows from "Market" (buying) to "Redeem" (burning), pushing price up
  - Arrow labeled "Arbitrageurs buy + redeem"
  - Price dot animates back toward $1.00
- The restoring animation plays over ~2 seconds after user releases the drag.
- Supply counter shows USDC supply increasing/decreasing with mints/burns.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement StablecoinPegMechanism widget"
```

### Task 21: WalletTransactionFlow (Module 12)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace WalletTransactionFlow placeholder

- [ ] **Step 1: Implement WalletTransactionFlow**

SVG + CSS widget, 500px tall (Tall). Step-through animation.
- 6 stages in a horizontal flow: Phantom Wallet → Jupiter API → RPC Node → Validator/Leader → On-chain Execution → Confirmation
- Each stage is a card with a label. Connected by animated arrow lines.
- Auto-plays: a glowing dot travels from stage to stage with ~1s pause at each.
- At each pause, a description text appears below: "Wallet creates and signs the swap instruction", "Jupiter finds optimal route across 4 DEXs", etc.
- Timing annotations between stages: "~50ms", "~30ms", "~200ms", "~120ms", etc.
- Total time displayed: "400ms from tap to finality"
- Replay button after completion.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement WalletTransactionFlow widget"
```

### Task 22: DePINCoverageMapper (Module 13)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace DePINCoverageMapper placeholder

- [ ] **Step 1: Implement DePINCoverageMapper**

Canvas widget, 500px tall (Tall).
- A hex grid (8x6 hexagons) representing a geographic area.
- Click a hex to "deploy a hotspot". The hex fills with accent color and starts emitting reward particles upward.
- Nearby hexes get a coverage highlight (translucent glow). This is the service coverage area.
- Each deployed hotspot earns tokens (counter in top-right shows "Network Rewards: X tokens/epoch").
- Deploying in an uncovered area: full reward. Deploying adjacent to an existing hotspot: reduced reward (shown by dimmer particles). Deploying on an already-covered hex: "Oversaturated — minimal rewards" warning.
- A stats bar: "Hotspots deployed: N | Coverage: X% | Avg reward/hotspot: Y tokens"
- "Reset" button clears the grid.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement DePINCoverageMapper widget"
```

### Task 23: AgentDecisionLoop (Module 14)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace AgentDecisionLoop placeholder

- [ ] **Step 1: Implement AgentDecisionLoop**

Canvas widget, 500px tall (Tall).
- Circular decision loop with 4 stages: Observe (eye icon) → Evaluate (brain) → Execute (lightning) → Collect (coin). Arranged as a square/diamond cycle.
- The agent (a small bot icon/circle) travels around the loop continuously.
- At "Observe": price data streams in (animated numbers).
- At "Evaluate": decision tree branches appear briefly — "Profitable?" → Yes/No. In volatile markets, more "Yes" branches light up.
- At "Execute": a transaction particle shoots toward an "On-chain" target.
- At "Collect": reward tokens flow back to the agent. Counter: "Total profit: X SOL"
- "Market Conditions" toggle: Stable vs Volatile. In volatile mode, the agent cycles faster and finds more opportunities. In stable, it mostly passes ("No opportunity" shown at Evaluate stage).
- Cycle counter: "Loops: N | Opportunities found: M | Success rate: X%"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement AgentDecisionLoop widget"
```

### Task 24: FullEcosystemFlow (Module 15)

**Files:**
- Modify: `src/courses/ecosystem/EcosystemCourse.jsx` — replace FullEcosystemFlow placeholder

- [ ] **Step 1: Implement FullEcosystemFlow**

Canvas widget, 700px tall (Showcase). The capstone visualization.
- Vertical layout with 7 layers (representing the ecosystem stack): Wallet → RPC/Infrastructure → Validator/Consensus → Runtime/Execution → DEX/Protocol → Oracle/Data → Propagation/Finality
- Each layer is a horizontal bar with the layer name and key protocols.
- "Swap 100 USDC → SOL" button at top. When clicked:
  - A glowing particle descends through each layer, pausing briefly at each
  - Each layer lights up with a glow effect as the particle passes through
  - Relevant protocol names in each layer pulse when active
  - Connection lines between layers animate
  - Particles cascade and multiply through lower layers (one tx touches many systems)
  - Final layer: "Finalized" burst of particles
- Auto-replays every 10 seconds. "Replay" button for manual trigger.
- As the particle traverses, a sidebar narrates: "Phantom signs the transaction", "Helius RPC forwards via QUIC", etc.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/ecosystem/EcosystemCourse.jsx
git commit -m "feat(ecosystem): implement FullEcosystemFlow widget"
```

---

## Phase 4: MEV Course Widgets

### Task 25: MEV Course widget placeholders + Section dispatcher

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx`

- [ ] **Step 1: Add placeholder functions and update Section dispatcher**

Add these placeholder widget stubs above the Section dispatcher in MevCourse.jsx (same style as ecosystem placeholders), and update the interactive case in the Section dispatcher:

Widgets to stub: `SandwichAttackAnimator`, `MEVExtractionHeatmap`, `LeaderSchedulePredictor`, `ArbOpportunityDetector`, `LiquidationCascade`, `SupplyChainFlow`, `JitoBundleBuilder`, `ColocationLatencyViz`, `StrategyBacktester`, `FirstPriceAuction`, `SlippageProtection`, `PrivateTransactionViz`, `MEVBotArchitectBuilder`

Widget IDs for dispatcher: `sandwich-attack`, `mev-heatmap`, `leader-schedule`, `arb-detector`, `liquidation-cascade`, `supply-chain-flow`, `jito-bundle-builder`, `colocation-latency`, `strategy-backtester`, `first-price-auction`, `slippage-protection`, `private-tx-viz`, `mev-bot-builder`

- [ ] **Step 2: Add interactive section entries to MODULES data**

Module 00 (`intro`): Add `{ type: "interactive", widget: "sandwich-attack" }` after the stats section, and `{ type: "interactive", widget: "mev-heatmap" }` after that.

Module 01 (`solana-arch`): Add `{ type: "interactive", widget: "leader-schedule" }` after the existing slot-visualizer.

Module 02 (`mev-types`): Add `{ type: "interactive", widget: "arb-detector" }` and `{ type: "interactive", widget: "liquidation-cascade" }` after the mev-table section.

Module 03 (`supply-chain`): Add `{ type: "interactive", widget: "supply-chain-flow" }` after the supply-chain section.

Module 04 (`infra`): Add `{ type: "interactive", widget: "jito-bundle-builder" }` and `{ type: "interactive", widget: "colocation-latency" }` after the infra-stack section.

Module 05 (`strategy`): Add `{ type: "interactive", widget: "strategy-backtester" }` after the last code section.

Module 06 (`economics`): Add `{ type: "interactive", widget: "first-price-auction" }` after the existing tip-optimizer.

Module 07 (`defense`): Add `{ type: "interactive", widget: "slippage-protection" }` and `{ type: "interactive", widget: "private-tx-viz" }` after the concepts section.

Module 08 (`build`): Add `{ type: "interactive", widget: "mev-bot-builder" }` at the end before the quiz.

- [ ] **Step 3: Verify build, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): add widget placeholders and interactive section entries"
```

### Task 26: SandwichAttackAnimator (MEV Module 00)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace SandwichAttackAnimator placeholder

- [ ] **Step 1: Implement SandwichAttackAnimator**

Canvas widget, 500px tall. Key behavior:
- A transaction queue shown vertically. User's swap is in the middle (labeled "Your Swap: 1000 USDC → SOL").
- "Watch Attack" button triggers the animation:
  1. A searcher bot icon detects the user's tx (scanning beam animation)
  2. Front-run tx inserts BEFORE user's tx (slides in from right with red glow): "Buy SOL" — price ticks up
  3. User's swap executes at the now-higher price (amber highlight): "You get less SOL"
  4. Back-run tx inserts AFTER: "Sell SOL" — searcher captures the spread
  5. Profit calculation animates: "Searcher profit: $8.67 | Your loss: $8.67"
- "Swap Size" slider (100 to 10,000 USDC). Larger swaps = bigger profit for attacker.
- "Slippage Tolerance" slider (0.1% to 5%). Higher slippage = more room for attacker.

Design tokens: user tx = #5DCAA5, attacker tx = #E24B4A, profit = #EF9F27.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement SandwichAttackAnimator widget"
```

### Task 27: MEVExtractionHeatmap (MEV Module 00)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace MEVExtractionHeatmap placeholder

- [ ] **Step 1: Implement MEVExtractionHeatmap**

Canvas widget, 350px tall (Standard).
- Grid of rectangles representing blocks (10 columns x 5 rows = 50 blocks).
- Each block has a random MEV value (0 to $5000). Color intensity maps to value: low = dim, high = bright glow.
- Three MEV types color-coded: arbitrage (#5DCAA5), liquidation (#378ADD), sandwich (#E24B4A).
- Blocks shift left every ~2 seconds (new column appears on right, oldest column fades out), simulating live chain activity.
- Hover over a block: tooltip shows "Block #N — Arb: $X | Liq: $Y | Sandwich: $Z | Total: $W"
- Running totals at bottom: "Total MEV (50 blocks): $X | Avg/block: $Y"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement MEVExtractionHeatmap widget"
```

### Task 28: LeaderSchedulePredictor (MEV Module 01)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace LeaderSchedulePredictor placeholder

- [ ] **Step 1: Implement LeaderSchedulePredictor**

SVG + CSS widget, 500px tall (Tall).
- Top section: horizontal timeline of 20 upcoming slots. Each slot is a colored rectangle labeled with a validator name ("Val-A", "Val-B", etc.). Groups of 4 consecutive slots have the same color (same leader).
- Current slot pulses with a glow. Timeline auto-advances every ~2 seconds.
- Click a slot → info panel appears: "Leader: Val-C | Stake: 5.2M SOL | Location: Amsterdam"
- Bottom section: simplified world map (just continental outlines drawn with SVG paths or simple shapes). 5 dots represent validator locations.
- A draggable "Your Server" marker. As you drag it near a validator, a latency line appears with "RTT: Xms" label. Closer = lower latency = greener color. Farther = higher latency = redder.
- Insight text: "Targeting Val-C from Amsterdam: 2ms RTT — strong position" vs "Targeting Val-C from Tokyo: 180ms RTT — disadvantaged"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement LeaderSchedulePredictor widget"
```

### Task 29: ArbOpportunityDetector (MEV Module 02)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace ArbOpportunityDetector placeholder

- [ ] **Step 1: Implement ArbOpportunityDetector**

Canvas widget, 500px tall (Tall). Gamified.
- Two DEX price displays side by side: "Raydium: $X" and "Orca: $Y" for SOL/USDC.
- Prices jitter randomly every 500ms (±0.1-0.5%).
- When the price difference exceeds $0.50, an "OPPORTUNITY!" flash appears with a countdown timer (3 seconds).
- User clicks "Execute Arb" button before timer expires:
  - Success: animated "buy low, sell high" particle flow between the two DEXs. Profit shown: "$0.83 - $0.02 fee - $0.05 tip = $0.76 net"
  - Too slow: "Missed! Another searcher captured it." Red flash.
- Score tracker: "Opportunities: N | Captured: M | Total profit: $X"
- "Speed" slider: controls how fast prices move (Easy/Medium/Hard). Harder = shorter opportunity windows.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement ArbOpportunityDetector widget"
```

### Task 30: LiquidationCascade (MEV Module 02)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace LiquidationCascade placeholder

- [ ] **Step 1: Implement LiquidationCascade**

Canvas widget, 500px tall (Tall).
- 8 lending positions shown as horizontal bars. Each bar has: "Position N — Collateral: X SOL | Debt: Y USDC | Health: Z%"
- Health is a color gradient: green (>150%) → yellow (120-150%) → red (<120%) → liquidated (<100%).
- A "SOL Price" slider at top: $200 down to $50.
- As user drags price down:
  - Health factors update in real-time
  - Positions turn yellow, then red
  - At health <100%: position bar shatters (particle burst), "LIQUIDATED" stamp appears
  - Liquidation dumps collateral → "Market sell: X SOL" text → this pushes the price down further (price slider auto-nudges down by a small amount)
  - The auto-nudge can trigger more liquidations = visible cascade
- Stats: "Positions liquidated: N/8 | Collateral sold: X SOL | Liquidator profit: $Y"
- Reset button restores all positions and price.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement LiquidationCascade widget"
```

### Task 31: SupplyChainFlow (MEV Module 03)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace SupplyChainFlow placeholder

- [ ] **Step 1: Implement SupplyChainFlow**

Canvas widget, 500px tall (Tall).
- 4 actor nodes in a horizontal chain: User → Searcher → Block Engine (Jito) → Validator
- Animated flow: user emits a transaction (particle). Searcher detects it, builds a bundle (particles merge), adds a tip (gold particle attached), sends to Block Engine. Block Engine evaluates (pulsing), accepts/rejects based on tip. If accepted → flows to Validator with tip distribution animation.
- "Tip Amount" slider (0.001 SOL to 0.1 SOL). Below a threshold (~0.01), Block Engine rejects (red X, bundle bounces back). Above threshold, it passes through.
- "Competing Bundles" counter (1-5). More competitors = higher tip needed to win. At 5 competitors with low tip, rejection rate goes up visually.
- Revenue split display: "Tip: 0.05 SOL → Validator: 0.04 SOL (80%) | Jito: 0.005 SOL (10%) | Stakers: 0.005 SOL (10%)"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement SupplyChainFlow widget"
```

### Task 32: JitoBundleBuilder (MEV Module 04)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace JitoBundleBuilder placeholder

- [ ] **Step 1: Implement JitoBundleBuilder**

SVG + CSS widget, 500px tall (Tall).
- Left panel: "Available Transactions" — 5 transaction cards (e.g., "Arb: Buy X on Raydium", "Sell X on Orca", "Tip: 0.03 SOL"). Draggable or click-to-add.
- Center panel: "Your Bundle" — ordered list of transactions the user has added. Reorderable by clicking up/down arrows. Tip at the bottom.
- Right panel: "Competing Bundles" — 2-3 AI bundles with hidden tips ("Bundle B: 3 txs, tip: ???").
- "Submit" button. When clicked:
  - Block Engine evaluates all bundles simultaneously
  - Tips are revealed with animation
  - Highest tip bundle wins (green checkmark), others get red X
  - Winner's bundle is included in a "Block" visualization at the bottom
- "Tip" slider on the user's bundle. Finding the sweet spot: too low = lose, too high = negative EV.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement JitoBundleBuilder widget"
```

### Task 33: ColocationLatencyViz (MEV Module 04)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace ColocationLatencyViz placeholder

- [ ] **Step 1: Implement ColocationLatencyViz**

Canvas widget, 500px tall (Tall).
- Simplified world map (continental outlines using canvas paths — doesn't need to be detailed, just recognizable shapes).
- 5 data center dots: Amsterdam, NYC, Tokyo, Frankfurt, Singapore. Each labeled.
- 3 validator dots nearby certain data centers, pulsing.
- A draggable "Your Server" circle (bright accent color). 
- As you drag your server:
  - Lines draw from your server to each validator
  - Each line has a latency label calculated from approximate distance: "2ms", "45ms", "180ms"
  - Line color: green (<10ms), yellow (10-50ms), red (>50ms)
  - A "Competitive Advantage" meter fills based on proximity to the current leader
- Current leader rotates every 3 seconds among the 3 validators.
- Insight text updates: "Your latency to current leader: Xms. You {'would' | 'would not'} be competitive for MEV extraction."

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement ColocationLatencyViz widget"
```

### Task 34: StrategyBacktester (MEV Module 05)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace StrategyBacktester placeholder

- [ ] **Step 1: Implement StrategyBacktester**

Canvas + SVG hybrid widget, 700px tall (Showcase).
- Top panel — configuration:
  - Strategy selector: 3 buttons (Arbitrage / Liquidation / Sandwich)
  - Parameter sliders vary by strategy:
    - Arbitrage: "Min Spread" (0.1%-2%), "Tip %" (5%-50%)
    - Liquidation: "Health Threshold" (100%-120%), "Tip %" (5%-50%)
    - Sandwich: "Min Victim Size" ($100-$10,000), "Slippage Buffer" (0.1%-2%)
  - "Run Backtest" button

- Bottom panel — results (canvas):
  - 50 simulated blocks scroll left to right
  - Each block: the strategy scans for opportunities (scanning line animation)
  - When opportunity found: bundle submitted (green if won, red if lost to competitor)
  - Running P&L chart draws in real-time as the backtest progresses
  - Final stats: "Blocks scanned: 50 | Opportunities: N | Won: M | Profit: X SOL | Win rate: Y% | Avg profit/trade: Z SOL"

All numbers are deterministic from the parameters (seeded random) so results are reproducible for the same settings.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement StrategyBacktester widget"
```

### Task 35: FirstPriceAuction (MEV Module 06)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace FirstPriceAuction placeholder

- [ ] **Step 1: Implement FirstPriceAuction**

SVG + CSS widget, 350px tall (Standard).
- An opportunity card at top: "Arb opportunity worth 0.10 SOL"
- 4 bidder rows: "You" + 3 AI opponents. Each has a bid input (slider: 0.01 to 0.09 SOL).
- AI bids are hidden ("???") until reveal.
- "Submit Bid" button. On click:
  - All bids revealed simultaneously with a flip animation
  - Highest bid highlighted in green = winner
  - Winner's profit = opportunity value - their bid
  - If you win: "You won! Profit: 0.10 - 0.07 = 0.03 SOL"
  - If you lose: "Outbid by Searcher B (0.08 SOL)"
- "Next Round" button. Over 5 rounds, AI opponents adapt:
  - Round 1: AI bids low (0.03-0.05)
  - Round 2-3: AI learns and bids higher
  - Round 4-5: Aggressive bidding, thin margins — demonstrates winner's curse
- Cumulative scoreboard after 5 rounds.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement FirstPriceAuction widget"
```

### Task 36: SlippageProtection (MEV Module 07)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace SlippageProtection placeholder

- [ ] **Step 1: Implement SlippageProtection**

SVG + CSS widget, 350px tall (Standard).
- A visual balance beam / seesaw.
- Left side: "Protection" (shield icon). Right side: "Execution" (speed icon).
- "Slippage Tolerance" slider (0.1% to 5%).
- As slider moves right (higher tolerance):
  - Beam tilts toward "Execution" — more tx succeed
  - But a "Sandwich Risk" meter fills up (red bar)
  - "Execution Rate: 98%" but "Avg MEV Loss: $4.20/trade"
- As slider moves left (lower tolerance):
  - Beam tilts toward "Protection" — safe from sandwiches
  - But "Execution Rate" drops: "72%" with "Avg MEV Loss: $0.10/trade"
  - "Failed Transactions" counter increases
- "Market Volatility" toggle (Low/High). In high volatility, tight slippage causes way more failures.
- Sweet spot highlighted in green on the slider: "Recommended: 0.5-1.0%"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement SlippageProtection widget"
```

### Task 37: PrivateTransactionViz (MEV Module 07)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace PrivateTransactionViz placeholder

- [ ] **Step 1: Implement PrivateTransactionViz**

Canvas widget, 500px tall (Tall). Split screen.
- **Left: "Public Transaction"**
  - User node at left emits a transaction (glowing particle)
  - Transaction broadcasts to the whole network (particle expands outward like a ripple)
  - 3 searcher bot icons detect it (their "scanners" light up)
  - Bots race to front-run: red particles converge on the transaction
  - Result: user's tx gets sandwiched (red bracket around it)
  - "Cost: -$8.67"

- **Right: "Private Transaction (Jito)"**
  - User node emits transaction
  - Instead of broadcasting, it travels through an encrypted tunnel (animated dashed line with lock icon) directly to the Block Engine
  - Block Engine includes it in a bundle — goes straight to the validator
  - Searcher bots have no signal (scanners stay dim)
  - Result: user's tx executes cleanly
  - "Cost: -$0.00 MEV + $0.001 tip"

- Both sides animate simultaneously for direct comparison.
- "Replay" button to watch again.

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement PrivateTransactionViz widget"
```

### Task 38: MEVBotArchitectBuilder (MEV Module 08)

**Files:**
- Modify: `src/courses/mev/MevCourse.jsx` — replace MEVBotArchitectBuilder placeholder

- [ ] **Step 1: Implement MEVBotArchitectBuilder**

SVG + CSS widget, 500px tall (Tall). Interactive system design tool.
- Left sidebar: 6 component cards that can be toggled on/off by clicking:
  - "RPC Node" (data source)
  - "Geyser Plugin" (real-time state streaming)
  - "Price Feed" (oracle data)
  - "Strategy Engine" (opportunity detection)
  - "Bundle Submitter" (Jito integration)
  - "Monitoring" (alerting/logging)
- Center: pipeline visualization. Connected components shown as cards with arrows between them. Unselected components are dimmed/dashed.
- When all 6 are selected: "Complete Architecture ✓" in green.
- When components are missing, feedback appears:
  - Missing RPC: "No data source — can't observe chain state"
  - Missing Geyser: "Using RPC polling — 100x slower than streaming. Competitors with Geyser will beat you."
  - Missing Price Feed: "No off-chain price reference — can't detect cross-venue arbitrage"
  - Missing Strategy Engine: "No logic — just infrastructure with no brain"
  - Missing Bundle Submitter: "Sending raw transactions — no bundle guarantees, high failure rate"
  - Missing Monitoring: "Flying blind — won't know when your bot fails at 3am"
- Each component card also shows estimated cost: "RPC: $100/mo", "Geyser: $200/mo", "Monitoring: $50/mo"
- Total cost counter at bottom: "Infrastructure cost: $X/month"

- [ ] **Step 2: Test in browser, commit**

```bash
git add src/courses/mev/MevCourse.jsx
git commit -m "feat(mev): implement MEVBotArchitectBuilder widget"
```

---

## Phase 5: HTML Sync

### Task 39: Sync ecosystem HTML file

**Files:**
- Modify: `ecosystem_course/solana-ecosystem-deep-dive.html`

- [ ] **Step 1: Copy all widget code and MODULES changes from JSX to HTML**

The HTML file uses identical React code inside `<script type="text/babel">`. Copy all changes from `EcosystemCourse.jsx` to the HTML file:
1. All new widget function components
2. The 3 new modules in the MODULES array
3. The updated `num` fields on existing modules
4. All new `{ type: "interactive", widget: "..." }` entries in existing modules
5. The updated Section dispatcher

Key differences between JSX and HTML:
- HTML uses `<a href="/">` instead of `<Link to="/">`
- HTML has no imports (React is loaded via CDN, Prism.js via CDN)
- HTML wraps everything in `<script type="text/babel">`
- The accent color is `#14F195` (not `#C8F06E`) — ensure widget color tokens match the HTML file's accent

Read the current HTML file carefully to understand these differences before copying.

- [ ] **Step 2: Verify by opening HTML file in browser**

Open `ecosystem_course/solana-ecosystem-deep-dive.html` directly and test that all widgets render and animate correctly.

- [ ] **Step 3: Commit**

```bash
git add ecosystem_course/solana-ecosystem-deep-dive.html
git commit -m "feat(ecosystem): sync HTML file with all new widgets and modules"
```

### Task 40: Sync MEV HTML file

**Files:**
- Modify: `mev_course/solana-mev-masterclass.html`

- [ ] **Step 1: Copy all widget code and MODULES changes from JSX to HTML**

Same process as Task 39 but for the MEV course. Copy from `MevCourse.jsx` to the HTML file:
1. All new widget function components
2. All new interactive section entries in MODULES
3. Updated Section dispatcher

Key differences: HTML uses `<a>` not `<Link>`, accent color is `#C8F06E` (matches JSX for MEV), no imports.

- [ ] **Step 2: Verify by opening HTML file in browser, commit**

```bash
git add mev_course/solana-mev-masterclass.html
git commit -m "feat(mev): sync HTML file with all new widgets"
```

---

## Summary

| Phase | Tasks | Widgets | Description |
|-------|-------|---------|-------------|
| 1 | 1 | 0 | Foundation: new modules, renumbering, placeholders |
| 2 | 2-9 | 8 | Ecosystem deep-dive widgets (Modules 03-05) |
| 3 | 10-24 | 15 | Ecosystem existing module widgets (Modules 00-02, 06-15) |
| 4 | 25-38 | 13 | MEV course widgets (all modules) |
| 5 | 39-40 | 0 | HTML file sync |
| **Total** | **40** | **36** | |
