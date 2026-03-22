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
