import { useState } from 'react'

export default function SkillCard({ skill, onSelect, similarities }) {
  const hasSimilarity = similarities?.some(s => s.skills.includes(skill.id))

  return (
    <div
      onClick={() => onSelect(skill.id)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: skill.agentColor }}
        />
        <h3 className="font-semibold text-zinc-100 truncate">{skill.name}</h3>
        {hasSimilarity && (
          <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-1 1" />
            <path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l1-1" />
          </svg>
        )}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-500">{skill.agentName}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          skill.scope === 'global' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {skill.scope}
        </span>
      </div>
      <p className="text-sm text-zinc-400 line-clamp-2">
        {skill.description || 'No description'}
      </p>
    </div>
  )
}
