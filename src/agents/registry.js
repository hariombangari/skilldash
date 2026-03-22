import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const AGENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    color: '#D97706',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.claude', 'skills'),
      ...(project ? [join(project, '.claude', 'skills')] : []),
    ],
  },
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    color: '#10B981',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.codex', 'skills'),
      ...(project ? [join(project, '.codex', 'skills')] : []),
    ],
    excludeDirs: ['.system'],
  },
  {
    id: 'cross-client',
    name: 'Cross-Client',
    color: '#6366F1',
    format: 'skill-md',
    paths: (home, project) => [
      join(home, '.agents', 'skills'),
      ...(project ? [join(project, '.agents', 'skills')] : []),
    ],
  },
]

export function getAgentRegistry(home, project) {
  return AGENTS.map(agent => ({
    ...agent,
    paths: agent.paths(home, project),
  }))
}

export async function detectAgents(project = process.cwd()) {
  const home = homedir()
  const registry = getAgentRegistry(home, project)

  const detected = []
  for (const agent of registry) {
    const detectedPaths = agent.paths.filter(p => existsSync(p))
    if (detectedPaths.length > 0) {
      detected.push({
        id: agent.id,
        name: agent.name,
        color: agent.color,
        format: agent.format,
        detectedPaths,
        excludeDirs: agent.excludeDirs || [],
      })
    }
  }
  return detected
}
