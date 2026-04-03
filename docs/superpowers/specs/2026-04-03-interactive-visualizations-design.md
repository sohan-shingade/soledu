# Interactive Visualizations & Animations — Design Spec

**Date:** 2026-04-03
**Scope:** Add 36 new interactive widgets across both courses (23 ecosystem, 13 MEV), plus 3 new deep-dive modules to the ecosystem course.

---

## 1. Overview

Both courses currently have only 2 interactive widgets each. This update adds rich, animated, interactive visualizations to every module — transforming the courses from mostly-static text into hands-on learning experiences.

### Goals
- Every module has at least one interactive element
- Mix of animated explainers (watch & understand) and hands-on sandboxes (play & discover)
- Rich visual style: particle effects, glowing connections, physics-based animations
- Zero external dependencies beyond React, Prism.js, and browser APIs

### Non-Goals
- Mobile-first optimization (desktop-first, responsive is nice-to-have)
- Accessibility for screen readers on canvas widgets (text alternatives exist in surrounding content)
- Real-time blockchain data (all simulations use realistic but synthetic data)

---

## 2. Ecosystem Course: Structural Changes

### New Modules (inserted after Module 02)

The 8 Innovations overview (Module 02) stays as-is. Three new deep-dive modules are added after it, shifting all subsequent module numbers by 3.

| New # | Old # | ID | Title |
|-------|-------|----|-------|
| 03 | NEW | `consensus-deep-dive` | Consensus Deep Dive — PoH + Tower BFT |
| 04 | NEW | `performance-deep-dive` | Performance Deep Dive — Gulf Stream, Turbine, Pipelining |
| 05 | NEW | `execution-deep-dive` | Execution Deep Dive — Sealevel + Cloudbreak |
| 06 | was 03 | `tx-lifecycle` | Transaction Lifecycle |
| 07 | was 04 | `network-infra` | Network Infrastructure |
| 08 | was 05 | `core-protocols` | Core Protocols & Middleware |
| 09 | was 06 | `defi-protocols` | DeFi Protocols |
| 10 | was 07 | `staking-yield` | Staking & Yield |
| 11 | was 08 | `stablecoins-rwa` | Stablecoins & Real-World Assets |
| 12 | was 09 | `consumer-layer` | Consumer Layer |
| 13 | was 10 | `depin` | DePIN |
| 14 | was 11 | `ai-agents` | AI Agents |
| 15 | was 12 | `how-it-connects` | How It All Connects |

Total modules: 13 → 16

---

## 3. Ecosystem Course: Widget Inventory

### Module 00: "What is Solana?"
**Widget 1: BlockchainComparisonRace** (`blockchain-race`)
- Type: Canvas animation
- Size: Showcase (700px)
- Three animated chains (Bitcoin, Ethereum, Solana) processing transactions side by side. Real-time counters for TPS, fees, confirmation time. User adjusts transaction load slider to see saturation points.

### Module 01: "Proof of History"
**Widget 2: InteractiveHashChain** (`hash-chain-explorer`)
- Type: Canvas + SVG hybrid
- Size: Standard (350px)
- Running hash chain where user clicks "insert transaction" to see timestamping. "Verify" button shows parallel verification across cores. Teaser for the deep-dive.

### Module 02: "The 8 Innovations"
**Widget 3: InnovationPipeline** (`innovation-pipeline`)
- Type: SVG + CSS animation
- Size: Tall (500px)
- All 8 innovations as an animated assembly line. Transaction flows left to right through each stage with mini-animations. Click any stage for tooltip + deep-dive link.

### Module 03: "Consensus Deep Dive" (NEW)
**Widget 4: PoHChainBuilder** (`poh-chain-builder`)
- Type: Canvas
- Size: Tall (500px)
- Real-time hash chain computation with glowing ticker. Transactions drop in and get woven in. Counter shows hashes/sec. Full-featured version of the Module 01 teaser.

