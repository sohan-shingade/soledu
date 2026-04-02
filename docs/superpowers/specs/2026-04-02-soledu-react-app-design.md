# soledu React App — Design Spec

## Overview

Convert soledu from standalone HTML files into a React single-page application with a course catalog home page. The app uses Vite as the bundler and React Router for navigation.

## Tech Stack

- React 18
- Vite
- React Router (v6+)

## File Structure

```
soledu/
  index.html              # Vite entry HTML
  vite.config.js
  package.json
  src/
    main.jsx              # Entry point, mounts <App /> into #root
    App.jsx               # Router setup, shared layout shell
    index.css             # Global styles: CSS variables, reset, font imports
    pages/
      Home.jsx            # Course catalog home page
    courses/
      mev/
        MevCourse.jsx     # Existing mev-course.jsx migrated here
  mev_course/             # Legacy files (kept for reference, no longer served)
```

## Routes

| Path  | Component     | Description              |
|-------|---------------|--------------------------|
| `/`   | `Home`        | Course catalog grid      |
| `/mev`| `MevCourse`   | MEV Masterclass course   |

## Shared Design Tokens (index.css)

The existing inline CSS variables from the MEV course become global:

```
--bg-primary: #0C0C0F
--bg-card: #141419
--bg-code: #0A0A0E
--bg-code-header: #111116
--text-primary: #E8E6E1
--text-secondary: #9B9990
--text-tertiary: #5F5E58
--text-code: #C5C3BB
--accent: #C8F06E
--accent-dim: rgba(200,240,110,0.12)
--border: #222228
--mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace
--body: 'DM Sans', 'Helvetica Neue', system-ui, sans-serif
```

Fonts loaded via Google Fonts in index.html.

## Home Page (pages/Home.jsx)

### Data

A `COURSES` array at the top of the file:

```js
const COURSES = [
  {
    id: "mev",
    title: "MEV Masterclass",
    description: "Understanding maximal extractable value on Solana — from fundamentals to defense strategies.",
    tag: "MEV",
    tagColor: "#C8F06E",
    modules: 9,
    path: "/mev",
    progressKey: "soledu-mev-progress", // localStorage key
  },
];
```

Adding a future course = adding an entry to this array and creating a route.

### Layout

- Centered container, max-width ~900px, vertical padding
- Header section:
  - "SOLEDU" in mono font, accent color, uppercase, letter-spaced
  - "Solana Education" as main heading
  - Brief tagline in secondary text color
- 2-column card grid (CSS grid), stacks to 1-column below 600px
- Placeholder card with dashed border after real course cards

### Course Card

Each card contains:
- Tag label (colored pill, e.g. "MEV" in accent green)
- Course title (bold)
- Description (1-2 lines, secondary text color)
- Module count (e.g. "9 modules" in tertiary text)
- Progress bar: reads localStorage for the course's progressKey. If progress exists and > 0, shows a bar with fraction (e.g. "3/9"). Hidden if no progress.
- Entire card is a clickable link (React Router `<Link>`) to the course path

Card styling: `--bg-card` background, `--border` border, rounded corners, hover state with slightly lighter border.

### Placeholder Card

- Dashed `--border` border
- Centered "More courses coming soon" in `--text-tertiary`
- No hover effect, not clickable

## MEV Course Migration (courses/mev/MevCourse.jsx)

The existing `mev_course/mev-course.jsx` is moved to `src/courses/mev/MevCourse.jsx` with these changes:

1. Remove the inline CSS variable definitions from the root `<div>` style (they're now in `index.css`)
2. Remove the `<link>` tag for Google Fonts (now in `index.html`)
3. Keep all other code as-is (MODULES array, components, layout)
4. Update localStorage key to `soledu-mev-progress` so the home page can read it
5. Add a back-to-home link in the sidebar header (small "SOLEDU" text that links to `/`)

## Progress Tracking

The MEV course currently tracks progress as a `Set` in React state but does not persist it. Changes needed:

- On module selection, persist progress to localStorage under `soledu-mev-progress` as a JSON array of visited module indices
- On mount, read from localStorage to restore progress
- The home page reads the same key to display the progress bar

## Adding Future Courses

1. Create `src/courses/<name>/<Name>Course.jsx` with a `MODULES` array and the shared component library
2. Add an entry to the `COURSES` array in `Home.jsx`
3. Add a `<Route>` in `App.jsx`

## What's Not In Scope

- Authentication or user accounts
- Server-side rendering
- Backend / database
- Deployment configuration
