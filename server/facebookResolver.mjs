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
    account: 'Facebook账号ID',
    page: 'Facebook主页ID',
    group: 'Facebook群组ID',
    adPost: 'Facebook广告贴ID',
    generic: 'Facebook数字ID',
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

  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Facebook 页面请求失败：HTTP ${response.status}`,
        matches: [],
      }
    }

    const html = await response.text()
    const matches = new Map()
    collectRegexMatches(html, matches)

    const values = Array.from(matches.values())
    return {
      ok: true,
      status: 200,
      normalizedUrl: response.url,
      matches: values,
      note:
        values.length > 0
          ? '结果来自服务端抓取 Facebook 页面后的解析。'
          : '已成功抓取页面，但页面源码里没有提取到可用数字 ID，可能是 Facebook 返回了登录墙或限制页。',
    }
  } catch (error) {
    const causeCode = getCauseCode(error)
    const message =
      error instanceof Error && error.name === 'AbortError'
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