**Widget 5: TowerBFTSimulator** (`tower-bft-simulator`)
- Type: Canvas
- Size: Showcase (700px)
- 12 validator nodes in a circle. Voting rounds animate with glowing pulses. Lockout periods shown as expanding rings (2→4→8→16→32 slots). User advances rounds, can toggle malicious validator. Shows 2/3+ supermajority finality.

**Widget 6: ConsensusRace** (`consensus-race`)
- Type: Canvas
- Size: Tall (500px)
- Split-screen: traditional BFT O(n²) messaging vs PoH minimal messaging. Both race to finality. User adjusts node count slider to see gap widen.

### Module 04: "Performance Deep Dive" (NEW)
**Widget 7: GulfStreamForwarding** (`gulf-stream`)
- Type: Canvas
- Size: Tall (500px)
- Network topology with transactions flowing to current + upcoming leaders. Particles along edges. Click nodes to see forwarding queues.

**Widget 8: TurbinePropagation** (`turbine-propagation`)
- Type: Canvas
- Size: Showcase (700px)
- Leader broadcasts block → shreds fan out in tree layers with cascading particles. Reed-Solomon recovery: red shreds lost, block reconstructs. User adjusts packet loss %.

**Widget 9: PipelineAnimator** (`pipeline-animator`)
- Type: SVG + CSS
- Size: Tall (500px)
- 4-stage conveyor belt (Fetch → SigVerify → Execute → Write). Multiple batches flow through simultaneously. Pause/step controls. Throughput multiplier display.

### Module 05: "Execution Deep Dive" (NEW)
**Widget 10: SealevelParallelViz** (`sealevel-parallel`)
- Type: Canvas
- Size: Showcase (700px)
- Multi-lane transaction execution. Parallel (green) vs conflicting (amber with lock). User drags transactions between lanes, adds conflicts. Core count slider shows scaling.

**Widget 11: CloudbreakIODemo** (`cloudbreak-io`)
- Type: Canvas
- Size: Standard (350px)
- 32 concurrent threads reading/writing accounts DB. Sequential vs concurrent comparison. IOPS throughput counter.

### Module 06: "Transaction Lifecycle"
**Widget 12: TransactionJourney** (`tx-journey`)
- Type: Canvas
- Size: Showcase (700px)
- Full tx lifecycle animated: wallet → QUIC → PoH → Sealevel → Tower BFT → Turbine → finalized. Glowing particle traveling through illustrated pipeline. Timeline bar shows elapsed ms. Click stages to pause and inspect.

### Module 07: "Network Infrastructure"
**Widget 13: ValidatorNetworkMap** (`validator-network`)
- Type: Canvas
- Size: Showcase (700px)
- Network graph with ~30 validators. Node size = stake. Leader rotation pulses. QUIC connections light up. Toggle "attack scenario" (1/3 nodes dark) to see consensus holds.

**Widget 14: StakeWeightedQoS** (`swqos-simulator`)
- Type: SVG + CSS
- Size: Standard (350px)
- Two lanes: staked (priority) vs unstaked. Under congestion, priority flows while regular backs up. User adjusts congestion and stake sliders.

### Module 08: "Core Protocols & Middleware"
**Widget 15: OraclePriceFeed** (`oracle-price-feed`)
- Type: Canvas
- Size: Tall (500px)
- Multiple publisher nodes push prices → weighted aggregate. User drags individual prices. Confidence interval widens on disagreement. Shows DeFi consumption.

### Module 09: "DeFi Protocols"
**Widget 16: AMMvsCLOB** (`amm-vs-clob`)
- Type: Canvas
- Size: Showcase (700px)
- Split: AMM xy=k curve with animated trades showing slippage vs order book with bid/ask depth. User places trades on both to compare execution.

**Widget 17: JupiterRouteOptimizer** (`jupiter-router`)
- Type: Canvas
- Size: Tall (500px)
- Input a swap → animated pathfinding splits across DEXs. Flowing particles along paths. Shows split routing reduces price impact.

