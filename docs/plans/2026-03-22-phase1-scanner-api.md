# Phase 1: Scanner + API Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the backend that scans the filesystem for agent skills and serves data via REST API + WebSocket.

**Architecture:** Hono server with adapter-based skill parsers per agent format. chokidar watches directories for live changes and broadcasts via WebSocket. CLI entry point starts server and opens browser.

**Tech Stack:** Node.js 18+, Hono, @hono/node-server, @hono/node-ws, ws, chokidar v5, gray-matter, fast-glob, open

---

## Task 1: Project Setup

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `src/index.js` (CLI entry point)
- Delete: `index.js` (empty placeholder)

**Step 1: Update package.json**

```json
{
  "name": "skilldash",
  "version": "0.0.1",
  "description": "One command. One dashboard. See and understand all your agent skills.",
  "type": "module",
  "bin": {
    "skilldash": "./src/index.js"
  },
  "scripts": {
    "dev": "node src/index.js",
    "test": "node --test"
  },
  "keywords": ["agent", "skills", "dashboard", "claude", "codex", "cursor"],
  "author": "hariombangari",
  "license": "MIT",
  "dependencies": {
    "hono": "^4",
    "@hono/node-server": "^1",
    "@hono/node-ws": "^1",
    "ws": "^8",
    "chokidar": "^4",
    "gray-matter": "^4",
    "fast-glob": "^3",
    "open": "^10"
  }
}
```

**Step 2: Install dependencies**

Run: `npm install`
Expected: Clean install, package-lock.json generated

**Step 3: Update .gitignore**

```
node_modules/
dist/
.env*.local
_bmad*
.DS_Store
```

**Step 4: Create CLI entry point stub**

Create `src/index.js`:
```js
#!/usr/bin/env node
console.log('skilldash starting...')
```

**Step 5: Delete empty index.js and verify**

Run: `rm index.js && node src/index.js`
Expected: prints "skilldash starting..."

**Step 6: Commit**

```
git add package.json package-lock.json .gitignore src/index.js
git rm index.js
git commit -m "feat: project setup with dependencies and CLI entry point"
```

---

## Task 2: Agent Registry

**Files:**
- Create: `src/agents/registry.js`
- Create: `src/agents/__tests__/registry.test.js`

**Step 1: Write the failing test**

Create `src/agents/__tests__/registry.test.js`:
```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAgentRegistry, detectAgents } from '../registry.js'

describe('getAgentRegistry', () => {
  it('returns all known agents with paths', () => {
    const registry = getAgentRegistry('/home/user', '/project')
    assert.ok(registry.length > 0)

    const claude = registry.find(a => a.id === 'claude-code')
    assert.ok(claude)
    assert.equal(claude.name, 'Claude Code')
    assert.ok(claude.paths.length > 0)
    assert.ok(claude.paths.some(p => p.includes('/home/user')))
    assert.ok(claude.paths.some(p => p.includes('/project')))
  })

  it('includes cross-client agent', () => {
    const registry = getAgentRegistry('/home/user', '/project')
    const crossClient = registry.find(a => a.id === 'cross-client')
    assert.ok(crossClient)
  })
})

describe('detectAgents', () => {
  it('returns only agents whose paths exist on disk', async () => {
    const agents = await detectAgents()
    assert.ok(Array.isArray(agents))
    // On this machine, at least claude-code should be detected
    for (const agent of agents) {
      assert.ok(agent.id)
      assert.ok(agent.name)
      assert.ok(agent.detectedPaths.length > 0)
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `node --test src/agents/__tests__/registry.test.js`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/agents/registry.js`:
```js
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const AGENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    color: '#D97706',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.claude', 'skills'),
      ...(project ? [join(project, '.claude', 'skills')] : []),
    ],
  },
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    color: '#10B981',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.codex', 'skills'),
      ...(project ? [join(project, '.codex', 'skills')] : []),
    ],
    excludeDirs: ['.system'],
  },
  {
    id: 'cross-client',
    name: 'Cross-Client',
    color: '#6366F1',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.agents', 'skills'),
      ...(project ? [join(project, '.agents', 'skills')] : []),
    ],
  },
]

export function getAgentRegistry(home, project) {
  return AGENTS.map(agent => ({
    ...agent,
    paths: agent.paths(home, project),
  }))
}

export async function detectAgents(project = process.cwd()) {
  const home = homedir()
  const registry = getAgentRegistry(home, project)

  const detected = []
  for (const agent of registry) {
    const detectedPaths = agent.paths.filter(p => existsSync(p))
    if (detectedPaths.length > 0) {
      detected.push({
        id: agent.id,
        name: agent.name,
        color: agent.color,
        format: agent.format,
        detectedPaths,
        excludeDirs: agent.excludeDirs || [],
      })
    }
  }
  return detected
}
```

