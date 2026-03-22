import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchStats, fetchAgents, fetchSkills, fetchSimilarities } from '../lib/api'

export function useSkills() {
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [allSkills, setAllSkills] = useState([])
  const [similarities, setSimilarities] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [agentFilter, setAgentFilter] = useState(null)
  const [scopeFilter, setScopeFilter] = useState(null)
  const [query, setQuery] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [statsData, agentsData, skillsData, simData] = await Promise.all([
        fetchStats(),
        fetchAgents(),
        fetchSkills(),
        fetchSimilarities(),
      ])
      setStats(statsData)
      setAgents(agentsData)
      setAllSkills(skillsData)
      setSimilarities(simData)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Client-side filtering
  const skills = useMemo(() => {
    let filtered = allSkills
    if (agentFilter) {
      filtered = filtered.filter(s => s.agentId === agentFilter)
    }
    if (scopeFilter) {
      filtered = filtered.filter(s => s.scope === scopeFilter)
    }
    if (query) {
      const lower = query.toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower)
      )
    }
    return filtered
  }, [allSkills, agentFilter, scopeFilter, query])

  return {
    stats,
    agents,
    skills,
    allSkills,
    similarities,
    loading,
    refetch: loadData,
    agentFilter,
    setAgentFilter,
    scopeFilter,
    setScopeFilter,
    query,
    setQuery,
  }
}
