# soledu React App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert soledu from standalone HTML files into a Vite + React Router SPA with a course catalog home page.

**Architecture:** Vite scaffolds the app shell. React Router provides client-side routing between the home page (`/`) and individual courses (`/mev`). The existing MEV course JSX component migrates into the app with minimal changes — CSS variables and fonts move to shared globals, and progress persists to localStorage so the home page can read it.

**Tech Stack:** React 18, Vite, React Router v6

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Dependencies and scripts |
| Create | `vite.config.js` | Vite configuration |
| Create | `index.html` | Vite entry HTML (fonts, #root) |
| Create | `src/main.jsx` | ReactDOM mount + BrowserRouter |
| Create | `src/App.jsx` | Route definitions |
| Create | `src/index.css` | CSS reset, variables, global styles |
| Create | `src/pages/Home.jsx` | Course catalog grid |
| Create | `src/courses/mev/MevCourse.jsx` | Migrated MEV course component |
| Keep | `mev_course/` | Legacy files kept for reference |

---

### Task 1: Scaffold Vite + React project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "soledu",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>soledu — Solana Education</title>
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 5: Add node_modules to .gitignore**

Create `.gitignore`:

```
node_modules
dist
```

- [ ] **Step 6: Commit**

```bash
git init
git add package.json package-lock.json vite.config.js index.html .gitignore
git commit -m "feat: scaffold Vite + React project"
```

---

### Task 2: Create app shell with routing

**Files:**
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/index.css`

- [ ] **Step 1: Create src/index.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-primary: #0C0C0F;
  --bg-card: #141419;
  --bg-code: #0A0A0E;
  --bg-code-header: #111116;
  --text-primary: #E8E6E1;
  --text-secondary: #9B9990;
  --text-tertiary: #5F5E58;
  --text-code: #C5C3BB;
  --accent: #C8F06E;
  --accent-dim: rgba(200, 240, 110, 0.12);
  --border: #222228;
  --mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  --body: 'DM Sans', 'Helvetica Neue', system-ui, sans-serif;
}

html, body, #root { height: 100%; }
body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--body);
}

input[type="range"] { accent-color: var(--accent); width: 100%; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

a { color: inherit; text-decoration: none; }
```

- [ ] **Step 2: Create src/main.jsx**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 3: Create src/App.jsx**

```jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Create a placeholder src/pages/Home.jsx**

```jsx
export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "var(--accent)", fontFamily: "var(--mono)" }}>SOLEDU</h1>
    </div>
  );
}
```

- [ ] **Step 5: Verify the app runs**

Run: `npm run dev`
Expected: Vite dev server starts. Browser shows "SOLEDU" centered on a dark background at `http://localhost:5173`.

- [ ] **Step 6: Commit**

```bash
git add src/main.jsx src/App.jsx src/index.css src/pages/Home.jsx
git commit -m "feat: add app shell with routing and global styles"
```

---

### Task 3: Migrate MEV course into the app

**Files:**
- Create: `src/courses/mev/MevCourse.jsx` (copy from `mev_course/mev-course.jsx`)
- Modify: `src/App.jsx`

- [ ] **Step 1: Copy the existing MEV course file**

Run: `mkdir -p src/courses/mev && cp mev_course/mev-course.jsx src/courses/mev/MevCourse.jsx`

- [ ] **Step 2: Add react-router-dom import to MevCourse.jsx**

At the top of `src/courses/mev/MevCourse.jsx`, add `Link` import:

```jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
```

- [ ] **Step 3: Remove inline CSS variables from the root div**

In the `MEVCourse` component's return statement (around line 1122), replace the root `<div>` style object. Remove all CSS variable definitions and the `<link>` tag for Google Fonts. Change from:

```jsx
    <div style={{
      "--bg-primary": "#0C0C0F",
      "--bg-card": "#141419",
      "--bg-code": "#0A0A0E",
      "--bg-code-header": "#111116",
      "--text-primary": "#E8E6E1",
      "--text-secondary": "#9B9990",
      "--text-tertiary": "#5F5E58",
      "--text-code": "#C5C3BB",
      "--accent": "#C8F06E",
      "--accent-dim": "#C8F06E20",
      "--border": "#222228",
      "--mono": "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
      "--body": "'DM Sans', 'Helvetica Neue', system-ui, sans-serif",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--body)",
      display: "flex",
      position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

To:

```jsx
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--body)",
      display: "flex",
      position: "relative",
    }}>
```

- [ ] **Step 4: Add back-to-home link in the sidebar header**

In the sidebar header section (the `<div>` with "Solana" and "MEV Masterclass"), replace the static "Solana" text with a Link. Change from:

```jsx
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Solana</div>
```

To:

```jsx
          <Link to="/" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2, display: "block" }}>← SOLEDU</Link>
