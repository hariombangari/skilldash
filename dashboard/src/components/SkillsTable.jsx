import { useState, useEffect, useRef, useCallback } from 'react'

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function SortArrow({ direction }) {
  if (direction === 'asc') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block ml-1">
        <path d="M6 3L10 8H2L6 3Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="inline-block ml-1">
      <path d="M6 9L2 4H10L6 9Z" fill="currentColor" />
    </svg>
  )
}

function ChainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-400">
      <path
        d="M5.5 8.5L8.5 5.5M4.5 6.5L3.15 7.85C2.28 8.72 2.28 10.13 3.15 11S5.28 11.72 6.15 10.85L7.5 9.5M6.5 4.5L7.85 3.15C8.72 2.28 10.13 2.28 11 3.15S11.72 5.28 10.85 6.15L9.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'agent', label: 'Agent' },
  { key: 'scope', label: 'Scope' },
  { key: 'description', label: 'Description' },
  { key: 'modified', label: 'Modified' },
  { key: 'similar', label: 'Similar', sortable: false },
]

function buildSimilaritySet(similarities) {
  const set = new Set()
  for (const sim of similarities) {
    if (Array.isArray(sim.skills)) {
      for (const id of sim.skills) {
        set.add(id)
      }
    }
  }
  return set
}

function sortSkills(skills, sortKey, sortDir) {
  const sorted = [...skills]
  sorted.sort((a, b) => {
    let aVal = a[sortKey] ?? ''
    let bVal = b[sortKey] ?? ''

    if (sortKey === 'modified') {
      aVal = new Date(aVal).getTime() || 0
      bVal = new Date(bVal).getTime() || 0
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = (bVal || '').toLowerCase()
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })
  return sorted
}

export default function SkillsTable({
  skills,
  similarities,
  onSelectSkill,
  highlightedSkill,
  selectedIndex,
}) {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [fadingSkill, setFadingSkill] = useState(null)
  const fadeTimerRef = useRef(null)

  const handleSort = useCallback((key) => {
    const col = COLUMNS.find((c) => c.key === key)
    if (col?.sortable === false) return

    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  useEffect(() => {
    if (highlightedSkill) {
      setFadingSkill(highlightedSkill)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = setTimeout(() => {
        setFadingSkill(null)
      }, 2000)
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [highlightedSkill])

  const similarIds = buildSimilaritySet(similarities ?? [])
  const sorted = sortSkills(skills ?? [], sortKey, sortDir)

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        No skills match your filters
      </div>
    )
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-900">
          <tr className="border-b border-zinc-800/50">
            {COLUMNS.map((col) => {
              const isSortable = col.sortable !== false
              const isActive = sortKey === col.key
              return (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 ${
                    isSortable ? 'cursor-pointer select-none hover:text-zinc-300' : ''
                  }`}
                  onClick={isSortable ? () => handleSort(col.key) : undefined}
                >
                  {col.label}
                  {isSortable && isActive && <SortArrow direction={sortDir} />}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((skill, index) => {
            const isHighlighted = fadingSkill && fadingSkill === skill.name
            const isKeyboardSelected = index === selectedIndex
            return (
              <tr
                key={skill.id}
                className={`border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                  isHighlighted ? 'animate-highlight-fade bg-amber-500/10' : ''
                } ${isKeyboardSelected ? 'ring-1 ring-zinc-600' : ''}`}
                onClick={() => onSelectSkill?.(skill.id)}
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: skill.agentColor || '#71717a' }}
                    />
                    <span className="font-bold text-white">{skill.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{skill.agent}</td>
                <td className="px-4 py-3">
                  {skill.scope === 'global' ? (
                    <span className="rounded px-2 py-0.5 text-xs bg-blue-500/15 text-blue-400">
                      global
                    </span>
                  ) : (
                    <span className="rounded px-2 py-0.5 text-xs bg-emerald-500/15 text-emerald-400">
                      project
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">
                  {skill.description && skill.description.length > 80
                    ? `${skill.description.slice(0, 80)}…`
                    : skill.description}
                </td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                  {skill.modified ? timeAgo(skill.modified) : '—'}
                </td>
                <td className="px-4 py-3">
                  {similarIds.has(skill.id) ? <ChainIcon /> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <style>{`
        @keyframes highlightFade {
          0% { background-color: rgba(245, 158, 11, 0.1); }
          100% { background-color: transparent; }
        }
        .animate-highlight-fade {
          animation: highlightFade 2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
