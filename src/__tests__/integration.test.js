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
