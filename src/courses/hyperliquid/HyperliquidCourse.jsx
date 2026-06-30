import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { drawWorldMap } from "../shared/worldMap";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-python";

const MODULES = [
  {
      id: "intro",
      num: "00",
      title: "What is MEV?",
      subtitle: "Extraction on a no-mempool order book",
      sections: [
        {
          type: "text",
          content: `**Maximal Extractable Value (MEV)** is the profit that block producers or other privileged actors can capture by strategically ordering, inserting, or censoring transactions within a block.\n\nThe term originated on Ethereum as "Miner Extractable Value," where a public mempool of pending transactions lets searchers observe a victim's swap and bracket it with their own orders. On Solana, the same incentive shows up as a latency race plus Jito's off-chain bundle auction, where searchers tip validators to win ordering.\n\nHyperliquid reshapes the question entirely. It runs a fully **on-chain central limit order book (CLOB)** on its HyperCore L1, sequenced by HyperBFT consensus. There is **no public mempool of pending trading orders**, matching follows strict **price-time priority**, and liquidations and stops fire on a robust **validator-median oracle** rather than a single venue's last print. The honest framing is not "MEV vs no MEV" — it is *discretionary, auctioned MEV* (Solana + Jito) versus *deterministic ordering with residual latency and cross-venue MEV* (Hyperliquid).`
        },
        {
          type: "diagram",
          title: "How an order flows on HyperCore",
          items: [
            { label: "Trader", desc: "Signs an EIP-712 action, POSTs to /exchange", color: "#5DCAA5" },
            { label: "Validators", desc: "Receive it directly — no public mempool", color: "#EF9F27" },
            { label: "HyperBFT", desc: "Sequences actions deterministically by category", color: "#7F77DD" },
            { label: "Matching engine", desc: "Part of the state transition: price-time priority", color: "#378ADD" },
          ]
        },
        {
          type: "stats",
          items: [
            { label: "Public order mempool", value: "None" },
            { label: "Single-block finality", value: "~0.07s" },
            { label: "Order-book matching", value: "Price-time" },
            { label: "Oracle update cadence", value: "Every 3s" },
          ]
        },
        {
          type: "text",
          content: `MEV does not disappear on Hyperliquid — it **moves**. The largest internalized stream, **backstop liquidations**, is socialized to the community HLP vault instead of being raced for by external bots. The most accessible external strategy is **cross-venue funding/basis arbitrage** between Hyperliquid and CEXes, captured by outside quant desks. **Oracle and funding arbitrage** persists on thin perps, and the separate **HyperEVM** layer still hosts a conventional gasPrice-priority bot economy.\n\nWhat is structurally foreclosed is the Ethereum/Solana "observe-the-victim-then-bracket-it" sandwich: with no public pending-order book, no gas-priority auction, and deterministic price-time matching under single-slot finality, classic sandwiching does **not** map onto the CLOB. Even Hyperliquid's native priority fees (added April 2026) are **burned** rather than auctioned to validators, with cancels always ordered ahead of taker orders.`
        },
        {
          type: "interactive",
          widget: "mev-heatmap"
        },
        {
          type: "quiz",
          question: "Why is MEV on Hyperliquid fundamentally different from Ethereum or Solana?",
          options: [
            "Hyperliquid has no MEV of any kind",
            "There is no public order mempool, matching is deterministic price-time priority, and liquidations fire on a validator-median oracle",
            "Hyperliquid uses Proof of Work to randomize ordering",
            "Validators auction top-of-block to the highest bidder like Jito",
          ],
          correct: 1,
          explanation: "HyperCore sequences orders via HyperBFT before execution with no public pending-order mempool, matches in strict price-time priority, and prices liquidations off a stake-weighted median oracle of CEX feeds. This forecloses the classic observe-then-sandwich vector and removes the discretionary, auctioned MEV economy — extraction shifts to latency races, cross-venue arbitrage, and liquidations socialized into HLP, not eliminated."
        }
      ]
    },
  {
    id: "hl-arch",
    num: "01",
    title: "Hyperliquid's Architecture",
    subtitle: "Why the design shapes MEV",
    sections: [
      {
        type: "text",
        content: `To understand MEV on Hyperliquid, you need to understand four architectural features that make it radically different from a public blockchain like Solana or Ethereum. Hyperliquid does not eliminate MEV — it replaces discretionary, auctioned ordering with deterministic in-protocol sequencing, which reshapes where value can be extracted and who captures it.`
      },
      {
        type: "concepts",
        items: [
          {
            title: "HyperBFT consensus",
            body: "A variant of HotStuff consensus optimized for end-to-end latency. Blocks are produced by validators in proportion to staked HYPE, with deterministic single-block finality and no reorgs. Under normal load, optimistic responsiveness finalizes blocks in ~0.07s (~70ms), p99 below ~0.5s. Because consensus produces one canonical finalized sequence with no competing execution traces, reorg- and backrun-based MEV is structurally removed.",
            icon: "🧱"
          },
          {
            title: "HyperCore vs HyperEVM",
            body: "HyperCore is the native L1 holding margin and matching-engine state — a fully on-chain central limit order book (CLOB) that does not rely on off-chain order books. HyperEVM is a separate general-purpose EVM (Chain ID 999) sharing the same HyperBFT block stream and reaching HyperCore via the CoreWriter system contract at 0x3333...3333. The MEV-relevant matching logic lives in HyperCore, not in user-orderable EVM calls.",
            icon: "🔀"
          },
          {
            title: "No public mempool of orders",
            body: "Hyperliquid does not expose a public gossip mempool of pending trading actions. HyperCore orders are sequenced by HyperBFT before execution, so classic 'observe-the-victim-then-bracket-it' sandwiching is structurally foreclosed on the CLOB. (HyperEVM keeps a normal on-chain mempool — constrained to the next 8 nonces per address — but that is the EVM layer, not the order book.)",
            icon: "🔒"
          },
          {
            title: "Validator-run oracle",
            body: "Each validator publishes a spot oracle price for every perp every 3 seconds, computed as a weighted median of eight CEX spot mids. The clearinghouse's final price is the stake-weighted median of all validator submissions, so no single party can arbitrarily override the reference price. This blunts 'manipulate-the-pool-then-liquidate' MEV that plagues single-source AMM oracles.",
            icon: "📡"
          }
        ]
      },
      {
        type: "code",
        title: "Deterministic intra-block ordering — the fundamental constraint",
        language: "rust",
        code: `// Within a single HyperBFT consensus batch, actions are bucketed
  // into three sequential categories and executed strictly in order:
  
  // 1. Actions sending NO GTC/IOC order to any book
  // 2. Cancellations
  // 3. Actions sending at least one GTC/IOC order
  
  // Within each category, actions keep their original proposal order.
  // Matching then runs in strict PRICE-TIME priority (FIFO per level).
  
  const FINALITY_MEDIAN_MS: u64 = 200;   // co-located benchmark
  const FINALITY_P99_MS:    u64 = 900;   // co-located p99
  const OPTIMISTIC_MS:      u64 = 70;    // normal-load responsiveness
  
  // Implication: there is no tip-for-ordering auction. Discretionary
  // searcher/validator reordering is removed — but deterministic,
  // publicly known rules (e.g. cancel-before-place) are themselves
  // gameable, and latency races still persist within a tier.`
      },
      {
        type: "interactive",
        widget: "colocation-latency"
      },
      {
        type: "quiz",
        question: "Within a single HyperBFT block, what determines the execution order of submitted actions?",
        options: [
          "A sealed-bid tip auction won by the highest bidder",
          "Random selection by the block proposer",
          "Three fixed action categories (non-GTC/IOC → cancels → GTC/IOC), then price-time priority",
          "Gas price, highest fee first"
        ],
        correct: 2,
        explanation: "HyperCore uses deterministic, protocol-fixed ordering: actions are bucketed into three sequential categories — those sending no GTC/IOC order, then cancellations, then actions sending at least one GTC/IOC order — keeping original proposal order within each category, with matching in strict price-time priority. There is no Jito-style tip auction; proposer discretion exists only within a tier."
      }
    ]
  },
  {
    id: "mev-types",
    num: "02",
    title: "MEV Types on Hyperliquid",
    subtitle: "Taxonomy of extraction strategies",
    sections: [
      {
        type: "text",
        content: `MEV on Hyperliquid looks different from Solana because the venue is a fully on-chain central limit order book sequenced by HyperBFT, not a mempool of pending AMM swaps. There is no public gossip of pending taker orders, and intra-block ordering is deterministic (non-GTC/IOC actions, then cancels, then GTC/IOC orders, each in price-time priority). That structurally forecloses classic sandwiching on the core book and removes the Jito-style tip-for-ordering economy. What remains is mostly latency-based and cross-venue extraction—plus the largest internalized stream, liquidations, which is socialized into the HLP community vault rather than auctioned to searchers. Here is the taxonomy:`
      },
      {
        type: "mev-table",
        strategies: [
          {
            name: "Backstop liquidations",
            desc: "Most liquidations are sent as market orders to the book where anyone can compete. If equity falls below 2/3 of maintenance margin without filling, the position is transferred to the Liquidator Vault (part of HLP) and the maintenance margin is retained as a buffer.",
            profit: "Socialized",
            competition: "Internalized",
            complexity: "Medium",
            example: "A 40x position breaches maintenance margin (~1.25%) in a thin book. It fails to fill, so the backstop hands it to HLP—the liquidation PnL accrues to community depositors, not an external bot.",
            color: "#EF9F27"
          },
          {
            name: "Oracle / funding arbitrage",
            desc: "Validators publish a stake-weighted spot oracle every 3 seconds. Low open interest and few funding-arb makers have repeatedly let large parties skew HL funding away from CEX rates. Captured by timing-advantaged traders.",
            profit: "Statistical",
            competition: "Medium",
            complexity: "Medium",
            example: "On a low-liquidity perp, a desk pushes premium so the hourly funding (capped at 4%/hr) drifts off the Binance rate, then positions to collect the skewed payment.",
            color: "#7F77DD"
          },
          {
            name: "Cross-venue arb (HL vs CEX)",
            desc: "Funding/basis arbitrage between Hyperliquid perps and centralized exchanges. HL base fees (0.015% maker / 0.045% taker) undercut Binance USDT-M, improving both legs. The most accessible external strategy.",
            profit: "Statistical",
            competition: "High",
            complexity: "Medium",
            example: "BTC perp funding on HL diverges from Binance. A quant desk longs the cheaper venue and shorts the richer one, harvesting the basis. Majors compress toward break-even; long-tail spreads stay wider.",
            color: "#378ADD"
          },
          {
            name: "JIT liquidity / HLP",
            desc: "HLP runs multiple market-making strategies plus the Liquidator sub-vault, acting as counterparty of last resort when the book is thin and accruing a share of fees. The spread that would be auctioned to searchers elsewhere is socialized to depositors.",
            profit: "Socialized",
            competition: "Internalized",
            complexity: "High",
            example: "The book thins during a fast move; HLP quotes both sides as universal counterparty. Profits (and tail drawdowns) flow to ~$300–400M of community TVL, not external makers.",
            color: "#5DCAA5"
          },
          {
            name: "HIP-3 builder markets",
            desc: "Builder-deployed perps (mainnet Oct 13, 2025). HyperCore still handles execution, margin, and liquidations, but the deployer selects and manages the price oracle—concentrating manipulation and MEV risk in that oracle choice. Requires 500k HYPE staked (slashable).",
            profit: "Statistical",
            competition: "Medium",
            complexity: "High",
            example: "A builder lists a tokenized-stock perp with its own oracle. Whoever can influence or front-run that deployer-chosen feed gains an edge on the market's mark price for funding and liquidations.",
            color: "#C8F06E"
          },
          {
            name: "Sandwiching — largely infeasible",
            desc: "Classic observe-then-bracket-the-victim does NOT map onto HyperCore. There is no public gas-priority mempool of pending taker orders, consensus is action-aware (non-GTC/IOC → cancels → GTC/IOC), and matching is strict price-time priority under single-block finality.",
            profit: "Foreclosed",
            competition: "n/a",
            complexity: "n/a",
            example: "A bot cannot see a pending taker order on the CLOB to front-run it, and cannot buy ordering priority via a tip. The vector survives only on the separate HyperEVM layer, which orders by gasPrice.",
            color: "#E24B4A"
          }
        ]
      },
      {
        type: "text",
        content: `**Key insight for builders:** The honest contrast with Solana is *discretionary/auctioned MEV* versus *deterministic ordering with residual latency and cross-venue MEV*—not "MEV versus no MEV." Hyperliquid removes the AMM-style sandwich vector and the Jito-style bundle auction, but value extraction moved rather than vanished. The most portable external strategy is cross-venue HL↔CEX basis arb; the largest internalized stream is liquidations, socialized to HLP.\n\n**Where it migrated:** Latency races persist (a co-located trader in AWS Tokyo still reacts fastest to public market data), self-liquidation into HLP is a real risk surface—weaponized in the March 2025 JELLY and ETH-whale incidents—and the separate HyperEVM layer hosts a conventional gasPrice-priority bot economy, where a documented two-person team reportedly netted ~$5M over ~6–8 months on ~$12.5B of volume.`
      },
      {
        type: "interactive",
        widget: "cross-venue-arb"
      },
      {
        type: "interactive",
        widget: "liquidation-cascade"
      },
      {
        type: "quiz",
        question: "Why is classic sandwiching largely infeasible on the HyperCore order book?",
        options: [
          "Validators manually reject any front-running transaction they detect",
          "There is no public mempool of pending taker orders, and intra-block ordering is deterministic with strict price-time priority",
          "Hyperliquid charges a 100% tax on sandwich profits",
          "Every order is encrypted until after the block is finalized"
        ],
        correct: 1,
        explanation: "HyperCore orders are sequenced by HyperBFT before execution with no public gossip of pending trades, and within a block actions are bucketed deterministically (non-GTC/IOC → cancels → GTC/IOC) then matched in strict price-time priority. With no observation window and no tip-for-ordering auction, the observe-then-bracket pattern is structurally foreclosed on the CLOB—though latency races persist and sandwiching is still possible on the separate gasPrice-ordered HyperEVM layer."
      }
    ]
  },
  {
    id: "order-flow",
    num: "03",
    title: "Order Flow & Sequencing",
    subtitle: "How orders reach the matching engine",
    sections: [
      {
        type: "text",
        content: `On Hyperliquid there is no MEV supply chain in the Solana sense — no searchers, no block engine, no bundle auction. Order flow is a short, deterministic pipeline that ends inside the protocol itself.\n\nA user signs an EIP-712 action with an agent/API wallet and POSTs it to the \`/exchange\` endpoint (read queries go to \`/info\`). The action travels to validators **without entering any public mempool** of pending trades. HyperBFT sequences it, and the matching engine runs it — because the matching engine **is part of the state-transition function**, not a separate off-chain service.\n\nThe critical structural fact: **there is no separate block-builder role.** Validators both order the incoming stream and execute the central limit order book natively. HyperCore "does not rely on the crutch of off-chain order books."`
      },
      {
        type: "supply-chain",
        actors: [
          {
            name: "User",
            role: "Signs an EIP-712 action via an agent/API wallet and POSTs it to /exchange. Never sees their pending order broadcast to a public mempool, so it cannot be observed and bracketed.",
            color: "#5DCAA5"
          },
          {
            name: "API / Non-validating node",
            role: "Permissionless relay and data feed. An API server points at a local non-validating node for low-latency fills. It forwards actions — it does not order or match them. The Foundation runs one public node in AWS Tokyo (no SLA).",
            color: "#378ADD"
          },
          {
            name: "Validators (HyperBFT)",
            role: "Run consensus AND the matching engine. They sequence the raw incoming stream into one canonical, single-block-finalized order. ~21–24 active validators by staked HYPE, clustered in AWS Tokyo as of mid-2026.",
            color: "#7F77DD"
          },
          {
            name: "Matching engine (HyperCore)",
            role: "Part of the state-transition function. Matches the sequenced actions against the on-chain CLOB in strict price-time priority under one-block finality. No off-chain sequencer or matcher exists.",
            color: "#EF9F27"
          }
        ]
      },
      {
        type: "concepts",
        items: [
          {
            icon: "🏷️",
            title: "Builder codes ≠ block builders",
            body: "A builder code is a native fee-sharing tag for front-ends and apps, attached as {\"b\": address, \"f\": number} (f in tenths of a bp; f=10 → 1bp). It routes a fee to the front-end that originated the order — it does NOT touch matching or ordering. Caps: 0.1% perps, 1% spot. ApproveBuilderFee must be signed by the user's main wallet; max 10 active approvals."
          },
          {
            icon: "💸",
            title: "A real revenue channel",
            body: "As an app-monetization rail, builder codes are large: >$40M cumulative paid to developers and ~40% of daily active users routed through third-party front-ends (mid-2026, approximate). Phantom leads at ~$20.6M cumulative since its July 2025 launch, followed by BasedOneX (~$15.1M) and PVP.trade (~$7.9M)."
          },
          {
            icon: "🚫",
            title: "No Jito-style bundle auction",
            body: "There is no off-chain block engine, no sealed-bid bundle auction, no top-of-block market, and no atomic multi-tx bundles sold to a leader. Ordering is deterministic in-protocol via HyperBFT. The entire Solana searcher-pays-validator economy simply has no counterpart here."
          }
        ]
      },
      {
        type: "text",
        content: `**Ordering is rule-based, not discretionary.** Within each consensus batch, actions are bucketed into three sequential categories and executed in that order: (1) actions sending no GTC/IOC order to any book, (2) cancellations, (3) actions sending at least one GTC/IOC order. Within a category, actions keep their original proposal order, then match in strict price-time priority.\n\nHyperliquid did add a native priority lever in April 2026, but it is the opposite of Jito's: order-priority fees are **burned**, not paid to validators, are capped at 8 bps, apply only to IOC orders on HIP-3 assets, and **all cancels are always prioritized ahead of all immediately-executable orders**. The correct framing is a constrained, burn-funded, in-protocol fee — not a validator-revenue auction.\n\n**What's left for an edge?** Latency. A co-located trader in AWS Tokyo still reacts fastest to public market data, and the block proposer still orders the raw stream *within* a tier. But ~880 ms of the ~884 ms measured order-to-fill is consensus/server time, so colocation only trims the small network tail — it cannot beat block time.`
      },
      {
        type: "interactive",
        widget: "order-flow"
      },
      {
        type: "quiz",
        question: "What role does a Hyperliquid 'builder code' play in order flow?",
        options: [
          "It auctions bundle inclusion to the highest-bidding searcher",
          "It is a fee-sharing tag for front-ends that does not affect matching or ordering",
          "It lets a validator reorder transactions within a block for a tip",
          "It guarantees top-of-block priority for the attached order"
        ],
        correct: 1,
        explanation: "A builder code is just a native fee/routing tag ({\"b\": address, \"f\": rate}) that directs a share of fees to the front-end that originated an order. It has no influence on sequencing or matching — those are handled deterministically by HyperBFT and HyperCore's price-time-priority engine. There is no Jito-style block builder or bundle auction on Hyperliquid."
      }
    ]
  },
  {
    id: "infra",
    num: "04",
    title: "Infrastructure Stack",
    subtitle: "The hardware and software behind MEV",
    sections: [
      {
        type: "text",
        content: `On Hyperliquid, infrastructure matters very differently than it does on Solana. There is no public mempool of pending orders to race, no Jito-style bundle auction to win, and no separate block-builder role to bribe — validators both order and execute, and HyperBFT sequences every action before it touches the book. That collapses most of the discretionary-MEV arms race. What remains is a **latency game with a fixed target and a hard floor**: be close to the validators, read market data as fast as possible, and accept that consensus time — not your wiring — sets the speed limit.\n\nHere is the stack that supports competitive Hyperliquid operations, layer by layer, from the node up to the execution path.`
      },
      {
        type: "infra-stack",
        layers: [
          {
            name: "Non-validating node",
            desc: "The foundation for low-latency raw reads. A non-validating node (`hl-visor run-non-validator`) peers with the network as a permissionless relay/data feed — it does not participate in consensus, but it gives you the rawest, closest view of HyperCore state. Validators run consensus and the matching engine natively; non-validating nodes are how everyone else taps the stream.",
            examples: "Recommended hardware: ≥32 logical cores, ≥500 MB/s disk, ~128 GB RAM, Ubuntu 24.04 only. The network generates ~100 GB/day, so pruning or archival is required. The Hyper Foundation runs a public non-validating node in AWS apne1-az1 with no availability or performance guarantee."
          },
          {
            name: "Colocation",
            desc: "Glassnode research (covered by CoinDesk, March 2026) measures Hyperliquid's ~21–24 active validators clustered in AWS ap-northeast-1 (Tokyo) across multiple availability zones, with the API fronted by CloudFront. Unlike Solana's rotating-leader target, the hot region is fixed — so the colocation decision is simple: be in AWS Tokyo.",
            examples: "Tokyo-colocated clients reach validators in ~2–3 ms versus >200 ms for European clients — roughly a 200 ms geographic edge. But measured order-to-fill from AWS Tokyo was ~884 ms median, of which only ~5 ms is network and ~879 ms is consensus/server time. Colocation trims the network tail; it cannot beat block time."
          },
          {
            name: "Market-data reads (WS / REST / gRPC)",
            desc: "The read path can be accelerated by third parties; the write path cannot. Queries go to `/info` (REST) and live updates stream over WebSocket. The infra ladder climbs from rate-limited public RPC, to dedicated managed RPC, to gRPC streaming, to a dedicated/colocated non-validating node peered for the lowest-latency raw reads.",
            examples: "WS limits: 10 connections, 1000 subscriptions, 2000 messages/min. A vendor 'Order Book Server' benchmark (Dwellir, 2,662 trades) reported a 51 ms (24.1%) median improvement over the public WebSocket and fewer tail spikes — and for inventory-managing market makers, the tail matters more than the median."
          },
          {
            name: "Oracle feeds",
            desc: "Pricing is a push model rather than something you fetch on demand. Each validator publishes a spot oracle price for every perp every 3 seconds — a weighted median of eight CEX spot mids (Binance, OKX, Bybit, Kraken, KuCoin, Gate.io, MEXC, Hyperliquid) — and the clearinghouse uses the stake-weighted median of all validator submissions. Mark price is a separate, robust multi-input median used for liquidations and stops.",
            examples: "Watching the 3-second oracle cadence against live CEX feeds is the basis of oracle/funding arbitrage on thin perps. Because liquidations fire on the multi-venue mark — not a single HyperCore print — no single feed can be pushed to trigger them."
          },
          {
            name: "Execution (the write path)",
            desc: "Every order follows the same route: sign an EIP-712 action with an agent/API wallet, POST it to `/exchange`, and it travels to validators without entering any public mempool. HyperBFT sequences it immediately and the matching engine is part of the state-transition function — there is no off-chain sequencer, no separate block-builder, and no bundle auction to buy your way into.",
            examples: "Within each consensus batch, actions are bucketed deterministically (non-GTC/IOC → cancels → GTC/IOC), then matched in strict price-time priority. CoreWriter order/vault actions submitted from HyperEVM are deliberately delayed a few seconds to deny any latency advantage from bypassing the L1 path."
          }
        ]
      },
      {
        type: "text",
        content: `**The structural cap on the arms race.** Consensus sets the floor: Hyperliquid's own benchmark cites ~0.2s median finality and <0.9s p99 for co-located clients, with ~0.07s optimistic responsiveness under normal load. But independent measurement (AWS Tokyo, ~120 samples, March 2026) saw ~884 ms median order-to-fill under real conditions — with ~880 ms of it being server/consensus time. The honest takeaway: present sub-second figures as best-case benchmarks, not guaranteed live latency, and treat consensus time as the wall that colocation cannot push through.\n\n**Getting started affordably.** None of this is needed to *research* Hyperliquid MEV. Public RPC plus the WebSocket feed and a few CEX spot/perp APIs are enough to study oracle cadence, funding skew, and cross-venue basis. Dedicated nodes, colocation, and vendor order-book servers only matter for live execution that competes on the small network tail — which, given the consensus floor, is a thin edge to begin with.`
      },
      {
        type: "interactive",
        widget: "colocation-latency"
      },
      {
        type: "quiz",
        question: "Why does colocating in AWS Tokyo give only a bounded edge on Hyperliquid?",
        options: [
          "Hyperliquid bans colocated clients from submitting orders",
          "Of the ~884 ms median order-to-fill, ~880 ms is HyperBFT consensus/server time and only ~5 ms is network",
          "Tokyo validators are slower than European ones",
          "Colocation only speeds up withdrawals, not orders"
        ],
        correct: 1,
        explanation: "Tokyo colocation cuts the network leg from >200 ms to ~2–3 ms — a real geographic edge. But measured order-to-fill is ~884 ms median, of which roughly 880 ms is consensus and server time and only ~5 ms is network. Colocation trims the small network tail; it cannot beat block time, which is the structural cap on Hyperliquid's latency arms race."
      }
    ]
  },
  {
    id: "strategy",
    num: "05",
    title: "Building a Strategy",
    subtitle: "From detection to execution",
    sections: [
      {
        type: "text",
        content: `This module walks through a complete Hyperliquid liquidation and oracle-arbitrage detector. It's a useful reference strategy because it touches every layer of the stack: data ingestion, opportunity detection, profit simulation, and order submission.\n\nThe shape is the same as a Solana CEX-DEX bot, but the mechanics are different. There is **no public mempool of pending orders** to watch, so there is no victim order to bracket. Instead, HyperCore pushes a fresh oracle price every ~3 seconds and a robust multi-venue **mark price** that liquidations and stops fire on. The edge comes from reacting to those public updates faster than competitors and from supplying liquidity into forced liquidation flow before it reaches the HLP backstop.`
      },
      {
        type: "code",
        title: "Step 1: Data ingestion — mark, oracle, and book feeds",
        language: "python",
        code: `import asyncio
  import json
  import websockets
  
  HL_WS = "wss://api.hyperliquid.xyz/ws"
  
  # HyperCore publishes a new oracle price (~every 3s) and a robust
  # multi-input MARK price. Liquidations and stops trigger on mark,
  # NOT the last trade, so the bot tracks mark + oracle + book depth.
  async def hypercore_feed(queue, coin="ETH"):
      async with websockets.connect(HL_WS) as ws:
          # activeAssetCtx -> markPx, oraclePx, funding, open interest
          await ws.send(json.dumps({
              "method": "subscribe",
              "subscription": {"type": "activeAssetCtx", "coin": coin},
          }))
          # l2Book -> full depth, needed to estimate forced-flow fills
          await ws.send(json.dumps({
              "method": "subscribe",
              "subscription": {"type": "l2Book", "coin": coin},
          }))
          async for msg in ws:
              data = json.loads(msg)
              ch = data.get("channel")
              if ch == "activeAssetCtx":
                  ctx = data["data"]["ctx"]
                  await queue.put({
                      "source": "hypercore",
                      "mark": float(ctx["markPx"]),
                      "oracle": float(ctx["oraclePx"]),
                      "funding": float(ctx["funding"]),
                  })
              elif ch == "l2Book":
                  await queue.put({
                      "source": "book",
                      "levels": data["data"]["levels"],  # [bids, asks]
                  })
  
  # CEX reference: the oracle is a stake-weighted median of CEX spot
  # mids, recomputed every ~3s. Watching the CEX directly front-runs
  # where the next oracle print will land.
  async def binance_feed(queue):
      uri = "wss://stream.binance.com/ws/ethusdt@bookTicker"
      async with websockets.connect(uri) as ws:
          async for msg in ws:
              d = json.loads(msg)
              mid = (float(d["b"]) + float(d["a"])) / 2
              await queue.put({"source": "cex", "mid": mid})`
      },
      {
        type: "code",
        title: "Step 2: Opportunity detection",
        language: "python",
        code: `class HLDetector:
      """
      Two signals on one venue:
        A) Oracle/basis arb — CEX mid has moved but the HL oracle
           (refreshed only every ~3s) and mark have not yet caught up.
        B) Liquidation liquidity — forced positions hit the book as
           market orders; rest just inside to capture the surplus
           before equity falls to 2/3 maint. margin and HLP absorbs it.
      """
      def __init__(self, min_edge_bps=6, taker_fee_bps=4.5):
          self.min_edge_bps = min_edge_bps
          self.taker_fee_bps = taker_fee_bps   # 0.045% base taker
          self.cex_mid = None
          self.mark = None
          self.oracle = None
          self.book = None
  
      def update(self, msg):
          src = msg["source"]
          if src == "cex":
              self.cex_mid = msg["mid"]
          elif src == "hypercore":
              self.mark, self.oracle = msg["mark"], msg["oracle"]
          elif src == "book":
              self.book = msg["levels"]
          return self.check()
  
      def check(self):
          if not (self.cex_mid and self.mark and self.book):
              return None
  
          # Divergence of the live CEX mid from HL's lagging mark.
          # Positive => CEX richer => oracle/mark will tick up => buy HL.
          edge_bps = (self.cex_mid - self.mark) / self.mark * 10_000
          net_bps = abs(edge_bps) - self.taker_fee_bps
  
          if net_bps >= self.min_edge_bps:
              side = "BUY" if edge_bps > 0 else "SELL"
              return {
                  "signal": "GO",
                  "coin": "ETH",
                  "side": side,
                  "edge_bps": round(net_bps, 1),
                  "mark": self.mark,
                  "oracle": self.oracle,
                  "cex": self.cex_mid,
              }
          return None`
      },
      {
        type: "code",
        title: "Step 3: Profit simulation",
        language: "python",
        code: `def simulate_fill(signal, book, hype_staked=10_000):
      """
      Hyperliquid has no free RPC tx-simulation like Solana. Instead,
      walk the live L2 book locally to estimate the realized fill, then
      subtract fees AFTER the HYPE staking discount.
      """
      notional_usd = 25_000          # start small
      bids, asks = book[0], book[1]
      levels = asks if signal["side"] == "BUY" else bids
  
      # Walk the book to find the size-weighted avg fill price.
      remaining, cost, filled = notional_usd, 0.0, 0.0
      for lvl in levels:
          px, sz = float(lvl["px"]), float(lvl["sz"])
          take_usd = min(remaining, px * sz)
          cost += take_usd
          filled += take_usd / px
          remaining -= take_usd
          if remaining <= 0:
              break
      if remaining > 0:
          return {"profitable": False, "reason": "thin_book"}
  
      avg_px = cost / filled
  
      # Fee: 0.045% base taker, reduced by HYPE staking tier.
      # >10,000 HYPE = Gold tier = 20% rebate.
      discount = 0.20 if hype_staked >= 10_000 else 0.0
      fee_bps = 4.5 * (1 - discount)
      fee_usd = cost * fee_bps / 10_000
  
      # Expected exit at the converged (CEX) price.
      exit_px = signal["cex"]
      gross = (exit_px - avg_px) * filled
      if signal["side"] == "SELL":
          gross = (avg_px - exit_px) * filled
  
      net = gross - fee_usd
      return {
          "profitable": net > 0,
          "net_profit_usd": round(net, 2),
          "avg_fill_px": round(avg_px, 2),
          "size": round(filled, 4),
          "fee_usd": round(fee_usd, 2),
      }`
      },
      {
        type: "code",
        title: "Step 4: Signing and order submission",
        language: "python",
        code: `from hyperliquid.exchange import Exchange
  
  def submit_order(signal, sim, exchange: Exchange):
      """
      No Jito-style bundle, no mempool, no tip-to-a-validator auction.
      The action is signed (EIP-712 via an agent/API wallet), POSTed to
      /exchange, and sequenced deterministically by HyperBFT. An IOC
      limit order crosses now or is cancelled — no resting risk.
      """
      if not sim["profitable"]:
          log_paper_trade(signal, sim)   # validate the detector first
          return
  
      order = {
          "name": signal["coin"],
          "is_buy": signal["side"] == "BUY",
          "sz": sim["size"],
          "limit_px": signal["mark"],     # IOC cap; cancels if it can't fill
          "order_type": {"limit": {"tif": "Ioc"}},
          "reduce_only": False,
      }
  
      # OPTIONAL in-protocol priority (live since Apr 2026). Unlike a
      # Jito tip this is BURNED, not paid to validators: capped at 8 bps,
      # supported only when every order is IOC on a non-outcome (HIP-3)
      # asset, and ALL cancels still execute ahead of it. p = rate * 1e8.
      # order["priority"] = {"p": 300}   # ~3 bps, burned from staked HYPE
  
      result = exchange.order(**order)
      status = result["response"]["data"]["statuses"][0]
  
      if "filled" in status:
          log_success(signal, sim, status["filled"])
      else:
          log_miss(signal, status)   # "resting" or "error" => missed cross
  
  # Reality check on speed: median order-to-fill measured ~884 ms,
  # of which ~880 ms is HyperBFT consensus/server time and only ~5 ms
  # is network. Colocation in AWS Tokyo trims the network tail — it
  # cannot beat block time. detect/sim/sign run in well under that.`
      },
      {
        type: "text",
        content: `**What this code doesn't show:** the real complexity isn't the logic — it's the structure of the venue. There is no pending-order mempool, so the classic "observe the victim, bracket it" pattern is foreclosed on the CLOB. The whole game is reacting to public mark/oracle updates and forced liquidation flow faster than the next bot, then submitting an order that HyperBFT sequences deterministically (non-GTC/IOC actions → cancels → GTC/IOC, then strict price-time priority).\n\nTwo hard truths bound the edge. First, because ~880 ms of the ~884 ms order-to-fill is consensus time, colocation in AWS Tokyo only shaves the small network tail — it never wins a sub-block race. Second, the largest liquidation stream is **socialized to HLP**, not auctioned to searchers: most liquidations route to the open book where anyone can compete, but a position that falls below 2/3 of maintenance margin is backstopped into the Liquidator Vault, and that surplus accrues to HLP depositors rather than to your bot.\n\nAs on any venue, start with paper trading — skip Step 4, just log theoretical P&L — to confirm the detector finds real edge after the 0.045% taker fee (less the HYPE staking discount) before spending on low-latency read infrastructure.`
      },
      {
        type: "interactive",
        widget: "strategy-backtester"
      },
      {
        type: "quiz",
        question: "Why can't a Hyperliquid bot guarantee its order lands first by paying a large Jito-style tip to the block proposer?",
        options: [
          "Hyperliquid charges a flat per-order fee that cannot be increased",
          "There is no validator bundle auction; the only priority lever (live since 2026) is burned, capped at 8 bps, IOC-on-HIP-3-only, and cancels always execute ahead of it",
          "Tips are allowed but must be paid in USDC instead of HYPE",
          "Validators reject any order that includes a priority parameter",
        ],
        correct: 1,
        explanation: "Hyperliquid has no off-chain block engine and no sealed-bid bundle auction. Ordering is deterministic in-protocol via HyperBFT. The native priority fee added in April 2026 is fundamentally unlike a Jito tip: it is burned rather than paid to validators, capped at 8 bps, supported only for IOC orders on non-outcome (HIP-3) assets, and every cancel is still sequenced ahead of every immediately-executable order. So no amount of payment buys discretionary top-of-block placement."
      }
    ]
  },
  {
    id: "economics",
    num: "06",
    title: "MEV Economics",
    subtitle: "Fees, HLP, and who captures value",
    sections: [
      {
        type: "text",
        content: `On Solana, MEV economics is an auction: searchers bid tips into Jito's sealed-bid bundle market, validators and stakers pocket the proceeds (Jito takes roughly 5%), and liquidation bonuses flow to whichever bot is fastest. The value leaks to the edges.\n\nHyperliquid rewires this. There is **no priority-fee auction for order placement** — HyperCore matches in strict price-time priority under one-block finality, so you cannot pay to jump the queue the way you bid for top-of-block on Solana. The largest internalized "MEV" stream, backstop liquidations, is **socialized into the HLP vault** for community depositors rather than auctioned to searchers. Trading fees go **entirely to the community** — no team or VC cut — with roughly 97-99% routed into automated on-chain HYPE buybacks via the Assistance Fund.\n\nThe practical question this module answers: when value moves through Hyperliquid, **who actually captures it** — and what is left for an external trader to earn?`
      },
      {
        type: "concepts",
        items: [
          {
            title: "No priority-fee auction — price-time instead",
            body: "There is no Jito-style sealed-bid bundle market and no top-of-block to buy. HyperCore sequences actions by HyperBFT into fixed categories (non-GTC/IOC → cancels → GTC/IOC) and matches by strict price-time priority. A constrained native priority fee did arrive in April 2026 (alpha), but it is fundamentally unlike Jito: fees are BURNED, not paid to validators; the order-side tip works only for IOC orders on HIP-3 assets, is capped at 8 bps, and cancels are always prioritized ahead of all immediately-executable orders. You cannot pay to front-run a resting book.",
            icon: "⚖️"
          },
          {
            title: "HLP as the universal counterparty",
            body: "The HLP vault runs market-making strategies plus a Liquidator sub-vault and acts as counterparty of last resort when the book is thin. Most liquidations route to the open book where anyone can compete, but if equity falls below 2/3 of maintenance margin without filling, a backstop liquidation hands the position to the Liquidator Vault and withholds the maintenance margin as a buffer. The docs are explicit: 'the pnl stream from liquidations go entirely to the community through HLP.' Value that would be an external searcher's liquidation bonus on Solana is instead socialized to HLP depositors — no clearance fee, no HLP performance fee.",
            icon: "🏦"
          },
          {
            title: "Fee tiers and builder-code economics",
            body: "Base perp fees (0.045% taker / 0.015% maker) undercut Binance USDT-M standard on both legs. Six volume tiers run down to 0.024% taker / 0.000% maker at the top, with maker rebates to -0.003%; HYPE staking adds rebate tiers from Wood (5%, >10 HYPE) to Diamond (40%, >500,000 HYPE). Builder codes are a native fee-sharing tag ({\"b\": address, \"f\": tenths-of-a-bp}) for front-ends — max 0.1% on perps, attached only as a fee/routing label that does NOT affect matching or ordering. As a revenue channel they are large: >$40M cumulative to developers, with Phantom alone at ~$20.6M cumulative since its July 2025 launch.",
            icon: "🏷️"
          },
          {
            title: "Where MEV-like revenue accrues",
            body: "On Solana, MEV value flows to searchers, validators, and stakers via tips, plus liquidator bonuses to the fastest bot. On Hyperliquid, validators capture NO order-flow MEV: order-priority tips are burned, the cancel-first rule blocks taker reordering, and single-slot finality removes reorg/backrun MEV. Validators earn only HYPE emissions (~2.2-2.4%/yr), not fees. Liquidation surplus, spread, and funding capture are socialized into HLP for depositors; trading fees flow to HYPE holders through Assistance Fund buybacks. What is left for external players: cross-venue HL↔CEX basis/funding arb (to quant desks) and HyperEVM gasPrice arb (to bots).",
            icon: "💸"
          }
        ]
      },
      {
        type: "quiz",
        question: "A trader wants to capture the liquidation bonus from a large underwater perp position the way a fast bot would on Solana lending markets. On Hyperliquid, what happens to that value?",
        options: [
          "It is auctioned via a sealed-bid bundle and paid to the winning searcher",
          "It is paid to the HyperBFT block proposer as a priority tip",
          "Most liquidations go to the open book, and backstop liquidations are socialized into the HLP vault for community depositors",
          "It is burned along with the order-priority fees"
        ],
        correct: 2,
        explanation: "Hyperliquid has no Jito-style bundle auction and validators capture no order-flow MEV. Most liquidations are sent as market orders to the book where anyone can compete, but positions that breach 2/3 of maintenance margin without filling are handed to the Liquidator Vault — a component of HLP — with the maintenance margin withheld as a buffer. The docs state the liquidation pnl stream 'go entirely to the community through HLP,' so the bonus a Solana bot would race for is socialized to HLP depositors rather than captured by an external searcher. (Order-priority tips are burned, but that is a separate mechanism from liquidation value.)"
      }
    ]
  },
  {
    id: "defense",
    num: "07",
    title: "MEV Defense & Fairness",
    subtitle: "What the design prevents, and what remains",
    sections: [
      {
        type: "text",
        content: `Hyperliquid's pitch is not "no MEV" — it is that the core order book removes the *discretionary, auctioned* MEV economy that defines Solana plus Jito. There is no public mempool of pending trading orders, no sealed-bid bundle auction, and no validator who can reorder your fill for a tip. Matching happens inside the HyperBFT state-transition function under deterministic, publicly known rules.\n\nThe honest framing is a trade, not a miracle: Hyperliquid swaps **permissionless-but-extractive** ordering for **protocol-controlled-but-centralized** ordering. The largest internalized "MEV" stream — backstop liquidations — is socialized into the community HLP vault instead of being raced for by external bots. But extraction did not vanish; it moved to latency, cross-venue arbitrage, the separate HyperEVM layer, and to whoever can self-liquidate into HLP. The structural defenses below are real; so is the residual surface that follows.`
      },
      {
        type: "concepts",
        items: [
          {
            title: "No public mempool + price-time priority",
            body: "HyperCore exposes no public gossip mempool of pending taker orders. Actions are sequenced by HyperBFT before execution, then matched in strict price-time priority (best price first, FIFO within a level). This removes the public observation window and discretionary intra-block reordering that enable AMM-style front-running and sandwiching. It is a consensus-layer property, not an opt-in RPC or relay add-on.",
            icon: "🚫"
          },
          {
            title: "Deterministic action-tier ordering",
            body: "Within each consensus batch, actions execute in three fixed categories — (1) actions sending no GTC/IOC order, (2) cancellations, (3) actions sending at least one GTC/IOC order — keeping proposal order within each tier. The cancel-before-place rule lets makers pull quotes ahead of incoming takers. This kills the Jito-style tip-for-ordering economy, though the publicly known rules are themselves a thing latency racers optimize around.",
            icon: "🔢"
          },
          {
            title: "Stake-weighted validator median oracle",
            body: "Each validator publishes a spot oracle every 3 seconds as a weighted median of eight CEX spot mids (Binance, OKX, Bybit, Kraken, KuCoin, Gate.io, MEXC, Hyperliquid). The clearinghouse takes the stake-weighted median across all validators. A single on-chain swap cannot move the reference price, blunting the 'manipulate-the-pool-then-liquidate' vector. No single party can arbitrarily override it.",
            icon: "🧮"
          },
          {
            title: "Robust multi-input mark price",
            body: "Liquidations, stops, and TP/SL fire on a composite mark price — a median of (oracle + a 150s EMA basis), the median of HL bid/ask/last, and a weighted median of CEX perp mids — not a single HyperCore print. Pushing one venue's last trade cannot trigger a liquidation, defeating single-print stop-hunt MEV.",
            icon: "📊"
          },
          {
            title: "Single-slot finality + burned priority fees",
            body: "HyperBFT gives deterministic single-block finality (~0.07s under normal load, no reorgs), which kills reorg and backrun strategies outright. The native priority lever added April 2026 is constrained and burn-funded: IOC-on-HIP-3 only, capped at 8 bps, paid in HYPE from undelegated stake, and burned rather than paid to validators — so ordering is never auctioned for validator revenue.",
            icon: "🔥"
          }
        ]
      },
      {
        type: "interactive",
        widget: "liquidation-cascade"
      },
      {
        type: "text",
        content: `**The residual risk surface.** Extraction moved, it did not disappear. Toxic flow and self-liquidation risk are socialized to HLP rather than competed for by external searchers — meaning the vault, and its depositors, absorb tail losses. The ultimate safety mechanism is a **small validator quorum** (roughly 21–24 active validators in mid-2026, all clustered in AWS Tokyo) that can override oracle prices and delist markets: effective against attackers, but a genuine censorship and trust concession. Oracle integrity still depends on honest validators and live CEX feeds — a risk Hyperliquid's own docs flag as **unmitigated** for prolonged manipulation. And the separate **HyperEVM** layer hosts a conventional gasPrice-priority MEV bot economy, where one documented two-person team reportedly netted ~$5M over ~6–8 months on ~$12.5B of volume. Proposer ordering discretion *within* an action tier is the last order-book trust assumption.\n\n**Incident — large ETH whale liquidation (March 12, 2025).** A trader deposited ~$15.23M USDC, used ~$4.3M as margin for a 50x long of ~113,000 ETH (~$200M+ notional), then withdrew unrealized profit as ETH rose, pushing margin below maintenance and forcing liquidation into HLP. The trader walked away with ~$1.8–1.86M while **HLP absorbed a ~$4M loss** and HYPE fell ~8.5%. Not a hack — an exploitation of the margin mechanic to offload tail risk onto the vault. Hyperliquid responded by cutting max leverage to 40x (BTC) / 25x (ETH) and raising maintenance margins on large positions.\n\n**Incident — JELLY oracle / short-squeeze (March 26, 2025), the canonical case.** An attacker opened a large JELLY short (reported in the ~$4.1M–$8M range) alongside coordinated long wallets, pulled margin to self-liquidate so HLP's Liquidator Vault inherited the short into a thin book, then pumped JELLY spot **~429%** (including via a Solana address) to distort the oracle. HLP's unrealized loss peaked near **~$12M (reported up to ~$13.5M)**, HYPE fell ~20%, and Halborn cites ~$230M of HLP at risk had the price kept climbing. Validators voted — consensus in ~2 minutes — to **delist and force-settle 392M JELLY at the short's opening price of $0.0095**, overriding the live oracle near ~$0.50 and converting a potential eight-figure loss into a ~$703K HLP profit. The Hyper Foundation pledged to make non-flagged users whole. Bitget CEO Gracy Chen publicly criticized the override as 'FTX 2.0' — capturing the central tension: the same quorum that defended depositors is also a centralized authority that rewrote the market.\n\n**Net assessment.** No-mempool plus price-time-priority matching plus a median oracle genuinely removes the AMM-style sandwich and front-run vector for the core order book. But the honest contrast with Solana plus Jito is *deterministic ordering with residual latency and cross-venue MEV* versus *discretionary, auctioned MEV* — not 'MEV versus no MEV.' Hyperliquid trades extractive decentralization for extraction-resistant centralization.`
      },
      {
        type: "quiz",
        question: "During the March 2025 JELLY incident, how did Hyperliquid ultimately cap HLP's losses?",
        options: [
          "A smart-contract bug auto-refunded the affected positions",
          "External searcher bots out-competed the attacker on the open book",
          "Validators voted in ~2 minutes to delist and force-settle JELLY at the short's opening price, overriding the live oracle",
          "The HyperEVM mempool was paused to block the attacker's transactions",
        ],
        correct: 2,
        explanation: "The attacker self-liquidated a large JELLY short into HLP's Liquidator Vault, then pumped spot ~429% to distort the oracle, driving HLP's unrealized loss toward ~$12M. With ~$230M reportedly at risk, the ~21–24 validator quorum reached consensus in about two minutes to delist and force-settle 392M JELLY at the opening price of $0.0095 — overriding the live oracle near ~$0.50 and turning the loss into a ~$703K profit. It illustrates Hyperliquid's core trade-off: the small validator set is both the decisive defense and a centralizing, market-overriding authority."
      }
    ]
  },
  {
    id: "build",
    num: "08",
    title: "Build Your Stack",
    subtitle: "From research to live execution",
    sections: [
      {
        type: "text",
        content: `This module outlines a phased roadmap for building a Hyperliquid market-data and MEV research environment. Because HyperCore forecloses the classic sandwich vector, the realistic targets are **cross-venue funding/basis arbitrage** (HL vs CEX), **oracle/funding arb on thin perps**, and **HyperEVM gasPrice arbitrage** — none of which require validator access. Every tool in the first two phases relies on the free public API (\`/info\` for queries, \`/exchange\` for actions) and freely available CEX market data.\n\nKeep one structural fact in front of you the whole way: measured AWS-Tokyo order-to-fill is roughly **884 ms**, of which only ~5 ms is network and ~880 ms is HyperBFT consensus/server time. Colocation in **AWS ap-northeast-1 (Tokyo)** trims the small network tail (~2–3 ms vs >200 ms from Europe) but cannot beat block time. Build for read-side speed and clean execution logic, not a write-path latency miracle that does not exist.`
      },
      {
        type: "roadmap",
        weeks: [
          {
            week: "Phase 1",
            title: "Data foundation",
            tasks: [
              "Create a read-only setup against the public API: poll /info for L2 order book, asset metadata (tick size, lot size, max leverage), and funding history",
              "Subscribe to the HyperCore WebSocket for trades, book deltas, and the every-3s oracle/funding stream; log to Parquet (pyarrow) for BTC, ETH, and 2–3 long-tail perps",
              "Connect to Binance/OKX/Bybit WebSockets and log the same symbols' perp mids — these are the CEX legs of any basis trade",
              "Record the multi-input mark price inputs separately so you can reconstruct why a liquidation or stop fired (mark, not last trade, is the trigger)",
              "Build a ReplayAdapter that iterates HL + CEX snapshots in strict timestamp order for deterministic backtests"
            ]
          },
          {
            week: "Phase 2",
            title: "Detection engine",
            tasks: [
              "Implement a BasisDetector: compute HL-vs-CEX funding/basis spread net of fees (HL 0.015% maker / 0.045% taker undercut Binance USDT-M 0.020% / 0.050% on both legs)",
              "Backtest: how often does the spread clear the round-trip break-even? Majors compress toward break-even; long-tail perps stay wider",
              "Add a FundingArbDetector for thin perps where low open interest lets large parties skew HL funding (capped at 4%/hour, paid hourly at one-eighth of the 8h rate)",
              "Log a paper-trading ledger: timestamp, venue legs, spread, direction, fee assumptions, theoretical PnL",
              "Run the paper trader live against the HL WebSocket + CEX feeds for 48 hours and reconcile against actual prints"
            ]
          },
          {
            week: "Phase 3",
            title: "Simulation & execution plumbing",
            tasks: [
              "Build EIP-712 action signing via an agent/API wallet and dry-run order construction for IOC, GTC, and ALO/Post-Only TIFs",
              "Model the deterministic intra-block ordering (non-GTC/IOC → cancels → GTC/IOC, then price-time priority) so your fill expectations match consensus behavior",
              "Account for both rate-limit systems: IP/weight (1200 weight/min) and address-based (1 request per 1 USDC cumulative volume, 10,000 buffer)",
              "If testing HyperEVM arb, model the ~2s small blocks, gasPrice-high-to-low ordering (priority fees burned), and the CoreWriter few-second delay on Core actions",
              "Validate order math against /info quotes and simulate against testnet (Chain ID 998) before risking capital"
            ]
          },
          {
            week: "Phase 4",
            title: "Live execution (micro-scale)",
            tasks: [
              "Provision a host in AWS ap-northeast-1 (Tokyo) near the validator cluster; optionally run a non-validating node (hl-visor run-non-validator) for low-latency raw reads",
              "Start at minimum size on majors with the most-compressed-but-safest basis spreads; place ALO orders to guarantee maker status and the 0.015% maker fee",
              "Optionally test native order-priority (param p, IOC-on-HIP-3-assets only, cap 8 bps, fees burned from undelegated stake) — but treat it as a constrained lever, not a Jito-style edge",
              "Monitor realized vs theoretical spread, fill latency against the ~884 ms baseline, and funding accrual; stake HYPE for fee rebates (Wood 5% at >10 HYPE up to Diamond 40% at >500k)",
              "Build a dashboard for live PnL, basis, funding capture, and rejected-order/rate-limit metrics"
            ]
          }
        ]
      },
      {
        type: "text",
        content: `**Key takeaway:** On Hyperliquid the moat is not a private mempool or a bundle auction — there is none to buy into. The dominant internalized stream, backstop liquidations, is socialized to HLP depositors rather than auctioned to searchers, so the practical external strategies are cross-venue arb and thin-perp funding/oracle arb. The edge that remains is **clean execution, fee-tier optimization, and read-side latency**, not write-path priority.\n\nA common pitfall is over-building a colocation stack chasing milliseconds when ~880 ms of every fill is consensus time you cannot touch. Validate the spread economics on real data first; the JELLY (March 2025) and the large-ETH-whale (March 2025) incidents are reminders that the biggest "MEV" on Hyperliquid is mechanism risk borne by HLP, not order-flow you can race for — and that validators can vote to delist or override an oracle in minutes.`
      },
      {
        type: "interactive",
        widget: "mev-bot-builder"
      },
      {
        type: "quiz",
        question: "Why is a Jito-style write-path latency race a poor foundation for a Hyperliquid execution strategy?",
        options: [
          "Hyperliquid bans colocation entirely",
          "Roughly 880 ms of the ~884 ms order-to-fill is HyperBFT consensus/server time, so colocation only trims the small network tail and cannot beat block time",
          "Orders on Hyperliquid never fill",
          "Validators sell top-of-block slots to the highest bidder"
        ],
        correct: 1,
        explanation: "Measured AWS-Tokyo order-to-fill is ~884 ms, of which only ~5 ms is network and ~880 ms is consensus/server time. Tokyo colocation cuts network latency from >200 ms to ~2–3 ms, but the consensus floor dominates total latency. There is also no off-chain block engine or bundle auction — ordering is deterministic in-protocol, and native priority fees are burned rather than paid to validators. So the realistic edge is read-side speed, fee tiers, and cross-venue spread economics, not a write-path latency war."
      }
    ]
  }
];

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
  const lang = language || "rust";
  const grammar = Prism.languages[lang];
  const highlighted = grammar ? Prism.highlight(code, grammar, lang) : code;
  return (
    <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-code-header)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", fontFamily: "var(--mono)" }}>{title}</span>
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
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>{s.value}</div>
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

