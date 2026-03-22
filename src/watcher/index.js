import chokidar from 'chokidar'

export function createWatcher(dirs, onChange) {
  const watcher = chokidar.watch(dirs, {
    persistent: true,
    followSymlinks: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('add', (path) => {
    if (path.endsWith('SKILL.md')) onChange('added', path)
  })
  watcher.on('change', (path) => {
    if (path.endsWith('SKILL.md')) onChange('changed', path)
  })
  watcher.on('unlink', (path) => {
    if (path.endsWith('SKILL.md')) onChange('removed', path)
  })

  return watcher
}