### Module 10: "Staking & Yield"
**Widget 18: LSTComposabilityBuilder** (`lst-builder`)
- Type: SVG + CSS
- Size: Tall (500px)
- Step-by-step DeFi chain builder: SOL → stake → collateralize → borrow → swap → LP. Animated token flows between protocol logos. Running APY counter. Richer version of existing ComposabilitySimulator.

### Module 11: "Stablecoins & Real-World Assets"
**Widget 19: StablecoinPegMechanism** (`stablecoin-peg`)
- Type: SVG + CSS
- Size: Standard (350px)
- Mint/burn arbitrage cycle. Price > $1 → mint & sell (price down). Price < $1 → buy & redeem (price up). User drags market price slider, watches peg restore.

### Module 12: "Consumer Layer"
**Widget 20: WalletTransactionFlow** (`wallet-tx-flow`)
- Type: SVG + CSS
- Size: Tall (500px)
- "Tap Swap in Phantom" → behind-the-scenes animated flow through Jupiter API, RPC, on-chain execution, confirmation, wallet update. Protocol logos at each stage.

### Module 13: "DePIN"
**Widget 21: DePINCoverageMapper** (`depin-mapper`)
- Type: Canvas
- Size: Tall (500px)
- Hex grid map. Click hexes to deploy hotspots. Coverage grows → rewards flow as particles. Diminishing returns on overlapping hexes. Token incentive visualization.

### Module 14: "AI Agents"
**Widget 22: AgentDecisionLoop** (`agent-loop`)
- Type: Canvas
- Size: Tall (500px)
- Agent decision loop: observe → evaluate → build tx → submit → reward. Decision tree lights up chosen path. Toggle market conditions (volatile/stable) to see adaptation.

### Module 15: "How It All Connects"
**Widget 23: FullEcosystemFlow** (`ecosystem-flow`)
- Type: Canvas
- Size: Showcase (700px)
- Capstone. "Swap 100 USDC for SOL" triggers cascade lighting up every ecosystem layer. Particle flow through wallet → RPC → validator → PoH → Sealevel → DEX → oracle → LP → Turbine → finality. Auto-plays on scroll, replayable.

---

## 4. MEV Course: Widget Inventory

### Module 00: "What is MEV?"
**Widget 24: SandwichAttackAnimator** (`sandwich-attack`)
- Type: Canvas
- Size: Tall (500px)
- Front-run → user swap → back-run animated with token amounts and profit. User adjusts swap size and slippage.

**Widget 25: MEVExtractionHeatmap** (`mev-heatmap`)
- Type: Canvas
- Size: Standard (350px)
- Block grid with MEV intensity glow. Hover shows breakdown (arb green, liquidation blue, sandwich red). Auto-scrolls simulating live chain.

### Module 01: "Solana's Architecture" (has SlotVisualizer)
**Widget 26: LeaderSchedulePredictor** (`leader-schedule`)
- Type: SVG + CSS
- Size: Tall (500px)
- Epoch timeline color-coded by validator. Click slot → "target this validator." Draggable searcher location on mini world map with latency calc.

### Module 02: "MEV Types on Solana"
**Widget 27: ArbOpportunityDetector** (`arb-detector`)
- Type: Canvas
- Size: Tall (500px)
- Two DEX price displays. Prices drift apart. Spread exceeds threshold → opportunity flashes → user clicks "Execute" before timer expires.

**Widget 28: LiquidationCascade** (`liquidation-cascade`)
- Type: Canvas
- Size: Tall (500px)
- Lending positions as health bars. User drags SOL price down. Positions turn amber → red → liquidated with particle burst. Cascade triggers more liquidations.

### Module 03: "The MEV Supply Chain"
**Widget 29: SupplyChainFlow** (`supply-chain-flow`)
- Type: Canvas
- Size: Tall (500px)
- User → Searcher → Block Engine → Validator pipeline. Token particles flow. Adjust tip amounts to see rejection/acceptance thresholds.

### Module 04: "Infrastructure Stack"
**Widget 30: JitoBundleBuilder** (`jito-bundle-builder`)
- Type: SVG + CSS
- Size: Tall (500px)
- Drag transactions into bundle, set tip, submit. Competing bundles shown. Winner included with animation.

