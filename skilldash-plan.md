# skilldash — Build Plan

> One command. One dashboard. See and understand all your agent skills.

```
npx skilldash
```

---

## What skilldash does

- Scans your machine and finds every agent skill installed — starting with Claude Code and Codex CLI, with Cursor rule support as a stretch goal
- Shows them all in one beautiful web dashboard with real-time updates
- Explains what each skill does — in plain English
- Detects similar skills (duplicates, near-identical descriptions, same name with different content across agents)
- Lets you open any skill in your editor with one click
- Lets you see cross-agent diffs when the same skill has different content in different agents
- Updates live when skills change on disk (via any tool or manual edit)

## What skilldash does NOT do

- Does NOT install skills (use `npx skills add` or any other tool)
- Does NOT have a marketplace or registry browser
- Does NOT integrate with or fork skills.sh
- Does NOT have CLI commands beyond starting the dashboard server
- Does NOT have an in-browser code editor (use your own editor)
- No AI features, no cloud sync, no team sharing, no VS Code extension

---

## Tech stack

- React + Vite + Tailwind v4 (dashboard frontend, pre-built at publish time)
- Hono (local API server, serves both API and static dashboard files)
- @hono/node-ws + ws (WebSocket for live updates)
- chokidar v5 (watches skill directories for live changes, followSymlinks: true)
- gray-matter (parses SKILL.md YAML frontmatter)
- fast-glob (scans directories for SKILL.md files)
- minisearch (fuzzy search for skills table)
- marked (renders SKILL.md markdown in detail panel)
- open (opens browser on startup)
- Single npm package (~2.5-3MB), not a monorepo
- Pre-built static dashboard assets shipped in npm package (never build at runtime)

---

## Phase 0 — Claim the name (DONE)

Register `skilldash` on npm immediately with a placeholder package. Create the GitHub repo with README, MIT license, and "coming soon" badge.

---

## Phase 1 — Scanner + API server

Build the backend that reads the filesystem and serves skill data.

**Agent detection:**
Maintain a hardcoded registry of known agents and their skill directory paths — both global (home directory) and project-level (current working directory). Use `os.homedir()` for platform-aware path resolution (enables future Windows/WSL support).

Launch agents (scan order):
1. **Claude Code** — `~/.claude/skills/`, `<project>/.claude/skills/`, `~/.claude/commands/`
2. **Codex CLI** — `~/.codex/skills/`, `<project>/.codex/skills/` (exclude `.system/` directory)
3. **Cross-client standard** — `~/.agents/skills/`, `<project>/.agents/skills/`
4. **Cursor** (stretch) — `~/.cursor/rules/*.mdc`, `<project>/.cursor/rules/*.mdc` (different parser needed for .mdc format)

On startup, check which paths actually exist and report which agents are detected. Only show agents that have skills — no empty agent cards.

