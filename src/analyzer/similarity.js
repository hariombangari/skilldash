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

  // Find near-identical descriptions across different-named skills
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i]
      const b = skills[j]
      if (a.name === b.name) continue // Already handled above

      const sim = descriptionSimilarity(a.description, b.description)
      if (sim >= 0.8) {
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