**Widget 31: ColocationLatencyViz** (`colocation-latency`)
- Type: Canvas
- Size: Tall (500px)
- World map with data centers and validators. Light pulses show propagation time. User places server, sees round-trip latency to current leader.

### Module 05: "Building a Strategy"
**Widget 32: StrategyBacktester** (`strategy-backtester`)
- Type: Canvas + SVG
- Size: Showcase (700px)
- Pick strategy type, set parameters, run. Animated block replay shows detection → submission → win/loss. Outputs profit, win rate, avg profit.

### Module 06: "MEV Economics" (has TipOptimizer)
**Widget 33: FirstPriceAuction** (`first-price-auction`)
- Type: SVG + CSS
- Size: Standard (350px)
- Multiple searchers bid on same opportunity. Sealed bids revealed simultaneously. User plays as one searcher over multiple rounds. Teaches winner's curse.

### Module 07: "MEV Defense"
**Widget 34: SlippageProtection** (`slippage-protection`)
- Type: SVG + CSS
- Size: Standard (350px)
- Swap with adjustable slippage tolerance. Tight = safe but fails in volatility. Wide = always executes but vulnerable. Animated balance beam visualization.

**Widget 35: PrivateTransactionViz** (`private-tx-viz`)
- Type: Canvas
- Size: Tall (500px)
- Split: normal tx (broadcast, searcher bots swarm) vs private tx (encrypted tunnel to block engine). Visual demonstration of why privacy matters.

### Module 08: "Build Your Stack"
**Widget 36: MEVBotArchitectBuilder** (`mev-bot-builder`)
- Type: SVG + CSS
- Size: Tall (500px)
- Drag-and-drop system design with components (RPC, Geyser, price feed, strategy engine, etc.). Connect into pipeline. System evaluates and gives feedback.

---

## 5. Technical Architecture

### Rendering Strategy

| Technique | When | Widgets |
|-----------|------|---------|
| Canvas + requestAnimationFrame | Particles, physics, 20+ moving elements | ~22 widgets |
| SVG + CSS transitions | Structured shapes, step-throughs, flowcharts | ~14 widgets |

### Canvas Widget Template

```javascript
function WidgetName() {
  const canvasRef = useRef(null);
  const [param, setParam] = useState(defaultValue);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];

    // IntersectionObserver pauses off-screen
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) cancelAnimationFrame(animId);
      else loop();
    }, { threshold: 0.1 });
    observer.observe(canvas);

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // update & draw particles
      // draw connections, nodes, etc.
      animId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [param]);

  return (
    <div style={{ marginBottom: 24 }}>
      <canvas ref={canvasRef} width={800} height={500}
        style={{ width: "100%", height: "auto", borderRadius: 10, border: "1px solid var(--border)" }} />
      {/* Controls below canvas */}
    </div>
  );
}
```

### Particle System (shared pattern)

```javascript
// Pre-allocated pool, recycled on death
const MAX_PARTICLES = 200;
const pool = Array.from({ length: MAX_PARTICLES }, () => ({
  x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: "", size: 2, active: false
}));

function emit(x, y, color, count = 10) {
  let spawned = 0;
  for (const p of pool) {
    if (!p.active && spawned < count) {
      p.x = x; p.y = y;
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = (Math.random() - 0.5) * 3;
      p.life = 0; p.maxLife = 40 + Math.random() * 40;
      p.color = color; p.size = 2 + Math.random() * 2;
      p.active = true;
      spawned++;
    }
  }
}
```

### Glow Effect Pattern

```javascript
ctx.shadowBlur = 15;
ctx.shadowColor = color;
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0; // reset
```

### Widget Sizing

| Category | Height | Use |
|----------|--------|-----|
| Standard | 350px | Simple sliders, charts, single-concept |
| Tall | 500px | Network graphs, multi-panel, simulators |
| Showcase | 700px | Turbine, Tower BFT, ecosystem flow, backtesters |