**Step 4: Run test to verify it passes**

Run: `node --test src/agents/__tests__/registry.test.js`
Expected: PASS (at least claude-code detected on this machine)

**Step 5: Commit**

```
git add src/agents/
git commit -m "feat: agent registry with path detection for Claude Code, Codex, cross-client"
```

---

## Task 3: Skill Parser

**Files:**
- Create: `src/parser/skill-md.js`
- Create: `src/parser/__tests__/skill-md.test.js`

**Step 1: Write the failing test**

Create `src/parser/__tests__/skill-md.test.js`:
```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSkillFile } from '../skill-md.js'

const SAMPLE_SKILL = `---
name: test-skill
description: Use when testing parsers. Triggers on test runs.
origin: ECC
---

# Test Skill

## When to Activate

- Running tests
- Verifying parser behavior
`

describe('parseSkillFile', () => {
  it('extracts frontmatter fields', () => {
    const result = parseSkillFile(SAMPLE_SKILL, '/path/to/test-skill/SKILL.md')
    assert.equal(result.name, 'test-skill')
    assert.equal(result.frontmatter.origin, 'ECC')
    assert.ok(result.description.includes('testing parsers'))
  })

  it('extracts markdown body', () => {
    const result = parseSkillFile(SAMPLE_SKILL, '/path/to/test-skill/SKILL.md')
    assert.ok(result.body.includes('# Test Skill'))
    assert.ok(result.body.includes('Running tests'))
  })

  it('computes checksum', () => {
    const result = parseSkillFile(SAMPLE_SKILL, '/path/to/test-skill/SKILL.md')
    assert.ok(result.checksum)
    assert.equal(result.checksum.length, 64) // SHA-256 hex
  })

  it('extracts trigger phrases from description', () => {
    const result = parseSkillFile(SAMPLE_SKILL, '/path/to/test-skill/SKILL.md')
    assert.ok(Array.isArray(result.triggers))
    assert.ok(result.triggers.length > 0)
    assert.ok(result.triggers.some(t => t.toLowerCase().includes('testing parsers')))
  })

  it('stores file path', () => {
    const result = parseSkillFile(SAMPLE_SKILL, '/path/to/test-skill/SKILL.md')
    assert.equal(result.filePath, '/path/to/test-skill/SKILL.md')
  })

  it('handles missing frontmatter gracefully', () => {
    const result = parseSkillFile('# Just markdown\nNo frontmatter here', '/p/s/SKILL.md')
    assert.equal(result.name, 's') // falls back to parent dir name
    assert.equal(result.description, '')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `node --test src/parser/__tests__/skill-md.test.js`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/parser/skill-md.js`:
```js
import { createHash } from 'node:crypto'
import { basename, dirname } from 'node:path'
import matter from 'gray-matter'

const TRIGGER_PATTERNS = [
  /use\s+when\s+(.+?)(?:\.|$)/gi,
  /triggers?\s+(?:on|when)\s+(.+?)(?:\.|$)/gi,
  /use\s+this\s+(?:skill|tool)\s+when\s+(?:the\s+user\s+)?(.+?)(?:\.|$)/gi,
  /activate\s+(?:when|for)\s+(.+?)(?:\.|$)/gi,
]

export function extractTriggers(description) {
  if (!description) return []
  const triggers = []
  for (const pattern of TRIGGER_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(description)) !== null) {
      const phrase = match[1].trim()
      if (phrase.length > 3 && phrase.length < 200) {
        triggers.push(phrase)
      }
    }
  }
  return triggers
}

export function parseSkillFile(content, filePath) {
  const checksum = createHash('sha256').update(content).digest('hex')

  let frontmatter = {}
  let body = content

  try {
    const parsed = matter(content)
    frontmatter = parsed.data || {}
    body = parsed.content
  } catch {
    // If frontmatter parsing fails, treat entire content as body
  }

  const skillDirName = basename(dirname(filePath))
  const name = frontmatter.name || skillDirName
  const description = frontmatter.description || ''
  const triggers = extractTriggers(description)

  return {
    name,
    description,
    frontmatter,
    body,
    checksum,
    triggers,
    filePath,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test src/parser/__tests__/skill-md.test.js`
