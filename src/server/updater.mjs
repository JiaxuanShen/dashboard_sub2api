import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export function normalizeVersion(value) {
  return String(value || '')
    .trim()
    .replace(/^v/i, '')
}

export function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function selectDashboardAsset(release) {
  const tag = release?.tag_name
  const expectedName = `dashboard_sub2api-${tag}.zip`
  return release?.assets?.find((asset) => asset.name === expectedName) || null
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function installExtractedPackage({ installDir, packageDir }) {
  const serverPath = join(packageDir, 'server.mjs')
  const indexPath = join(packageDir, 'dist', 'index.html')
  if (!(await pathExists(serverPath)) || !(await pathExists(indexPath))) {
    throw new Error('Invalid dashboard package structure')
  }

  await mkdir(dirname(installDir), { recursive: true })
  const backupDir = join(dirname(installDir), `dashboard_sub2api.backup-${Date.now()}`)
  if (await pathExists(installDir)) {
    await cp(installDir, backupDir, { recursive: true })
  }

  await mkdir(installDir, { recursive: true })
  const entries = await readdir(installDir)
  await Promise.all(entries.map((entry) => rm(join(installDir, entry), { recursive: true, force: true })))
  await cp(packageDir, installDir, { recursive: true })

  return { backupDir }
}

export function defaultRunner(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${basename(command)} exited with code ${code}`))
    })
  })
}

function validateDownloadUrl(rawUrl) {
  const parsed = new URL(rawUrl)
  if (!['github.com', 'objects.githubusercontent.com'].includes(parsed.hostname)) {
    throw new Error(`Unexpected release asset host: ${parsed.hostname}`)
  }
}

export function createDashboardUpdater(options = {}) {
  const repo = options.repo || 'JiaxuanShen/dashboard_sub2api'
  const fetcher = options.fetcher || fetch
  const currentVersion = options.currentVersion || (async () => 'source')
  const runner = options.runner || defaultRunner
  const restartCommand = options.restartCommand || 'systemctl'
  const restartArgs = options.restartArgs || ['restart', options.serviceName || 'dashboard-sub2api.service']
  const installDir = options.installDir
  let backupDir = options.backupDir || ''
  const maxDownloadSize = options.maxDownloadSize || 100 * 1024 * 1024

  return {
    async checkUpdates() {
      const current = await currentVersion()
      const response = await fetcher(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (!response.ok) {
        return {
          current_version: current,
          latest_version: current,
          has_update: false,
          warning: `GitHub release check failed: ${response.status}`,
        }
      }

      const release = await response.json()
      const latest = release.tag_name || current
      const asset = selectDashboardAsset(release)
      return {
        current_version: current,
        latest_version: latest,
        has_update: compareVersions(latest, current) > 0 && !!asset,
        release_info: {
          name: release.name || latest,
          body: release.body || '',
          published_at: release.published_at || '',
          html_url: release.html_url || '',
          asset,
        },
      }
    },
    async restart() {
      await runner(restartCommand, restartArgs)
      return { message: 'Dashboard restart initiated' }
    },
    async update() {
      if (!installDir) throw new Error('DASHBOARD_INSTALL_DIR is not configured')
      const info = await this.checkUpdates({ force: true })
      if (!info.has_update) return { message: 'Already up to date', need_restart: false }

      const asset = info.release_info?.asset
      if (!asset?.browser_download_url) throw new Error('No dashboard release asset found')
      if (asset.size && asset.size > maxDownloadSize) throw new Error('Dashboard release asset is too large')
      validateDownloadUrl(asset.browser_download_url)

      const tempDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-update-'))
      try {
        const archivePath = join(tempDir, asset.name)
        const response = await fetcher(asset.browser_download_url)
        if (!response.ok) throw new Error(`Release asset download failed: ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.byteLength > maxDownloadSize) throw new Error('Dashboard release asset is too large')
        await writeFile(archivePath, bytes)

        const extractDir = join(tempDir, 'extract')
        await mkdir(extractDir, { recursive: true })
        await runner('unzip', ['-q', archivePath, '-d', extractDir])
        const installResult = await installExtractedPackage({
          installDir,
          packageDir: join(extractDir, 'dashboard_sub2api'),
        })
        backupDir = installResult.backupDir

        return {
          message: 'Update installed',
          need_restart: true,
          backup_dir: installResult.backupDir,
          latest_version: info.latest_version,
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    },
    async rollback() {
      if (!installDir) throw new Error('DASHBOARD_INSTALL_DIR is not configured')
      if (!backupDir) throw new Error('No dashboard backup is available')
      await installExtractedPackage({ installDir, packageDir: backupDir })
      return { message: 'Rollback installed', need_restart: true, backup_dir: backupDir }
    },
  }
}
