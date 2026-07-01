import { describe, expect, it } from 'vitest'
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('dashboard updater', () => {
  it('reads current version from VERSION file', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { readCurrentVersion } = await import('../server/version.mjs')
    const dir = await mkdtemp(join(tmpdir(), 'dashboard-version-'))
    await writeFile(join(dir, 'VERSION'), 'v0.1.2\n')

    await expect(readCurrentVersion(dir)).resolves.toBe('v0.1.2')
  })

  it('compares semantic release tags', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { compareVersions } = await import('../server/updater.mjs')

    expect(compareVersions('v0.1.3', 'v0.1.2')).toBeGreaterThan(0)
    expect(compareVersions('0.1.2', 'v0.1.2')).toBe(0)
    expect(compareVersions('v0.1.2', 'v0.2.0')).toBeLessThan(0)
  })

  it('selects the dashboard release package asset', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { selectDashboardAsset } = await import('../server/updater.mjs')
    const release = {
      tag_name: 'v0.1.3',
      assets: [
        { name: 'source.zip', browser_download_url: 'https://github.com/example/source.zip', size: 100 },
        {
          name: 'dashboard_sub2api-v0.1.3.zip',
          browser_download_url: 'https://github.com/JiaxuanShen/dashboard_sub2api/releases/download/v0.1.3/dashboard_sub2api-v0.1.3.zip',
          size: 12345,
        },
      ],
    }

    expect(selectDashboardAsset(release)).toMatchObject({
      name: 'dashboard_sub2api-v0.1.3.zip',
      size: 12345,
    })
  })

  it('installs an extracted dashboard package with backup', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { installExtractedPackage } = await import('../server/updater.mjs')
    const installDir = await mkdtemp(join(tmpdir(), 'dashboard-install-'))
    const extractedDir = await mkdtemp(join(tmpdir(), 'dashboard-extracted-'))
    await writeFile(join(installDir, 'server.mjs'), 'old server')
    await writeFile(join(installDir, 'keep.env'), 'do not care')
    await writeFile(join(extractedDir, 'server.mjs'), 'new server')
    await mkdir(join(extractedDir, 'dist'), { recursive: true })
    await writeFile(join(extractedDir, 'dist', 'index.html'), '<div>new</div>')

    const result = await installExtractedPackage({ installDir, packageDir: extractedDir })

    await expect(readFile(join(installDir, 'server.mjs'), 'utf8')).resolves.toBe('new server')
    await expect(readFile(join(installDir, 'dist', 'index.html'), 'utf8')).resolves.toBe('<div>new</div>')
    expect(result.backupDir).toContain('dashboard_sub2api.backup-')
  })

  it('runs the configured restart command', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { createDashboardUpdater } = await import('../server/updater.mjs')
    const calls: string[][] = []
    const updater = createDashboardUpdater({
      runner: async (command: string, args: string[]) => {
        calls.push([command, ...args])
      },
      restartCommand: 'systemctl',
      restartArgs: ['restart', 'dashboard-sub2api.service'],
    })

    await updater.restart()

    expect(calls).toEqual([['systemctl', 'restart', 'dashboard-sub2api.service']])
  })

  it('downloads and installs the latest release package', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { createDashboardUpdater } = await import('../server/updater.mjs')
    const installDir = await mkdtemp(join(tmpdir(), 'dashboard-install-'))
    const packageSource = await mkdtemp(join(tmpdir(), 'dashboard-package-'))
    await writeFile(join(installDir, 'server.mjs'), 'old server')
    await mkdir(join(packageSource, 'dashboard_sub2api', 'dist'), { recursive: true })
    await writeFile(join(packageSource, 'dashboard_sub2api', 'server.mjs'), 'new server')
    await writeFile(join(packageSource, 'dashboard_sub2api', 'dist', 'index.html'), '<div>new</div>')

    const updater = createDashboardUpdater({
      installDir,
      currentVersion: async () => 'v0.1.1',
      fetcher: async (url: string) => {
        if (String(url).includes('/releases/latest')) {
          return new Response(JSON.stringify({
            tag_name: 'v0.1.2',
            assets: [{
              name: 'dashboard_sub2api-v0.1.2.zip',
              browser_download_url: 'https://github.com/JiaxuanShen/dashboard_sub2api/releases/download/v0.1.2/dashboard_sub2api-v0.1.2.zip',
              size: 4,
            }],
          }), { status: 200 })
        }
        return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 })
      },
      runner: async (_command: string, args: string[]) => {
        const destination = args[args.indexOf('-d') + 1]
        await cp(packageSource, destination, { recursive: true })
      },
    })

    await expect(updater.update()).resolves.toMatchObject({ message: 'Update installed', need_restart: true })
    await expect(readFile(join(installDir, 'server.mjs'), 'utf8')).resolves.toBe('new server')
  })

  it('rolls back from the configured backup directory', async () => {
    // @ts-expect-error Node runtime module exercised by integration tests.
    const { createDashboardUpdater } = await import('../server/updater.mjs')
    const installDir = await mkdtemp(join(tmpdir(), 'dashboard-install-'))
    const backupDir = await mkdtemp(join(tmpdir(), 'dashboard-backup-'))
    await writeFile(join(installDir, 'server.mjs'), 'broken server')
    await writeFile(join(backupDir, 'server.mjs'), 'old server')
    await mkdir(join(backupDir, 'dist'), { recursive: true })
    await writeFile(join(backupDir, 'dist', 'index.html'), '<div>old</div>')

    const updater = createDashboardUpdater({ installDir, backupDir })

    await expect(updater.rollback()).resolves.toMatchObject({ message: 'Rollback installed', need_restart: true })
    await expect(readFile(join(installDir, 'server.mjs'), 'utf8')).resolves.toBe('old server')
  })
})
