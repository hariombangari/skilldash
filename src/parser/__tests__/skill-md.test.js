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