Expected: PASS

**Step 5: Commit**

```
git add src/parser/
git commit -m "feat: SKILL.md parser with frontmatter extraction and trigger detection"
```

---

## Task 4: Scanner

**Files:**
- Create: `src/scanner/index.js`
- Create: `src/scanner/__tests__/scanner.test.js`

**Step 1: Write the failing test**

Create `src/scanner/__tests__/scanner.test.js`:
```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scanAgent, scanAll } from '../index.js'

describe('scanAgent', () => {
  it('finds SKILL.md files in a real agent directory', async () => {
    const home = (await import('node:os')).homedir()
    const claudeSkillsDir = `${home}/.claude/skills`
    const skills = await scanAgent(claudeSkillsDir, [])
    assert.ok(skills.length > 0, 'Should find at least one skill')

    const first = skills[0]
    assert.ok(first.name)
    assert.ok(first.filePath)
    assert.ok(first.checksum)
  })
})

describe('scanAll', () => {
  it('returns skills grouped by agent with metadata', async () => {
    const result = await scanAll()
    assert.ok(result.agents.length > 0)
    assert.ok(result.skills.length > 0)
    assert.ok(result.stats.totalSkills > 0)

    const firstSkill = result.skills[0]
    assert.ok(firstSkill.agentId)
    assert.ok(firstSkill.scope) // 'global' or 'project'
    assert.ok(firstSkill.id) // unique ID
  })
})
```

**Step 2: Run test to verify it fails**

Run: `node --test src/scanner/__tests__/scanner.test.js`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/scanner/index.js`:
```js
import fg from 'fast-glob'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { detectAgents } from '../agents/registry.js'
import { parseSkillFile } from '../parser/skill-md.js'

export async function scanAgent(dirPath, excludeDirs = []) {
  const pattern = '**/SKILL.md'
  const ignore = excludeDirs.map(d => `**/${d}/**`)

  const files = await fg(pattern, {
    cwd: dirPath,
    absolute: true,
    followSymbolicLinks: true,
    ignore,
  })

  const skills = []
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const fileStat = await stat(filePath)
      const parsed = parseSkillFile(content, filePath)

      skills.push({
        ...parsed,
        fileSize: fileStat.size,
        lastModified: fileStat.mtime.toISOString(),
        lineCount: content.split('\n').length,
        hasScripts: existsSync(join(filePath, '..', 'scripts')),
      })
    } catch (err) {
      // Skip files we cannot read (permission errors, etc.)
      console.warn(`Skipping ${filePath}: ${err.message}`)
    }
  }
  return skills
}