```

- [ ] **Step 5: Add localStorage persistence for progress**

In the `MEVCourse` component, change the progress state initialization and the `handleModuleSelect` callback to persist to localStorage. Replace:

```jsx
  const [progress, setProgress] = useState(() => new Set());

  const handleModuleSelect = useCallback((i) => {
    setActiveModule(i);
    setSidebarOpen(false);
    setProgress(prev => { const next = new Set(prev); next.add(i); return next; });
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);
```

With:

```jsx
  const PROGRESS_KEY = "soledu-mev-progress";

  const [progress, setProgress] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
      return new Set(Array.isArray(saved) ? saved : []);
    } catch { return new Set(); }
  });

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
```

- [ ] **Step 6: Add the MEV course route to App.jsx**

Update `src/App.jsx`:

```jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MevCourse from "./courses/mev/MevCourse";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mev" element={<MevCourse />} />
    </Routes>
  );
}
```

- [ ] **Step 7: Verify the MEV course renders**

Run: `npm run dev`
Navigate to `http://localhost:5173/mev`.
Expected: The full MEV Masterclass renders with sidebar, modules, all content. The "SOLEDU" link in the sidebar header navigates back to `/`. Clicking a module persists progress to localStorage (check in DevTools > Application > Local Storage for `soledu-mev-progress`).

- [ ] **Step 8: Commit**

```bash
git add src/courses/mev/MevCourse.jsx src/App.jsx
git commit -m "feat: migrate MEV course into React app with localStorage progress"
```

---

### Task 4: Build the home page

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Replace the placeholder Home.jsx with the full implementation**

Write the complete `src/pages/Home.jsx`:

```jsx
import { Link } from "react-router-dom";

const COURSES = [
  {
    id: "mev",
    title: "MEV Masterclass",
    description:
      "Understanding maximal extractable value on Solana — from fundamentals to defense strategies.",
    tag: "MEV",
    tagColor: "#C8F06E",
    modules: 9,
    path: "/mev",
    progressKey: "soledu-mev-progress",
  },
];

function getProgress(key, total) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length > 0) {
      return { count: saved.length, total };
    }
  } catch {}
  return null;
}

function CourseCard({ course }) {
  const progress = getProgress(course.progressKey, course.modules);

  return (
    <Link to={course.path} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          cursor: "pointer",
          transition: "border-color 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          height: "100%",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-tertiary)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--mono)",
              letterSpacing: 1.5,
              color: course.tagColor,
              background: `${course.tagColor}18`,
              padding: "3px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            {course.tag}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
          {course.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
          {course.description}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--mono)" }}>
          {course.modules} modules
        </div>
        {progress && (
          <div>
            <div
              style={{
                height: 3,
                background: "var(--border)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(progress.count / progress.total) * 100}%`,
                  background: course.tagColor,
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--mono)",
                marginTop: 4,
              }}
            >
              {progress.count}/{progress.total} explored
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function PlaceholderCard() {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 180,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
        More courses coming soon
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 24px 80px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 48, maxWidth: 600 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent)",
            fontFamily: "var(--mono)",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          SOLEDU
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          Solana Education
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Deep dives into Solana — from protocol internals to DeFi mechanics.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {COURSES.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
        <PlaceholderCard />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the home page**

Run: `npm run dev`
Navigate to `http://localhost:5173/`.
Expected:
- "SOLEDU" branding in accent green, "Solana Education" heading, tagline
- MEV Masterclass card with tag, title, description, "9 modules"
- If progress exists in localStorage, a progress bar appears on the card
- Clicking the card navigates to `/mev`
- "More courses coming soon" placeholder card with dashed border
- 2-column grid on wide screens, 1-column on narrow

- [ ] **Step 3: Verify full navigation loop**

1. Start at `/` — click MEV card → lands on `/mev`
2. Click a few modules → progress updates in sidebar
3. Click "← SOLEDU" in sidebar → navigates to `/`
4. Home page shows updated progress bar on the MEV card

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat: add home page with course catalog grid and progress display"
```

---

### Task 5: Verify build and clean up

**Files:**
- None created; verification only

- [ ] **Step 1: Run a production build**

Run: `npm run build`
Expected: Build completes with no errors. Output in `dist/`.

- [ ] **Step 2: Preview the production build**

Run: `npm run preview`
Expected: App serves at `http://localhost:4173`. Home page loads, MEV course loads, navigation works, progress persists.

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
```

If there are uncommitted changes, stage and commit them.
