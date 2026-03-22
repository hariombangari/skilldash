#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import open from 'open'
import { createApp } from './server/app.js'
import { createWatcher } from './watcher/index.js'
import { detectAgents } from './agents/registry.js'

const args = process.argv.slice(2)
const noOpen = args.includes('--no-open')
const portArg = args.find((_, i, a) => a[i - 1] === '--port')
const port = portArg ? parseInt(portArg, 10) : 3377

async function main() {
  console.log('skilldash - scanning for agent skills...\n')

  const app = await createApp()

  // WebSocket setup
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
  const clients = new Set()

  app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(evt, ws) {
      clients.add(ws)
    },
    onClose(evt, ws) {
      clients.delete(ws)
    },
  })))

  function broadcast(event) {
    const message = JSON.stringify(event)
    for (const ws of clients) {
      try { ws.send(message) } catch { clients.delete(ws) }
    }
  }

  // Start server
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`  Dashboard: http://localhost:${info.port}`)
    console.log('  Press Ctrl+C to stop\n')

    if (!noOpen) {
      open(`http://localhost:${info.port}`)
    }
  })

  injectWebSocket(server)

  // Set up file watching
  const agents = await detectAgents()
  const watchDirs = agents.flatMap(a => a.detectedPaths)

  if (watchDirs.length > 0) {
    createWatcher(watchDirs, async (event, path) => {
      console.log(`  ${event}: ${path}`)
      await app._rescan()
      broadcast({ type: 'skill-change', event, path })
    })
    console.log(`  Watching ${watchDirs.length} directories for changes`)
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    server.close()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Failed to start skilldash:', err.message)
  process.exit(1)
})
