import http from 'node:http'
import { URL } from 'node:url'
import { resolveFacebookNumericIds } from './facebookResolver.mjs'

const port = Number(process.env.API_PORT || process.env.PORT || 3001)
const host = process.env.API_HOST || '0.0.0.0'

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

  if (req.method === 'GET' && reqUrl.pathname === '/api/facebook/resolve') {
    const input = reqUrl.searchParams.get('input') || ''
    const result = await resolveFacebookNumericIds(input)
    return sendJson(res, result.status || 200, result)
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' })
})

server.listen(port, host, () => {
  console.log(`facebook api listening on ${host}:${port}`)
})