function MEVTable({ strategies }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 6 }}>
      {strategies.map((s, i) => (
        <div key={i} onClick={() => setSelected(selected === i ? null : i)}
          style={{ background: "var(--bg-card)", borderRadius: 10, border: `1px solid ${selected === i ? s.color + "60" : "var(--border)"}`, padding: "14px 18px", cursor: "pointer", transition: "all 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", flex: 1, minWidth: 120 }}>{s.name}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: s.competition === "Extreme" ? "#E24B4A20" : s.competition === "High" ? "#EF9F2720" : "#5DCAA520", color: s.competition === "Extreme" ? "#E24B4A" : s.competition === "High" ? "#EF9F27" : "#5DCAA5", fontWeight: 600 }}>{s.competition} competition</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
          {selected === i && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid var(--border)` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Example</div>
              <div style={{ fontSize: 12.5, color: "var(--accent)", lineHeight: 1.6, fontStyle: "italic" }}>{s.example}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Profit: <strong style={{ color: "var(--text-primary)" }}>{s.profit}</strong></div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Complexity: <strong style={{ color: "var(--text-primary)" }}>{s.complexity}</strong></div>
              </div>
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
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--bg-primary)", zIndex: 1 }} />
            {i < actors.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 2 }} />}
          </div>
          <div style={{ flex: 1, background: "var(--bg-card)", borderRadius: 10, padding: "14px 18px", border: "1px solid var(--border)", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{a.name || a.role}</div>
            {(a.desc || (a.name && a.role)) && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{a.desc || a.role}</div>}
            {(a.incentive || a.tools) && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {a.incentive && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Incentive: <span style={{ color: "var(--accent)" }}>{a.incentive}</span></div>}
                {a.tools && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Tools: {a.tools}</div>}
              </div>
            )}
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
            {l.tier && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--accent)15", color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>{l.tier}</span>}
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</span>
          </div>
          {Array.isArray(l.items) ? (
            <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 8 }}>
              {l.items.map((item, ii) => (
                <div key={ii} style={{ padding: "10px 14px", background: "var(--bg-card)", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 600 }}>{item.cost}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "12px 18px" }}>
              {l.desc && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{l.desc}</div>}
              {l.examples && <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: 8, fontFamily: "var(--mono)" }}>{l.examples}</div>}
            </div>
          )}
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
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>{w.week}</div>
          </div>
          <div style={{ flex: 1, borderLeft: "2px solid var(--accent)30", paddingLeft: 16 }}>
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

function SlotVisualizer() {
  const [slotTime, setSlotTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  const handleRestart = () => { setRunning(false); setSlotTime(0); };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSlotTime(t => {
          if (t >= 400) { return 0; }
          return t + 5;
        });
      }, 25 / speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, speed]);

  const phases = [
    { name: "Detect", end: 10, color: "#7F77DD" },
    { name: "Simulate", end: 30, color: "#5DCAA5" },
    { name: "Build tx", end: 40, color: "#EF9F27" },
    { name: "Submit", end: 55, color: "#378ADD" },
    { name: "Propagate", end: 200, color: "#888780" },
    { name: "Confirm", end: 400, color: "#5DCAA540" },
  ];

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Slot clock simulator</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setRunning(!running); if (!running && slotTime === 0) setSlotTime(0); }}
            style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: running ? "var(--accent)15" : "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
            {running ? "⏸ pause" : "▶ simulate"}
          </button>
        </div>
      </div>
      <div style={{ height: 32, borderRadius: 6, background: "var(--bg-primary)", overflow: "hidden", position: "relative", border: "1px solid var(--border)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(slotTime / 400) * 100}%`, background: `linear-gradient(90deg, ${phases.find(p => slotTime <= p.end)?.color || "#888"}90, ${phases.find(p => slotTime <= p.end)?.color || "#888"}40)`, transition: "width 0.02s linear" }} />
        {phases.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${(p.end / 400) * 100}%`, top: 0, bottom: 0, width: 1, background: "var(--border)" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>0ms</span>
        <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{slotTime}ms</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>400ms</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {phases.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, opacity: slotTime >= (i > 0 ? phases[i - 1].end : 0) && slotTime <= p.end ? 1 : 0.35, transition: "opacity 0.2s" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>{p.name} ({i > 0 ? phases[i - 1].end : 0}-{p.end}ms)</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipOptimizer() {
  const [tipPct, setTipPct] = useState(40);
  const [competitors, setCompetitors] = useState(5);

  const oppValue = 0.1;
  const yourTip = oppValue * (tipPct / 100);
  const winProb = Math.min(0.98, 1 - Math.pow(1 - tipPct / 100, competitors * 0.8));
  const ev = winProb * (oppValue - yourTip);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Tip optimization simulator</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Tip % of profit</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{tipPct}%</span>
          </div>
          <input type="range" min="5" max="90" value={tipPct} onChange={e => setTipPct(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Competing searchers</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{competitors}</span>
          </div>
          <input type="range" min="1" max="20" value={competitors} onChange={e => setCompetitors(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16 }}>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Win probability</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: winProb > 0.7 ? "#5DCAA5" : winProb > 0.4 ? "#EF9F27" : "#E24B4A" }}>{Math.round(winProb * 100)}%</div>
        </div>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Your tip</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text-primary)" }}>{yourTip.toFixed(4)} SOL</div>
        </div>
        <div style={{ background: "var(--bg-primary)", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Expected value</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: ev > 0.03 ? "#5DCAA5" : ev > 0.01 ? "#EF9F27" : "#E24B4A" }}>{ev.toFixed(4)} SOL</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Assuming 0.1 SOL opportunity value. EV = P(win) × (value − tip). The sweet spot is typically 30-50% tip with 3-8 competitors.
      </div>
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
    <div style={{ marginBottom: 24, borderRadius: 10, border: "1px solid var(--accent)30", padding: "18px 20px", background: "var(--bg-card)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Knowledge check</div>
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

/* ===== NEW INTERACTIVE WIDGETS ===== */

function SandwichAttackAnimator() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({ phase: "idle", t: 0, swapSize: 2000, slippage: 1.0 });
  const [swapSize, setSwapSize] = useState(2000);
  const [slippage, setSlippage] = useState(1.0);
  const [phase, setPhase] = useState("idle");
  const [profit, setProfit] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  stateRef.current.swapSize = swapSize;
  stateRef.current.slippage = slippage;

  const startAttack = useCallback(() => {
    stateRef.current.phase = "scanning";
    stateRef.current.t = 0;
    setPhase("scanning");
    setProfit(null);
  }, []);

  const handleRestart = () => { setPaused(false); setRestartKey(k => k + 1); stateRef.current.phase = "idle"; stateRef.current.t = 0; setPhase("idle"); setProfit(null); };

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

    const txQueue = [
      { label: "Swap: SOL/USDC", type: "user", y: 200 },
      { label: "Transfer: 5 SOL", type: "normal", y: 260 },
      { label: "Stake: 100 SOL", type: "normal", y: 320 },
      { label: "Mint NFT", type: "normal", y: 380 },
    ];

    stateRef.current.phase = "idle";
    stateRef.current.t = 0;

    const draw = () => {
      const s = stateRef.current;
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.fillText("TRANSACTION QUEUE", W / 2, 24);

      // Queue border
      ctx.strokeStyle = "#2A2A30";
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      // Draw queue label
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#555";
      ctx.textAlign = "left";
      ctx.fillText("PENDING", 50, 60);

      // Scanner beam
      if (s.phase === "scanning") {
        s.t += 1 * speedRef.current;
        const beamY = 70 + (s.t * 3) % (H - 140);
        ctx.fillStyle = "rgba(200,240,110,0.06)";
        ctx.fillRect(40, beamY - 20, W - 80, 40);
        ctx.strokeStyle = "rgba(200,240,110,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, beamY);
        ctx.lineTo(W - 40, beamY);
        ctx.stroke();
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#C8F06E";
        ctx.textAlign = "right";
        ctx.fillText("SCANNING...", W - 50, beamY - 6);

        if (s.t > 50) {
          s.phase = "frontrun";
          s.t = 0;
          setPhase("frontrun");
        }
      }

      // Draw transactions
      const drawTx = (label, y, color, alpha, tag) => {
        const a = Math.min(1, alpha);
        ctx.globalAlpha = a;
        ctx.fillStyle = color + "20";
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = 1;
        const rw = W - 120, rx = 60, rh = 40, ry = y - 20;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.fillText(label, 80, y + 4);
        if (tag) {
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "right";
          ctx.fillText(tag, W - 70, y + 4);
        }
        ctx.globalAlpha = 1;
      };

      // Normal txs
      let offset = 0;
      if (s.phase === "frontrun" || s.phase === "backrun" || s.phase === "done") offset = 50;

      for (let i = 0; i < txQueue.length; i++) {
        const tx = txQueue[i];
        const yShift = (i === 0 && offset) ? offset : (i > 0 ? offset : 0);
        const c = tx.type === "user" ? "#5DCAA5" : "#666";
        const tag = tx.type === "user" ? `$${s.swapSize}` : "";
        drawTx(tx.label, tx.y + yShift, c, 1, tag);
      }

      // Front-run tx
      if (s.phase === "frontrun" || s.phase === "backrun" || s.phase === "done") {
        s.t += 1 * speedRef.current;
        const frontAlpha = Math.min(1, s.t / 15);
        drawTx("FRONT-RUN: Buy SOL", 170, "#E24B4A", frontAlpha, "ATTACKER");
        if (s.t > 30) {
          s.phase = "backrun";
          s.t = 0;
          setPhase("backrun");
        }
      }

      // Back-run tx
      if (s.phase === "backrun" || s.phase === "done") {
        s.t += 1 * speedRef.current;
        const backAlpha = Math.min(1, s.t / 15);
        drawTx("BACK-RUN: Sell SOL", 310, "#E24B4A", backAlpha, "ATTACKER");
        if (s.t > 30) {
          const p = Math.min(s.swapSize * s.slippage / 100, s.swapSize * 0.03);
          setProfit(p);
          s.phase = "done";
          s.t = 0;
          setPhase("done");
        }
      }

      // Done phase - profit display
      if (s.phase === "done") {
        const p = Math.min(s.swapSize * s.slippage / 100, s.swapSize * 0.03);
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#EF9F27";
        ctx.textAlign = "center";
        ctx.fillText(`PROFIT: $${p.toFixed(2)}`, W / 2, H - 50);
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#E24B4A";
        ctx.fillText(`User paid $${p.toFixed(2)} extra in slippage`, W / 2, H - 32);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Sandwich attack animator</span>
        <button onClick={startAttack}
          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: phase === "idle" || phase === "done" ? "var(--accent)15" : "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
          {phase === "idle" ? "Watch Attack" : phase === "done" ? "Replay" : "Running..."}
        </button>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Swap size</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>${swapSize.toLocaleString()}</span>
          </div>
          <input type="range" min="100" max="10000" step="100" value={swapSize} onChange={e => setSwapSize(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Slippage tolerance</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{slippage.toFixed(1)}%</span>
          </div>
          <input type="range" min="0.1" max="5" step="0.1" value={slippage} onChange={e => setSlippage(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
      </div>
      {profit !== null && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "#EF9F2710", borderRadius: 6, border: "1px solid #EF9F2730", fontSize: 12, fontFamily: "var(--mono)", color: "#EF9F27" }}>
          Attacker profit: ${profit.toFixed(2)} | Formula: min(swapSize x slippage%, swapSize x 3%)
        </div>
      )}
    </div>
  );
}

function MEVExtractionHeatmap() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dataRef = useRef(null);
  const hoverRef = useRef({ col: -1, row: -1 });
  const totalsRef = useRef({ arb: 0, liq: 0, sand: 0 });
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); dataRef.current = null; setRestartKey(k => k + 1); };

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
    const COLS = 10, ROWS = 5;
    const PAD_L = 10, PAD_T = 30, PAD_R = 10, PAD_B = 60;
    const cellW = (W - PAD_L - PAD_R) / COLS;
    const cellH = (H - PAD_T - PAD_B) / ROWS;

    // Initialize block data
    if (!dataRef.current) {
      dataRef.current = [];
      for (let c = 0; c < COLS; c++) {
        const col = [];
        for (let r = 0; r < ROWS; r++) {
          col.push({
            arb: Math.random() * 0.5,
            liq: Math.random() * 0.3,
            sand: Math.random() * 0.4,
          });
        }
        dataRef.current.push(col);
      }
    }

    const handleMouse = (e) => {
      const rect2 = canvas.getBoundingClientRect();
      const mx = e.clientX - rect2.left;
      const my = e.clientY - rect2.top;
      const col = Math.floor((mx - PAD_L) / cellW);
      const row = Math.floor((my - PAD_T) / cellH);
      hoverRef.current = { col: col >= 0 && col < COLS ? col : -1, row: row >= 0 && row < ROWS ? row : -1 };
    };
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", () => { hoverRef.current = { col: -1, row: -1 }; });

    let shiftTimer = 0;

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      const data = dataRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.fillText("MEV EXTRACTION HEATMAP — LAST 50 BLOCKS", W / 2, 18);

      // Compute totals
      let tArb = 0, tLiq = 0, tSand = 0;

      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const d = data[c][r];
          const total = d.arb + d.liq + d.sand;
          tArb += d.arb;
          tLiq += d.liq;
          tSand += d.sand;
          const intensity = Math.min(1, total / 1.0);

          const x = PAD_L + c * cellW;
          const y = PAD_T + r * cellH;

          // Color blend
          const rr = Math.round((93 * d.arb + 55 * d.liq + 226 * d.sand) / Math.max(0.01, total));
          const gg = Math.round((202 * d.arb + 138 * d.liq + 75 * d.sand) / Math.max(0.01, total));
          const bb = Math.round((165 * d.arb + 221 * d.liq + 74 * d.sand) / Math.max(0.01, total));

          ctx.fillStyle = `rgba(${rr},${gg},${bb},${0.15 + intensity * 0.7})`;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

          // Value
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillStyle = `rgba(255,255,255,${0.3 + intensity * 0.5})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(total.toFixed(2), x + cellW / 2, y + cellH / 2);

          // Hover highlight
          if (hoverRef.current.col === c && hoverRef.current.row === r) {
            ctx.strokeStyle = "#C8F06E";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
          }
        }
      }

      totalsRef.current = { arb: tArb, liq: tLiq, sand: tSand };

      // Hover tooltip
      const hc = hoverRef.current.col, hr = hoverRef.current.row;
      if (hc >= 0 && hr >= 0 && data[hc] && data[hc][hr]) {
        const d = data[hc][hr];
        const tx = PAD_L + hc * cellW + cellW / 2;
        const ty = PAD_T + hr * cellH - 8;
        const tooltipW = 150;
        const tooltipX = Math.min(tx - tooltipW / 2, W - tooltipW - 5);
        ctx.fillStyle = "rgba(20,20,25,0.95)";
        ctx.beginPath();
        ctx.roundRect(Math.max(5, tooltipX), ty - 50, tooltipW, 48, 6);
        ctx.fill();
        ctx.strokeStyle = "#C8F06E50";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const bx = Math.max(5, tooltipX) + 8;
        ctx.fillStyle = "#5DCAA5"; ctx.fillText(`Arb: ${d.arb.toFixed(3)} SOL`, bx, ty - 44);
        ctx.fillStyle = "#378ADD"; ctx.fillText(`Liq: ${d.liq.toFixed(3)} SOL`, bx, ty - 32);
        ctx.fillStyle = "#E24B4A"; ctx.fillText(`Sand: ${d.sand.toFixed(3)} SOL`, bx, ty - 20);
      }

      // Bottom totals
      const by = H - PAD_B + 14;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const third = W / 3;
      ctx.fillStyle = "#5DCAA5"; ctx.fillText(`ARB: ${tArb.toFixed(2)} SOL`, third * 0.5, by);
      ctx.fillStyle = "#378ADD"; ctx.fillText(`LIQUIDATION: ${tLiq.toFixed(2)} SOL`, third * 1.5, by);
      ctx.fillStyle = "#E24B4A"; ctx.fillText(`SANDWICH: ${tSand.toFixed(2)} SOL`, third * 2.5, by);
      ctx.fillStyle = "#888780";
      ctx.fillText(`TOTAL: ${(tArb + tLiq + tSand).toFixed(2)} SOL`, W / 2, by + 18);

      // Shift every ~2s (120 frames at ~60fps)
      shiftTimer += speedRef.current;
      if (shiftTimer >= 120) {
        shiftTimer = 0;
        data.shift();
        const newCol = [];
        for (let r = 0; r < ROWS; r++) {
          newCol.push({
            arb: Math.random() * 0.5,
            liq: Math.random() * 0.3,
            sand: Math.random() * 0.4,
          });
        }
        data.push(newCol);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouse);
    };
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>MEV extraction heatmap</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 350, borderRadius: 8, border: "1px solid var(--border)", cursor: "crosshair", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Each cell represents a block. Color intensity = total MEV extracted. Hover for breakdown. Grid shifts left every 2 seconds as new blocks arrive.
      </div>
    </div>
  );
}

