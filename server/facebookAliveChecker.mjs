import { resolveFacebookNumericIds } from './facebookResolver.mjs'

const NUMERIC_ID_RE = /^\d{5,}$/
const FACEBOOK_HOSTS = ['facebook.com', 'fb.com', 'fb.watch', 'm.me']

function isFacebookHost(hostname) {
  const h = hostname.toLowerCase()
  return FACEBOOK_HOSTS.some(base => h === base || h.endsWith(`.${base}`))
}

export function normalizeInput(input) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) return null

  if (NUMERIC_ID_RE.test(trimmed)) {
    return { kind: 'id', id: trimmed }
  }

  let url = trimmed
  if (!/^https?:\/\//i.test(url)) {
    if (/^(www\.|m\.|mbasic\.|business\.)?facebook\.com\//i.test(url) || /^fb\.watch\//i.test(url)) {
      url = `https://${url}`
    } else {
      return { kind: 'url', url: `https://www.facebook.com/${encodeURIComponent(trimmed)}`, raw: trimmed }
    }
  }

  try {
    const u = new URL(url)
    if (!isFacebookHost(u.hostname)) {
      return { kind: 'invalid', reason: '仅支持 Facebook 域名的链接' }
    }
    const idParam = u.searchParams.get('id')
    if (idParam && NUMERIC_ID_RE.test(idParam)) {
      return { kind: 'id', id: idParam }
    }
    const segments = u.pathname.split('/').filter(Boolean)
    if (segments[0] === 'groups' && segments[1] && NUMERIC_ID_RE.test(segments[1])) {
      return { kind: 'id', id: segments[1] }
    }
    if (segments.length === 1 && NUMERIC_ID_RE.test(segments[0])) {
      return { kind: 'id', id: segments[0] }
    }
    return { kind: 'url', url, raw: trimmed }
  } catch {
    return { kind: 'url', url, raw: trimmed }
  }
}

async function probeGraphPicture(id) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(id)}/picture?redirect=false&type=normal`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          accept: 'application/json,*/*;q=0.8',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
      }
    )
    const text = await res.text().catch(() => '')
    let data = null
    try {
      data = JSON.parse(text)
    } catch {
      // ignore
    }

    if (data && data.data && typeof data.data.url === 'string') {
      return { alive: true, id }
    }

    if (data && data.error) {
      const code = data.error.code
      const subcode = data.error.error_subcode
      if (code === 100 && subcode === 33) {
        return { alive: false, reason: '账号不存在或已被删除' }
      }
      return { alive: false, reason: data.error.message || `Graph 错误 ${code ?? ''}`.trim() }
    }

    return { alive: false, reason: `Graph 响应异常（HTTP ${res.status}）` }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { alive: false, reason: 'Graph 请求超时', transient: true }
    }
    return { alive: false, reason: 'Graph 请求失败', transient: true }
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveIdFromUrl(url) {
  const result = await resolveFacebookNumericIds(url).catch(() => null)
  if (!result || !Array.isArray(result.matches)) return null
  const priority = ['account', 'page', 'group', 'adPost', 'generic']
  for (const kind of priority) {
    const hit = result.matches.find(m => m && m.kind === kind && m.id && NUMERIC_ID_RE.test(m.id))
    if (hit) return hit.id
  }
  return null
}

export async function checkFacebookAlive(input) {
  const norm = normalizeInput(input)
  if (!norm) {
    return { ok: false, status: 400, alive: false, input, error: '输入为空' }
  }
  if (norm.kind === 'invalid') {
    return { ok: false, status: 400, alive: false, input, error: norm.reason }
  }

  let id = norm.kind === 'id' ? norm.id : null
  if (!id) {
    id = await resolveIdFromUrl(norm.url)
  }

  if (!id) {
    return {
      ok: true,
      status: 200,
      alive: false,
      input,
      url: norm.url,
      reason: '无法从链接解析出数字 ID（可能已封禁或用户名不存在）',
    }
  }

  const probe = await probeGraphPicture(id)
  return {
    ok: true,
    status: 200,
    alive: probe.alive,
    input,
    url: norm.kind === 'url' ? norm.url : `https://www.facebook.com/profile.php?id=${id}`,
    id,
    reason: probe.alive ? undefined : probe.reason,
    transient: probe.transient || undefined,
  }
}
