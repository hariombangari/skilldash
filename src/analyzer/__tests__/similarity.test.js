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