// ponytail: module-scope so object identity is stable across renders.
// schedule (a useRef) holds these objects; if recreated each render,
// VALIDATORS.indexOf(currentValidator) returns -1 -> CITIES[-1] undefined -> render crash.
const LSP_VALIDATORS = [
  { name: "Jito", color: "#5DCAA5" },
  { name: "Marinade", color: "#378ADD" },
  { name: "Helius", color: "#EF9F27" },
  { name: "Galaxy", color: "#7F77DD" },
  { name: "Everstake", color: "#D4537E" },
];

const LSP_CITIES = [
  { name: "New York", x: 80, y: 60 },
  { name: "Amsterdam", x: 220, y: 42 },
  { name: "Frankfurt", x: 255, y: 105 },
  { name: "Tokyo", x: 415, y: 58 },
  { name: "Singapore", x: 370, y: 122 },
];

function LeaderSchedulePredictor() {
  const VALIDATORS = LSP_VALIDATORS;
  const CITIES = LSP_CITIES;

  const [currentSlot, setCurrentSlot] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [serverPos, setServerPos] = useState({ x: 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const handleRestart = () => { setPaused(false); setCurrentSlot(0); setSelectedSlot(null); };

  // Generate a schedule: 20 slots, groups of 4
  const schedule = useRef(
    Array.from({ length: 20 }, (_, i) => {
      const vIdx = Math.floor(i / 4) % VALIDATORS.length;
      return { slot: 1000 + i, validator: VALIDATORS[vIdx] };
    })
  ).current;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setCurrentSlot(s => (s + 1) % 20);
    }, 800 / speed);
    return () => clearInterval(intervalRef.current);
  }, [speed]);

  const latencyTo = (city) => {
    const dx = serverPos.x - city.x;
    const dy = serverPos.y - city.y;
    return Math.sqrt(dx * dx + dy * dy) * 0.35;
  };

  const handleMapMouse = (e) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setServerPos({
      x: Math.max(20, Math.min(460, ((e.clientX - rect.left) / rect.width) * 480)),
      y: Math.max(20, Math.min(155, ((e.clientY - rect.top) / rect.height) * 170)),
    });
  };

  const info = selectedSlot !== null ? schedule[selectedSlot] : schedule[currentSlot];
  const currentValidator = schedule[currentSlot].validator;
  const currentCity = CITIES[VALIDATORS.indexOf(currentValidator) % CITIES.length];
  const currentLatency = latencyTo(currentCity);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Leader schedule predictor</div>

      {/* Slot timeline */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
        {schedule.map((s, i) => {
          const isCurrent = i === currentSlot;
          const isGroupStart = i % 4 === 0;
          return (
            <div key={i} onClick={() => setSelectedSlot(i === selectedSlot ? null : i)}
              style={{
                width: 28, height: 36, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: isCurrent ? s.validator.color + "30" : "var(--bg-primary)",
                border: `1.5px solid ${isCurrent ? s.validator.color : selectedSlot === i ? "#C8F06E" : "var(--border)"}`,
                cursor: "pointer", flexShrink: 0, position: "relative",
                boxShadow: isCurrent ? `0 0 8px ${s.validator.color}40` : "none",
                animation: isCurrent ? "none" : "none",
              }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.validator.color, marginBottom: 2 }} />
              <span style={{ fontSize: 8, fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>{s.slot}</span>
              {isGroupStart && <div style={{ position: "absolute", top: -10, fontSize: 7, color: s.validator.color, fontFamily: "var(--mono)", fontWeight: 700, whiteSpace: "nowrap" }}>{s.validator.name}</div>}
            </div>
          );
        })}
      </div>

      {/* Info panel */}
      <div style={{ padding: "10px 14px", background: "var(--bg-primary)", borderRadius: 8, marginBottom: 14, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, fontFamily: "var(--mono)" }}>
          <span style={{ color: "var(--text-tertiary)" }}>Slot: <strong style={{ color: info.validator.color }}>{info.slot}</strong></span>
          <span style={{ color: "var(--text-tertiary)" }}>Leader: <strong style={{ color: info.validator.color }}>{info.validator.name}</strong></span>
          <span style={{ color: "var(--text-tertiary)" }}>Latency: <strong style={{ color: currentLatency < 10 ? "#5DCAA5" : currentLatency < 50 ? "#EF9F27" : "#E24B4A" }}>{currentLatency.toFixed(0)}ms</strong></span>
        </div>
      </div>

      {/* Simple "map" */}
      <div style={{ position: "relative", height: 170, background: "#0A0A0D", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", cursor: dragging ? "grabbing" : "default" }}
        onMouseMove={handleMapMouse}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}>
        {/* Latency lines from server to each city */}
        <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }} viewBox="0 0 480 170">
          {CITIES.map((city, i) => {
            const lat = latencyTo(city);
            const col = lat < 10 ? "#5DCAA5" : lat < 50 ? "#EF9F27" : "#E24B4A";
            return (
              <g key={i}>
                <line x1={serverPos.x} y1={serverPos.y} x2={city.x} y2={city.y} stroke={col} strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
                <text x={(serverPos.x + city.x) / 2} y={(serverPos.y + city.y) / 2 - 6} fill={col} fontSize="8" fontFamily="'JetBrains Mono', monospace" textAnchor="middle">{lat.toFixed(0)}ms</text>
              </g>
            );
          })}
        </svg>

        {/* City dots */}
        {CITIES.map((city, i) => (
          <div key={i} style={{ position: "absolute", left: `${(city.x / 480) * 100}%`, top: `${(city.y / 170) * 100}%`, transform: "translate(-50%, -50%)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: VALIDATORS[i % VALIDATORS.length].color, border: "1.5px solid #0A0A0D" }} />
            <div style={{ fontSize: 7, fontFamily: "var(--mono)", color: "#888", textAlign: "center", marginTop: 2, whiteSpace: "nowrap" }}>{city.name}</div>
          </div>
        ))}

        {/* Draggable server dot */}
        <div
          onMouseDown={() => setDragging(true)}
          style={{
            position: "absolute", left: `${(serverPos.x / 480) * 100}%`, top: `${(serverPos.y / 170) * 100}%`, transform: "translate(-50%, -50%)",
            cursor: "grab", zIndex: 10, userSelect: "none"
          }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#C8F06E", border: "2px solid #0A0A0D", boxShadow: "0 0 10px #C8F06E60" }} />
          <div style={{ fontSize: 8, fontFamily: "var(--mono)", color: "#C8F06E", textAlign: "center", marginTop: 2, fontWeight: 700, whiteSpace: "nowrap" }}>YOUR SERVER</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#5DCAA5" }}>● &lt;10ms</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#EF9F27" }}>● 10-50ms</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#E24B4A" }}>● &gt;50ms</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>Drag your server to see latency changes</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArbOpportunityDetector() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    raydiumPrice: 150, orcaPrice: 150,
    opportunity: false, countdown: 0, maxCountdown: 5,
    score: 0, missed: 0, caught: 0,
    phase: "waiting", resultText: "", resultTimer: 0,
    difficulty: "easy"
  });
  const [difficulty, setDifficulty] = useState("easy");
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); setRestartKey(k => k + 1); stateRef.current = { raydiumPrice: 150, orcaPrice: 150, opportunity: false, countdown: 0, maxCountdown: 5, score: 0, missed: 0, caught: 0, phase: "waiting", resultText: "", resultTimer: 0, difficulty }; setScore(0); };

  stateRef.current.difficulty = difficulty;

  const handleClick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "opportunity") {
      const spread = Math.abs(s.raydiumPrice - s.orcaPrice);
      const profit = spread * (0.5 + Math.random() * 0.5);
      s.score += Math.round(profit * 100);
      s.caught++;
      s.phase = "success";
      s.resultText = `+$${profit.toFixed(2)} profit!`;
      s.resultTimer = 60;
      setScore(s.score);
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
    let frame = 0;

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      const s = stateRef.current;
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Jitter prices
      s.raydiumPrice += (Math.random() - 0.5) * 0.15 * speedRef.current;
      s.orcaPrice += (Math.random() - 0.5) * 0.15 * speedRef.current;
      // Mean revert
      s.raydiumPrice += (150 - s.raydiumPrice) * 0.005 * speedRef.current;
      s.orcaPrice += (150 - s.orcaPrice) * 0.005 * speedRef.current;

      const spread = Math.abs(s.raydiumPrice - s.orcaPrice);

      // Create opportunity occasionally
      if (s.phase === "waiting" && frame % Math.round(180 / speedRef.current) === 0 && Math.random() > 0.3) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        s.raydiumPrice += dir * (0.6 + Math.random() * 0.8);
        s.phase = "opportunity";
        const speeds = { easy: 5, medium: 3, hard: 1.5 };
        s.maxCountdown = speeds[s.difficulty] || 5;
        s.countdown = s.maxCountdown;
      }

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.fillText("ARB OPPORTUNITY DETECTOR", W / 2, 24);

      // DEX price boxes
      const boxW = 190, boxH = 100;
      // Raydium
      ctx.fillStyle = "#1A1A20";
      ctx.beginPath(); ctx.roundRect(30, 50, boxW, boxH, 8); ctx.fill();
      ctx.strokeStyle = "#5DCAA540"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#5DCAA5"; ctx.textAlign = "center";
      ctx.fillText("HYPERLIQUID", 30 + boxW / 2, 78);
      ctx.font = "bold 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(`$${s.raydiumPrice.toFixed(2)}`, 30 + boxW / 2, 120);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#666"; ctx.fillText("BTC-PERP", 30 + boxW / 2, 140);

      // Orca
      ctx.fillStyle = "#1A1A20";
      ctx.beginPath(); ctx.roundRect(W - 30 - boxW, 50, boxW, boxH, 8); ctx.fill();
      ctx.strokeStyle = "#378ADD40"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#378ADD"; ctx.textAlign = "center";
      ctx.fillText("BINANCE", W - 30 - boxW / 2, 78);
      ctx.font = "bold 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(`$${s.orcaPrice.toFixed(2)}`, W - 30 - boxW / 2, 120);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#666"; ctx.fillText("BTC-PERP", W - 30 - boxW / 2, 140);

      // Spread indicator
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const spreadColor = spread > 0.5 ? "#C8F06E" : "#666";
      ctx.fillStyle = spreadColor;
      ctx.fillText(`SPREAD: $${spread.toFixed(3)}`, W / 2, 185);

      // Opportunity state
      if (s.phase === "opportunity") {
        s.countdown -= (1 / 60) * speedRef.current;
        if (s.countdown <= 0) {
          s.phase = "missed";
          s.missed++;
          s.resultText = "TOO SLOW!";
          s.resultTimer = 60;
        } else {
          // Flashing alert
          const flash = Math.sin(frame * 0.2) > 0;
          ctx.fillStyle = flash ? "#C8F06E" : "#C8F06E80";
          ctx.font = "bold 20px 'JetBrains Mono', monospace";
          ctx.fillText("OPPORTUNITY!", W / 2, 230);

          // Countdown bar
          const barW = 300, barH = 16;
          const barX = (W - barW) / 2, barY = 245;
          ctx.fillStyle = "#1A1A20";
          ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
          const frac = s.countdown / s.maxCountdown;
          const barColor = frac > 0.5 ? "#5DCAA5" : frac > 0.2 ? "#EF9F27" : "#E24B4A";
          ctx.fillStyle = barColor;
          ctx.beginPath(); ctx.roundRect(barX, barY, barW * frac, barH, 4); ctx.fill();
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#000";
          ctx.fillText(`${s.countdown.toFixed(1)}s`, W / 2, barY + 12);

          // Execute button area
          ctx.fillStyle = "#C8F06E20";
          ctx.beginPath(); ctx.roundRect((W - 160) / 2, 280, 160, 44, 8); ctx.fill();
          ctx.strokeStyle = "#C8F06E";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.font = "bold 14px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#C8F06E";
          ctx.fillText("CLICK TO EXECUTE", W / 2, 307);
        }
      } else if (s.phase === "waiting") {
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#555";
        ctx.fillText("Monitoring for spread > $0.50...", W / 2, 230);
      }

      // Result display
      if (s.resultTimer > 0) {
        s.resultTimer -= speedRef.current;
        ctx.font = "bold 18px 'JetBrains Mono', monospace";
        ctx.fillStyle = s.phase === "success" ? "#5DCAA5" : "#E24B4A";
        ctx.globalAlpha = Math.min(1, s.resultTimer / 30);
        ctx.fillText(s.resultText, W / 2, 260);
        ctx.globalAlpha = 1;
        if (s.resultTimer <= 0) {
          s.phase = "waiting";
          s.raydiumPrice = 150 + (Math.random() - 0.5) * 0.5;
          s.orcaPrice = 150 + (Math.random() - 0.5) * 0.5;
        }
      }

      // Score board
      ctx.fillStyle = "#1A1A20";
      ctx.beginPath(); ctx.roundRect(30, H - 120, W - 60, 80, 8); ctx.fill();
      ctx.strokeStyle = "#2A2A30"; ctx.lineWidth = 1; ctx.stroke();
      const third = (W - 60) / 3;
      ctx.font = "9px 'JetBrains Mono', monospace"; ctx.textBaseline = "top";
      ctx.fillStyle = "#888"; ctx.textAlign = "center";
      ctx.fillText("SCORE", 30 + third * 0.5, H - 112);
      ctx.fillText("CAUGHT", 30 + third * 1.5, H - 112);
      ctx.fillText("MISSED", 30 + third * 2.5, H - 112);
      ctx.font = "bold 22px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#C8F06E"; ctx.fillText(s.score.toString(), 30 + third * 0.5, H - 94);
      ctx.fillStyle = "#5DCAA5"; ctx.fillText(s.caught.toString(), 30 + third * 1.5, H - 94);
      ctx.fillStyle = "#E24B4A"; ctx.fillText(s.missed.toString(), 30 + third * 2.5, H - 94);
      ctx.textBaseline = "alphabetic";

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Arb opportunity detector</span>
        <div style={{ display: "flex", gap: 4 }}>
          {["easy", "medium", "hard"].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 4, border: `1px solid ${difficulty === d ? "var(--accent)" : "var(--border)"}`,
                background: difficulty === d ? "var(--accent)15" : "transparent",
                color: difficulty === d ? "var(--accent)" : "var(--text-tertiary)",
                cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600, textTransform: "uppercase"
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} onClick={handleClick}
        style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Watch for price spreads &gt; $0.50 between Hyperliquid and the CEX. Click to execute the arb before time runs out. Higher difficulty = less reaction time.
      </div>
    </div>
  );
}

