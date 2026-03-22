# Phase 2: Dashboard UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the React web dashboard that shows all installed skills in a beautiful, interactive interface with real-time updates.

**Architecture:** Vite + React + Tailwind v4 SPA served as static files by the Hono backend. Data fetched from Phase 1 API endpoints. WebSocket for live updates.

**Tech Stack:** React 19, Vite 6, Tailwind CSS v4, marked (markdown rendering), minisearch (fuzzy search)

---

## Task 1: Vite + React + Tailwind Scaffold

**Files:**
- Create: `dashboard/` directory with Vite React project
- Create: `dashboard/vite.config.js`
- Create: `dashboard/index.html`
- Create: `dashboard/src/main.jsx`
- Create: `dashboard/src/App.jsx`
- Create: `dashboard/src/index.css`
- Create: `dashboard/package.json`
- Modify: root `package.json` (add dashboard build scripts)
- Modify: `src/server/app.js` (serve static files from dashboard dist)

**Steps:**

1. Create `dashboard/` with `npm create vite@latest dashboard -- --template react`
2. Install Tailwind v4: `cd dashboard && npm install tailwindcss @tailwindcss/vite`
3. Configure vite.config.js with Tailwind plugin and API proxy to localhost:3377
4. Set up index.css with Tailwind v4 imports and dark mode defaults
5. Create minimal App.jsx that fetches /api/stats and displays "skilldash - N skills"
6. Add scripts to root package.json: `"build:dashboard": "cd dashboard && npm run build"`, `"dev:dashboard": "cd dashboard && npm run dev"`
7. Update `src/server/app.js` to serve `dashboard/dist/` as static files (with fallback to index.html for SPA routing)
8. Test: `cd dashboard && npm run dev` shows the app, `npm run build` produces dist/
9. Commit

---

## Task 2: Data Layer (API hooks + WebSocket)

**Files:**
- Create: `dashboard/src/hooks/useSkills.js`
- Create: `dashboard/src/hooks/useWebSocket.js`
- Create: `dashboard/src/lib/api.js`

**Steps:**

1. Create `dashboard/src/lib/api.js` with helper functions: `fetchStats()`, `fetchAgents()`, `fetchSkills(filters)`, `fetchSkillDetail(id)`, `fetchSimilarities()`, `triggerRescan()`. Each calls the Hono API. In dev mode use proxy, in prod use relative URLs.
2. Create `dashboard/src/hooks/useSkills.js` as a React hook that loads stats, agents, skills, similarities on mount. Exposes `skills`, `agents`, `stats`, `similarities`, `loading`, `refetch()`, filter setters (`setAgentFilter`, `setScopeFilter`, `setQuery`).
3. Create `dashboard/src/hooks/useWebSocket.js` that connects to ws://localhost:PORT/ws, calls `refetch()` on `skill-change` events, returns `lastEvent` for toast notifications.
4. Wire hooks into App.jsx to show loading state, then skill count
5. Test: dashboard shows real skill count from API
6. Commit

---

## Task 3: Summary Header + Agent Filter Chips

**Files:**
- Create: `dashboard/src/components/Header.jsx`

**Steps:**

1. Create Header component with:
   - "skilldash" logo/title (left)
   - Stats bar: "N skills", "N agents", "N similar" (compact, inline)
   - Agent filter chips: one per agent with brand color dot, clickable to toggle filter
   - Similarity info banner (if count > 0): subtle, clickable
2. Style: dark background, zinc-900, clean typography, agent brand colors as dot indicators
3. Wire to useSkills hook filters
4. Test: chips filter the skills, stats update
5. Commit

---

## Task 4: Skills Table

**Files:**
- Create: `dashboard/src/components/SkillsTable.jsx`
- Create: `dashboard/src/components/SearchBar.jsx`

**Steps:**

1. Create SearchBar: input field with `/` keyboard shortcut to focus, search icon, calls setQuery
2. Install minisearch in dashboard: `cd dashboard && npm install minisearch`
3. Create SkillsTable: sortable table with columns:
   - Name (with agent color badge/dot)
   - Agent name
   - Scope (global/project badge)
   - Description (truncated to ~80 chars)
   - Last modified (relative date like "2h ago")
   - Link icon if skill has similarities
4. Sortable columns: click header to sort (name, agent, scope, lastModified)
5. Clicking a row calls `onSelectSkill(skill.id)`
6. Highlight animation class for recently-changed skills (from WebSocket events)
7. Style: dark table with hover states, alternating subtle row backgrounds, agent color badges
8. Keyboard: arrow keys to navigate rows, Enter to select
9. Commit

