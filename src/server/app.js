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