function LiquidationCascade() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [solPrice, setSolPrice] = useState(200);
  const [particles, setParticles] = useState([]);
  const priceRef = useRef(200);
  const particlesRef = useRef([]);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const POSITIONS = useRef([
    { id: 0, collateral: 100, debt: 60, liqPrice: 180, label: "Position A", liquidated: false },
    { id: 1, collateral: 80, debt: 50, liqPrice: 160, label: "Position B", liquidated: false },
    { id: 2, collateral: 120, debt: 85, liqPrice: 140, label: "Position C", liquidated: false },
    { id: 3, collateral: 60, debt: 45, liqPrice: 120, label: "Position D", liquidated: false },
    { id: 4, collateral: 90, debt: 72, liqPrice: 100, label: "Position E", liquidated: false },
    { id: 5, collateral: 70, debt: 60, liqPrice: 85, label: "Position F", liquidated: false },
    { id: 6, collateral: 50, debt: 44, liqPrice: 70, label: "Position G", liquidated: false },
    { id: 7, collateral: 110, debt: 100, liqPrice: 55, label: "Position H", liquidated: false },
  ]).current;

  priceRef.current = solPrice;

  const resetPositions = useCallback(() => {
    POSITIONS.forEach(p => { p.liquidated = false; });
    particlesRef.current = [];
    setSolPrice(200);
  }, [POSITIONS]);

  const handleRestart = () => { setPaused(false); resetPositions(); setRestartKey(k => k + 1); };

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

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      const price = priceRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.fillText("LENDING POSITIONS — LIQUIDATION CASCADE", W / 2, 22);

      // Price display
      ctx.font = "bold 24px 'JetBrains Mono', monospace";
      ctx.fillStyle = price > 150 ? "#5DCAA5" : price > 100 ? "#EF9F27" : "#E24B4A";
      ctx.fillText(`SOL: $${price.toFixed(0)}`, W / 2, 56);

      // Draw positions as bars
      const barH = 38, barGap = 8, startY = 75;
      const barMaxW = W - 100;

      let cascadeHit = false;

      for (let i = 0; i < POSITIONS.length; i++) {
        const p = POSITIONS[i];
        const y = startY + i * (barH + barGap);
        const collateralValue = p.collateral * (price / 200);
        const healthFactor = (collateralValue / p.debt) * 100;

        // Check liquidation
        if (!p.liquidated && price <= p.liqPrice) {
          p.liquidated = true;
          cascadeHit = true;
          // Add particles
          for (let j = 0; j < 12; j++) {
            particlesRef.current.push({
              x: 50 + barMaxW * Math.min(1, healthFactor / 200),
              y: y + barH / 2,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 4,
              life: 40 + Math.random() * 20,
              color: "#E24B4A"
            });
          }
        }

        // Background
        ctx.fillStyle = "#1A1A20";
        ctx.beginPath(); ctx.roundRect(50, y, barMaxW, barH, 4); ctx.fill();

        // Health bar
        const barFrac = Math.min(1, healthFactor / 200);
        const barColor = p.liquidated ? "#E24B4A" : healthFactor > 150 ? "#5DCAA5" : healthFactor > 110 ? "#EF9F27" : "#E24B4A";
        if (!p.liquidated) {
          ctx.fillStyle = barColor + "40";
          ctx.beginPath(); ctx.roundRect(50, y, barMaxW * barFrac, barH, 4); ctx.fill();
        }

        // Label
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = p.liquidated ? "#E24B4A60" : "#fff";
        ctx.textAlign = "left";
        ctx.fillText(p.label, 58, y + 16);

        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillStyle = p.liquidated ? "#E24B4A60" : "#888";
        ctx.fillText(`Liq: $${p.liqPrice}`, 58, y + 30);

        // Health factor
        ctx.textAlign = "right";
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = p.liquidated ? "#E24B4A" : barColor;
        ctx.fillText(p.liquidated ? "LIQUIDATED" : `${healthFactor.toFixed(0)}%`, 50 + barMaxW - 8, y + 24);
      }

      // Cascade price nudge
      if (cascadeHit) {
        // Each liquidation pushes price down $2
        const newPrice = Math.max(50, priceRef.current - 2);
        priceRef.current = newPrice;
        setSolPrice(newPrice);
      }

      // Draw particles
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const pt = ps[i];
        pt.x += pt.vx * speedRef.current;
        pt.y += pt.vy * speedRef.current;
        pt.vy += 0.1 * speedRef.current;
        pt.life -= speedRef.current;
        if (pt.life <= 0) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = pt.life / 60;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Liquidation count
      const liqCount = POSITIONS.filter(p => p.liquidated).length;
      if (liqCount > 0) {
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#E24B4A";
        ctx.textAlign = "center";
        ctx.fillText(`${liqCount} position${liqCount > 1 ? "s" : ""} liquidated | Cascade price impact: -$${liqCount * 2}`, W / 2, H - 20);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [POSITIONS, restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Liquidation cascade simulator</span>
        <button onClick={resetPositions}
          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
          Reset
        </button>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>SOL Price</span>
          <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>${solPrice.toFixed(0)}</span>
        </div>
        <input type="range" min="50" max="200" step="1" value={solPrice} onChange={e => { const v = +e.target.value; setSolPrice(v); priceRef.current = v; }}
          style={{ width: "100%", accentColor: "var(--accent)" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Drag the price slider down to see positions get liquidated. Each liquidation pushes price down $2, potentially triggering a cascade.
      </div>
    </div>
  );
}

function SupplyChainFlow() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [tip, setTip] = useState(0.01);
  const [competitors, setCompetitors] = useState(2);
  const tipRef = useRef(0.01);
  const compRef = useRef(2);
  tipRef.current = tip;
  compRef.current = competitors;
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); setRestartKey(k => k + 1); };

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

    const nodes = [
      { label: "User", x: 60, y: H / 2, color: "#5DCAA5", icon: "U" },
      { label: "Searcher", x: W * 0.38, y: H / 2, color: "#EF9F27", icon: "S" },
      { label: "Block Engine", x: W * 0.64, y: H / 2, color: "#7F77DD", icon: "B" },
      { label: "Validator", x: W * 0.88, y: H / 2, color: "#E24B4A", icon: "V" },
    ];

    let particles = [];
    let frame = 0;
    let lastEmit = 0;
    let statusMessages = [];

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780";
      ctx.textAlign = "center";
      ctx.fillText("MEV SUPPLY CHAIN FLOW", W / 2, 22);

      // Connection lines
      ctx.strokeStyle = "#2A2A30";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x + 25, nodes[i].y);
        ctx.lineTo(nodes[i + 1].x - 25, nodes[i + 1].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw nodes
      for (const n of nodes) {
        // Glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 35);
        gradient.addColorStop(0, n.color + "15");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(n.x - 35, n.y - 35, 70, 70);

        // Circle
        ctx.fillStyle = "#1A1A20";
        ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = n.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.stroke();

        // Icon
        ctx.font = "bold 16px 'JetBrains Mono', monospace";
        ctx.fillStyle = n.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.icon, n.x, n.y);

        // Label
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = n.color;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(n.label, n.x, n.y + 42);
      }

      // Emit tx particles every ~3 seconds
      if (frame - lastEmit > Math.round(180 / speedRef.current)) {
        lastEmit = frame;
        // User emits tx
        particles.push({
          x: nodes[0].x + 25, y: nodes[0].y,
          targetIdx: 1, color: "#5DCAA5", label: "tx", speed: 1.5,
          phase: "user-to-searcher"
        });
        statusMessages = [{ text: "User submits swap tx", timer: 60, color: "#5DCAA5" }];
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const target = nodes[p.targetIdx];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) {
          // Reached target
          if (p.targetIdx === 1) {
            // At searcher - create bundle
            particles.splice(i, 1);
            setTimeout(() => {
              particles.push({
                x: nodes[1].x + 25, y: nodes[1].y,
                targetIdx: 2, color: "#EF9F27", label: "bundle",
                speed: 2, phase: "searcher-to-engine"
              });
              statusMessages = [{ text: `Searcher bundles tx + tip (${tipRef.current.toFixed(3)} SOL)`, timer: 60, color: "#EF9F27" }];
            }, 200);
          } else if (p.targetIdx === 2) {
            // At block engine - check tip threshold
            const threshold = 0.005 * compRef.current;
            particles.splice(i, 1);
            if (tipRef.current >= threshold) {
              setTimeout(() => {
                particles.push({
                  x: nodes[2].x + 25, y: nodes[2].y,
                  targetIdx: 3, color: "#7F77DD", label: "won",
                  speed: 2, phase: "engine-to-validator"
                });
                statusMessages = [{ text: "Auction won! Bundle forwarded to validator", timer: 60, color: "#5DCAA5" }];
              }, 300);
            } else {
              statusMessages = [{ text: `Rejected! Tip ${tipRef.current.toFixed(3)} < threshold ${threshold.toFixed(3)} SOL`, timer: 90, color: "#E24B4A" }];
            }
          } else if (p.targetIdx === 3) {
            // At validator - included
            particles.splice(i, 1);
            statusMessages = [{ text: "Bundle included in block!", timer: 60, color: "#C8F06E" }];
          }
        } else {
          p.x += (dx / dist) * p.speed * speedRef.current;
          p.y += (dy / dist) * p.speed * speedRef.current;

          // Draw particle
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillStyle = p.color;
          ctx.textAlign = "center";
          ctx.fillText(p.label, p.x, p.y - 10);

          // Trail
          ctx.fillStyle = p.color + "30";
          ctx.beginPath(); ctx.arc(p.x - (dx / dist) * 8, p.y - (dy / dist) * 8, 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Status messages
      for (const msg of statusMessages) {
        if (msg.timer > 0) {
          msg.timer--;
          ctx.globalAlpha = Math.min(1, msg.timer / 30);
          ctx.font = "11px 'JetBrains Mono', monospace";
          ctx.fillStyle = msg.color;
          ctx.textAlign = "center";
          ctx.fillText(msg.text, W / 2, H / 2 + 70);
          ctx.globalAlpha = 1;
        }
      }

      // Revenue split display
      const tipVal = tipRef.current;
      const validatorShare = tipVal * 0.95;
      const engineShare = tipVal * 0.05;
      const splitY = H - 80;
      ctx.fillStyle = "#1A1A20";
      ctx.beginPath(); ctx.roundRect(30, splitY, W - 60, 60, 8); ctx.fill();
      ctx.strokeStyle = "#2A2A30"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888"; ctx.textAlign = "center";
      ctx.fillText("REVENUE SPLIT", W / 2, splitY + 14);
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#EF9F27"; ctx.fillText(`Searcher keeps profit - tip`, W / 4, splitY + 34);
      ctx.fillStyle = "#E24B4A"; ctx.fillText(`Validator: ${(validatorShare * 1000).toFixed(1)}ms`, W / 2, splitY + 34);
      ctx.fillStyle = "#7F77DD"; ctx.fillText(`Engine: ${(engineShare * 1000).toFixed(1)}ms`, W * 3 / 4, splitY + 34);
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#666";
      ctx.fillText(`Tip: ${tipVal.toFixed(3)} SOL | Validator 95% / Engine 5%`, W / 2, splitY + 52);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Supply chain flow simulator</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Tip amount</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{tip.toFixed(3)} SOL</span>
          </div>
          <input type="range" min="0.001" max="0.1" step="0.001" value={tip} onChange={e => setTip(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Competitors</span>
            <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{competitors}</span>
          </div>
          <input type="range" min="1" max="5" step="1" value={competitors} onChange={e => setCompetitors(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Threshold = 0.005 x competitors. If your tip is below the threshold, the bundle gets rejected. More competitors raise the bar.
      </div>
    </div>
  );
}

/* ===== PLACEHOLDER WIDGETS ===== */

function JitoBundleBuilder() {
  const availableTxs = [
    { id: 0, label: "Buy SOL on Raydium", tag: "arb leg 1", color: "#5DCAA5" },
    { id: 1, label: "Sell SOL on Orca", tag: "arb leg 2", color: "#5DCAA5" },
    { id: 2, label: "Liquidate Position #3", tag: "liquidation", color: "#EF9F27" },
    { id: 3, label: "Backrun DEX trade", tag: "backrun", color: "#7F77DD" },
    { id: 4, label: "Priority tip", tag: "tip tx", color: "#C8F06E" },
  ];
  const [bundle, setBundle] = useState([]);
  const [tip, setTip] = useState(0.04);
  const [submitted, setSubmitted] = useState(false);
  const [aiTips, setAiTips] = useState([0, 0]);
  const [winner, setWinner] = useState(null);

  const addTx = (tx) => {
    if (submitted) return;
    if (bundle.find(b => b.id === tx.id)) return;
    setBundle(prev => [...prev, tx]);
  };
  const removeTx = (id) => {
    if (submitted) return;
    setBundle(prev => prev.filter(b => b.id !== id));
  };
  const handleSubmit = () => {
    if (bundle.length === 0) return;
    const a1 = +(0.02 + Math.random() * 0.06).toFixed(3);
    const a2 = +(0.02 + Math.random() * 0.06).toFixed(3);
    setAiTips([a1, a2]);
    const tips = [{ name: "You", tip }, { name: "Bundle B", tip: a1 }, { name: "Bundle C", tip: a2 }];
    tips.sort((a, b) => b.tip - a.tip);
    setWinner(tips[0].name);
    setSubmitted(true);
  };
  const reset = () => { setBundle([]); setSubmitted(false); setWinner(null); setAiTips([0, 0]); setTip(0.04); };

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Jito bundle builder</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {/* Left panel: available txs */}
        <div style={{ background: "#141419", borderRadius: 8, padding: 12, border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B9990", textTransform: "uppercase", marginBottom: 8 }}>Available Transactions</div>
          {availableTxs.map(tx => {
            const inBundle = bundle.find(b => b.id === tx.id);
            return (
              <div key={tx.id} onClick={() => addTx(tx)} style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, border: `1px solid ${inBundle ? "#5F5E58" : tx.color + "50"}`, background: inBundle ? "#0A0A0E" : tx.color + "10", cursor: submitted ? "default" : "pointer", opacity: inBundle ? 0.35 : 1, transition: "all 0.15s" }}>
                <div style={{ fontSize: 11, color: inBundle ? "#5F5E58" : tx.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{tx.label}</div>
                <div style={{ fontSize: 9, color: "#5F5E58", marginTop: 2 }}>{tx.tag}</div>
              </div>
            );
          })}
        </div>
        {/* Center panel: bundle */}
        <div style={{ background: "#141419", borderRadius: 8, padding: 12, border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B9990", textTransform: "uppercase", marginBottom: 8 }}>Your Bundle</div>
          {bundle.length === 0 && <div style={{ fontSize: 11, color: "#5F5E58", padding: "20px 0", textAlign: "center" }}>Click transactions to add</div>}
          {bundle.map((tx, i) => (
            <div key={tx.id} onClick={() => removeTx(tx.id)} style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, border: `1px solid ${tx.color}50`, background: tx.color + "10", cursor: submitted ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#9B9990", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, width: 16 }}>{i + 1}.</span>
              <span style={{ fontSize: 11, color: tx.color, fontFamily: "'JetBrains Mono', monospace" }}>{tx.label}</span>
            </div>
          ))}
          {bundle.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#9B9990" }}>Tip</span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{tip.toFixed(3)} SOL</span>
              </div>
              <input type="range" min="0.01" max="0.1" step="0.005" value={tip} onChange={e => { if (!submitted) setTip(+e.target.value); }} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
          )}
          {!submitted && <button onClick={handleSubmit} style={{ ...btnStyle, marginTop: 8, width: "100%", background: bundle.length > 0 ? "#C8F06E20" : "#141419", color: bundle.length > 0 ? "#C8F06E" : "#5F5E58", border: `1px solid ${bundle.length > 0 ? "#C8F06E50" : "#222228"}` }}>Submit Bundle</button>}
          {submitted && <button onClick={reset} style={{ ...btnStyle, marginTop: 8, width: "100%" }}>Reset</button>}
        </div>
        {/* Right panel: competing bundles */}
        <div style={{ background: "#141419", borderRadius: 8, padding: 12, border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B9990", textTransform: "uppercase", marginBottom: 8 }}>Competing Bundles</div>
          {["Bundle B", "Bundle C"].map((name, i) => (
            <div key={name} style={{ padding: "10px 10px", marginBottom: 6, borderRadius: 6, border: `1px solid ${submitted ? (winner === name ? "#5DCAA560" : "#E24B4A40") : "#222228"}`, background: submitted ? (winner === name ? "#5DCAA510" : "#E24B4A08") : "#0A0A0E" }}>
              <div style={{ fontSize: 11, color: "#E8E6E1", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 10, color: "#9B9990", marginTop: 2 }}>{i === 0 ? "3" : "2"} txs</div>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, color: submitted ? (winner === name ? "#5DCAA5" : "#E24B4A") : "#5F5E58" }}>
                Tip: {submitted ? `${aiTips[i].toFixed(3)} SOL` : "???"}
                {submitted && (winner === name ? " \u2713" : " \u2717")}
              </div>
            </div>
          ))}
          {/* Your tip in comparison */}
          {submitted && (
            <div style={{ padding: "10px 10px", marginBottom: 6, borderRadius: 6, border: `1px solid ${winner === "You" ? "#5DCAA560" : "#E24B4A40"}`, background: winner === "You" ? "#5DCAA510" : "#E24B4A08" }}>
              <div style={{ fontSize: 11, color: "#E8E6E1", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>You</div>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 4, color: winner === "You" ? "#5DCAA5" : "#E24B4A" }}>
                Tip: {tip.toFixed(3)} SOL {winner === "You" ? "\u2713" : "\u2717"}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Winner block bar */}
      {submitted && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#141419", border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B9990", textTransform: "uppercase", marginBottom: 6 }}>Block #14,329,871</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 28, borderRadius: 6, background: winner === "You" ? "#5DCAA520" : "#E24B4A10", border: `1px solid ${winner === "You" ? "#5DCAA550" : "#E24B4A30"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: winner === "You" ? "#5DCAA5" : "#E24B4A", fontWeight: 600 }}>
                {winner === "You" ? "Your bundle included! Highest tip wins." : `${winner} won — their tip was higher.`}
              </span>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={reset}>↻</button>
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 10, lineHeight: 1.5 }}>
        Build a bundle by selecting transactions. Order matters for atomic execution. Set your tip to compete with AI bundles — highest tip wins block inclusion.
      </div>
    </div>
  );
}

function ColocationLatencyViz() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dragRef = useRef({ dragging: false, x: 350, y: 200 });
  const leaderRef = useRef(0);
  const [latencyText, setLatencyText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); leaderRef.current = 0; dragRef.current = { dragging: false, x: 350, y: 200 }; setRestartKey(k => k + 1); };

  // Positioned at real geographic coordinates on the world map (see worldMap.js).
  const dataCenters = [
    { name: "NYC", x: 212, y: 119, color: "#7F77DD" },
    { name: "Amsterdam", x: 370, y: 95, color: "#7F77DD", labelDx: -30 },
    { name: "Frankfurt", x: 384, y: 110, color: "#7F77DD", labelDx: 30, labelDy: 8 },
    { name: "Tokyo", x: 639, y: 129, color: "#7F77DD" },
    { name: "Singapore", x: 568, y: 197, color: "#7F77DD" },
  ];
  const validators = [
    { name: "Validator 1", x: 182, y: 130, color: "#5DCAA5" }, // central US
    { name: "Validator 2", x: 372, y: 112, color: "#5DCAA5" }, // France/central Europe
    { name: "Validator 3", x: 616, y: 138, color: "#5DCAA5" }, // East Asia
  ];

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
    // Map is authored in a fixed 720x400 design space; scale it uniformly to fit
    // the responsive canvas (centered) so nothing clips and aspect is preserved.
    const BW = 720, BH = 400;
    const sc = Math.min(W / BW, H / BH);
    const ox = (W - BW * sc) / 2, oy = (H - BH * sc) / 2;
    const toDesignX = (cx) => (cx - ox) / sc;
    const toDesignY = (cy) => (cy - oy) / sc;
    let frame = 0;

    const leaderInterval = setInterval(() => {
      if (!pausedRef.current) leaderRef.current = (leaderRef.current + 1) % 3;
    }, 3000 / speedRef.current);

    const handleDown = (e) => {
      const rect2 = canvas.getBoundingClientRect();
      const mx = toDesignX(e.clientX - rect2.left), my = toDesignY(e.clientY - rect2.top);
      const d = dragRef.current;
      if (Math.hypot(mx - d.x, my - d.y) < 18) d.dragging = true;
    };
    const handleMove = (e) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      const rect2 = canvas.getBoundingClientRect();
      d.x = Math.max(8, Math.min(BW - 8, toDesignX(e.clientX - rect2.left)));
      d.y = Math.max(8, Math.min(BH - 8, toDesignY(e.clientY - rect2.top)));
    };
    const handleUp = () => { dragRef.current.dragging = false; };
    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleUp);
    canvas.addEventListener("mouseleave", handleUp);

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      frame++;
      const d = dragRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0A0A0E";
      ctx.fillRect(0, 0, W, H);

      // Draw the map in fixed 720x400 design space, scaled to fit the canvas.
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);

      // World map land outlines
      drawWorldMap(ctx);

      // Data center dots
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      for (const dc of dataCenters) {
        ctx.fillStyle = dc.color + "40";
        ctx.beginPath(); ctx.arc(dc.x, dc.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dc.color;
        ctx.beginPath(); ctx.arc(dc.x, dc.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#9B9990";
        ctx.fillText(dc.name, dc.x + (dc.labelDx || 0), dc.y - 12 + (dc.labelDy || 0));
      }

      // Validator dots with pulse
      const leader = leaderRef.current;
      for (let i = 0; i < validators.length; i++) {
        const v = validators[i];
        const isLeader = i === leader;
        const pulse = isLeader ? 4 + Math.sin(frame * 0.08) * 3 : 0;
        if (isLeader) {
          ctx.fillStyle = "#C8F06E20";
          ctx.beginPath(); ctx.arc(v.x, v.y, 12 + pulse, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = isLeader ? "#C8F06E" : v.color;
        ctx.beginPath(); ctx.arc(v.x, v.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isLeader ? "#C8F06E" : "#9B9990";
        ctx.fillText(v.name + (isLeader ? " (LEADER)" : ""), v.x, v.y + 16);
      }

      // Lines from user server to validators
      let leaderLatency = 0;
      for (let i = 0; i < validators.length; i++) {
        const v = validators[i];
        const dist = Math.hypot(d.x - v.x, d.y - v.y);
        const latency = Math.round(dist / 4);
        const color = latency < 10 ? "#5DCAA5" : latency <= 50 ? "#EF9F27" : "#E24B4A";
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = i === leader ? 2 : 1;
        ctx.setLineDash(i === leader ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(v.x, v.y); ctx.stroke();
        ctx.setLineDash([]);
        // Latency label at midpoint
        const mx = (d.x + v.x) / 2, my = (d.y + v.y) / 2;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = color;
        ctx.fillText(`${latency}ms`, mx, my - 6);
        if (i === leader) leaderLatency = latency;
      }

      // Your server dot
      ctx.fillStyle = "#C8F06E40";
      ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#C8F06E";
      ctx.beginPath(); ctx.arc(d.x, d.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#0A0A0E";
      ctx.fillText("YOU", d.x, d.y + 3);

      ctx.restore();

      setLatencyText(`Latency to current leader: ${leaderLatency}ms \u2014 ${leaderLatency < 10 ? "Competitive" : leaderLatency <= 50 ? "Marginal" : "Disadvantaged"}`);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(leaderInterval);
      canvas.removeEventListener("mousedown", handleDown);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleUp);
      canvas.removeEventListener("mouseleave", handleUp);
    };
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Colocation latency visualizer</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 400, borderRadius: 8, border: "1px solid #222228", cursor: "grab", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#141419", border: "1px solid #222228", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: latencyText.includes("Competitive") ? "#5DCAA5" : latencyText.includes("Marginal") ? "#EF9F27" : "#E24B4A" }}>
        {latencyText}
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 8, lineHeight: 1.5 }}>
        Drag the green "YOU" node to see how geographic proximity affects latency to validators. The current leader rotates every 3 seconds.
      </div>
    </div>
  );
}

function StrategyBacktester() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [strategy, setStrategy] = useState("arb");
  const [params, setParams] = useState({ arbSpread: 0.5, arbTip: 25, liqThresh: 110, liqTip: 25, sandSize: 2000, sandSlip: 0.5 });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const runRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); setRunning(false); setResults(null); cancelAnimationFrame(animRef.current); clearTimeout(runRef.current); };

  const seededRandom = (seed) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  };

  const runBacktest = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    setRunning(true);
    setResults(null);

    let spread, tipPct;
    if (strategy === "arb") { spread = params.arbSpread; tipPct = params.arbTip; }
    else if (strategy === "liq") { spread = (params.liqThresh - 100) / 10; tipPct = params.liqTip; }
    else { spread = params.sandSize / 5000; tipPct = 50 - params.sandSlip * 20; }

    const seed = Math.floor(spread * 100 + tipPct);
    const rng = seededRandom(seed);
    const BLOCKS = 30;
    const blocks = [];
    for (let i = 0; i < BLOCKS; i++) {
      const hasOpp = rng() < (0.2 + spread * 0.15);
      const won = hasOpp && rng() < (0.3 + tipPct / 100 * 0.6);
      const profit = won ? +(0.01 + rng() * spread * 0.05).toFixed(4) : 0;
      blocks.push({ hasOpp, won, profit });
    }

    let blockIdx = 0;
    let pnl = 0;
    const pnlData = [0];

    const drawFrame = () => {
      if (pausedRef.current) { runRef.current = setTimeout(() => { animRef.current = requestAnimationFrame(drawFrame); }, 50); return; }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0A0A0E";
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#9B9990";
      ctx.textAlign = "center";
      ctx.fillText(`BACKTEST: ${strategy.toUpperCase()} STRATEGY`, W / 2, 22);

      // Block area
      const blockW = (W - 40) / BLOCKS;
      const blockY = 40, blockH = 80;
      for (let i = 0; i <= blockIdx && i < BLOCKS; i++) {
        const b = blocks[i];
        const x = 20 + i * blockW;
        if (i === blockIdx && i < BLOCKS) {
          // Scanning animation
          ctx.fillStyle = "#C8F06E10";
          ctx.fillRect(x, blockY, blockW - 2, blockH);
          ctx.strokeStyle = "#C8F06E40";
          ctx.strokeRect(x, blockY, blockW - 2, blockH);
        } else {
          ctx.fillStyle = b.won ? "#5DCAA520" : b.hasOpp ? "#E24B4A15" : "#141419";
          ctx.fillRect(x, blockY, blockW - 2, blockH);
          // Icon
          ctx.font = "bold 12px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = b.won ? "#5DCAA5" : b.hasOpp ? "#E24B4A" : "#5F5E58";
          ctx.fillText(b.won ? "\u2713" : b.hasOpp ? "\u2717" : "\u00b7", x + blockW / 2 - 1, blockY + blockH / 2 + 4);
        }
        // Block number
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#5F5E58";
        ctx.textAlign = "center";
        ctx.fillText(`${i + 1}`, x + blockW / 2 - 1, blockY + blockH + 12);
      }

      // P&L chart
      const chartY = 155, chartH = 120;
      ctx.strokeStyle = "#222228";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, chartY + chartH / 2); ctx.lineTo(W - 20, chartY + chartH / 2); ctx.stroke();
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#5F5E58";
      ctx.textAlign = "left";
      ctx.fillText("P&L", 20, chartY - 4);

      if (pnlData.length > 1) {
        const maxAbs = Math.max(0.01, ...pnlData.map(Math.abs));
        ctx.strokeStyle = "#C8F06E";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < pnlData.length; i++) {
          const px = 20 + (i / BLOCKS) * (W - 40);
          const py = chartY + chartH / 2 - (pnlData[i] / maxAbs) * (chartH / 2 - 5);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Fill under
        ctx.lineTo(20 + ((pnlData.length - 1) / BLOCKS) * (W - 40), chartY + chartH / 2);
        ctx.lineTo(20, chartY + chartH / 2);
        ctx.closePath();
        ctx.fillStyle = "#C8F06E08";
        ctx.fill();
      }

      // Stats
      if (blockIdx >= BLOCKS) {
        const opps = blocks.filter(b => b.hasOpp).length;
        const wins = blocks.filter(b => b.won).length;
        const totalProfit = blocks.reduce((s, b) => s + b.profit, 0);
        const winRate = opps > 0 ? Math.round(wins / opps * 100) : 0;
        ctx.font = "bold 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#E8E6E1";
        ctx.textAlign = "center";
        ctx.fillText(`Blocks: ${BLOCKS}  |  Opportunities: ${opps}  |  Won: ${wins}  |  Profit: ${totalProfit.toFixed(4)} SOL  |  Win rate: ${winRate}%`, W / 2, chartY + chartH + 30);
        setResults({ blocks: BLOCKS, opps, wins, profit: totalProfit, winRate });
        setRunning(false);
        return;
      }

      // Advance
      if (blocks[blockIdx]) {
        pnl += blocks[blockIdx].profit;
        pnlData.push(pnl);
      }
      blockIdx++;
      runRef.current = setTimeout(() => { animRef.current = requestAnimationFrame(drawFrame); }, 100 / speedRef.current);
    };

    animRef.current = requestAnimationFrame(drawFrame);
  }, [strategy, params]);

  useEffect(() => {
    return () => { cancelAnimationFrame(animRef.current); clearTimeout(runRef.current); };
  }, []);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Strategy backtester</div>
      {/* Strategy buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["arb", "Arbitrage"], ["liq", "Liquidation"], ["sand", "Sandwich"]].map(([key, label]) => (
          <button key={key} onClick={() => { if (!running) setStrategy(key); }}
            style={{ ...btnStyle, background: strategy === key ? "#C8F06E20" : "#141419", color: strategy === key ? "#C8F06E" : "#9B9990", border: `1px solid ${strategy === key ? "#C8F06E50" : "#222228"}` }}>{label}</button>
        ))}
      </div>
      {/* Parameters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {strategy === "arb" && (
          <>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Min Spread</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{params.arbSpread.toFixed(1)}%</span>
              </div>
              <input type="range" min="0.1" max="2" step="0.1" value={params.arbSpread} onChange={e => setParams(p => ({ ...p, arbSpread: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Tip %</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{params.arbTip}%</span>
              </div>
              <input type="range" min="5" max="50" step="1" value={params.arbTip} onChange={e => setParams(p => ({ ...p, arbTip: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
          </>
        )}
        {strategy === "liq" && (
          <>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Health Threshold</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{params.liqThresh}%</span>
              </div>
              <input type="range" min="100" max="120" step="1" value={params.liqThresh} onChange={e => setParams(p => ({ ...p, liqThresh: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Tip %</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{params.liqTip}%</span>
              </div>
              <input type="range" min="5" max="50" step="1" value={params.liqTip} onChange={e => setParams(p => ({ ...p, liqTip: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
          </>
        )}
        {strategy === "sand" && (
          <>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Min Victim Size</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>${params.sandSize.toLocaleString()}</span>
              </div>
              <input type="range" min="100" max="10000" step="100" value={params.sandSize} onChange={e => setParams(p => ({ ...p, sandSize: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9B9990" }}>Slippage Buffer</span>
                <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700 }}>{params.sandSlip.toFixed(1)}%</span>
              </div>
              <input type="range" min="0.1" max="2" step="0.1" value={params.sandSlip} onChange={e => setParams(p => ({ ...p, sandSlip: +e.target.value }))} style={{ width: "100%", accentColor: "#C8F06E" }} />
            </div>
          </>
        )}
      </div>
      <button onClick={runBacktest} disabled={running}
        style={{ ...btnStyle, marginBottom: 14, background: running ? "#141419" : "#C8F06E20", color: running ? "#5F5E58" : "#C8F06E", border: `1px solid ${running ? "#222228" : "#C8F06E50"}` }}>
        {running ? "Running..." : "Run Backtest"}
      </button>
      <canvas ref={canvasRef} style={{ width: "100%", height: 310, borderRadius: 8, border: "1px solid #222228", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      {results && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#141419", border: "1px solid #222228", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: results.profit > 0 ? "#5DCAA5" : "#E24B4A" }}>
          Final: {results.wins}/{results.opps} won ({results.winRate}%) | Profit: {results.profit.toFixed(4)} SOL across {results.blocks} blocks
        </div>
      )}
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 8, lineHeight: 1.5 }}>
        Adjust parameters and run the backtest. Higher tip % improves win rate but reduces profit per trade. Results are deterministic per parameter set.
      </div>
    </div>
  );
}

function FirstPriceAuction() {
  const OPP_VALUE = 0.10;
  const aiRanges = [
    [0.03, 0.05], [0.04, 0.06], [0.05, 0.07], [0.06, 0.08], [0.07, 0.09]
  ];
  const [round, setRound] = useState(1);
  const [bid, setBid] = useState(0.04);
  const [revealed, setRevealed] = useState(false);
  const [aiBids, setAiBids] = useState([0, 0, 0]);
  const [roundWinner, setRoundWinner] = useState(null);
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(false);

  const submitBid = () => {
    const range = aiRanges[round - 1];
    const bids = [0, 1, 2].map(() => +(range[0] + Math.random() * (range[1] - range[0])).toFixed(3));
    setAiBids(bids);
    const all = [{ name: "You", bid }, { name: "Searcher A", bid: bids[0] }, { name: "Searcher B", bid: bids[1] }, { name: "Searcher C", bid: bids[2] }];
    all.sort((a, b) => b.bid - a.bid);
    const w = all[0];
    setRoundWinner(w);
    const yourProfit = w.name === "You" ? +(OPP_VALUE - bid).toFixed(4) : 0;
    setHistory(prev => [...prev, { round, winner: w.name, yourBid: bid, yourProfit }]);
    setRevealed(true);
  };

  const nextRound = () => {
    if (round >= 5) { setDone(true); return; }
    setRound(r => r + 1);
    setRevealed(false);
    setRoundWinner(null);
    setBid(0.04);
  };

  const restart = () => {
    setRound(1); setBid(0.04); setRevealed(false); setRoundWinner(null); setHistory([]); setDone(false);
  };

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };
  const totalProfit = history.reduce((s, h) => s + h.yourProfit, 0);

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5 }}>First-price sealed-bid auction</span>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#7F77DD" }}>Round {round}/5</span>
      </div>
      {!done ? (
        <>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#141419", border: "1px solid #222228", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "#E8E6E1" }}>Arb opportunity worth </span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E" }}>0.10 SOL</span>
          </div>
          {/* Bidders */}
          {["You", "Searcher A", "Searcher B", "Searcher C"].map((name, i) => {
            const isUser = i === 0;
            const bidVal = isUser ? bid : (revealed ? aiBids[i - 1] : null);
            const isWinner = revealed && roundWinner && roundWinner.name === name;
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 4, borderRadius: 8, background: revealed ? (isWinner ? "#5DCAA510" : "#141419") : "#141419", border: `1px solid ${revealed ? (isWinner ? "#5DCAA550" : "#222228") : "#222228"}`, transition: "all 0.3s" }}>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: isUser ? "#C8F06E" : "#9B9990", fontWeight: 600, width: 90 }}>{name}</span>
                {isUser ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="range" min="0.01" max="0.09" step="0.005" value={bid} onChange={e => { if (!revealed) setBid(+e.target.value); }} style={{ flex: 1, accentColor: "#C8F06E" }} />
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#C8F06E", fontWeight: 700, width: 60, textAlign: "right" }}>{bid.toFixed(3)}</span>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: revealed ? (isWinner ? "#5DCAA5" : "#E8E6E1") : "#5F5E58", fontWeight: revealed ? 700 : 400, transition: "all 0.3s" }}>
                      {bidVal !== null ? bidVal.toFixed(3) + " SOL" : "???"}
                    </span>
                  </div>
                )}
                {revealed && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? "#5DCAA5" : "#E24B4A" }}>{isWinner ? "\u2713" : "\u2717"}</span>
                )}
              </div>
            );
          })}
          {/* Result */}
          {revealed && (
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: roundWinner.name === "You" ? "#5DCAA510" : "#E24B4A10", border: `1px solid ${roundWinner.name === "You" ? "#5DCAA530" : "#E24B4A30"}`, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: roundWinner.name === "You" ? "#5DCAA5" : "#E24B4A" }}>
              {roundWinner.name === "You" ? `Won! Profit: ${(OPP_VALUE - bid).toFixed(4)} SOL` : `Outbid by ${roundWinner.name} (${roundWinner.bid.toFixed(3)} SOL)`}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {!revealed && <button onClick={submitBid} style={{ ...btnStyle, background: "#C8F06E20", color: "#C8F06E", border: "1px solid #C8F06E50" }}>Submit Bid</button>}
            {revealed && !done && <button onClick={nextRound} style={{ ...btnStyle, background: "#C8F06E20", color: "#C8F06E", border: "1px solid #C8F06E50" }}>{round >= 5 ? "See Results" : "Next Round"}</button>}
          </div>
        </>
      ) : (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E6E1", marginBottom: 12 }}>Auction Complete</div>
          {history.map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", marginBottom: 2, borderRadius: 6, background: "#141419", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: "#9B9990" }}>Round {h.round}</span>
              <span style={{ color: h.winner === "You" ? "#5DCAA5" : "#E24B4A" }}>{h.winner === "You" ? `Won +${h.yourProfit.toFixed(4)}` : `Lost to ${h.winner}`}</span>
              <span style={{ color: "#5F5E58" }}>Bid: {h.yourBid.toFixed(3)}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: totalProfit > 0 ? "#5DCAA510" : "#E24B4A10", border: `1px solid ${totalProfit > 0 ? "#5DCAA530" : "#E24B4A30"}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: totalProfit > 0 ? "#5DCAA5" : "#E24B4A" }}>Total profit: {totalProfit.toFixed(4)} SOL</span>
          </div>
          <button onClick={restart} style={{ ...btnStyle, marginTop: 10 }}>Restart</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={restart}>↻</button>
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 10, lineHeight: 1.5 }}>
        AI bids escalate each round. By round 5, margins are razor-thin — illustrating the winner's curse in MEV auctions.
      </div>
    </div>
  );
}

function SlippageProtection() {
  const [slippage, setSlippage] = useState(1.0);
  const [highVol, setHighVol] = useState(false);

  const volPenalty = highVol ? 15 : 0;
  const executionRate = slippage < 0.5 ? Math.max(40, 60 + slippage * 20 - volPenalty) : Math.min(99, 80 + slippage * 4 - volPenalty);
  const sandwichRisk = Math.min(100, slippage * 20);
  const mevLoss = +(0.05 + slippage * 1.2).toFixed(2);
  const tiltDeg = (slippage - 2.5) * 4;
  const isRecommended = slippage >= 0.5 && slippage <= 1.0;

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Slippage protection tradeoff</div>
      {/* Balance beam */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 20, position: "relative", height: 80 }}>
        {/* Pivot */}
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderBottom: "16px solid #222228" }} />
        {/* Beam */}
        <div style={{ width: "80%", height: 6, borderRadius: 3, background: "linear-gradient(90deg, #5DCAA5, #222228 45%, #222228 55%, #E24B4A)", transform: `rotate(${tiltDeg}deg)`, transition: "transform 0.3s ease", position: "relative" }}>
          {/* Left label */}
          <div style={{ position: "absolute", left: -10, top: -28, textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{"\u26E8"}</div>
            <div style={{ fontSize: 9, color: "#5DCAA5", fontFamily: "'JetBrains Mono', monospace" }}>Protection</div>
          </div>
          {/* Right label */}
          <div style={{ position: "absolute", right: -10, top: -28, textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{"\u26A1"}</div>
            <div style={{ fontSize: 9, color: "#EF9F27", fontFamily: "'JetBrains Mono', monospace" }}>Execution</div>
          </div>
        </div>
      </div>
      {/* Slider with recommended zone */}
      <div style={{ position: "relative", marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#9B9990" }}>Slippage Tolerance</span>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: isRecommended ? "#5DCAA5" : "#E8E6E1", fontWeight: 700 }}>{slippage.toFixed(1)}%{isRecommended ? " (recommended)" : ""}</span>
        </div>
        {/* Recommended zone indicator */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: `${((0.5 - 0.1) / 4.9) * 100}%`, width: `${((1.0 - 0.5) / 4.9) * 100}%`, height: 4, background: "#5DCAA530", borderRadius: 2, top: -2 }} />
          <input type="range" min="0.1" max="5" step="0.1" value={slippage} onChange={e => setSlippage(+e.target.value)} style={{ width: "100%", accentColor: "#C8F06E" }} />
        </div>
      </div>
      {/* Volatility toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#9B9990" }}>Volatility:</span>
        <button onClick={() => setHighVol(false)} style={{ fontSize: 11, padding: "3px 12px", borderRadius: 6, border: `1px solid ${!highVol ? "#5DCAA550" : "#222228"}`, background: !highVol ? "#5DCAA510" : "#141419", color: !highVol ? "#5DCAA5" : "#5F5E58", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Low</button>
        <button onClick={() => setHighVol(true)} style={{ fontSize: 11, padding: "3px 12px", borderRadius: 6, border: `1px solid ${highVol ? "#EF9F2750" : "#222228"}`, background: highVol ? "#EF9F2710" : "#141419", color: highVol ? "#EF9F27" : "#5F5E58", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>High</button>
      </div>
      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <div style={{ background: "#141419", borderRadius: 8, padding: "10px 12px", border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, color: "#5F5E58", textTransform: "uppercase" }}>Execution Rate</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: executionRate > 90 ? "#5DCAA5" : executionRate > 75 ? "#EF9F27" : "#E24B4A" }}>{Math.round(executionRate)}%</div>
        </div>
        <div style={{ background: "#141419", borderRadius: 8, padding: "10px 12px", border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, color: "#5F5E58", textTransform: "uppercase" }}>Sandwich Risk</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#222228", overflow: "hidden" }}>
              <div style={{ width: `${sandwichRisk}%`, height: "100%", borderRadius: 4, background: sandwichRisk > 60 ? "#E24B4A" : sandwichRisk > 30 ? "#EF9F27" : "#5DCAA5", transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: sandwichRisk > 60 ? "#E24B4A" : sandwichRisk > 30 ? "#EF9F27" : "#5DCAA5", fontWeight: 700, width: 36 }}>{sandwichRisk > 60 ? "HIGH" : sandwichRisk > 30 ? "MED" : "LOW"}</span>
          </div>
        </div>
        <div style={{ background: "#141419", borderRadius: 8, padding: "10px 12px", border: "1px solid #222228" }}>
          <div style={{ fontSize: 10, color: "#5F5E58", textTransform: "uppercase" }}>Avg MEV Loss</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: mevLoss > 3 ? "#E24B4A" : mevLoss > 1 ? "#EF9F27" : "#5DCAA5" }}>${mevLoss}</div>
          <div style={{ fontSize: 9, color: "#5F5E58" }}>per trade</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => { setSlippage(1.0); setHighVol(false); }}>↻</button>
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 10, lineHeight: 1.5 }}>
        Lower slippage protects against sandwich attacks but reduces execution probability. The recommended zone is 0.5-1.0%. Toggle high volatility to see how market conditions affect the tradeoff.
      </div>
    </div>
  );
}

function PrivateTransactionViz() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [animState, setAnimState] = useState("idle");
  const stateRef = useRef({ phase: "idle", t: 0 });
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); stateRef.current = { phase: "idle", t: 0 }; setAnimState("idle"); setRestartKey(k => k + 1); };

  const startAnim = useCallback(() => {
    stateRef.current = { phase: "emit", t: 0 };
    setAnimState("running");
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
    const MID = W / 2;

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0A0A0E";
      ctx.fillRect(0, 0, W, H);

      // Divider
      ctx.strokeStyle = "#222228";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(MID, 30); ctx.lineTo(MID, H - 30); ctx.stroke();
      ctx.setLineDash([]);

      // Headers
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#E24B4A";
      ctx.fillText("PUBLIC TRANSACTION", MID / 2, 22);
      ctx.fillStyle = "#5DCAA5";
      ctx.fillText("PRIVATE TRANSACTION (JITO)", MID + MID / 2, 22);

      const drawNode = (x, y, label, color, r) => {
        ctx.fillStyle = color + "30";
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText(label, x, y + r + 14);
      };

      // === LEFT SIDE: Public ===
      const userPubX = 60, userPubY = 80;
      const bot1 = { x: 50, y: 200 }, bot2 = { x: 120, y: 220 }, bot3 = { x: 180, y: 195 };
      const blockPubX = 120, blockPubY = 340;
      drawNode(userPubX, userPubY, "User", "#5DCAA5", 10);
      drawNode(bot1.x, bot1.y, "Bot 1", "#E24B4A", 7);
      drawNode(bot2.x, bot2.y, "Bot 2", "#E24B4A", 7);
      drawNode(bot3.x, bot3.y, "Bot 3", "#E24B4A", 7);
      drawNode(blockPubX, blockPubY, "Block", "#9B9990", 10);

      // === RIGHT SIDE: Private ===
      const userPrivX = MID + 60, userPrivY = 80;
      const engineX = MID + 140, engineY = 200;
      const validatorX = MID + 140, validatorY = 340;
      const privBot1 = { x: MID + 50, y: 210 }, privBot2 = { x: MID + 200, y: 220 };
      drawNode(userPrivX, userPrivY, "User", "#5DCAA5", 10);
      drawNode(engineX, engineY, "Block Engine", "#7F77DD", 12);
      drawNode(validatorX, validatorY, "Validator", "#EF9F27", 10);
      // Dim bots
      ctx.globalAlpha = 0.25;
      drawNode(privBot1.x, privBot1.y, "Bot 1", "#E24B4A", 6);
      drawNode(privBot2.x, privBot2.y, "Bot 2", "#E24B4A", 6);
      ctx.globalAlpha = 1;

      if (s.phase !== "idle") {
        s.t += 1 * speedRef.current;
        const progress = Math.min(1, s.t / 90);

        // LEFT: expanding ring (public broadcast)
        if (progress < 0.4) {
          const ringR = (progress / 0.4) * 160;
          ctx.strokeStyle = "#5DCAA540";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(userPubX, userPubY, ringR, 0, Math.PI * 2); ctx.stroke();

          // Bots detect when ring reaches them
          for (const bot of [bot1, bot2, bot3]) {
            const distToUser = Math.hypot(bot.x - userPubX, bot.y - userPubY);
            if (ringR >= distToUser) {
              ctx.strokeStyle = "#E24B4A60";
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.lineTo(userPubX, userPubY); ctx.stroke();
              ctx.font = "8px 'JetBrains Mono', monospace";
              ctx.fillStyle = "#E24B4A";
              ctx.textAlign = "center";
              ctx.fillText("DETECTED", bot.x, bot.y - 14);
            }
          }
        }

        // LEFT: bots converge (sandwich)
        if (progress >= 0.4 && progress < 0.75) {
          const attackP = (progress - 0.4) / 0.35;
          for (const bot of [bot1, bot2, bot3]) {
            const ax = bot.x + (blockPubX - bot.x) * attackP;
            const ay = bot.y + (blockPubY - bot.y) * attackP;
            ctx.fillStyle = "#E24B4A";
            ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.fill();
          }
          // User tx also moves to block
          const ux = userPubX + (blockPubX - userPubX) * attackP;
          const uy = userPubY + (blockPubY - userPubY) * attackP;
          ctx.fillStyle = "#5DCAA5";
          ctx.beginPath(); ctx.arc(ux, uy, 4, 0, Math.PI * 2); ctx.fill();
        }

        // LEFT: result
        if (progress >= 0.75) {
          ctx.font = "bold 12px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#E24B4A";
          ctx.textAlign = "center";
          ctx.fillText("Sandwiched \u2014 Lost: $8.67", MID / 2, H - 40);
        }

        // RIGHT: private tunnel
        if (progress < 0.5) {
          const tunnelP = progress / 0.5;
          // Dashed tunnel line
          ctx.strokeStyle = "#7F77DD60";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.moveTo(userPrivX, userPrivY); ctx.lineTo(engineX, engineY); ctx.stroke();
          ctx.setLineDash([]);
          // Tx particle through tunnel
          const tx = userPrivX + (engineX - userPrivX) * tunnelP;
          const ty = userPrivY + (engineY - userPrivY) * tunnelP;
          ctx.fillStyle = "#5DCAA5";
          ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill();
          // Lock icon
          ctx.font = "10px sans-serif";
          ctx.fillText("\uD83D\uDD12", (userPrivX + engineX) / 2, (userPrivY + engineY) / 2 - 10);
          // Dim scanners
          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#5F5E58";
          ctx.textAlign = "center";
          ctx.fillText("NO SIGNAL", privBot1.x, privBot1.y - 12);
          ctx.fillText("NO SIGNAL", privBot2.x, privBot2.y - 12);
        }

        // RIGHT: engine to validator
        if (progress >= 0.5 && progress < 0.85) {
          const relP = (progress - 0.5) / 0.35;
          ctx.strokeStyle = "#7F77DD40";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(engineX, engineY); ctx.lineTo(validatorX, validatorY); ctx.stroke();
          const tx2 = engineX + (validatorX - engineX) * relP;
          const ty2 = engineY + (validatorY - engineY) * relP;
          ctx.fillStyle = "#5DCAA5";
          ctx.beginPath(); ctx.arc(tx2, ty2, 4, 0, Math.PI * 2); ctx.fill();
        }

        // RIGHT: result
        if (progress >= 0.85) {
          ctx.font = "bold 12px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#5DCAA5";
          ctx.textAlign = "center";
          ctx.fillText("Clean execution \u2014 Tip: $0.001", MID + MID / 2, H - 40);
        }

        if (s.t >= 90) {
          s.phase = "done";
          setAnimState("done");
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [restartKey]);

  const btnStyle = { fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5 }}>Public vs private transaction</span>
        <button onClick={startAnim}
          style={{ ...btnStyle, background: animState === "idle" || animState === "done" ? "#C8F06E20" : "#141419", color: animState === "idle" || animState === "done" ? "#C8F06E" : "#5F5E58", border: `1px solid ${animState === "idle" || animState === "done" ? "#C8F06E50" : "#222228"}` }}>
          {animState === "idle" ? "Play" : animState === "done" ? "Replay" : "Running..."}
        </button>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 420, borderRadius: 8, border: "1px solid #222228", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "\u25B6" : "\u23F8"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 10, lineHeight: 1.5 }}>
        Public transactions broadcast to the network where bots can detect and sandwich them. Private transactions go through Jito's block engine directly to the validator, invisible to searcher bots.
      </div>
    </div>
  );
}

function MEVBotArchitectBuilder() {
  const components = [
    { id: "rpc", label: "RPC Node", cost: 100, warning: "Cannot observe chain state" },
    { id: "geyser", label: "Geyser Plugin", cost: 200, warning: "Using RPC polling \u2014 100x slower than streaming" },
    { id: "pricefeed", label: "Price Feed", cost: 50, warning: "Cannot detect cross-venue arbitrage" },
    { id: "strategy", label: "Strategy Engine", cost: 0, warning: "No opportunity detection logic" },
    { id: "bundler", label: "Bundle Submitter", cost: 150, warning: "Raw tx submission \u2014 high failure rate" },
    { id: "monitor", label: "Monitoring", cost: 50, warning: "Won't detect failures or missed opportunities" },
  ];
  const colors = ["#5DCAA5", "#7F77DD", "#EF9F27", "#C8F06E", "#378ADD", "#D4537E"];

  const [selected, setSelected] = useState(() => new Set(components.map(c => c.id)));

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalCost = components.filter(c => selected.has(c.id)).reduce((s, c) => s + c.cost, 0);
  const allSelected = selected.size === components.length;
  const warnings = components.filter(c => !selected.has(c.id));

  return (
    <div style={{ marginBottom: 24, background: "#0A0A0E", borderRadius: 10, padding: "18px 20px", border: "1px solid #222228" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9990", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>MEV bot architecture builder</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {/* Left: component cards */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#5F5E58", textTransform: "uppercase", marginBottom: 8 }}>Components</div>
          {components.map((c, i) => {
            const active = selected.has(c.id);
            const color = colors[i];
            return (
              <div key={c.id} onClick={() => toggle(c.id)} style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, border: `1px solid ${active ? color + "50" : "#222228"}`, background: active ? color + "10" : "#141419", cursor: "pointer", transition: "all 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: active ? color : "#5F5E58", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: "#5F5E58" }}>{c.cost === 0 ? "Free" : `$${c.cost}/mo`}</div>
                </div>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${active ? color : "#5F5E58"}`, background: active ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0A0A0E", fontWeight: 700 }}>
                  {active ? "\u2713" : ""}
                </div>
              </div>
            );
          })}
        </div>
        {/* Center: pipeline */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#5F5E58", textTransform: "uppercase", marginBottom: 8 }}>Pipeline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {components.map((c, i) => {
              const active = selected.has(c.id);
              const color = colors[i];
              return (
                <div key={c.id}>
                  <div style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${active ? color + "40" : "#222228"}`, background: active ? color + "08" : "transparent", borderStyle: active ? "solid" : "dashed", opacity: active ? 1 : 0.35, transition: "all 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: active ? color : "#5F5E58" }} />
                      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: active ? "#E8E6E1" : "#5F5E58", fontWeight: 600 }}>{c.label}</span>
                      {!active && <span style={{ fontSize: 9, color: "#E24B4A", marginLeft: "auto" }}>MISSING</span>}
                    </div>
                  </div>
                  {i < components.length - 1 && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                      <div style={{ fontSize: 14, color: active && selected.has(components[i + 1].id) ? "#9B9990" : "#5F5E58", opacity: active ? 1 : 0.3 }}>{"\u2193"}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {warnings.map(c => (
                <div key={c.id} style={{ padding: "6px 10px", marginBottom: 3, borderRadius: 6, background: "#E24B4A08", border: "1px solid #E24B4A20", fontSize: 11, color: "#E24B4A", fontFamily: "'JetBrains Mono', monospace" }}>
                  {"\u26A0"} No {c.label}: {c.warning}
                </div>
              ))}
            </div>
          )}
          {allSelected && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#5DCAA510", border: "1px solid #5DCAA530", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#5DCAA5", textAlign: "center" }}>
              Complete Architecture {"\u2713"}
            </div>
          )}
        </div>
      </div>
      {/* Cost */}
      <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#141419", border: "1px solid #222228", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#9B9990" }}>Infrastructure cost</span>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#E8E6E1" }}>${totalCost}/month</span>
      </div>
      <div style={{ fontSize: 11, color: "#5F5E58", marginTop: 10, lineHeight: 1.5 }}>
        Toggle components on/off to see how each piece affects the pipeline. All components are needed for a competitive MEV bot — removing any one creates a significant disadvantage.
      </div>
    </div>
  );
}

function HLOrderFlow() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const handleRestart = () => { setPaused(false); setRestartKey(k => k + 1); };

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

    const nodes = [
      { label: "Trader", sub: "EIP-712 action", x: W * 0.10, y: H / 2, color: "#5DCAA5", icon: "T" },
      { label: "Validators", sub: "no public mempool", x: W * 0.37, y: H / 2, color: "#EF9F27", icon: "V" },
      { label: "HyperBFT", sub: "deterministic order", x: W * 0.64, y: H / 2, color: "#7F77DD", icon: "H" },
      { label: "Matching engine", sub: "price-time priority", x: W * 0.89, y: H / 2, color: "#E24B4A", icon: "M" },
    ];
    const stages = [
      "Trader signs an EIP-712 action and POSTs it to /exchange",
      "A validator receives it directly — no public pending-order mempool to observe",
      "HyperBFT sequences actions deterministically (cancels ordered before taker orders)",
      "Filled at price-time priority — single-slot finality, no bundle auction, no validator tips",
    ];

    let particles = [];
    let frame = 0, lastEmit = -999, stageIdx = 0, msgTimer = 0;

    const draw = () => {
      if (pausedRef.current) { animRef.current = requestAnimationFrame(draw); return; }
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F"; ctx.fillRect(0, 0, W, H);

      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#888780"; ctx.textAlign = "center";
      ctx.fillText("HYPERLIQUID ORDER FLOW", W / 2, 22);

      ctx.strokeStyle = "#2A2A30"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      for (let i = 0; i < nodes.length - 1; i++) {
        ctx.beginPath(); ctx.moveTo(nodes[i].x + 26, nodes[i].y); ctx.lineTo(nodes[i + 1].x - 26, nodes[i + 1].y); ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const n of nodes) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 36);
        g.addColorStop(0, n.color + "18"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(n.x - 36, n.y - 36, 72, 72);
        ctx.fillStyle = "#1A1A20"; ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "bold 16px 'JetBrains Mono', monospace"; ctx.fillStyle = n.color; ctx.textBaseline = "middle";
        ctx.fillText(n.icon, n.x, n.y);
        ctx.textBaseline = "alphabetic"; ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = n.color; ctx.fillText(n.label, n.x, n.y + 42);
        ctx.font = "8px 'JetBrains Mono', monospace"; ctx.fillStyle = "#6B6A64"; ctx.fillText(n.sub, n.x, n.y + 54);
      }

      if (frame - lastEmit > Math.round(220 / speedRef.current)) {
        lastEmit = frame; stageIdx = 0; msgTimer = 80;
        particles.push({ x: nodes[0].x + 26, y: nodes[0].y, targetIdx: 1, color: "#5DCAA5", label: "order", speed: 1.6 });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const target = nodes[p.targetIdx];
        const dx = target.x - p.x, dy = target.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < 28) {
          if (p.targetIdx < nodes.length - 1) {
            stageIdx = p.targetIdx; msgTimer = 80;
            p.x = target.x + 26; p.targetIdx += 1; p.color = target.color;
          } else { stageIdx = 3; msgTimer = 90; particles.splice(i, 1); }
        } else {
          p.x += (dx / dist) * p.speed * speedRef.current;
          p.y += (dy / dist) * p.speed * speedRef.current;
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.font = "8px 'JetBrains Mono', monospace"; ctx.fillText(p.label, p.x, p.y - 10);
          ctx.fillStyle = p.color + "30"; ctx.beginPath(); ctx.arc(p.x - (dx / dist) * 8, p.y - (dy / dist) * 8, 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (msgTimer > 0) {
        msgTimer--;
        ctx.globalAlpha = Math.min(1, msgTimer / 25);
        ctx.font = "11px 'JetBrains Mono', monospace"; ctx.fillStyle = nodes[Math.min(stageIdx + 1, 3)].color; ctx.textAlign = "center";
        ctx.fillText(stages[stageIdx], W / 2, H / 2 + 78);
        ctx.globalAlpha = 1;
      }

      const noteY = H - 78;
      ctx.fillStyle = "#1A1A20"; ctx.beginPath(); ctx.roundRect(30, noteY, W - 60, 62, 8); ctx.fill();
      ctx.strokeStyle = "#2A2A30"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "9px 'JetBrains Mono', monospace"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
      ctx.fillText("WHY THERE IS NO JITO-STYLE BUNDLE AUCTION", W / 2, noteY + 18);
      ctx.font = "10px 'JetBrains Mono', monospace"; ctx.fillStyle = "#9B9990";
      ctx.fillText("No public mempool to bid on  ·  ordering is fixed by protocol, not bought", W / 2, noteY + 36);
      ctx.fillText("native priority fees are burned, not paid to validators as tips", W / 2, noteY + 50);

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [restartKey]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Order flow simulator</div>
      <canvas ref={canvasRef} style={{ width: "100%", height: 440, borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={handleRestart}>↻</button>
        <button style={paused ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setPaused(p => !p)}>{paused ? "▶" : "⏸"}</button>
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {[0.5, 1, 2].map(s => (
            <button key={s} style={speed === s ? { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #C8F06E", background: "#C8F06E", color: "#0C0C0F", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" } : { fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #222228", background: "#141419", color: "#E8E6E1", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setSpeed(s)}>{s}x</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ section }) {
  switch (section.type) {
    case "text": return <TextBlock content={section.content} />;
    case "code": return <CodeBlock title={section.title} code={section.code} language={section.language} />;
    case "stats": return <StatsGrid items={section.items} />;
    case "diagram": return <DiagramFlow title={section.title} items={section.items} />;
    case "concepts": return <ConceptCards items={section.items} />;
    case "mev-table": return <MEVTable strategies={section.strategies} />;
    case "supply-chain": return <SupplyChain actors={section.actors} />;
    case "infra-stack": return <InfraStack layers={section.layers} />;
    case "roadmap": return <Roadmap weeks={section.weeks} />;
    case "quiz": return <Quiz {...section} />;
    case "interactive":
      if (section.widget === "slot-visualizer") return <SlotVisualizer />;
      if (section.widget === "tip-optimizer") return <TipOptimizer />;
      if (section.widget === "sandwich-attack") return <SandwichAttackAnimator />;
      if (section.widget === "mev-heatmap") return <MEVExtractionHeatmap />;
      if (section.widget === "leader-schedule") return <LeaderSchedulePredictor />;
      if (section.widget === "arb-detector") return <ArbOpportunityDetector />;
      if (section.widget === "liquidation-cascade") return <LiquidationCascade />;
      if (section.widget === "cross-venue-arb") return <ArbOpportunityDetector />;
      if (section.widget === "builder-code-optimizer") return <TipOptimizer />;
      if (section.widget === "order-flow") return <HLOrderFlow />;
      if (section.widget === "supply-chain-flow") return <SupplyChainFlow />;
      if (section.widget === "jito-bundle-builder") return <JitoBundleBuilder />;
      if (section.widget === "colocation-latency") return <ColocationLatencyViz />;
      if (section.widget === "strategy-backtester") return <StrategyBacktester />;
      if (section.widget === "first-price-auction") return <FirstPriceAuction />;
      if (section.widget === "slippage-protection") return <SlippageProtection />;
      if (section.widget === "private-tx-viz") return <PrivateTransactionViz />;
      if (section.widget === "mev-bot-builder") return <MEVBotArchitectBuilder />;
      return null;
    default: return null;
  }
}

/* ===== MAIN APP ===== */

const PROGRESS_KEY = "soledu-hl-mev-progress";

export default function HyperliquidCourse() {
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
          <Link to="/" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2, display: "block" }}>← SOLEDU</Link>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>Hyperliquid MEV</div>
          <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(progress.size / MODULES.length) * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, fontFamily: "var(--mono)" }}>{progress.size}/{MODULES.length} modules explored</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {MODULES.map((m, i) => (
            <div key={i} onClick={() => handleModuleSelect(i)}
              style={{
                padding: "10px 20px", cursor: "pointer", transition: "all 0.1s", display: "flex", alignItems: "center", gap: 12,
                background: i === activeModule ? "var(--accent-dim)" : "transparent",
                borderRight: i === activeModule ? `2px solid var(--accent)` : "2px solid transparent",
              }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: progress.has(i) ? "var(--accent)" : "var(--border)",
                color: progress.has(i) ? "var(--bg-primary)" : "var(--text-tertiary)",
              }}>{m.num}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: i === activeModule ? 700 : 500, color: i === activeModule ? "var(--accent)" : "var(--text-primary)" }}>{m.title}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{m.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
          a deep dive into Hyperliquid MEV
        </div>
      </nav>

      {/* Main content */}
      <main ref={contentRef} style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
        {/* Mobile header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-primary)", zIndex: 50 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer", padding: 4, display: "flex" }}>☰</button>
          <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>{mod.num}</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{mod.title}</span>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* Module header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--accent)", opacity: 0.15, lineHeight: 1 }}>{mod.num}</div>
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
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--accent)40", background: "var(--accent-dim)", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--body)" }}>
                {MODULES[activeModule + 1].title} →
              </button>
            ) : (
              <div style={{ padding: "10px 20px", borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
                Course complete ✓
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
