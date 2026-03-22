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
