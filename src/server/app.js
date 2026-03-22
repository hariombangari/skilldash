import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanAll } from '../scanner/index.js'
import { detectSimilarities } from '../analyzer/similarity.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dashboardDist = join(__dirname, '..', '..', 'dashboard', 'dist')

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

  // Diff: Compare two skills side by side
  app.get('/api/diff/:id1/:id2', (c) => {
    const id1 = decodeURIComponent(c.req.param('id1'))
    const id2 = decodeURIComponent(c.req.param('id2'))
    const skill1 = data.skills.find(s => s.id === id1)
    const skill2 = data.skills.find(s => s.id === id2)
    if (!skill1 || !skill2) return c.json({ error: 'Skill not found' }, 404)
    return c.json({ left: skill1, right: skill2 })
  })

  app.post('/api/rescan', async (c) => {
    const stats = await rescan()
    return c.json(stats)
  })

  // Action: Open in Editor
  app.post('/api/actions/open-editor', async (c) => {
    const { filePath } = await c.req.json()
    if (!filePath) return c.json({ error: 'filePath required' }, 400)

    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)

    if (process.platform === 'darwin') {
      // On macOS, use 'open -a' which finds apps properly
      const editors = ['Cursor', 'Visual Studio Code', 'Zed']
      for (const app of editors) {
        try {
          await execFileAsync('open', ['-a', app, filePath])
          return c.json({ ok: true, editor: app })
        } catch {
          continue
        }
      }
    }

    // On Linux (or macOS fallback), try CLI commands via /usr/bin/env for PATH resolution
    for (const editor of ['cursor', 'code', 'zed']) {
      try {
        await execFileAsync('/usr/bin/env', [editor, filePath])
        return c.json({ ok: true, editor })
      } catch {
        continue
      }
    }
    return c.json({ error: 'No editor found (tried Cursor, VS Code, Zed)' }, 404)
  })

  // Action: Open Folder
  app.post('/api/actions/open-folder', async (c) => {
    const { filePath } = await c.req.json()
    if (!filePath) return c.json({ error: 'filePath required' }, 400)

    const { execFile } = await import('node:child_process')
    const { dirname } = await import('node:path')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    const folder = dirname(filePath)

    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
    try {
      await execFileAsync(opener, [folder])
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: err.message }, 500)
    }
  })

  // Action: Delete skill
  app.post('/api/actions/delete', async (c) => {
    const { filePath } = await c.req.json()
    if (!filePath) return c.json({ error: 'filePath required' }, 400)

    const { rm } = await import('node:fs/promises')
    const { dirname } = await import('node:path')

    // Delete the skill directory (parent of SKILL.md)
    const skillDir = dirname(filePath)
    try {
      await rm(skillDir, { recursive: true })
      return c.json({ ok: true, deleted: skillDir })
    } catch (err) {
      return c.json({ error: err.message }, 500)
    }
  })

  // Serve dashboard static files
  app.get('*', async (c) => {
    const url = new URL(c.req.url)
    const filePath = join(dashboardDist, url.pathname === '/' ? 'index.html' : url.pathname)

    try {
      const content = await readFile(filePath)
      const ext = filePath.split('.').pop()
      const types = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
        svg: 'image/svg+xml',
        png: 'image/png',
        json: 'application/json',
      }
      return new Response(content, {
        headers: { 'Content-Type': types[ext] || 'application/octet-stream' },
      })
    } catch {
      // SPA fallback
      try {
        const html = await readFile(join(dashboardDist, 'index.html'), 'utf-8')
        return c.html(html)
      } catch {
        return c.text('Dashboard not built. Run: npm run build:dashboard', 404)
      }
    }
  })

  // Expose rescan for watcher integration
  app._rescan = rescan

  return app
}