**Skill parser (adapter architecture):**
Build one parser per format to handle schema differences:
- `skill-md-parser`: Parses standard SKILL.md with YAML frontmatter (Claude Code, Codex, cross-client). Handles schema variations (Codex has `metadata` block that Claude doesn't).
- `mdc-parser` (stretch): Parses Cursor .mdc files with their own frontmatter format (`description`, `globs`, `alwaysApply`).

For every skill found, extract: YAML frontmatter (name, description, all fields), full markdown body, whether a scripts/ directory exists alongside it, file's last modified date and size, and a SHA-256 checksum for cross-agent diffing.

**Similarity detection (replaces "conflict detection"):**
Three tiers, no keyword overlap heuristics:
1. **Exact duplicates**: Same checksum across agents → "Identical in Claude Code and Codex"
2. **Same name, different content**: Same `name` field, different checksums → "Differs between agents" (enables diff view)
3. **Near-identical descriptions**: >90% content similarity via edit distance → "Very similar to [other skill]"

Label these as "Similar Skills" with neutral styling (link icon, not warning triangle). Allow users to dismiss/acknowledge similarities (persisted to local config).

**Trigger extraction (demoted to detail-only):**
Parse description for phrases like "use when", "triggers on", etc. Store as heuristic trigger phrases. These are NOT shown in the main table — only in the detail panel, labeled as "Possible triggers (extracted from description)."

**API server:**
Hono server on localhost (default port auto-detected, configurable via --port). Endpoints:
- `GET /api/agents` — list detected agents with skill counts
- `GET /api/skills` — list all skills (filters: agent, scope, search query)
- `GET /api/skills/:id` — single skill with full content
- `GET /api/similarities` — detected similar skills
- `GET /api/stats` — summary statistics
- `POST /api/rescan` — force full rescan (fallback when watcher misses changes)
- Serve pre-built React dashboard as static files from same server

**WebSocket:**
Watch all detected skill directories with chokidar (followSymlinks: true). When any SKILL.md is added, changed, or deleted, re-parse the affected skill and broadcast the change to connected dashboard clients via WebSocket. Handle permission errors gracefully (log warning, skip directory).

**CLI entry point:**
`npx skilldash` starts the server and opens the browser automatically via `open` package. Support `--port` and `--no-open` flags. Parse with manual `process.argv` (only 2 flags, no library needed).

**Done when:** `npx skilldash` starts a local server that returns real skill data from the user's machine via REST API, and WebSocket pushes updates when files change.

---

## Phase 2 — Dashboard UI

Build the React web dashboard. This is the actual product.

**Single-page layout (Table + Summary Header):**
No separate overview page. Everything on one screen:
- **Summary header bar**: total skills count, agents detected (with brand color dots), similarity count. Compact, not stat cards.
- **Agent filter chips** in the header: click to filter by agent. Show agent brand color.
- **Similarity banner**: if similar skills detected, a subtle info banner (not warning) with count. Clickable to filter.

**Skills table (main content):**
- A sortable, filterable table showing every installed skill
- Columns: skill name (with agent color badge), agent, scope (global or project), description (truncated), last modified date, and a link icon if the skill has similarities
- Search bar at the top powered by minisearch for fuzzy matching across name and description
- Filter sidebar: agent, scope (global vs project), has bundled scripts
- Clicking any row opens the skill detail slide-over

**Small-state UX (< 10 skills):**
- Switch from table to card layout (3 cards feel intentional, 3 table rows feel empty)
- Hide the filter sidebar (nothing to filter)
- Show onboarding hint: "Skilldash found 3 skills in Claude Code. Install more with `npx skills add`."
- Show "Agents not detected" section with links to agent docs

**Skill detail (slide-over panel):**
- Skill name, agent badge, scope badge
- "What it does": the description from frontmatter
- "Possible triggers" (if extracted with confidence): phrases as muted tags, labeled "Heuristic — extracted from description"
- "Also installed in": if same skill name in multiple agents, show all with checksum match status. If content differs, show "View diff" button
- **Cross-agent diff view**: side-by-side diff when same skill has different content across agents (promoted from post-v1)
- Full SKILL.md content rendered as formatted markdown via marked
- File info: path on disk, file size, last modified, line count
- Action buttons: "Open in Editor" (runs `code <path>` or `cursor <path>`, detected from environment), "Copy path", "Open folder"

**Real-time updates:**
When the WebSocket reports a skill change, update the table in place with a subtle highlight animation on the affected row. Recalculate stats. Show a toast notification like "frontend-design updated in Claude Code."

**Design direction:**
Dark mode by default (developer tool aesthetic). Clean, information-dense but not cluttered. Each agent gets its own brand color used consistently across badges, chips, and the summary header. Keyboard navigable — `/` to search, arrow keys to navigate, Enter to open detail, Escape to close.

**Done when:** `npx skilldash` opens a browser with a working dashboard showing all installed skills, their details, similarity detection, and cross-agent diffs. Live updates on file changes.

---

## Phase 3 — Polish + Ship

**Theming:** Dark and light mode with a toggle. Follow system preference by default.

**Keyboard shortcuts:** `/` to search, Escape to close panels, arrow keys to navigate the table. Shown in a `?` help overlay.

**Delete (with caution):**
A "Delete" button on the skill detail panel with a confirmation modal showing the full path. Deletes the skill directory from disk. Watcher picks it up, dashboard updates. This is the only destructive action in v1.

**Frontmatter quick-edit:**
Simple form fields for name and description in the detail panel. Save writes to disk. No full code editor — use "Open in Editor" for everything else.

**Performance:** Scanning 100+ skills should complete in under 500ms. Dashboard should load in under 1 second. Test on macOS and Linux.

**README:** Hero screenshot showing the skills table with agent badges and similarity indicators. The `npx skilldash` install command. Three bullet points explaining what it does. Supported agents table. Short FAQ.

**Publish:** npm publish v1.0.0 with proper package.json (bin field pointing to CLI entry, bundled dashboard assets). GitHub release with changelog.

**Launch:** Post on Hacker News (Show HN), r/ClaudeCode, r/cursor, Twitter/X with a demo screenshot or GIF, and DEV.to article.

**Done when:** v1.0.0 is live on npm and `npx skilldash` works for anyone on macOS/Linux with Node 18+.

---

## Post v1.0 ideas (not for now)

- Windows/WSL support (path resolution already abstracted)
- Cursor .mdc full support (if not shipped in v1)
- More agents via community PRs (Windsurf, Amp, Goose, OpenCode, Gemini CLI when it ships skills)
- Skill health scoring (is the description clear? are triggers specific enough?)
- Semantic similarity detection (embeddings or LLM-based, replacing edit distance)
- Move/Copy between agents (with format adaptation warnings)
- Marketplace browsing (skills.sh, Antigravity)
- Skill templates for creating new skills
- AI-powered skill explainer for complex skills
- Export/share skill configuration (copy as JSON/gist)
