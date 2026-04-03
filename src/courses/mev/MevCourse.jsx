import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-python";

const MODULES = [
  {
    id: "intro",
    num: "00",
    title: "What is MEV?",
    subtitle: "The invisible tax on every trade",
    sections: [
      {
        type: "text",
        content: `**Maximal Extractable Value (MEV)** is the profit that block producers or searchers can capture by strategically ordering, inserting, or censoring transactions within a block.\n\nOriginally called "Miner Extractable Value" on Ethereum, the concept was first formalized by Phil Daian et al. in 2019. On Solana, MEV operates differently due to the absence of a traditional mempool and the network's sub-second slot times.\n\nThink of it this way: every time you submit a swap on a DEX, you're broadcasting a signal about what you're willing to pay. Sophisticated actors—called **searchers**—detect these signals and race to extract profit from the resulting price movements.`
      },
      {
        type: "diagram",
        title: "The MEV food chain",
        items: [
          { label: "You", desc: "Submit a swap on Raydium", color: "#5DCAA5" },
          { label: "Searcher", desc: "Detects your tx, builds a bundle", color: "#EF9F27" },
          { label: "Block engine", desc: "Jito auctions bundle inclusion", color: "#7F77DD" },
          { label: "Validator", desc: "Includes highest-tip bundle", color: "#E24B4A" },
        ]
      },
      {
        type: "stats",
        items: [
          { label: "MEV extracted on Solana (2025)", value: "$720M+" },
          { label: "Jito validator adoption", value: "92% stake" },
          { label: "Avg sandwich profit per tx", value: "~$8.67" },
          { label: "Failed MEV txs (pre-Jito)", value: ">98%" },
        ]
      },
      {
        type: "text",
        content: `MEV isn't inherently "bad"—arbitrage MEV improves price consistency across venues. But sandwich attacks and front-running extract value directly from users. Understanding MEV is essential whether you want to capture it, defend against it, or build protocols that minimize it.`
      },
      {
        type: "interactive",
        widget: "sandwich-attack"
      },
      {
        type: "interactive",
        widget: "mev-heatmap"
      },
      {
        type: "quiz",
        question: "Why is MEV on Solana fundamentally different from Ethereum?",
        options: [
          "Solana has lower fees",
          "Solana has no global mempool and ~400ms slot times",
          "Solana uses Proof of Work",
          "Solana doesn't have MEV",
        ],
        correct: 1,
        explanation: "Solana's lack of a global mempool means searchers can't observe pending transactions the same way. Combined with ~400ms slots (vs Ethereum's 12 seconds), MEV on Solana is an infrastructure speed race, not a gas auction."
      }
    ]
  },
  {
    id: "solana-arch",
    num: "01",
    title: "Solana's Architecture",
    subtitle: "Why the chain's design shapes MEV",
    sections: [
      {
        type: "text",
        content: `To understand MEV on Solana, you need to understand four architectural features that make it radically different from Ethereum:`
      },
      {
        type: "concepts",
        items: [
          {
            title: "Proof of History (PoH)",
            body: "A cryptographic clock that timestamps transactions before consensus. Each validator maintains a sequential hash chain, creating a verifiable ordering of events. This means transaction ordering within a slot is determined by arrival time to the leader, not by gas price.",
            icon: "⏱"
          },
          {
            title: "Leader schedule",
            body: "Validators take turns producing blocks in a predetermined schedule. Each leader produces 4 consecutive slots (~1.6 seconds total). The schedule is known ~2 epochs in advance. MEV searchers use this to predict which validator to target and optimize geographic proximity.",
            icon: "📋"
          },
          {
            title: "Sealevel (parallel execution)",
            body: "Solana's runtime executes non-conflicting transactions in parallel. Transactions that touch different accounts can run simultaneously. This means MEV bots monitoring one DEX pool don't necessarily compete with bots monitoring another—unless the pools share accounts.",
            icon: "⚡"
          },
          {
            title: "No global mempool",
            body: "Unlike Ethereum, Solana has no public pending transaction pool. Transactions go directly to the current leader via QUIC (formerly UDP). This means traditional front-running by watching the mempool doesn't work. Instead, MEV happens through private mempools, Jito bundles, and direct observation of on-chain state changes.",
            icon: "🔒"
          }
        ]
      },
      {
        type: "code",
        title: "Slot timing — the fundamental constraint",
        language: "rust",
        code: `// Solana slot structure
// Each slot: ~400ms
// Each leader: 4 consecutive slots (~1.6s)
// Leader rotation: every 4 slots

// Your MEV bot's budget per opportunity:
const SLOT_DURATION_MS: u64 = 400;
const DETECT_BUDGET_MS: u64 = 10;   // State change → opportunity identified
const SIMULATE_BUDGET_MS: u64 = 20; // Verify tx would succeed
const BUILD_BUDGET_MS: u64 = 10;    // Construct bundle
const SUBMIT_BUDGET_MS: u64 = 15;   // Send to Jito block engine
// Total: ~55ms — leaves ~345ms for network propagation
// Compare to Ethereum: ~12,000ms per block`
      },
      {
        type: "interactive",
        widget: "slot-visualizer"
      },
      {
        type: "interactive",
        widget: "leader-schedule"
      },
      {
        type: "quiz",
        question: "What determines transaction ordering within a Solana slot?",
        options: [
          "Gas price (highest bidder first)",
          "Arrival time to the leader + stake-weighted QoS priority",
          "Random selection by the validator",
          "Transaction size",
        ],
        correct: 1,
        explanation: "Solana uses a first-come-first-served model modified by Stake-Weighted Quality of Service (SWQoS). Transactions from staked connections get priority in the QUIC pipeline, but within the same priority tier, arrival order matters."
      }
    ]
  },
  {
    id: "mev-types",
    num: "02",
    title: "MEV Types on Solana",
    subtitle: "Taxonomy of extraction strategies",
    sections: [
      {
        type: "text",
        content: `MEV strategies on Solana can be categorized by their mechanism, risk profile, and competitive intensity. Here's the complete taxonomy:`
      },
      {
        type: "mev-table",
        strategies: [
          {
            name: "Atomic arbitrage",
            desc: "Buy on DEX A, sell on DEX B in the same transaction. Profit from price discrepancy between pools.",
            profit: "Deterministic",
            competition: "Extreme",
            complexity: "Low",
            example: "SOL/USDC is $148.20 on Raydium but $148.85 on Orca. Buy on Raydium, sell on Orca, pocket the difference minus fees.",
            color: "#5DCAA5"
          },
          {
            name: "CEX-DEX arbitrage",
            desc: "On-chain DEX price diverges from centralized exchange price. Requires sub-second CEX data feeds.",
            profit: "Statistical",
            competition: "High",
            complexity: "Medium",
            example: "Binance SOL/USDT moves to $149.00 but Raydium pool still reflects $148.50. Swap on Raydium before the pool updates.",
            color: "#378ADD"
          },
          {
            name: "Sandwich attack",
            desc: "Front-run a large swap with a buy, then back-run with a sell. The victim's trade moves the price in your favor.",
            profit: "Deterministic",
            competition: "High",
            complexity: "Medium",
            example: "Detect a 10,000 USDC→SOL swap. Buy SOL before it executes (price goes up), victim's swap pushes it higher, you sell at the inflated price.",
            color: "#E24B4A"
          },
          {
            name: "Liquidation",
            desc: "Monitor lending protocols for under-collateralized positions. Race to liquidate and collect the liquidation bonus.",
            profit: "Deterministic",
            competition: "Medium",
            complexity: "Medium",
            example: "A Solend position has health factor 0.98 and falling. Submit the liquidation tx to claim the 5% bonus on the collateral.",
            color: "#EF9F27"
          },
          {
            name: "Backrun arbitrage",
            desc: "Detect a large swap that will move a pool's price, then submit an arb tx immediately after to capture the displacement.",
            profit: "Statistical",
            competition: "High",
            complexity: "Medium",
            example: "A whale swaps 50,000 SOL on Raydium, pushing the price up 0.3%. Your backrun arb corrects the price against other venues.",
            color: "#7F77DD"
          },
          {
            name: "JIT liquidity",
            desc: "Provide concentrated liquidity just before a large trade, capture fees, withdraw immediately after.",
            profit: "Statistical",
            competition: "Low",
            complexity: "High",
            example: "Detect incoming 100K swap on an Orca CLMM pool. Mint a tight LP position in the tick range, earn 0.25% fee on the full trade, burn the position.",
            color: "#D4537E"
          },
        ]
      },
      {
        type: "text",
        content: `**Key insight for builders:** Atomic arb is the most competitive because it's the simplest—thousands of bots are running it. The highest alpha is in strategies that require more infrastructure or domain knowledge: JIT liquidity, cross-venue statistical arb, and liquidation monitoring across multiple lending protocols simultaneously.\n\n**Ethical note:** Sandwich attacks directly harm users by extracting value from their trades. Many in the ecosystem consider them adversarial. Protocols like Jito have implemented "dontfront" protections, and Application-Controlled Execution (ACE) is being developed to give dApps control over transaction ordering within their programs.`
      },
      {
        type: "interactive",
        widget: "arb-detector"
      },
      {
        type: "interactive",
        widget: "liquidation-cascade"
      },
      {
        type: "quiz",
        question: "Which MEV strategy is considered harmful to users?",
        options: [
          "Atomic arbitrage (improves price consistency)",
          "Sandwich attacks (extract value from user trades)",
          "Liquidation (maintains protocol health)",
          "JIT liquidity (provides better execution)",
        ],
        correct: 1,
        explanation: "Sandwich attacks directly harm users by manipulating the price around their trade. The attacker profits at the user's expense. Other strategies like arb and liquidation generally benefit the ecosystem by improving price efficiency and maintaining protocol solvency."
      }
    ]
  },
  {
    id: "supply-chain",
    num: "03",
    title: "The MEV Supply Chain",
    subtitle: "How value flows from user to validator",
    sections: [
      {
        type: "text",
        content: `The Solana MEV supply chain has four key actors, each with different incentives. Understanding their relationships is essential to building effective strategies.`
      },
      {
        type: "supply-chain",
        actors: [
          {
            role: "User",
            desc: "Submits a swap, borrow, or other DeFi transaction. Usually unaware of MEV being extracted from their trade.",
            incentive: "Best execution price",
            tools: "Wallet, DEX frontend, Telegram bots"
          },
          {
            role: "Searcher",
            desc: "Automated bot that monitors on-chain state and constructs profitable transaction bundles.",
            incentive: "Maximize extracted profit minus tips and infra costs",
            tools: "Custom Rust bots, Geyser plugins, Jito SDK, dedicated RPC"
          },
          {
            role: "Block engine",
            desc: "Jito's block engine receives bundles from searchers, runs a sealed-bid auction, and forwards winning bundles to the validator.",
            incentive: "Maximize tip revenue for validators/stakers",
            tools: "Jito block engine, bloXroute relay"
          },
          {
            role: "Validator",
            desc: "Produces blocks. Includes the highest-paying bundles at favorable positions within the block. Earns tips on top of base rewards.",
            incentive: "Maximize total block revenue (base + tips)",
            tools: "Jito-Solana client, Firedancer (emerging)"
          }
        ]
      },
      {
        type: "code",
        title: "Jito bundle structure",
        language: "rust",
        code: `// A Jito bundle contains up to 5 transactions
// Executed atomically: ALL succeed or ALL revert
// Tip is attached as a separate transfer tx

use jito_sdk::bundle::Bundle;

let bundle = Bundle::new(vec![
    // Tx 1: Your MEV transaction (the arb swap)
    swap_transaction,
    
    // Tx 2: Tip payment to Jito tip account
    // Higher tip = higher priority in the auction
    create_tip_transaction(
        tip_accounts::JITO_TIP_ACCOUNT_1,
        5_000, // lamports (0.000005 SOL)
    ),
]);

// Submit to Jito block engine
let result = jito_client
    .send_bundle(&bundle)
    .await?;
    
// Bundle lands atomically or not at all
// You only pay the tip if the bundle succeeds`
      },
      {
        type: "text",
        content: `**The auction dynamics matter.** Jito runs a first-price sealed-bid auction. Searchers don't see each other's bids. The optimal tip is a function of your expected profit, the number of competing searchers, and the probability of landing. Overbid and you leave money on the table. Underbid and you lose to competitors. Most successful searchers converge on tipping 30-50% of expected profit.`
      },
      {
        type: "interactive",
        widget: "supply-chain-flow"
      },
      {
        type: "quiz",
        question: "What happens if one transaction in a Jito bundle fails?",
        options: [
          "Only the failed transaction reverts",
          "The entire bundle reverts atomically",
          "The validator retries the failed transaction",
          "The tip is still paid",
        ],
        correct: 1,
        explanation: "Jito bundles are atomic—all transactions succeed or all revert. This is crucial for MEV because it means you never pay a tip on a failed arb. If the price moved between detection and execution, the bundle simply doesn't land and you lose nothing."
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
        content: `On Solana, MEV is won by infrastructure as much as strategy. The searchers extracting the most value in 2025-2026 aren't running the smartest algorithms—they're running the fastest infrastructure. Here's the full stack that powers competitive MEV operations, layer by layer:`
      },
      {
        type: "infra-stack",
        layers: [
          {
            name: "Hardware",
            tier: "Foundation",
            items: [
              { name: "AMD EPYC 9355/7443P", desc: "High single-thread performance, large L3 cache", cost: "$500-2000/mo" },
              { name: "512GB+ RAM", desc: "Validator-grade memory for full state", cost: "Included" },
              { name: "NVMe enterprise SSD", desc: "Solana generates ~1TB/day of new data", cost: "Included" },
              { name: "1-10 Gbps symmetric", desc: "Low jitter, direct peering to major validators", cost: "Included" },
            ]
          },
          {
            name: "Data streaming",
            tier: "Observation",
            items: [
              { name: "Geyser plugin", desc: "Account updates from validator memory. Fastest possible.", cost: "Requires own node" },
              { name: "Yellowstone gRPC", desc: "Filtered streaming from providers. Sub-100ms.", cost: "$50-300/mo" },
              { name: "ShredStream (Jito)", desc: "Raw shreds before block propagation. 50-200ms edge.", cost: "$150+/mo" },
              { name: "WebSocket", desc: "JSON-encoded, HTTP overhead. Fine for research, not competitive.", cost: "Free tier" },
            ]
          },
          {
            name: "Execution",
            tier: "Submission",
            items: [
              { name: "Jito bundle API", desc: "92% validator coverage. Atomic bundles with tip auction.", cost: "Free (tips only)" },
              { name: "bloXroute Trader API", desc: "Leader-aware routing, multi-path submission.", cost: "Paid tier" },
              { name: "Staked RPC (SWQoS)", desc: "Priority in QUIC pipeline. Dramatically reduces drops under congestion.", cost: "$1500+/mo" },
              { name: "Direct TPU", desc: "Raw QUIC to leader. Fastest but unreliable without stake.", cost: "Own node" },
            ]
          },
          {
            name: "Monitoring",
            tier: "Operations",
            items: [
              { name: "Prometheus + Grafana", desc: "Metrics collection and dashboarding.", cost: "Free (self-hosted)" },
              { name: "Custom alerting", desc: "Telegram/Discord webhooks for critical events.", cost: "Free" },
            ]
          }
        ]
      },
      {
        type: "text",
        content: `**Getting started affordably:** None of the expensive infrastructure above is required to *research and understand* MEV strategies. Helius free tier (30 RPS) + Binance WebSocket (free) + local Parquet replay provides everything needed for strategy analysis and validation. The expensive infrastructure only matters for live competitive execution—and even then, Jito bundle submission is free (tips are only paid on successful captures).`
      },
      {
        type: "interactive",
        widget: "jito-bundle-builder"
      },
      {
        type: "interactive",
        widget: "colocation-latency"
      },
      {
        type: "quiz",
        question: "What's the biggest latency advantage of Geyser plugins over WebSocket?",
        options: [
          "Geyser uses a different programming language",
          "Geyser reads from validator memory before data is serialized for RPC",
          "Geyser has lower fees",
          "Geyser works on more protocols",
        ],
        correct: 1,
        explanation: "Geyser plugins sit inside the validator process itself, reading account updates directly from memory. WebSocket data has to be serialized to JSON, sent through the RPC layer, and decoded—adding significant latency. For MEV where every millisecond counts, this difference is the edge."
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
        content: `This module walks through a complete CEX-DEX arbitrage detector. It's a useful reference strategy because it touches every layer of the stack: data ingestion, opportunity detection, profit simulation, and execution.`
      },
      {
        type: "code",
        title: "Step 1: Data ingestion — dual price feeds",
        language: "python",
        code: `import asyncio
import json
import websockets
from solders.pubkey import Pubkey

# CEX reference price (Binance WebSocket - free)
async def binance_feed(queue):
    uri = "wss://stream.binance.com/ws/solusdt@trade"
    async with websockets.connect(uri) as ws:
        async for msg in ws:
            data = json.loads(msg)
            await queue.put({
                "source": "binance",
                "price": float(data["p"]),
                "ts": data["T"]
            })

# On-chain DEX price (Raydium pool via RPC)
RAYDIUM_SOL_USDC = Pubkey.from_string(
    "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"
)

async def raydium_feed(queue, rpc_ws):
    # Subscribe to account changes on the pool
    await rpc_ws.account_subscribe(
        RAYDIUM_SOL_USDC,
        commitment="processed"  # fastest confirmation
    )
    async for update in rpc_ws:
        pool_state = decode_raydium_amm(update.data)
        price = pool_state.quote_reserve / pool_state.base_reserve
        await queue.put({
            "source": "raydium",
            "price": price,
            "ts": update.slot
        })`
      },
      {
        type: "code",
        title: "Step 2: Opportunity detection",
        language: "python",
        code: `class ArbDetector:
    def __init__(self, min_spread_bps=15, fee_bps=10):
        self.min_spread_bps = min_spread_bps
        self.fee_bps = fee_bps  # DEX swap fee
        self.cex_price = None
        self.dex_price = None
    
    def update(self, source, price):
        if source == "binance":
            self.cex_price = price
        elif source == "raydium":
            self.dex_price = price
        
        return self.check_opportunity()
    
    def check_opportunity(self):
        if not self.cex_price or not self.dex_price:
            return None
        
        # Spread in basis points
        spread_bps = abs(
            self.cex_price - self.dex_price
        ) / self.cex_price * 10_000
        
        net_spread = spread_bps - self.fee_bps
        
        if net_spread >= self.min_spread_bps:
            direction = (
                "BUY_DEX" if self.dex_price < self.cex_price 
                else "SELL_DEX"
            )
            return {
                "signal": "GO",
                "direction": direction,
                "spread_bps": round(net_spread, 1),
                "cex": self.cex_price,
                "dex": self.dex_price,
            }
        return None`
      },
      {
        type: "code",
        title: "Step 3: Profit simulation",
        language: "python",
        code: `async def simulate_profit(opportunity, rpc_client):
    """
    Before submitting, simulate the exact swap to verify
    profitability after all costs.
    """
    swap_amount_sol = 1.0  # Start small
    
    # Build the swap instruction
    swap_ix = build_raydium_swap(
        pool=RAYDIUM_SOL_USDC,
        amount_in=int(swap_amount_sol * 1e9),  # lamports
        min_amount_out=0,  # We'll check profit, not slippage
        direction=opportunity["direction"],
    )
    
    # Simulate via RPC (free, no SOL spent)
    sim_result = await rpc_client.simulate_transaction(
        build_tx([swap_ix])
    )
    
    if sim_result.err:
        return {"profitable": False, "reason": "sim_failed"}
    
    # Parse output amount from logs
    output = parse_swap_output(sim_result.logs)
    
    # Calculate net profit
    gross_profit = abs(output - swap_amount_sol * opportunity["dex"])
    tip_cost = 5000 / 1e9          # 5000 lamports
    priority_fee = 10000 / 1e9     # compute unit price
    net_profit = gross_profit - tip_cost - priority_fee
    
    return {
        "profitable": net_profit > 0,
        "net_profit_sol": net_profit,
        "net_profit_usd": net_profit * opportunity["cex"],
        "compute_units": sim_result.units_consumed,
    }`
      },
      {
        type: "code",
        title: "Step 4: Bundle construction and submission",
        language: "python",
        code: `from jito_sdk import JitoClient, Bundle

async def execute_arb(opportunity, sim_result, jito_client):
    """
    Construct and submit a Jito bundle.
    Atomic: if the arb fails, tip is not paid.
    """
    if not sim_result["profitable"]:
        log_paper_trade(opportunity, sim_result)
        return
    
    # Build swap transaction
    swap_tx = build_swap_tx(opportunity)
    
    # Build tip transaction
    # Tip = 40% of expected profit (competitive but not wasteful)
    tip_lamports = int(
        sim_result["net_profit_sol"] * 0.4 * 1e9
    )
    tip_tx = build_tip_tx(tip_lamports)
    
    # Create atomic bundle
    bundle = Bundle(
        transactions=[swap_tx, tip_tx],
    )
    
    # Submit to Jito block engine
    result = await jito_client.send_bundle(bundle)
    
    # Log outcome
    if result.landed:
        log_success(opportunity, sim_result, result)
    else:
        log_miss(opportunity, result.reason)
        
# The full pipeline runs in ~50ms:
# detect(5ms) → simulate(20ms) → build(10ms) → submit(15ms)`
      },
      {
        type: "text",
        content: `**What this code doesn't show:** The real complexity isn't in the logic—it's in the infrastructure. Getting Raydium pool updates in under 10ms requires Yellowstone gRPC, not RPC polling. Landing a bundle before competitors requires geographic proximity to the current leader. And the Binance price feed has its own latency that creates a stale-signal risk.\n\nIn practice, searchers start with paper trading (skipping Step 4, just logging theoretical P&L) to validate that their detector finds real opportunities with real profit margins before investing in live execution infrastructure.`
      },
      {
        type: "interactive",
        widget: "strategy-backtester"
      },
      {
        type: "quiz",
        question: "Why do searchers typically tip 30-50% of expected profit?",
        options: [
          "Jito requires a minimum tip percentage",
          "It's a Nash equilibrium in the sealed-bid auction—overbid wastes profit, underbid loses to competitors",
          "Validators refuse bundles with lower tips",
          "It's a Solana protocol requirement",
        ],
        correct: 1,
        explanation: "Jito runs a first-price sealed-bid auction. In game theory, competing searchers converge on tipping a fraction of their expected value—enough to win the auction most of the time without giving away all the profit. The exact percentage depends on competition density for that specific opportunity type."
      }
    ]
  },
  {
    id: "economics",
    num: "06",
    title: "MEV Economics",
    subtitle: "Auction theory, tip optimization, game theory",
    sections: [
      {
        type: "text",
        content: `MEV extraction is fundamentally a game theory problem. Understanding the economics determines whether your strategy is profitable after accounting for competition, infrastructure costs, and execution risk.`
      },
      {
        type: "concepts",
        items: [
          {
            title: "First-price sealed-bid auction",
            body: "Jito's block engine runs a first-price sealed-bid auction every few hundred milliseconds. Each searcher submits a bundle with a tip, and the highest tip wins. Unlike second-price auctions, you pay what you bid—so overbidding directly reduces profit. The optimal bid depends on your estimate of competing bids, which you can't observe.",
            icon: "🏷"
          },
          {
            title: "Winner's curse",
            body: "If you consistently win Jito auctions, you might be overbidding. The winner of a first-price auction tends to be the bidder who most overestimated the item's value. Track your win rate: if it's above 80%, you're likely leaving money on the table by tipping too much.",
            icon: "🏆"
          },
          {
            title: "Infrastructure as moat",
            body: "A searcher with 10ms faster detection sees opportunities 10ms before competitors. In a 400ms slot, that's a 2.5% time advantage—but in practice it's more because the first valid bundle submitted often wins. Infrastructure investment has compounding returns: faster detection → earlier submission → higher win rate → more revenue → more infrastructure investment.",
            icon: "🏗"
          },
          {
            title: "Strategy decay",
            body: "Every profitable MEV strategy attracts competitors over time. Atomic arb on major pairs went from highly profitable in 2023 to nearly zero-margin in 2025 as thousands of bots entered. Sustainable MEV requires either (a) infrastructure advantages that are expensive to replicate, or (b) continuous discovery of new strategy types before they become crowded.",
            icon: "📉"
          }
        ]
      },
      {
        type: "interactive",
        widget: "tip-optimizer"
      },
      {
        type: "interactive",
        widget: "first-price-auction"
      },
      {
        type: "quiz",
        question: "A searcher wins 95% of Jito auctions. What should they do?",
        options: [
          "Celebrate—they're the best searcher",
          "Lower their tip percentage—they're likely overbidding",
          "Increase their tip to maintain dominance",
          "Nothing—high win rate is always optimal",
        ],
        correct: 1,
        explanation: "A 95% win rate in a competitive first-price auction almost certainly means you're bidding too high. Lowering tips by 10-20% would reduce your win rate to perhaps 70-80% but dramatically increase profit per won auction. The optimal win rate depends on opportunity frequency—for rare, high-value opportunities, a higher win rate is worth the cost."
      }
    ]
  },
  {
    id: "defense",
    num: "07",
    title: "MEV Defense",
    subtitle: "Protecting users and building fair systems",
    sections: [
      {
        type: "text",
        content: `Understanding MEV isn't just about extraction—it's equally about defense. If you're building protocols or frontends, you need to protect your users from adversarial MEV. Here are the defense mechanisms available on Solana in 2026:`
      },
      {
        type: "concepts",
        items: [
          {
            title: "Jito dontfront",
            body: "A flag on Jito bundles that tells the block engine not to front-run the transaction. Effective against Jito-routed front-running but doesn't protect against private mempools or malicious validators who don't honor the flag.",
            icon: "🛡"
          },
          {
            title: "Application-Controlled Execution (ACE)",
            body: "An emerging standard that lets dApps define execution constraints at the program level. Applications can enforce ordering rules, slippage bounds, and which actors can interact with specific instructions. This moves MEV protection from the network layer to the application layer.",
            icon: "⚙"
          },
          {
            title: "TWAP deviation checks",
            body: "Programs can compare the current swap price against a time-weighted average price (TWAP) oracle. If the deviation exceeds a threshold, the swap reverts—preventing sandwich attacks that rely on temporary price manipulation.",
            icon: "📊"
          },
          {
            title: "Private transaction submission",
            body: "bloXroute's leader-aware routing scores validators for sandwich risk and avoids routing through known-malicious leaders. This protects users by selecting validators less likely to extract MEV from their transactions.",
            icon: "🔐"
          },
          {
            title: "Commit-reveal schemes",
            body: "For large trades, users can commit to a trade (encrypted) in one transaction and reveal (execute) in a later transaction. Searchers can't front-run what they can't read. Adds latency but provides strong protection.",
            icon: "✉"
          },
        ]
      },
      {
        type: "interactive",
        widget: "slippage-protection"
      },
      {
        type: "interactive",
        widget: "private-tx-viz"
      },
      {
        type: "text",
        content: `**The Firedancer factor:** Jump Crypto's Firedancer validator client introduces new dynamics. Its optimized block packing reduces the time transactions sit in a "pending" state, theoretically shrinking the sandwich window. But Firedancer also supports a "Revenue Mode" that prioritizes MEV capture—meaning validators running it may be more efficient at extraction, not less. The net effect is still playing out.\n\n**The big picture:** MEV will never be fully eliminated—it's a fundamental property of any system where transaction ordering matters. The goal is to minimize *harmful* MEV (sandwiches, front-running) while allowing *beneficial* MEV (arbitrage, liquidation) that improves market efficiency. The best defense is protocol-level design that makes harmful extraction structurally unprofitable.`
      },
      {
        type: "quiz",
        question: "Why can't Jito's 'dontfront' flag fully prevent sandwich attacks?",
        options: [
          "It only works on Ethereum",
          "Private mempools and malicious validators can bypass Jito's block engine entirely",
          "It's not implemented yet",
          "Sandwich attacks don't exist on Solana",
        ],
        correct: 1,
        explanation: "Jito suspended its public mempool in March 2024, but private mempools have emerged. Validators participating in these private pools can see transactions before they're included in blocks and can sandwich them outside of Jito's protection. This is why protocol-level defenses (ACE, TWAP checks) are necessary—they work regardless of the submission path."
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
        content: `This module outlines a phased roadmap for building an MEV research and development environment. Every tool in the first two phases is free.`
      },
      {
        type: "roadmap",
        weeks: [
          {
            week: "Phase 1",
            title: "Data foundation",
            tasks: [
              "Set up Helius free tier account and get an API key",
              "Fetch historical Raydium pool states via getMultipleAccounts",
              "Store as Parquet files (using pyarrow) — aim for 1 week of SOL/USDC pool snapshots",
              "Connect to Binance WebSocket and log SOL/USDT trades to CSV",
              "Build a ReplayAdapter that iterates through historical snapshots chronologically"
            ]
          },
          {
            week: "Phase 2",
            title: "Detection engine",
            tasks: [
              "Implement an ArbDetector class (see Module 05)",
              "Backtest against Parquet data: how many opportunities per day? Average spread?",
              "Add Jupiter quote API calls to verify real executable prices (not just pool math)",
              "Build a paper trading logger: CSV with timestamp, spread, direction, theoretical P&L",
              "Run paper trader live against Helius WebSocket + Binance feed for 48 hours"
            ]
          },
          {
            week: "Phase 3",
            title: "Simulation layer",
            tasks: [
              "Set up solana-test-validator locally for transaction simulation",
              "Build swap transaction construction (Raydium SDK or raw instruction building)",
              "Implement simulateTransaction calls to verify profitability before execution",
              "Add compute unit estimation and priority fee calculation",
              "Run simulated executions against live data and track sim success rate"
            ]
          },
          {
            week: "Phase 4",
            title: "Live execution (micro-scale)",
            tasks: [
              "Set up Jito SDK (jito-rs or jito-ts)",
              "Build bundle construction: swap tx + tip tx",
              "Start with minimal position sizes (e.g. 0.01 SOL) and low tips (1000 lamports)",
              "Monitor landing rate, actual vs simulated profit, and tip efficiency",
              "Build a Grafana dashboard for real-time P&L and execution metrics"
            ]
          }
        ]
      },
      {
        type: "text",
        content: `**Key takeaway:** This phased approach reflects how most successful MEV teams got started. The difference between teams that succeeded and those that didn't often comes down to iteration speed—each phase validates assumptions before investing in the next.\n\nA common pitfall is spending months building "the perfect system" before running a single backtest. Starting with rough prototypes, measuring real results, and iterating tends to produce better outcomes than over-engineering upfront.`
      },
      {
        type: "interactive",
        widget: "mev-bot-builder"
      }
    ]
  }
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
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{a.role}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{a.desc}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Incentive: <span style={{ color: "var(--accent)" }}>{a.incentive}</span></div>
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
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--accent)15", color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>{l.tier}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{l.name}</span>
          </div>
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
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSlotTime(t => {
          if (t >= 400) { return 0; }
          return t + 5;
        });
      }, 25);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

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
        <button onClick={() => { setRunning(!running); if (!running) setSlotTime(0); }}
          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: running ? "var(--accent)15" : "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
          {running ? "⏸ pause" : "▶ simulate"}
        </button>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
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

  stateRef.current.swapSize = swapSize;
  stateRef.current.slippage = slippage;

  const startAttack = useCallback(() => {
    stateRef.current.phase = "scanning";
    stateRef.current.t = 0;
    setPhase("scanning");
    setProfit(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const txQueue = [
      { label: "Swap: SOL/USDC", type: "user", y: 200 },
      { label: "Transfer: 5 SOL", type: "normal", y: 260 },
      { label: "Stake: 100 SOL", type: "normal", y: 320 },
      { label: "Mint NFT", type: "normal", y: 380 },
    ];

    const draw = () => {
      const s = stateRef.current;
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
        s.t += 1;
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
        s.t += 1;
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
        s.t += 1;
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
  }, []);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Sandwich attack animator</span>
        <button onClick={startAttack}
          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: phase === "idle" || phase === "done" ? "var(--accent)15" : "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
          {phase === "idle" ? "Watch Attack" : phase === "done" ? "Replay" : "Running..."}
        </button>
      </div>
      <canvas ref={canvasRef} width={500} height={500} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)" }} />
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
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
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const col = Math.floor((mx - PAD_L) / cellW);
      const row = Math.floor((my - PAD_T) / cellH);
      hoverRef.current = { col: col >= 0 && col < COLS ? col : -1, row: row >= 0 && row < ROWS ? row : -1 };
    };
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", () => { hoverRef.current = { col: -1, row: -1 }; });

    let shiftTimer = 0;

    const draw = () => {
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
      shiftTimer++;
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
  }, []);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>MEV extraction heatmap</div>
      <canvas ref={canvasRef} width={500} height={350} style={{ width: "100%", height: 350, borderRadius: 8, border: "1px solid var(--border)", cursor: "crosshair" }} />
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Each cell represents a block. Color intensity = total MEV extracted. Hover for breakdown. Grid shifts left every 2 seconds as new blocks arrive.
      </div>
    </div>
  );
}

