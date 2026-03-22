# skilldash

**One command. One dashboard. See and understand all your AI agent skills.**

```bash
npx skilldash
```

skilldash scans your machine for AI agent skills (SKILL.md files), then opens a local web dashboard where you can browse, search, compare, and manage them all in one place.

---

## Why skilldash?

If you use Claude Code, Codex CLI, or other AI coding agents, you've probably accumulated skills across `~/.claude/skills/`, project-level directories, and maybe even cross-client locations. skilldash finds all of them and puts them in one searchable interface.

- **See everything at a glance** -- every skill across every agent, in one table
- **Detect duplicates** -- find identical skills, same-name conflicts, and near-identical descriptions across agents
- **Compare diffs** -- side-by-side view when the same skill has different content in different agents
- **Live updates** -- dashboard refreshes automatically when you edit, add, or remove skills on disk
- **Open in editor** -- one click to open any skill in Cursor, VS Code, or Zed

## Quick Start

```bash
# Run directly (no install needed)
npx skilldash

# Or install globally
npm install -g skilldash
skilldash
```

Your browser opens automatically with the dashboard at `http://localhost:3377`.

### CLI Options

```bash
skilldash --port 8080    # Use a custom port (default: 3377)
skilldash --no-open      # Don't open browser automatically
```

## Supported Agents

| Agent | Global Skills | Project Skills |
|-------|--------------|----------------|
| **Claude Code** | `~/.claude/skills/` | `<project>/.claude/skills/` |
| **Codex CLI** | `~/.codex/skills/` | `<project>/.codex/skills/` |
| **Cross-Client** | `~/.agents/skills/` | `<project>/.agents/skills/` |

skilldash auto-detects which agents you have installed by checking which directories exist. Only agents with skills are shown.

## Features

### Skills Table

A sortable, searchable table showing every installed skill. Each row shows the skill name (with agent color badge), agent, scope (global or project), description, and last modified date. Skills with detected similarities show a link icon.

For fewer than 10 skills, the table switches to a card layout that feels more intentional.

### Skill Detail Panel

Click any skill to open a slide-over panel with:
- Full description and extracted trigger phrases
- Cross-agent similarity detection ("Also installed in...")
- Full SKILL.md content rendered as formatted markdown
- File path, size, last modified date, and line count
- Action buttons: **Open in Editor**, **Copy Path**, **Open Folder**, **Delete**

### Similarity Detection

skilldash detects three types of similarities across agents:

- **Exact duplicates** -- identical content (same SHA-256 checksum)
- **Same name, different content** -- same skill name but different implementations (with diff view)
- **Near-identical descriptions** -- very similar descriptions detected via edit distance

### Cross-Agent Diff View

When the same skill exists in multiple agents with different content, click "View diff" to see a side-by-side comparison with line-level highlighting.

### Live Updates

skilldash watches all detected skill directories for changes using chokidar. When a SKILL.md file is added, modified, or deleted (by any tool or manual edit), the dashboard updates in real time via WebSocket.

### Search & Filter

- Type `/` to focus the search bar (fuzzy search across name and description)
- Filter by agent using the color-coded chips in the header
- Filter by scope (global vs project)
- Keyboard navigation: `j`/`k` to move, `Enter` to open, `Escape` to close, `?` for help

### Dark & Light Mode

Dark mode by default (developer tool aesthetic). Toggle with the theme button. Follows your system preference on first visit.

## How It Works

1. **Scan** -- On startup, skilldash recursively scans all known agent skill directories for SKILL.md files
2. **Parse** -- Each file is parsed for YAML frontmatter (name, description, metadata) and markdown body
3. **Analyze** -- Skills are compared across agents using checksums and edit distance to detect similarities
4. **Serve** -- A local Hono server provides the REST API and serves the pre-built React dashboard
5. **Watch** -- chokidar monitors skill directories and pushes changes via WebSocket

## Requirements

- **Node.js 18+**
- **macOS or Linux** (Windows/WSL support planned)

## Tech Stack

- [Hono](https://hono.dev) -- lightweight server (API + static files)
- [React 19](https://react.dev) + [Vite 6](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com) -- dashboard UI
- [chokidar](https://github.com/paulmillr/chokidar) -- filesystem watching
- [gray-matter](https://github.com/jonschlinkert/gray-matter) -- YAML frontmatter parsing
- [fast-glob](https://github.com/mrmlnc/fast-glob) -- recursive file discovery
- [marked](https://github.com/markedjs/marked) -- markdown rendering

The dashboard is pre-built at publish time and bundled in the npm package. No build step required at runtime.

## FAQ

**Does skilldash install or manage skills?**
No. skilldash is read-only (except for the optional delete action). Use your agent's skill installer or manually create SKILL.md files.

**Does skilldash need an internet connection?**
No. Everything runs locally. No cloud sync, no telemetry, no external API calls.

**What if I only use one agent?**
skilldash is still useful. You get a searchable dashboard of all your skills with full markdown rendering, trigger extraction, and quick editor access.

**Can I add support for more agents?**
Yes. The agent registry in `src/agents/registry.js` is designed to be extended. PRs welcome for Cursor (.mdc), Windsurf, Amp, and others.

**What happens if a skill directory doesn't exist?**
skilldash silently skips it. Only agents with detected skills are shown in the dashboard.

## Contributing

Contributions are welcome. To develop locally:

```bash
git clone https://github.com/hariombangari/skilldash.git
cd skilldash
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..

# Build dashboard
npm run build

# Run locally
npm run dev
```

The dashboard dev server (with hot reload) can be run separately:

```bash
npm run dev:dashboard
```

## License

MIT
