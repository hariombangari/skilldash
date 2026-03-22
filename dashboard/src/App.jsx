import { useState, useEffect } from 'react'

export default function App() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Scanning for skills...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">skilldash</h1>
      {stats && (
        <p className="text-zinc-400">
          Found {stats.totalSkills} skills across {stats.totalAgents} agents
        </p>
      )}
    </div>
  )
}
