# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**soledu** is a Solana education platform. Each course lives in its own directory (e.g. `mev_course/`). The project will grow to include multiple courses covering different Solana topics. There is no build toolchain — no package.json, bundler, or test framework.

## Repository Structure

Each course directory contains two representations of the same content:

- **`<course>/xxx-course.jsx`** — A standalone React component exported as default. Intended to be imported into a React app or rendered by a host page.
- **`<course>/xxx.html`** — A self-contained HTML file that loads React 18 and Babel via CDN. Can be opened directly in a browser with no build step.

When editing course content, keep both files in sync — the JSX and HTML contain the same MODULES data and components.

### Current Courses

- **`mev_course/`** — Solana MEV Masterclass (9 modules covering MEV fundamentals, Solana architecture, MEV types, supply chain, infrastructure, strategy building, economics, defense, and a build roadmap)

## Course Data Model

Course content lives in a `MODULES` array at the top of each file. Each module has `id`, `num`, `title`, `subtitle`, and a `sections` array. Section types: `text`, `diagram`, `stats`, `code`, `concepts`, `mev-table`, `supply-chain`, `infra-stack`, `roadmap`, `interactive`, `quiz`.

## Component Architecture

The component library is shared across the JSX/HTML representations within each course:

- **Rendering components:** `TextBlock`, `CodeBlock`, `StatsGrid`, `DiagramFlow`, `ConceptCards`, `MEVTable`, `SupplyChain`, `InfraStack`, `Roadmap`, `Quiz`
- **Interactive widgets:** `SlotVisualizer`, `TipOptimizer` (rendered via `section.type === "interactive"`)
- **`Section`** dispatches to the correct component based on `section.type`
- **Top-level layout** provides sidebar navigation with progress tracking and module content area

### Styling

All styles are inline (no CSS files or CSS-in-JS library). Design tokens are CSS custom properties: `--bg-primary` (#0C0C0F), `--bg-card`, `--accent` (#C8F06E), `--border`, `--mono`, `--body`. Fonts: DM Sans (body) and JetBrains Mono (code/labels) from Google Fonts CDN.

## Development

To preview any course, open its HTML file directly in a browser. No server or build step required.

## Content Guidelines

Course content should be written for a general audience learning about Solana — educational and neutral in tone, not personal or opinionated. Avoid first-person framing ("I", "my", "what I want to build") and coaching-style language ("you should", "your roadmap"). Present information objectively so any learner can benefit.
