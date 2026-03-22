import { useSkills } from './hooks/useSkills'
import { useWebSocket } from './hooks/useWebSocket'

export default function App() {
  const data = useSkills()
  const { lastEvent, connected } = useWebSocket(data.refetch)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-zinc-400 text-lg">Scanning for skills...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">skilldash</h1>
        {data.stats && (
          <p className="text-zinc-400">
            {data.stats.totalSkills} skills across {data.stats.totalAgents} agents
            {data.stats.totalSimilarities > 0 && ` · ${data.stats.totalSimilarities} similar`}
          </p>
        )}
        <p className="text-zinc-600 text-sm mt-1">
          WebSocket: {connected ? 'connected' : 'disconnected'}
        </p>
      </div>
    </div>
  )
}
