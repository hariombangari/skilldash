import { useEffect, useRef } from 'react'
import ThemeToggle from './ThemeToggle'

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-zinc-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg
      className="w-4 h-4 text-zinc-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      className="w-4 h-4 text-zinc-500 hover:text-zinc-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

export default function Header({
  stats,
  agents,
  agentFilter,
  setAgentFilter,
  query,
  setQuery,
  theme,
  onToggleTheme,
}) {
  const searchRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const statsText = stats
    ? `${stats.totalSkills} skills \u00b7 ${stats.totalAgents} agents${stats.totalSimilarities > 0 ? ` \u00b7 ${stats.totalSimilarities} similar` : ''}`
    : ''

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-white">skilldash</span>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 text-sm">{statsText}</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {/* Agent filter chips */}
      {agents.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap">
          {agents.map((agent) => {
            const isActive = agentFilter === agent.id
            return (
              <button
                key={agent.id}
                onClick={() => setAgentFilter(isActive ? null : agent.id)}
                className={`rounded-full px-3 py-1 text-sm border cursor-pointer transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
                style={
                  isActive
                    ? { backgroundColor: `${agent.color}22`, borderColor: agent.color }
                    : undefined
                }
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: agent.color }}
                />
                <span>{agent.name}</span>
                <span className="text-zinc-500">{agent.skillCount}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search skills... (press /)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-full pl-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-3 flex items-center"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Similarity banner */}
      {stats && stats.totalSimilarities > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-400 flex items-center gap-2">
          <LinkIcon />
          <span>{stats.totalSimilarities} similar skills detected</span>
        </div>
      )}
    </header>
  )
}