---

## Task 5: Small-State UX (< 10 skills)

**Files:**
- Create: `dashboard/src/components/SkillCard.jsx`
- Modify: `dashboard/src/App.jsx` (conditionally render cards vs table)

**Steps:**

1. Create SkillCard: card layout showing skill name, agent badge, description, scope
2. In App.jsx: if totalSkills < 10, render grid of SkillCards instead of table. Hide filter sidebar.
3. Add onboarding hint below cards: "Skilldash found N skills in [Agent]. Install more with `npx skills add`."
4. Cards are clickable and open detail panel same as table rows
5. Commit

---

## Task 6: Skill Detail Slide-Over

**Files:**
- Create: `dashboard/src/components/SkillDetail.jsx`
- Install: `marked` in dashboard

**Steps:**

1. Install marked: `cd dashboard && npm install marked`
2. Create SkillDetail slide-over panel (slides in from right, 50% width):
   - Header: skill name, agent badge, scope badge, close button (X / Escape)
   - "What it does": description text
   - "Possible triggers" (if triggers array non-empty): muted tag pills, labeled "Heuristic - extracted from description"
   - "Also installed in": if similarities include this skill, show other agents with match status (identical / differs). "View diff" button if differs.
   - Full SKILL.md rendered markdown (via marked, with syntax highlighting for code blocks)
   - File info footer: path, size, last modified, line count
   - Action buttons: "Open in Editor", "Copy Path", "Open Folder" (these call API endpoints or copy to clipboard)
3. Fetch full skill detail (with body) via fetchSkillDetail when opened
4. Escape key closes panel
5. Style: dark slide-over with border-l, smooth slide animation
6. Commit

---

## Task 7: Real-Time Updates + Toast

**Files:**
- Create: `dashboard/src/components/Toast.jsx`
- Modify: `dashboard/src/App.jsx` (wire toasts to WebSocket events)

**Steps:**

1. Create Toast component: small notification that appears bottom-right, auto-dismisses after 3s
2. On WebSocket `skill-change` event: show toast like "api-design updated in Claude Code"
3. Highlight the affected row in the table (add/remove a CSS class with animation)
4. Auto-refetch data on any skill-change event (already wired in useWebSocket)
5. Commit

---

## Task 8: Action Buttons (Open in Editor, Copy Path)

**Files:**
- Modify: `src/server/app.js` (add action endpoints)
- Modify: `dashboard/src/components/SkillDetail.jsx`

**Steps:**

1. Add API endpoint `POST /api/actions/open-editor` that accepts `{ filePath }` and spawns the editor using `child_process.execFile` (not exec, to prevent command injection). Detect editor: check for `cursor` then `code` in PATH.
2. Add API endpoint `POST /api/actions/open-folder` that accepts `{ filePath }` and opens the containing directory with the system file manager using `child_process.execFile` with `open` on macOS, `xdg-open` on Linux.
3. "Copy Path" is client-side only via `navigator.clipboard.writeText()`
4. Wire buttons in SkillDetail
5. Commit

---

## Task 9: Build Pipeline + Static Serving

**Files:**
- Modify: `src/server/app.js` (serve built dashboard)
- Modify: root `package.json` (build scripts)
- Modify: `.gitignore` (ignore dashboard/dist)

**Steps:**

1. Configure Vite build output to `dashboard/dist/`
2. Update `src/server/app.js`: serve static files from `dashboard/dist/` using Hono's serveStatic middleware. Fallback all non-API routes to index.html (SPA routing).
3. Add root scripts: `"build": "cd dashboard && npm run build"`, `"prepack": "npm run build"` so dashboard builds before npm publish
4. Add `dashboard/dist/` to .gitignore but include in npm package via `files` field
5. Test full flow: `npm run build && node src/index.js --no-open`, then open http://localhost:3377 and verify the dashboard shows real data
6. Commit

---

## Summary

| Task | What | Depends On |
|------|------|------------|
| 1 | Vite + React + Tailwind scaffold | - |
| 2 | Data layer (API hooks + WebSocket) | 1 |
| 3 | Summary header + agent chips | 2 |
| 4 | Skills table + search | 2 |
| 5 | Small-state card layout | 4 |
| 6 | Skill detail slide-over | 2 |
| 7 | Real-time updates + toast | 2, 4 |
| 8 | Action buttons | 6 |
| 9 | Build pipeline + static serving | All |

**Done when:** `npm run build && node src/index.js` opens a browser with a working dashboard showing all skills, filterable, searchable, with detail panels and live updates.