export async function scanAll(projectDir = process.cwd()) {
  const home = homedir()
  const agents = await detectAgents(projectDir)
  const allSkills = []

  for (const agent of agents) {
    for (const dirPath of agent.detectedPaths) {
      const isGlobal = dirPath.startsWith(home) && !dirPath.startsWith(projectDir)
      const scope = isGlobal ? 'global' : 'project'
      const skills = await scanAgent(dirPath, agent.excludeDirs)

      for (const skill of skills) {
        allSkills.push({
          ...skill,
          id: `${agent.id}:${skill.name}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          scope,
        })
      }
    }
  }

  return {
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      color: a.color,
      skillCount: allSkills.filter(s => s.agentId === a.id).length,
    })),
    skills: allSkills,
    stats: {
      totalSkills: allSkills.length,
      totalAgents: agents.length,
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test src/scanner/__tests__/scanner.test.js`
Expected: PASS - finds 47+ Claude Code skills

**Step 5: Commit**

```
git add src/scanner/
git commit -m "feat: filesystem scanner finds SKILL.md files across detected agents"
```

---

## Task 5: Similarity Detection

**Files:**
- Create: `src/analyzer/similarity.js`
- Create: `src/analyzer/__tests__/similarity.test.js`

**Step 1: Write the failing test**

Create `src/analyzer/__tests__/similarity.test.js`:
```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectSimilarities } from '../similarity.js'

describe('detectSimilarities', () => {
  it('detects exact duplicates by checksum', () => {
    const skills = [
      { id: 'a:foo', name: 'foo', checksum: 'abc123', agentId: 'a', description: 'desc' },
      { id: 'b:foo', name: 'foo', checksum: 'abc123', agentId: 'b', description: 'desc' },
    ]
    const result = detectSimilarities(skills)
    assert.ok(result.some(s => s.type === 'exact-duplicate'))
  })

  it('detects same name with different content', () => {
    const skills = [
      { id: 'a:foo', name: 'foo', checksum: 'abc123', agentId: 'a', description: 'desc a' },
      { id: 'b:foo', name: 'foo', checksum: 'def456', agentId: 'b', description: 'desc b' },
    ]
    const result = detectSimilarities(skills)
    assert.ok(result.some(s => s.type === 'same-name-different-content'))
  })

  it('does not flag unrelated skills', () => {
    const skills = [
      { id: 'a:foo', name: 'foo', checksum: 'abc', agentId: 'a', description: 'totally different' },
      { id: 'a:bar', name: 'bar', checksum: 'def', agentId: 'a', description: 'nothing alike' },
    ]
    const result = detectSimilarities(skills)
    assert.equal(result.length, 0)
  })

  it('detects near-identical descriptions', () => {
    const skills = [
      { id: 'a:foo', name: 'foo', checksum: 'abc', agentId: 'a', description: 'Format Python code according to Black style guidelines' },
      { id: 'a:bar', name: 'bar', checksum: 'def', agentId: 'a', description: 'Format Python code according to Black style guidelines and rules' },
    ]
    const result = detectSimilarities(skills)
    assert.ok(result.some(s => s.type === 'near-identical-description'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `node --test src/analyzer/__tests__/similarity.test.js`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/analyzer/similarity.js`:
```js
export function editDistance(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}

export function descriptionSimilarity(a, b) {
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - editDistance(a.toLowerCase(), b.toLowerCase()) / maxLen
}

export function detectSimilarities(skills) {
  const similarities = []

  // Group by name to find cross-agent duplicates
  const byName = new Map()
  for (const skill of skills) {
    const group = byName.get(skill.name) || []
    group.push(skill)
    byName.set(skill.name, group)
  }

  for (const [name, group] of byName) {
    if (group.length < 2) continue

    const checksums = new Set(group.map(s => s.checksum))
    if (checksums.size === 1) {
      similarities.push({
        type: 'exact-duplicate',
        skills: group.map(s => s.id),
        message: `"${name}" is identical across ${group.map(s => s.agentName || s.agentId).join(', ')}`,
      })
    } else {
      similarities.push({
        type: 'same-name-different-content',
        skills: group.map(s => s.id),
        message: `"${name}" differs between ${group.map(s => s.agentName || s.agentId).join(', ')}`,
      })
    }
  }

  // Find near-identical descriptions within same agent
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i]
      const b = skills[j]
      if (a.name === b.name) continue // Already handled above

      const sim = descriptionSimilarity(a.description, b.description)
      if (sim >= 0.9) {
        similarities.push({
          type: 'near-identical-description',
          skills: [a.id, b.id],
          similarity: Math.round(sim * 100),
          message: `"${a.name}" and "${b.name}" have ${Math.round(sim * 100)}% similar descriptions`,
        })
      }
    }
  }

  return similarities
}
```

**Step 4: Run test to verify it passes**

Run: `node --test src/analyzer/__tests__/similarity.test.js`
Expected: PASS

**Step 5: Commit**

```
git add src/analyzer/
git commit -m "feat: similarity detection via checksums and description matching"
```

---

## Task 6: API Server

**Files:**
- Create: `src/server/app.js`
- Create: `src/server/__tests__/app.test.js`

**Step 1: Write the failing test**

Create `src/server/__tests__/app.test.js`:
```js
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../app.js'

describe('API endpoints', () => {
  let app

  before(async () => {
    app = await createApp()
  })

  it('GET /api/stats returns summary', async () => {
    const res = await app.request('/api/stats')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(typeof data.totalSkills === 'number')
    assert.ok(typeof data.totalAgents === 'number')
  })

  it('GET /api/agents returns detected agents', async () => {
    const res = await app.request('/api/agents')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.ok(data.length > 0)
    assert.ok(data[0].id)
    assert.ok(data[0].name)
  })

  it('GET /api/skills returns all skills', async () => {
    const res = await app.request('/api/skills')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data))
    assert.ok(data.length > 0)
  })

  it('GET /api/skills?agent=claude-code filters by agent', async () => {
    const res = await app.request('/api/skills?agent=claude-code')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.every(s => s.agentId === 'claude-code'))
  })

  it('GET /api/skills?q=api searches skills', async () => {
    const res = await app.request('/api/skills?q=api')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.length > 0)
  })

  it('GET /api/skills/:id returns single skill', async () => {
    const allRes = await app.request('/api/skills')
    const all = await allRes.json()
    const firstId = encodeURIComponent(all[0].id)

    const res = await app.request(`/api/skills/${firstId}`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.name)
    assert.ok(data.body) // full markdown content
  })

  it('GET /api/similarities returns similarity data', async () => {
    const res = await app.request('/api/similarities')
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(Array.isArray(data))
  })

  it('POST /api/rescan triggers rescan', async () => {
    const res = await app.request('/api/rescan', { method: 'POST' })
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.totalSkills >= 0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `node --test src/server/__tests__/app.test.js`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/server/app.js`:
```js
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { scanAll } from '../scanner/index.js'
import { detectSimilarities } from '../analyzer/similarity.js'

export async function createApp() {
  const app = new Hono()
  app.use('*', cors())

  // Initial scan
  let data = await scanAll()
  let similarities = detectSimilarities(data.skills)

  // Rescan function (called by watcher and manual rescan)
  async function rescan() {
    data = await scanAll()
    similarities = detectSimilarities(data.skills)
    return data.stats
  }

  app.get('/api/stats', (c) => {
    return c.json({
      ...data.stats,
      totalSimilarities: similarities.length,
    })
  })

  app.get('/api/agents', (c) => {
    return c.json(data.agents)
  })

  app.get('/api/skills', (c) => {
    let skills = data.skills

    const agent = c.req.query('agent')
    if (agent) {
      skills = skills.filter(s => s.agentId === agent)
    }

    const scope = c.req.query('scope')
    if (scope) {
      skills = skills.filter(s => s.scope === scope)
    }

    const q = c.req.query('q')
    if (q) {
      const lower = q.toLowerCase()
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower)
      )
    }

    // Return skills without full body for list view
    return c.json(skills.map(({ body, ...rest }) => rest))
  })

  app.get('/api/skills/:id', (c) => {
    const id = decodeURIComponent(c.req.param('id'))
    const skill = data.skills.find(s => s.id === id)
    if (!skill) return c.json({ error: 'Not found' }, 404)
    return c.json(skill)
  })

  app.get('/api/similarities', (c) => {
    return c.json(similarities)
  })

  app.post('/api/rescan', async (c) => {
    const stats = await rescan()
    return c.json(stats)
  })

  // Expose rescan for watcher integration
  app._rescan = rescan

  return app
}
```

**Step 4: Run test to verify it passes**

Run: `node --test src/server/__tests__/app.test.js`
Expected: PASS

**Step 5: Commit**

```
git add src/server/
git commit -m "feat: Hono API server with skills, agents, similarities, and rescan endpoints"
```

---

## Task 7: File Watcher

**Files:**
- Create: `src/watcher/index.js`

**Step 1: Write the watcher module**

Create `src/watcher/index.js`:
```js
import chokidar from 'chokidar'

export function createWatcher(dirs, onChange) {
  const watcher = chokidar.watch(dirs, {
    persistent: true,
    followSymlinks: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('add', (path) => {
    if (path.endsWith('SKILL.md')) onChange('added', path)
  })
  watcher.on('change', (path) => {
    if (path.endsWith('SKILL.md')) onChange('changed', path)
  })
  watcher.on('unlink', (path) => {
    if (path.endsWith('SKILL.md')) onChange('removed', path)
  })

  return watcher
}
```

**Step 2: No unit test** (thin chokidar wrapper, validated via manual integration test in Task 8)

**Step 3: Commit**

```
git add src/watcher/
git commit -m "feat: file watcher for SKILL.md changes via chokidar"
```

---

## Task 8: CLI Entry Point + Server Startup

**Files:**
- Modify: `src/index.js`

**Step 1: Write the full CLI entry point**

Update `src/index.js`:
```js
#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import open from 'open'
import { createApp } from './server/app.js'
import { createWatcher } from './watcher/index.js'
import { detectAgents } from './agents/registry.js'

const args = process.argv.slice(2)
const noOpen = args.includes('--no-open')
const portArg = args.find((_, i, a) => a[i - 1] === '--port')
const port = portArg ? parseInt(portArg, 10) : 3377

async function main() {
  console.log('skilldash - scanning for agent skills...\n')

  const app = await createApp()

  // WebSocket setup
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
  const clients = new Set()

  app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(evt, ws) {
      clients.add(ws)
    },
    onClose() {
      clients.delete(this)
    },
  })))

  function broadcast(event) {
    const message = JSON.stringify(event)
    for (const ws of clients) {
      try { ws.send(message) } catch { clients.delete(ws) }
    }
  }

  // Start server
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`  Dashboard: http://localhost:${info.port}`)
    console.log('  Press Ctrl+C to stop\n')

    if (!noOpen) {
      open(`http://localhost:${info.port}`)
    }
  })

  injectWebSocket(server)

  // Set up file watching
  const agents = await detectAgents()
  const watchDirs = agents.flatMap(a => a.detectedPaths)

  if (watchDirs.length > 0) {
    createWatcher(watchDirs, async (event, path) => {
      console.log(`  ${event}: ${path}`)
      await app._rescan()
      broadcast({ type: 'skill-change', event, path })
    })
    console.log(`  Watching ${watchDirs.length} directories for changes`)
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    server.close()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Failed to start skilldash:', err.message)
  process.exit(1)
})
```

**Step 2: Manual integration test**

Run: `node src/index.js --no-open`
Expected:
- Prints "skilldash - scanning for agent skills..."
- Prints dashboard URL
- Prints "Watching N directories for changes"
- `curl http://localhost:3377/api/stats` returns JSON with totalSkills > 0
- `curl http://localhost:3377/api/agents` returns agent list
- `curl http://localhost:3377/api/skills` returns skills array
- Ctrl+C shuts down cleanly

**Step 3: Commit**

```
git add src/index.js
git commit -m "feat: CLI entry point with server, WebSocket, and file watcher"
```

---

## Task 9: Integration Smoke Test

**Files:**
- Create: `src/__tests__/integration.test.js`

**Step 1: Write integration test**

Create `src/__tests__/integration.test.js`:
```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../server/app.js'

describe('Full integration', () => {
  it('scans real filesystem and returns coherent data', async () => {
    const app = await createApp()

    // Stats
    const statsRes = await app.request('/api/stats')
    const stats = await statsRes.json()
    assert.ok(stats.totalSkills > 0, `Expected skills, got ${stats.totalSkills}`)

    // Agents
    const agentsRes = await app.request('/api/agents')
    const agents = await agentsRes.json()
    assert.ok(agents.some(a => a.id === 'claude-code'), 'Claude Code should be detected')

    // Skills list
    const skillsRes = await app.request('/api/skills')
    const skills = await skillsRes.json()
    assert.equal(skills.length, stats.totalSkills)

    // Single skill detail
    const firstId = encodeURIComponent(skills[0].id)
    const detailRes = await app.request(`/api/skills/${firstId}`)
    const detail = await detailRes.json()
    assert.ok(detail.body, 'Detail should include full markdown body')
    assert.ok(detail.checksum, 'Detail should include checksum')

    // Search
    const searchRes = await app.request('/api/skills?q=api')
    const searchResults = await searchRes.json()
    assert.ok(searchResults.length < skills.length, 'Search should filter results')

    console.log(`Integration: ${stats.totalSkills} skills across ${stats.totalAgents} agents`)
  })
})
```

**Step 2: Run all tests**

Run: `node --test src/**/__tests__/*.test.js`
Expected: ALL PASS

**Step 3: Commit**

```
git add src/__tests__/
git commit -m "test: integration smoke test for full scanner + API pipeline"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Project setup | package.json, .gitignore, src/index.js |
| 2 | Agent registry | src/agents/registry.js + test |
| 3 | Skill parser | src/parser/skill-md.js + test |
| 4 | Scanner | src/scanner/index.js + test |
| 5 | Similarity detection | src/analyzer/similarity.js + test |
| 6 | API server | src/server/app.js + test |
| 7 | File watcher | src/watcher/index.js |
| 8 | CLI entry point | src/index.js (full) |
| 9 | Integration test | src/__tests__/integration.test.js |

**Done when:** `node src/index.js` starts a server that returns real skill data from your machine, WebSocket broadcasts file changes, and all tests pass.
