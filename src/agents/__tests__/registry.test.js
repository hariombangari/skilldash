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
    for (const agent of agents) {
      assert.ok(agent.id)
      assert.ok(agent.name)
      assert.ok(agent.detectedPaths.length > 0)
    }
  })
})
