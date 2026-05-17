<p align="center">
  <br/>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/SOLEDU-Solana_Education-14F195?style=for-the-badge&labelColor=0C0C0F">
    <img alt="Soledu" src="https://img.shields.io/badge/SOLEDU-Solana_Education-14F195?style=for-the-badge&labelColor=0C0C0F">
  </picture>
  <br/><br/>
  <strong>Interactive deep-dive courses on Solana protocol internals, DeFi mechanics, and MEV.</strong>
  <br/>
  <em>22 modules | 40+ interactive widgets | quizzes | progress tracking | dark theme</em>
  <br/><br/>
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&labelColor=141418" alt="React 18">
  <img src="https://img.shields.io/badge/vite-5-646CFF?style=flat-square&labelColor=141418" alt="Vite 5">
  <img src="https://img.shields.io/badge/courses-2-14F195?style=flat-square&labelColor=141418" alt="2 courses">
  <img src="https://img.shields.io/badge/license-MIT-gray?style=flat-square&labelColor=141418" alt="MIT License">
</p>

---

## What This Is

Soledu is an interactive education platform for learning Solana from first principles. Each course combines long-form technical writing with animated diagrams, live simulations, and module-end quizzes -- designed to teach the way documentation should but rarely does.

This is not a video series, a blog, or a slide deck. Every concept has a visual, every visual is interactive, and every module ends with a knowledge check.

---

## Courses

### MEV Masterclass -- 9 Modules

From what MEV is to building a live extraction stack. Covers the full lifecycle: detection, bundle construction, Jito submission, economics, and defense.

| Module | Topic | Interactive Widgets |
|--------|-------|---------------------|
| 00 | What is MEV? | Sandwich attack animator, MEV extraction heatmap |
| 01 | Solana's Architecture | Slot visualizer, leader schedule predictor |
| 02 | MEV Types on Solana | Arb detector, liquidation cascade |
| 03 | The MEV Supply Chain | Supply chain flow, Jito bundle builder |
| 04 | Infrastructure Stack | Colocation latency simulator |
| 05 | Building a Strategy | Strategy backtester |
| 06 | MEV Economics | Tip optimizer, first-price auction |
| 07 | MEV Defense | Slippage protection, private tx visualizer |
| 08 | Build Your Stack | MEV bot builder |

### Solana Ecosystem Deep Dive -- 13 Modules

From the whitepaper to the full ecosystem map. Covers every layer: PoH, consensus, runtime, networking, DeFi, staking, stablecoins, DePIN, AI agents.

| Module | Topic | Interactive Widgets |
|--------|-------|---------------------|
| 00 | What is Solana? | Blockchain comparison race |
| 01 | Proof of History | Hash chain explorer |
| 02 | The 8 Innovations | Innovation pipeline |
| 03 | Consensus | PoH chain builder, Tower BFT simulator, consensus race |
| 04 | Networking | Gulf Stream, Turbine propagation, pipeline animator |
| 05 | Parallel Execution | Sealevel parallel, Cloudbreak I/O |
| 06 | Transaction Lifecycle | Transaction journey |
| 07 | Validator Infrastructure | Validator network, SWQoS simulator |
| 08 | Developer Tooling | Oracle price feed |
| 09 | DeFi | AMM vs CLOB, Jupiter router |
| 10 | Staking | LST builder |
| 11 | Stablecoins | Stablecoin peg mechanism |
| 12 | Consumer + DePIN + AI | Wallet tx flow, DePIN mapper, agent loop |

---

## Features

- **Interactive widgets** -- 40+ animated simulations (sandwich attacks, hash chains, AMM curves, Turbine propagation, and more). Built as self-contained React components with play/pause/speed controls.
- **Section types** -- Text blocks, code blocks with syntax highlighting (Prism.js), stat grids, flow diagrams, concept cards, data tables, roadmaps, and quizzes.
- **Progress tracking** -- Per-module completion state persisted to localStorage. Resume where you left off.
- **Sidebar navigation** -- Collapsible module list with section-level anchors and progress indicators.
- **Dark theme** -- Dark background (#0C0C0F) with accent green (#C8F06E / #14F195). DM Sans body, JetBrains Mono code.
- **Zero build required** -- Each course ships as both a React component (for the Vite app) and a standalone HTML file (open directly in a browser via CDN React + Babel).

---

## Quick Start

```bash
git clone https://github.com/sohan-shingade/soledu.git
cd soledu
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### No-Build Option

Open any standalone HTML file directly in a browser -- no install, no server:

```
mev_course/solana-mev-masterclass.html
ecosystem_course/solana-ecosystem-deep-dive.html
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build | Vite 5 |
| Routing | React Router v6 |
| Syntax highlighting | Prism.js (JavaScript, Python, Rust) |
| Styling | Inline styles with CSS custom properties |
| Fonts | DM Sans (body), JetBrains Mono (code) via Google Fonts CDN |
| Deployment | Vercel |

---

## Project Structure

```
soledu/
├── src/
│   ├── App.jsx                 # Router: / → Home, /mev → MevCourse, /ecosystem → EcosystemCourse
│   ├── main.jsx                # React entry point
│   ├── index.css               # CSS custom properties (design tokens)
│   ├── pages/
│   │   └── Home.jsx            # Course catalog with progress bars
│   └── courses/
│       ├── mev/
│       │   └── MevCourse.jsx   # 9 modules, ~3,600 lines, 15 interactive widgets
│       └── ecosystem/
│           └── EcosystemCourse.jsx  # 13 modules, ~7,600 lines, 24 interactive widgets
├── mev_course/
│   ├── mev-course.jsx          # Standalone JSX export
│   └── solana-mev-masterclass.html  # Self-contained HTML (CDN React + Babel)
├── ecosystem_course/
│   ├── ecosystem-course.jsx
│   └── solana-ecosystem-deep-dive.html
├── package.json
├── vite.config.js
└── index.html
```

### Content Architecture

Course content is defined as a `MODULES` array at the top of each course component. Each module contains an array of typed sections:

```
MODULES[] → { id, num, title, subtitle, sections[] }
                                           │
                     ┌─────────────────────┬┴──────────────────────┐
                     ▼                     ▼                       ▼
              { type: "text" }    { type: "interactive",   { type: "quiz",
                                    widget: "..." }          question, options,
                                                             correct, explanation }
```

Section types: `text`, `diagram`, `stats`, `code`, `concepts`, `mev-table`, `supply-chain`, `infra-stack`, `roadmap`, `interactive`, `quiz`.

---

## Adding a New Course

1. Create the course component at `src/courses/<name>/<Name>Course.jsx` with a `MODULES` array following the data model above.
2. Add an entry to the `COURSES` array in `src/pages/Home.jsx`.
3. Add a `<Route>` in `src/App.jsx`.
4. Optionally create a standalone HTML version in `<name>_course/` for zero-build access.

---

## Build

```bash
npm run build       # Production build → dist/
npm run preview     # Preview production build locally
```

---

## License

MIT
