import http from 'node:http'
import { URL } from 'node:url'
import { resolveFacebookNumericIds } from './facebookResolver.mjs'
import { checkFacebookAlive } from './facebookAliveChecker.mjs'

const port = Number(process.env.API_PORT || process.env.PORT || 3001)
const host = process.env.API_HOST || '0.0.0.0'

const RATE_WINDOW_MS = 60_000
const RATE_MAX = Number(process.env.API_RATE_LIMIT || 60)
const rateBuckets = new Map()

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

function takeRateToken(ip) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { start: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= RATE_MAX
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of rateBuckets) {
    if (now - bucket.start > RATE_WINDOW_MS * 2) rateBuckets.delete(ip)
  }
}, RATE_WINDOW_MS).unref()

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'GET' && reqUrl.pathname === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (reqUrl.pathname.startsWith('/api/')) {
    const ip = getClientIp(req)
    if (!takeRateToken(ip)) {
      return sendJson(res, 429, { ok: false, error: '请求过于频繁，请稍后再试' })
    }
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/facebook/resolve') {
    const input = reqUrl.searchParams.get('input') || ''
    const result = await resolveFacebookNumericIds(input)
    return sendJson(res, result.status || 200, result)
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/facebook/check') {
    const input = reqUrl.searchParams.get('input') || ''
    const result = await checkFacebookAlive(input)
    return sendJson(res, result.status || 200, result)
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' })
})

server.listen(port, host, () => {
  console.log(`facebook api listening on ${host}:${port}`)
})
