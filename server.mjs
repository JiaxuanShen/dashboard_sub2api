import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { readCurrentVersion } from './src/server/version.mjs'
import { createDashboardUpdater } from './src/server/updater.mjs'

const defaultRoot = process.cwd()
const defaultDistDir = resolve(defaultRoot, 'dist')

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp']
])

function isInside(parent, child) {
  const relative = normalize(child).slice(normalize(parent).length)
  return relative === '' || relative.startsWith(sep)
}

function resolveStaticPath(distDir, pathname) {
  const decodedPath = decodeURIComponent(pathname)
  const requested = resolve(distDir, `.${decodedPath}`)
  return isInside(distDir, requested) ? requested : resolve(distDir, 'index.html')
}

async function sendFile(res, filePath, fallbackPath) {
  let target = filePath
  let fileStat

  try {
    fileStat = await stat(target)
    if (fileStat.isDirectory()) {
      target = join(target, 'index.html')
      fileStat = await stat(target)
    }
  } catch {
    target = fallbackPath
    fileStat = await stat(target)
  }

  res.writeHead(200, {
    'content-length': fileStat.size,
    'content-type': contentTypes.get(extname(target)) || 'application/octet-stream'
  })
  createReadStream(target).pipe(res)
}

async function proxyDashboardApi(req, res, options) {
  if (!options.adminApiKey) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ code: 500, message: 'SUB2API_ADMIN_API_KEY is not configured', data: null }))
    return
  }

  const incomingUrl = new URL(req.url || '/', 'http://dashboard.local')
  const upstreamPath = incomingUrl.pathname.replace(/^\/dashboard-api\/?/, '/api/v1/admin/')
  const upstreamUrl = new URL(upstreamPath + incomingUrl.search, options.sub2apiBaseUrl)

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (name.toLowerCase() === 'host') continue
    headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  headers.set('x-api-key', options.adminApiKey)

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
      duplex: 'half'
    })

    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()))
    if (upstream.body) {
      for await (const chunk of upstream.body) res.write(chunk)
    }
    res.end()
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ code: 502, message: error instanceof Error ? error.message : 'Bad gateway', data: null }))
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-length': Buffer.byteLength(body),
    'content-type': 'application/json; charset=utf-8'
  })
  res.end(body)
}

function isUpdateAuthorized(req, options) {
  if (!options.updateEnabled) return false
  if (!options.updateKey) return false
  return req.headers['x-dashboard-update-key'] === options.updateKey
}

async function handleDashboardSystem(req, res, url, options) {
  if (!options.updateEnabled) {
    sendJson(res, 404, { message: 'Dashboard update is disabled' })
    return
  }

  if (!isUpdateAuthorized(req, options)) {
    sendJson(res, 401, { message: 'Invalid dashboard update key' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/dashboard-system/version') {
    sendJson(res, 200, { version: await readCurrentVersion(options.rootDir) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/dashboard-system/check-updates') {
    const force = url.searchParams.get('force') === 'true'
    sendJson(res, 200, await options.updater.checkUpdates({ force }))
    return
  }

  if (req.method === 'POST' && url.pathname === '/dashboard-system/update') {
    sendJson(res, 200, await options.updater.update())
    return
  }

  if (req.method === 'POST' && url.pathname === '/dashboard-system/restart') {
    sendJson(res, 200, await options.updater.restart())
    return
  }

  if (req.method === 'POST' && url.pathname === '/dashboard-system/rollback') {
    sendJson(res, 200, await options.updater.rollback())
    return
  }

  sendJson(res, 404, { message: 'Unknown dashboard system endpoint' })
}

export function createDashboardServer(config = {}) {
  const rootDir = resolve(config.rootDir || process.env.DASHBOARD_ROOT_DIR || defaultRoot)
  const distDir = resolve(config.distDir || process.env.DASHBOARD_DIST_DIR || defaultDistDir)
  const indexPath = resolve(distDir, 'index.html')
  const options = {
    adminApiKey: config.adminApiKey ?? process.env.SUB2API_ADMIN_API_KEY ?? '',
    distDir,
    host: config.host ?? process.env.DASHBOARD_HOST ?? '0.0.0.0',
    port: Number(config.port ?? process.env.DASHBOARD_PORT ?? 4180),
    rootDir,
    sub2apiBaseUrl: config.sub2apiBaseUrl ?? process.env.SUB2API_BASE_URL ?? 'http://127.0.0.1:8080',
    updateEnabled: config.updateEnabled ?? process.env.DASHBOARD_UPDATE_ENABLED === 'true',
    updateKey: config.updateKey ?? process.env.DASHBOARD_UPDATE_KEY ?? '',
    updater: config.updater ?? createDashboardUpdater({
      currentVersion: async () => readCurrentVersion(rootDir),
      installDir: config.installDir ?? process.env.DASHBOARD_INSTALL_DIR ?? rootDir,
      repo: process.env.DASHBOARD_GITHUB_REPO || 'JiaxuanShen/dashboard_sub2api',
      restartCommand: process.env.DASHBOARD_RESTART_COMMAND || 'systemctl',
      restartArgs: process.env.DASHBOARD_RESTART_ARGS
        ? process.env.DASHBOARD_RESTART_ARGS.split(' ').filter(Boolean)
        : ['restart', process.env.DASHBOARD_SERVICE_NAME || 'dashboard-sub2api.service'],
      serviceName: process.env.DASHBOARD_SERVICE_NAME || 'dashboard-sub2api.service'
    })
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://dashboard.local')
    if (url.pathname === '/dashboard-system' || url.pathname.startsWith('/dashboard-system/')) {
      await handleDashboardSystem(req, res, url, options)
      return
    }

    if (url.pathname === '/dashboard-api' || url.pathname.startsWith('/dashboard-api/')) {
      await proxyDashboardApi(req, res, options)
      return
    }

    const filePath = resolveStaticPath(options.distDir, url.pathname)
    await sendFile(res, filePath, indexPath)
  })

  return {
    server,
    start() {
      return new Promise((resolveStart) => {
        server.listen(options.port, options.host, () => {
          const address = server.address()
          const port = typeof address === 'object' && address ? address.port : options.port
          resolveStart({
            baseUrl: `http://127.0.0.1:${port}`,
            close: () => new Promise((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())))
          })
        })
      })
    }
  }
}

if (process.argv[1]?.endsWith('server.mjs')) {
  createDashboardServer().start().then(({ baseUrl }) => {
    console.log(`dashboard_sub2api listening on ${baseUrl}`)
  })
}
