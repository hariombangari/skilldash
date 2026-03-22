import { useState } from 'react'
import { useSkills } from './hooks/useSkills'
import { useWebSocket } from './hooks/useWebSocket'
import Header from './components/Header'
import SkillsTable from './components/SkillsTable'
import SkillCard from './components/SkillCard'
import SkillDetail from './components/SkillDetail'
import Toast from './components/Toast'

export default function App() {
  const data = useSkills()
  const { lastEvent, connected } = useWebSocket(data.refetch)
  const [selectedSkillId, setSelectedSkillId] = useState(null)

  // Extract highlighted skill name from WebSocket event
  const highlightedSkill = lastEvent?.path
    ? lastEvent.path.split('/').slice(-2, -1)[0]
    : null

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-zinc-400 text-lg">Scanning for skills...</div>
        </div>
      </div>
    )
  }

  const isSmallState = data.stats && data.stats.totalSkills < 10

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        stats={data.stats}
        agents={data.agents}
        agentFilter={data.agentFilter}
        setAgentFilter={data.setAgentFilter}
        query={data.query}
        setQuery={data.setQuery}
      />

      <main className="flex-1 p-6">
        {isSmallState ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.skills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onSelect={setSelectedSkillId}
                  similarities={data.similarities}
                />
              ))}
            </div>
            {data.skills.length > 0 && (
              <p className="text-zinc-500 text-sm mt-6 text-center">
                Skilldash found {data.stats.totalSkills} skills
                {data.agents.length > 0 && ` in ${data.agents.map(a => a.name).join(', ')}`}.
                Install more with <code className="text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">npx skills add</code>
              </p>
            )}
          </div>
        ) : (
          <SkillsTable
            skills={data.skills}
            similarities={data.similarities}
            onSelectSkill={setSelectedSkillId}
            highlightedSkill={highlightedSkill}
          />
        )}

        {data.skills.length === 0 && !isSmallState && (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg">No skills found</p>
            <p className="text-zinc-500 text-sm mt-2">
              Install skills with <code className="text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">npx skills add</code>
            </p>
          </div>
        )}
      </main>

      {selectedSkillId && (
        <SkillDetail
          skillId={selectedSkillId}
          similarities={data.similarities}
          onClose={() => setSelectedSkillId(null)}
        />
      )}

      <Toast event={lastEvent} />
    </div>
  )
}
