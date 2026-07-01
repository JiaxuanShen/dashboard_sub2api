import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function readCurrentVersion(rootDir) {
  try {
    const raw = await readFile(join(rootDir, 'VERSION'), 'utf8')
    const version = raw.trim()
    if (version) return version
  } catch {
    // Fall through to package metadata.
  }

  try {
    const raw = await readFile(join(rootDir, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw)
    if (typeof pkg.version === 'string' && pkg.version.trim()) return `v${pkg.version.trim()}`
  } catch {
    // Fall through to source fallback.
  }

  return 'source'
}
