import { resolveFacebookIdsWithBrowser } from './facebookBrowserResolver.mjs'

const FACEBOOK_HOST_PATTERNS = ['facebook.com', 'fb.com', 'fb.watch']
const NUMERIC_ID_RE = /^\d{5,}$/

function isFacebookHost(hostname) {
  return FACEBOOK_HOST_PATTERNS.some(pattern => hostname === pattern || hostname.endsWith(`.${pattern}`))
}

function normalizeInput(input) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^(www\.|m\.|mbasic\.|business\.)?facebook\.com\//i.test(trimmed) || /^fb\.watch\//i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
}

function buildMatch(kind, id, source, hint) {
  const labelMap = {
    account: 'Facebook 账号 ID',
    page: 'Facebook 主页 ID',
    group: 'Facebook 群组 ID',
    adPost: 'Facebook 广告帖 ID',
    generic: 'Facebook 数字 ID',
  }

  return {
    kind,
    label: labelMap[kind] ?? labelMap.generic,
    id,
    source,
    hint,
  }
}

function addMatch(bucket, kind, id, source, hint) {
  if (!id || !NUMERIC_ID_RE.test(id)) {
    return
  }

  const key = `${kind}:${id}`
  if (!bucket.has(key)) {
    bucket.set(key, buildMatch(kind, id, source, hint))
  }
}

function collectRegexMatches(html, bucket) {
  const patterns = [
    { kind: 'page', source: 'pageID', regex: /"pageID"\s*:\s*"(\d{5,})"/g },
    { kind: 'account', source: 'userID', regex: /"userID"\s*:\s*"(\d{5,})"/g },
    { kind: 'account', source: 'profile_owner', regex: /"profile_owner"\s*:\s*"(\d{5,})"/g },
    { kind: 'group', source: 'groupID', regex: /"groupID"\s*:\s*"(\d{5,})"/g },
    { kind: 'group', source: 'group_ent_id', regex: /"group_ent_id"\s*:\s*"(\d{5,})"/g },
    { kind: 'adPost', source: 'story_fbid', regex: /"story_fbid"\s*:\s*"(\d{5,})"/g },
    { kind: 'adPost', source: 'post_id', regex: /"post_id"\s*:\s*"(\d{5,})"/g },
    { kind: 'adPost', source: 'top_level_post_id', regex: /"top_level_post_id"\s*:\s*"(\d{5,})"/g },
    { kind: 'adPost', source: 'feedback_id', regex: /"feedback_id"\s*:\s*"(\d{5,})"/g },
    { kind: 'generic', source: 'entity_id', regex: /"entity_id"\s*:\s*"(\d{5,})"/g },
  ]

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern.regex)) {
      addMatch(bucket, pattern.kind, match[1], `HTML 中的 ${pattern.source}`)
    }
  }

  for (const match of html.matchAll(/content="fb:\/\/(?:profile|page|group|post)\/(\d{5,})"/g)) {
    addMatch(bucket, 'generic', match[1], 'meta 中的 fb:// 深链')
  }

  for (const match of html.matchAll(/"alternate_name":"[^"]+","id":"(\d{5,})"/g)) {
    addMatch(bucket, 'generic', match[1], 'structured data 中的 id')
  }
}

function collectPublicPluginMatches(html, bucket) {
  for (const match of html.matchAll(/https:\/\/www\.facebook\.com\/(\d{5,})\?ref=embed_page/g)) {
    addMatch(
      bucket,
      'generic',
      match[1],
      'plugins/page.php embed_page link',
      '\u516c\u5f00\u5d4c\u5165\u9875\u8fd4\u56de\u7684\u5bf9\u8c61 ID\uff0c\u901a\u5e38\u662f\u4e3b\u9875\u6216\u5173\u8054\u5bf9\u8c61\u7684\u6570\u5b57 ID'
    )
  }
}

function getCauseCode(error) {
  if (
    error &&
    typeof error === 'object' &&
    'cause' in error &&
    error.cause &&
    typeof error.cause === 'object' &&
    'code' in error.cause
  ) {
    return error.cause.code
  }

  return undefined
}

function buildCandidateUrls(url) {
  const seen = new Set()
  const candidates = []

  const push = value => {
    const href = value.toString()
    if (!seen.has(href)) {
      seen.add(href)
      candidates.push(value)
    }
  }

  push(new URL(url.toString()))

  if (!url.pathname.endsWith('/')) {
    const withSlash = new URL(url.toString())
    withSlash.pathname = `${withSlash.pathname}/`
    push(withSlash)
  }

  if (
    url.hostname === 'facebook.com' ||
    url.hostname === 'www.facebook.com' ||
    url.hostname === 'm.facebook.com' ||
    url.hostname === 'mbasic.facebook.com'
  ) {
    for (const host of ['www.facebook.com', 'm.facebook.com', 'mbasic.facebook.com']) {
      const variant = new URL(url.toString())
      variant.hostname = host
      push(variant)

      if (!variant.pathname.endsWith('/')) {
        const variantWithSlash = new URL(variant.toString())
        variantWithSlash.pathname = `${variantWithSlash.pathname}/`
        push(variantWithSlash)
      }
    }
  }

  return candidates
}

