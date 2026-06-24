import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

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

export function createDashboardServer(config = {}) {
  const distDir = resolve(config.distDir || process.env.DASHBOARD_DIST_DIR || defaultDistDir)
  const indexPath = resolve(distDir, 'index.html')
  const options = {
    adminApiKey: config.adminApiKey ?? process.env.SUB2API_ADMIN_API_KEY ?? '',
    distDir,
    host: config.host ?? process.env.DASHBOARD_HOST ?? '0.0.0.0',
    port: Number(config.port ?? process.env.DASHBOARD_PORT ?? 4180),
    sub2apiBaseUrl: config.sub2apiBaseUrl ?? process.env.SUB2API_BASE_URL ?? 'http://127.0.0.1:8080'
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://dashboard.local')
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
