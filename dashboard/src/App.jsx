import { useSkills } from './hooks/useSkills'
import { useWebSocket } from './hooks/useWebSocket'
import Header from './components/Header'

export default function App() {
  const data = useSkills()
  const { lastEvent, connected } = useWebSocket(data.refetch)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-400 text-lg">Scanning for skills...</div>
      </div>
    )
  }

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
        <p className="text-zinc-500">{data.skills.length} skills shown</p>
      </main>
    </div>
  )
}
