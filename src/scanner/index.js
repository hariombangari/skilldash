import fg from 'fast-glob'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { detectAgents } from '../agents/registry.js'
import { parseSkillFile } from '../parser/skill-md.js'

export async function scanAgent(dirPath, excludeDirs = []) {
  const pattern = '**/SKILL.md'
  const ignore = excludeDirs.map(d => `**/${d}/**`)

  const files = await fg(pattern, {
    cwd: dirPath,
    absolute: true,
    followSymbolicLinks: true,
    ignore,
  })

  const skills = []
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const fileStat = await stat(filePath)
      const parsed = parseSkillFile(content, filePath)

      skills.push({
        ...parsed,
        fileSize: fileStat.size,
        lastModified: fileStat.mtime.toISOString(),
        lineCount: content.split('\n').length,
        hasScripts: existsSync(join(filePath, '..', 'scripts')),
      })
    } catch (err) {
      // Skip files we cannot read (permission errors, etc.)
      console.warn(`Skipping ${filePath}: ${err.message}`)
    }
  }
  return skills
}

export async function scanAll(projectDir = process.cwd()) {
  const home = homedir()
  const agents = await detectAgents(projectDir)
  const allSkills = []

  for (const agent of agents) {
    for (const dirPath of agent.detectedPaths) {
      const isGlobal = dirPath.startsWith(home) && !dirPath.startsWith(projectDir)
      const scope = isGlobal ? 'global' : 'project'
      const skills = await scanAgent(dirPath, agent.excludeDirs)

      for (const skill of skills) {
        allSkills.push({
          ...skill,
          id: `${agent.id}:${skill.name}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          scope,
        })
      }
    }
  }

  return {
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      color: a.color,
      skillCount: allSkills.filter(s => s.agentId === a.id).length,
    })),
    skills: allSkills,
    stats: {
      totalSkills: allSkills.length,
      totalAgents: agents.length,
    },
  }
}
