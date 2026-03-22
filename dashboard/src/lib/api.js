const BASE = ''  // Empty string = relative URLs (works with both proxy and production)

export async function fetchStats() {
  const res = await fetch(`${BASE}/api/stats`)
  return res.json()
}

export async function fetchAgents() {
  const res = await fetch(`${BASE}/api/agents`)
  return res.json()
}

export async function fetchSkills({ agent, scope, q } = {}) {
  const params = new URLSearchParams()
  if (agent) params.set('agent', agent)
  if (scope) params.set('scope', scope)
  if (q) params.set('q', q)
  const qs = params.toString()
  const res = await fetch(`${BASE}/api/skills${qs ? `?${qs}` : ''}`)
  return res.json()
}

export async function fetchSkillDetail(id) {
  const res = await fetch(`${BASE}/api/skills/${encodeURIComponent(id)}`)
  return res.json()
}

export async function fetchSimilarities() {
  const res = await fetch(`${BASE}/api/similarities`)
  return res.json()
}

export async function triggerRescan() {
  const res = await fetch(`${BASE}/api/rescan`, { method: 'POST' })
  return res.json()
}
