import { createHash } from 'node:crypto'
import { basename, dirname } from 'node:path'
import matter from 'gray-matter'

const TRIGGER_PATTERNS = [
  /use\s+when\s+(.+?)(?:\.|$)/gi,
  /triggers?\s+(?:on|when)\s+(.+?)(?:\.|$)/gi,
  /use\s+this\s+(?:skill|tool)\s+when\s+(?:the\s+user\s+)?(.+?)(?:\.|$)/gi,
  /activate\s+(?:when|for)\s+(.+?)(?:\.|$)/gi,
]

export function extractTriggers(description) {
  if (!description) return []
  const triggers = []
  for (const pattern of TRIGGER_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(description)) !== null) {
      const phrase = match[1].trim()
      if (phrase.length > 3 && phrase.length < 200) {
        triggers.push(phrase)
      }
    }
  }
  return triggers
}

export function parseSkillFile(content, filePath) {
  const checksum = createHash('sha256').update(content).digest('hex')

  let frontmatter = {}
  let body = content

  try {
    const parsed = matter(content)
    frontmatter = parsed.data || {}
    body = parsed.content
  } catch {
    // If frontmatter parsing fails, treat entire content as body
  }

  const skillDirName = basename(dirname(filePath))
  const name = frontmatter.name || skillDirName
  const description = frontmatter.description || ''
  const triggers = extractTriggers(description)

  return {
    name,
    description,
    frontmatter,
    body,
    checksum,
    triggers,
    filePath,
  }
}
