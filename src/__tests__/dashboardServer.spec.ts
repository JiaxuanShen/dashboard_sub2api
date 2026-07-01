import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'

interface StartedServer {
  baseUrl: string
  close: () => Promise<void>
}

async function startUpstream(): Promise<StartedServer & { requests: Array<{ url?: string; apiKey?: string }> }> {
  const requests: Array<{ url?: string; apiKey?: string }> = []
  const server = http.createServer((req, res) => {
    requests.push({ url: req.url, apiKey: req.headers['x-api-key'] as string | undefined })
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ code: 0, message: 'success', data: { ok: true } }))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('failed to start upstream')

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

describe('dashboard server', () => {
  let tmpDir: string | undefined
  let upstream: Awaited<ReturnType<typeof startUpstream>> | undefined
  let dashboard: StartedServer | undefined

  afterEach(async () => {
    await dashboard?.close()
    await upstream?.close()
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
    dashboard = undefined
    upstream = undefined
    tmpDir = undefined
  })

  it('serves static files and falls back to index.html', async () => {
    // @ts-expect-error server.mjs is the Node runtime entrypoint exercised by this integration test.
    const { createDashboardServer } = await import('../../server.mjs')
    tmpDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-'))
    await writeFile(join(tmpDir, 'index.html'), '<div id="app"></div>')

    const startedDashboard = await createDashboardServer({ distDir: tmpDir, port: 0, adminApiKey: 'secret' }).start()
    dashboard = startedDashboard

    await expect(fetch(`${startedDashboard.baseUrl}/`)).resolves.toMatchObject({ status: 200 })
    const fallback = await fetch(`${startedDashboard.baseUrl}/accounts/1`)
    await expect(fallback.text()).resolves.toBe('<div id="app"></div>')
  })

  it('proxies dashboard-api requests to Sub2API admin routes with x-api-key', async () => {
    // @ts-expect-error server.mjs is the Node runtime entrypoint exercised by this integration test.
    const { createDashboardServer } = await import('../../server.mjs')
    tmpDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-'))
    await writeFile(join(tmpDir, 'index.html'), '<div id="app"></div>')
    upstream = await startUpstream()

    const startedDashboard = await createDashboardServer({
      distDir: tmpDir,
      port: 0,
      sub2apiBaseUrl: upstream.baseUrl,
      adminApiKey: 'secret'
    }).start()
    dashboard = startedDashboard

    const response = await fetch(`${startedDashboard.baseUrl}/dashboard-api/accounts?page=1`)

    await expect(response.json()).resolves.toEqual({ code: 0, message: 'success', data: { ok: true } })
    expect(upstream.requests).toEqual([{ url: '/api/v1/admin/accounts?page=1', apiKey: 'secret' }])
  })

  it('rejects dashboard-system requests without the update key', async () => {
    // @ts-expect-error server.mjs is the Node runtime entrypoint exercised by this integration test.
    const { createDashboardServer } = await import('../../server.mjs')
    tmpDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-'))
    await writeFile(join(tmpDir, 'index.html'), '<div id="app"></div>')

    const startedDashboard = await createDashboardServer({
      distDir: tmpDir,
      port: 0,
      updateKey: 'update-secret',
      updateEnabled: true,
      updater: {
        checkUpdates: async () => ({ current_version: 'v0.1.1', latest_version: 'v0.1.2', has_update: true }),
      },
    }).start()
    dashboard = startedDashboard

    const response = await fetch(`${startedDashboard.baseUrl}/dashboard-system/check-updates`)

    expect(response.status).toBe(401)
  })

  it('returns dashboard update info when update key is valid', async () => {
    // @ts-expect-error server.mjs is the Node runtime entrypoint exercised by this integration test.
    const { createDashboardServer } = await import('../../server.mjs')
    tmpDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-'))
    await writeFile(join(tmpDir, 'index.html'), '<div id="app"></div>')

    const startedDashboard = await createDashboardServer({
      distDir: tmpDir,
      port: 0,
      updateKey: 'update-secret',
      updateEnabled: true,
      updater: {
        checkUpdates: async () => ({ current_version: 'v0.1.1', latest_version: 'v0.1.2', has_update: true }),
      },
    }).start()
    dashboard = startedDashboard

    const response = await fetch(`${startedDashboard.baseUrl}/dashboard-system/check-updates`, {
      headers: { 'x-dashboard-update-key': 'update-secret' },
    })

    await expect(response.json()).resolves.toEqual({
      current_version: 'v0.1.1',
      latest_version: 'v0.1.2',
      has_update: true,
    })
  })

  it('runs update, restart, and rollback through authenticated dashboard-system endpoints', async () => {
    // @ts-expect-error server.mjs is the Node runtime entrypoint exercised by this integration test.
    const { createDashboardServer } = await import('../../server.mjs')
    tmpDir = await mkdtemp(join(tmpdir(), 'dashboard-sub2api-'))
    await writeFile(join(tmpDir, 'index.html'), '<div id="app"></div>')
    const calls: string[] = []

    const startedDashboard = await createDashboardServer({
      distDir: tmpDir,
      port: 0,
      updateKey: 'update-secret',
      updateEnabled: true,
      updater: {
        update: async () => {
          calls.push('update')
          return { message: 'updated', need_restart: true }
        },
        restart: async () => {
          calls.push('restart')
          return { message: 'restarted' }
        },
        rollback: async () => {
          calls.push('rollback')
          return { message: 'rolled back', need_restart: true }
        },
      },
    }).start()
    dashboard = startedDashboard

    const headers = { 'x-dashboard-update-key': 'update-secret' }
    await expect((await fetch(`${startedDashboard.baseUrl}/dashboard-system/update`, { method: 'POST', headers })).json()).resolves.toMatchObject({ message: 'updated' })
    await expect((await fetch(`${startedDashboard.baseUrl}/dashboard-system/restart`, { method: 'POST', headers })).json()).resolves.toMatchObject({ message: 'restarted' })
    await expect((await fetch(`${startedDashboard.baseUrl}/dashboard-system/rollback`, { method: 'POST', headers })).json()).resolves.toMatchObject({ message: 'rolled back' })

    expect(calls).toEqual(['update', 'restart', 'rollback'])
  })
})
