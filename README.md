# soledu

A Solana education platform with deep-dive courses on protocol internals, DeFi mechanics, and more.

## Courses

- **MEV Masterclass** — 9 modules covering maximal extractable value on Solana: fundamentals, architecture, extraction strategies, the MEV supply chain, infrastructure, strategy building, economics, defense mechanisms, and a practical build roadmap.

More courses coming soon.

## Tech Stack

- React 18
- Vite
- React Router v6

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Adding a New Course

1. Create `src/courses/<name>/<Name>Course.jsx` with a `MODULES` array
2. Add an entry to the `COURSES` array in `src/pages/Home.jsx`
3. Add a `<Route>` in `src/App.jsx`

## License

MIT