function buildRequestHeaders() {
  return {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  }
}

function buildPublicFallbackUrls(url) {
  const publicUrl = new URL(url.toString())
  publicUrl.hostname = 'www.facebook.com'
  publicUrl.hash = ''

  return [
    {
      url: `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(publicUrl.toString())}`,
      source: 'plugins/page.php',
    },
  ]
}

function buildHttpStatusMessage(status) {
  return `Facebook 页面请求失败：HTTP ${status}`
}

export async function resolveFacebookNumericIds(input, fetchImpl = fetch) {
  const normalizedInput = normalizeInput(input)
  if (!normalizedInput) {
    return {
      ok: false,
      status: 400,
      error: '缺少查询内容',
      matches: [],
    }
  }

  let url
  try {
    url = new URL(normalizedInput)
  } catch {
    return {
      ok: false,
      status: 400,
      error: '请输入有效的 Facebook 链接',
      matches: [],
    }
  }

  if (!isFacebookHost(url.hostname)) {
    return {
      ok: false,
      status: 400,
      error: '仅支持 facebook.com 相关链接',
      matches: [],
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  const candidates = buildCandidateUrls(url)
  const publicFallbacks = buildPublicFallbackUrls(url)
  let lastFailure = null
  let triedPublicFallback = false
  let triedBrowserFallback = false

  try {
    for (const candidate of candidates) {
      let response
      try {
        response = await fetchImpl(candidate.toString(), {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: buildRequestHeaders(),
        })
      } catch (error) {
        lastFailure = { type: 'fetch', error }
        continue
      }

      let html = ''
      try {
        html = await response.text()
      } catch {
        html = ''
      }

      const matches = new Map()
      if (html) {
        collectRegexMatches(html, matches)
      }

      const values = Array.from(matches.values())
      if (values.length > 0) {
        return {
          ok: true,
          status: 200,
          normalizedUrl: response.url,
          matches: values,
          note:
            response.ok
              ? '结果来自服务端抓取 Facebook 页面后的解析。'
              : `结果来自服务端解析返回页面，原始响应状态为 HTTP ${response.status}。`,
        }
      }

      if (response.ok) {
        lastFailure = {
          type: 'empty',
          status: response.status,
          url: response.url,
        }
        continue
      }

      lastFailure = {
        type: 'http',
        status: response.status,
        url: response.url,
      }
    }

    for (const fallback of publicFallbacks) {
      triedPublicFallback = true

      let response
      try {
        response = await fetchImpl(fallback.url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: buildRequestHeaders(),
        })
      } catch (error) {
        lastFailure = { type: 'fetch', error }
        continue
      }

      let html = ''
      try {
        html = await response.text()
      } catch {
        html = ''
      }

      const matches = new Map()
      if (html) {
        collectPublicPluginMatches(html, matches)
      }

      const values = Array.from(matches.values())
      if (values.length > 0) {
        return {
          ok: true,
          status: 200,
          normalizedUrl: response.url,
          matches: values,
          note: '结果来自 Facebook 公开嵌入页的补充解析，可以作为候选 ID 参考。',
        }
      }
    }

    const browserResult = await resolveFacebookIdsWithBrowser(url.toString()).catch(error => {
      lastFailure = { type: 'browser', error }
      return null
    })

    if (browserResult) {
      triedBrowserFallback = true
      if (browserResult.matches.length > 0) {
        return browserResult
      }

      lastFailure = {
        type: 'empty',
        status: browserResult.status,
        url: browserResult.normalizedUrl,
      }
    }

    if (lastFailure?.type === 'empty') {
      return {
        ok: true,
        status: 200,
        normalizedUrl: lastFailure.url,
        matches: [],
        note: triedBrowserFallback
          ? '已抓取原页面、Facebook 公开嵌入页并尝试真实浏览器解析，但仍没有提取到可用数字 ID。'
          : triedPublicFallback
            ? '已抓取原页面和 Facebook 公开嵌入页，但仍没有提取到可用数字 ID，可能是登录墙、限制页或对象本身不再公开暴露 ID。'
            : '已成功抓取页面，但页面源码里没有提取到可用数字 ID，可能是 Facebook 返回了登录墙或限制页。',
      }
    }

    if (lastFailure?.type === 'http') {
      return {
        ok: false,
        status: lastFailure.status,
        error: `${buildHttpStatusMessage(lastFailure.status)}。这通常是 Facebook 对未登录或机器人请求的限制。`,
        matches: [],
      }
    }

    const causeCode = getCauseCode(lastFailure?.error)
    const message =
      lastFailure?.error instanceof Error && lastFailure.error.name === 'AbortError'
        ? '请求 Facebook 超时，请稍后重试'
        : causeCode === 'UND_ERR_CONNECT_TIMEOUT'
          ? '服务端连接 Facebook 超时，请检查服务器是否能访问 www.facebook.com:443'
          : '服务端抓取 Facebook 页面失败'

    return {
      ok: false,
      status: 502,
      error: message,
      matches: [],
    }
  } finally {
    clearTimeout(timeout)
  }
}