function LeaderSchedulePredictor() {
  const VALIDATORS = [
    { name: "Jito", color: "#5DCAA5" },
    { name: "Marinade", color: "#378ADD" },
    { name: "Helius", color: "#EF9F27" },
    { name: "Galaxy", color: "#7F77DD" },
    { name: "Everstake", color: "#D4537E" },
  ];

  const CITIES = [
    { name: "New York", x: 120, y: 60 },
    { name: "Amsterdam", x: 240, y: 45 },
    { name: "Tokyo", x: 400, y: 65 },
    { name: "Singapore", x: 350, y: 115 },
    { name: "Frankfurt", x: 250, y: 55 },
  ];

  const [currentSlot, setCurrentSlot] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [serverPos, setServerPos] = useState({ x: 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const intervalRef = useRef(null);

  // Generate a schedule: 20 slots, groups of 4
  const schedule = useRef(
    Array.from({ length: 20 }, (_, i) => {
      const vIdx = Math.floor(i / 4) % VALIDATORS.length;
      return { slot: 1000 + i, validator: VALIDATORS[vIdx] };
    })
  ).current;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentSlot(s => (s + 1) % 20);
    }, 800);
    return () => clearInterval(intervalRef.current);
  }, []);

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
    const W = canvas.width, H = canvas.height;
    let frame = 0;

    const draw = () => {
      const s = stateRef.current;
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0C0C0F";
      ctx.fillRect(0, 0, W, H);

      // Jitter prices
      s.raydiumPrice += (Math.random() - 0.5) * 0.15;
      s.orcaPrice += (Math.random() - 0.5) * 0.15;
      // Mean revert
      s.raydiumPrice += (150 - s.raydiumPrice) * 0.005;
      s.orcaPrice += (150 - s.orcaPrice) * 0.005;

      const spread = Math.abs(s.raydiumPrice - s.orcaPrice);

      // Create opportunity occasionally
      if (s.phase === "waiting" && frame % 180 === 0 && Math.random() > 0.3) {
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
      ctx.fillText("RAYDIUM", 30 + boxW / 2, 78);
      ctx.font = "bold 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(`$${s.raydiumPrice.toFixed(2)}`, 30 + boxW / 2, 120);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#666"; ctx.fillText("SOL/USDC", 30 + boxW / 2, 140);

      // Orca
      ctx.fillStyle = "#1A1A20";
      ctx.beginPath(); ctx.roundRect(W - 30 - boxW, 50, boxW, boxH, 8); ctx.fill();
      ctx.strokeStyle = "#378ADD40"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#378ADD"; ctx.textAlign = "center";
      ctx.fillText("ORCA", W - 30 - boxW / 2, 78);
      ctx.font = "bold 28px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(`$${s.orcaPrice.toFixed(2)}`, W - 30 - boxW / 2, 120);
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#666"; ctx.fillText("SOL/USDC", W - 30 - boxW / 2, 140);

      // Spread indicator
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const spreadColor = spread > 0.5 ? "#C8F06E" : "#666";
      ctx.fillStyle = spreadColor;
      ctx.fillText(`SPREAD: $${spread.toFixed(3)}`, W / 2, 185);

      // Opportunity state
      if (s.phase === "opportunity") {
        s.countdown -= 1 / 60;
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
        s.resultTimer--;
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
  }, []);

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
      <canvas ref={canvasRef} width={500} height={500} onClick={handleClick}
        style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }} />
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
        Watch for price spreads &gt; $0.50 between DEXes. Click to execute the arb before time runs out. Higher difficulty = less reaction time.
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const draw = () => {
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
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.1;
        pt.life--;
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
  }, [POSITIONS]);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Liquidation cascade simulator</span>
        <button onClick={resetPositions}
          style={{ fontSize: 11, padding: "4px 14px", borderRadius: 6, border: "1px solid var(--accent)40", background: "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontWeight: 600 }}>
          Reset
        </button>
      </div>
      <canvas ref={canvasRef} width={500} height={500} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)" }} />
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const nodes = [
      { label: "User", x: 60, y: H / 2, color: "#5DCAA5", icon: "U" },
      { label: "Searcher", x: 190, y: H / 2, color: "#EF9F27", icon: "S" },
      { label: "Block Engine", x: 320, y: H / 2, color: "#7F77DD", icon: "B" },
      { label: "Validator", x: 440, y: H / 2, color: "#E24B4A", icon: "V" },
    ];

    let particles = [];
    let frame = 0;
    let lastEmit = 0;
    let statusMessages = [];

    const draw = () => {
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
      if (frame - lastEmit > 180) {
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
          p.x += (dx / dist) * p.speed;
          p.y += (dy / dist) * p.speed;

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
  }, []);

  return (
    <div style={{ marginBottom: 24, background: "var(--bg-card)", borderRadius: 10, padding: "18px 20px", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Supply chain flow simulator</div>
      <canvas ref={canvasRef} width={500} height={500} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid var(--border)" }} />
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

function JitoBundleBuilder() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>JITO BUNDLE BUILDER</div>; }

function ColocationLatencyViz() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>COLOCATION LATENCY VIZ</div>; }

function StrategyBacktester() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>STRATEGY BACKTESTER</div>; }

function FirstPriceAuction() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>FIRST PRICE AUCTION</div>; }

function SlippageProtection() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>SLIPPAGE PROTECTION</div>; }

function PrivateTransactionViz() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>PRIVATE TRANSACTION VIZ</div>; }

function MEVBotArchitectBuilder() { return <div style={{ padding: 40, background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--mono)", fontSize: 12, marginBottom: 24 }}>MEV BOT ARCHITECT BUILDER</div>; }

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

const PROGRESS_KEY = "soledu-mev-progress";

export default function MevCourse() {
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
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>MEV Masterclass</div>
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
          a deep dive into Solana MEV
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