### Performance

- IntersectionObserver pauses off-screen canvas animations
- Particle pool: max 200 per widget, pre-allocated, recycled
- Target: 60fps on 2020-era hardware
- Canvas resolution: logical 800×{height}, CSS scaled to container width

### Code Organization

All widget components defined above the Section dispatcher in each course file. Pattern:

```
// existing components (TextBlock, CodeBlock, etc.)
// === NEW INTERACTIVE WIDGETS ===
function BlockchainComparisonRace() { ... }
function InteractiveHashChain() { ... }
// ...etc
// === END WIDGETS ===
function Section({ section }) { ... } // updated switch
```

### HTML Sync

- Build widgets in .jsx files first (Vite hot reload)
- Port to .html after each batch is validated
- HTML versions are identical code wrapped in `<script type="text/babel">`

---

## 6. New Module Content

### Module 03: "Consensus Deep Dive — PoH + Tower BFT"

**Sections:**
1. text — Introduction to consensus: why distributed systems need agreement
2. text — PoH deep dive: SHA-256 chaining explained in detail with notation
3. interactive — PoHChainBuilder widget
4. text — Tower BFT: exponential lockout voting explained
5. interactive — TowerBFTSimulator widget
6. text — How PoH + Tower BFT combine: PoH provides ordering, Tower BFT provides finality
7. interactive — ConsensusRace widget
8. stats — Consensus metrics (finality time, vote cost, lockout periods)
9. quiz — "What happens to a validator's lockout period after 5 consecutive votes for the same fork?"

### Module 04: "Performance Deep Dive — Gulf Stream, Turbine, Pipelining"

**Sections:**
1. text — Introduction: Solana's performance trinity
2. text — Gulf Stream: eliminating the mempool
3. interactive — GulfStreamForwarding widget
4. text — Turbine: BitTorrent-inspired block propagation
5. interactive — TurbinePropagation widget
6. text — Pipelining: assembly-line transaction processing
7. interactive — PipelineAnimator widget
8. stats — Performance metrics (propagation time, pipeline throughput, mempool comparison)
9. quiz — "Why does Turbine use Reed-Solomon erasure coding?"

### Module 05: "Execution Deep Dive — Sealevel + Cloudbreak"

**Sections:**
1. text — Introduction: parallel execution as Solana's secret weapon
2. text — Sealevel: how account-level locking enables parallelism
3. interactive — SealevelParallelViz widget
4. text — Cloudbreak: memory-mapped accounts database
5. interactive — CloudbreakIODemo widget
6. stats — Execution metrics (parallel threads, IOPS, accounts DB size)
7. quiz — "What must a Solana transaction declare upfront to enable parallel execution?"

---

## 7. Module Numbering Migration

All references to module numbers in the ecosystem course MODULES array need updating. The `num` field shifts by 3 for all modules after position 2:

```
00 → 00 (What is Solana?)
01 → 01 (Proof of History)
02 → 02 (The 8 Innovations)
NEW → 03 (Consensus Deep Dive)
NEW → 04 (Performance Deep Dive)
NEW → 05 (Execution Deep Dive)
03 → 06 (Transaction Lifecycle)
04 → 07 (Network Infrastructure)
05 → 08 (Core Protocols & Middleware)
06 → 09 (DeFi Protocols)
07 → 10 (Staking & Yield)
08 → 11 (Stablecoins & Real-World Assets)
09 → 12 (Consumer Layer)
10 → 13 (DePIN)
11 → 14 (AI Agents)
12 → 15 (How It All Connects)
```

Progress tracking keys in localStorage remain functional (keyed by module index).

---

## 8. Summary

| Metric | Before | After |
|--------|--------|-------|
| Ecosystem modules | 13 | 16 |
| Ecosystem interactive widgets | 2 | 25 |
| MEV interactive widgets | 2 | 15 |
| Total interactive widgets | 4 | 40 |
| Animation technique | CSS transitions only | Canvas + SVG + CSS |
| External dependencies added | 0 | 0 |
