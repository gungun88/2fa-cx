export type FacebookIdKind = 'account' | 'page' | 'group' | 'adPost' | 'generic'

type FacebookMatchConfidence = 'high' | 'medium' | 'low'

export interface FacebookIdMatch {
  kind: FacebookIdKind
  label: string
  id: string
  source: string
  hint?: string
  confidence: FacebookMatchConfidence
}

export interface FacebookLookupResult {
  ok: boolean
  status: number
  normalizedInput?: string
  normalizedUrl?: string
  matches: FacebookIdMatch[]
  note?: string
  error?: string
}

const NUMERIC_ID_RE = /^\d{5,}$/
const FACEBOOK_HOST_PATTERNS = ['facebook.com', 'fb.com', 'fb.watch']

function normalizeInput(input: string) {
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

function isFacebookHost(hostname: string) {
  return FACEBOOK_HOST_PATTERNS.some(pattern => hostname === pattern || hostname.endsWith(`.${pattern}`))
}

function isLikelyFacebookUrl(value: string) {
  try {
    const url = new URL(value)
    return isFacebookHost(url.hostname)
  } catch {
    return false
  }
}

function getLabel(kind: FacebookIdKind) {
  switch (kind) {
    case 'account':
      return 'Facebook \u8d26\u53f7 ID'
    case 'page':
      return 'Facebook \u4e13\u9875 ID'
    case 'group':
      return 'Facebook \u5c0f\u7ec4 ID'
    case 'adPost':
      return 'Facebook \u5e16\u5b50 ID'
    case 'generic':
    default:
      return 'Facebook \u6570\u5b57 ID'
  }
}

function buildMatch(
  kind: FacebookIdKind,
  id: string,
  source: string,
  confidence: FacebookMatchConfidence,
  hint?: string
): FacebookIdMatch {
  return {
    kind,
    label: getLabel(kind),
    id,
    source,
    hint,
    confidence,
  }
}

function addMatch(
  bucket: Map<string, FacebookIdMatch>,
  kind: FacebookIdKind,
  id: string | null | undefined,
  source: string,
  confidence: FacebookMatchConfidence,
  hint?: string
) {
  if (!id || !NUMERIC_ID_RE.test(id)) {
    return
  }

  const key = `${kind}:${id}`
  if (!bucket.has(key)) {
    bucket.set(key, buildMatch(kind, id, source, confidence, hint))
  }
}

function collectQueryParamMatches(url: URL, bucket: Map<string, FacebookIdMatch>) {
  const queryMappings: Array<{
    key: string
    kind: FacebookIdKind
    source: string
    confidence: FacebookMatchConfidence
  }> = [
    { key: 'id', kind: 'account', source: 'URL \u53c2\u6570 id', confidence: 'high' },
    { key: 'story_fbid', kind: 'adPost', source: 'URL \u53c2\u6570 story_fbid', confidence: 'high' },
    { key: 'fbid', kind: 'adPost', source: 'URL \u53c2\u6570 fbid', confidence: 'high' },
    { key: 'post_id', kind: 'adPost', source: 'URL \u53c2\u6570 post_id', confidence: 'high' },
    { key: 'page_id', kind: 'page', source: 'URL \u53c2\u6570 page_id', confidence: 'high' },
    { key: 'group_id', kind: 'group', source: 'URL \u53c2\u6570 group_id', confidence: 'high' },
    { key: 'object_story_id', kind: 'adPost', source: 'URL \u53c2\u6570 object_story_id', confidence: 'high' },
  ]

  for (const mapping of queryMappings) {
    addMatch(bucket, mapping.kind, url.searchParams.get(mapping.key), mapping.source, mapping.confidence)
  }
}

function collectPathMatches(url: URL, bucket: Map<string, FacebookIdMatch>) {
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return
  }

  if (NUMERIC_ID_RE.test(segments[0])) {
    addMatch(bucket, 'generic', segments[0], '\u8def\u5f84\u4e2d\u7684\u7eaf\u6570\u5b57\u6bb5', 'medium')
  }

  if (segments[0] === 'profile.php') {
    addMatch(bucket, 'account', url.searchParams.get('id'), 'profile.php \u9875\u9762\u53c2\u6570', 'high')
    return
  }

  if (segments[0] === 'people' && segments.length >= 3) {
    addMatch(bucket, 'account', segments[2], '/people/.../{id} \u8def\u5f84', 'high')
  }

  if (segments[0] === 'pages' && segments.length >= 3) {
    addMatch(bucket, 'page', segments[2], '/pages/.../{id} \u8def\u5f84', 'high')
  }

  if (segments[0] === 'groups' && segments.length >= 2) {
    addMatch(bucket, 'group', segments[1], '/groups/{id} \u8def\u5f84', 'high')
  }

  if (segments[0] === 'watch' && segments.length >= 2) {
    addMatch(bucket, 'adPost', segments[1], '/watch/{id} \u8def\u5f84', 'medium')
  }

  if (segments[0] === 'reel' && segments.length >= 2) {
    addMatch(bucket, 'adPost', segments[1], '/reel/{id} \u8def\u5f84', 'medium')
  }

  if (segments.length >= 3 && segments[1] === 'posts') {
    addMatch(bucket, 'adPost', segments[2], '/{name}/posts/{id} \u8def\u5f84', 'medium')
  }

  if (segments.length >= 3 && segments[1] === 'videos') {
    addMatch(bucket, 'adPost', segments[2], '/{name}/videos/{id} \u8def\u5f84', 'medium')
  }

  for (const segment of segments) {
    if (NUMERIC_ID_RE.test(segment)) {
      addMatch(bucket, 'generic', segment, '\u8def\u5f84\u7247\u6bb5\u4e2d\u7684\u6570\u5b57 ID', 'low')
    }
  }
}

function collectInlineMatches(input: string, bucket: Map<string, FacebookIdMatch>) {
  if (NUMERIC_ID_RE.test(input)) {
    addMatch(bucket, 'generic', input, '\u76f4\u63a5\u8f93\u5165\u7684\u6570\u5b57 ID', 'high')
    return
  }

  const patterns: Array<{
    regex: RegExp
    kind: FacebookIdKind
    source: string
    confidence: FacebookMatchConfidence
  }> = [
    { regex: /(?:^|[?&])id=(\d{5,})(?:$|[&#])/i, kind: 'account', source: '\u5b57\u7b26\u4e32\u4e2d\u7684 id \u53c2\u6570', confidence: 'medium' },
    { regex: /(?:^|[?&])story_fbid=(\d{5,})(?:$|[&#])/i, kind: 'adPost', source: '\u5b57\u7b26\u4e32\u4e2d\u7684 story_fbid \u53c2\u6570', confidence: 'medium' },
    { regex: /(?:^|[?&])fbid=(\d{5,})(?:$|[&#])/i, kind: 'adPost', source: '\u5b57\u7b26\u4e32\u4e2d\u7684 fbid \u53c2\u6570', confidence: 'medium' },
    { regex: /(?:^|[?&])page_id=(\d{5,})(?:$|[&#])/i, kind: 'page', source: '\u5b57\u7b26\u4e32\u4e2d\u7684 page_id \u53c2\u6570', confidence: 'medium' },
    { regex: /(?:^|[?&])group_id=(\d{5,})(?:$|[&#])/i, kind: 'group', source: '\u5b57\u7b26\u4e32\u4e2d\u7684 group_id \u53c2\u6570', confidence: 'medium' },
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern.regex)
    if (match) {
      addMatch(bucket, pattern.kind, match[1], pattern.source, pattern.confidence)
    }
  }

  const tail = input.match(/(?:people|pages)\/[^/?#]+\/(\d{5,})/i)
  if (tail) {
    const kind = /people\//i.test(input) ? 'account' : 'page'
    addMatch(bucket, kind, tail[1], '\u5b57\u7b26\u4e32\u8def\u5f84\u4e2d\u7684\u5c3e\u90e8 ID', 'medium')
  }
}

function extractLocalMatches(input: string) {
  const bucket = new Map<string, FacebookIdMatch>()

  collectInlineMatches(input, bucket)

  try {
    const url = new URL(input)
    if (isFacebookHost(url.hostname)) {
      collectQueryParamMatches(url, bucket)
      collectPathMatches(url, bucket)
    }
  } catch {
    return Array.from(bucket.values())
  }

  return Array.from(bucket.values())
}

function mergeMatches(localMatches: FacebookIdMatch[], remoteMatches: Array<Partial<FacebookIdMatch>>) {
  const bucket = new Map<string, FacebookIdMatch>()

  for (const match of localMatches) {
    bucket.set(`${match.kind}:${match.id}`, match)
  }

  for (const match of remoteMatches) {
    if (!match.id || !match.kind) {
      continue
    }

    const key = `${match.kind}:${match.id}`
    if (!bucket.has(key)) {
      bucket.set(
        key,
        buildMatch(
          match.kind,
          match.id,
          match.source || '\u670d\u52a1\u7aef\u89e3\u6790',
          match.confidence || 'medium',
          match.hint
        )
      )
    }
  }

  return Array.from(bucket.values())
}

export function canUseFacebookResolver() {
  if (typeof window === 'undefined') {
    return false
  }

  return /^https?:$/i.test(window.location.protocol)
}

export async function lookupFacebookIds(input: string): Promise<FacebookLookupResult> {
  const normalizedInput = normalizeInput(input)
  if (!normalizedInput) {
    return {
      ok: false,
      status: 400,
      matches: [],
      error: '\u8bf7\u8f93\u5165 Facebook \u94fe\u63a5\u6216\u6570\u5b57 ID',
    }
  }

  const localMatches = extractLocalMatches(normalizedInput)
  const localOnlyResult: FacebookLookupResult = {
    ok: localMatches.length > 0,
    status: localMatches.length > 0 ? 200 : 422,
    normalizedInput,
    matches: localMatches,
    note:
      localMatches.length > 0
        ? '\u5df2\u5728\u5f53\u524d\u9875\u9762\u5b8c\u6210\u672c\u5730\u89e3\u6790\u3002'
        : '\u672a\u80fd\u4ec5\u51ed\u94fe\u63a5\u7ed3\u6784\u76f4\u63a5\u63d0\u53d6\u7a33\u5b9a ID\u3002',
  }

  if (!canUseFacebookResolver() || !isLikelyFacebookUrl(normalizedInput)) {
    if (localMatches.length > 0) {
      return localOnlyResult
    }

    return {
      ...localOnlyResult,
      ok: false,
      status: 400,
      error: '\u8bf7\u8f93\u5165 Facebook \u94fe\u63a5\u3001`profile.php?id=...`\u6216\u7eaf\u6570\u5b57 ID',
    }
  }

  try {
    const response = await fetch(`/api/facebook/resolve?input=${encodeURIComponent(normalizedInput)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const data = (await response.json()) as FacebookLookupResult & { matches?: Array<Partial<FacebookIdMatch>> }
    const mergedMatches = mergeMatches(localMatches, data.matches || [])

    if (response.ok || data.ok) {
      return {
        ok: mergedMatches.length > 0,
        status: data.status || response.status || 200,
        normalizedInput,
        normalizedUrl: data.normalizedUrl,
        matches: mergedMatches,
        note: data.note || localOnlyResult.note,
        error: mergedMatches.length > 0 ? undefined : data.error,
      }
    }

    if (localMatches.length > 0) {
      return {
        ...localOnlyResult,
        note: '\u670d\u52a1\u7aef\u89e3\u6790\u672a\u8fd4\u56de\u66f4\u591a\u7ed3\u679c\uff0c\u4e0b\u65b9\u4ecd\u663e\u793a\u672c\u5730\u89e3\u6790\u7ed3\u679c\u3002',
      }
    }

    return {
      ok: false,
      status: data.status || response.status || 502,
      normalizedInput,
      matches: mergedMatches,
      note: data.note,
      error: data.error || '\u670d\u52a1\u7aef\u89e3\u6790\u5931\u8d25',
    }
  } catch {
    if (localMatches.length > 0) {
      return {
        ...localOnlyResult,
        note: '\u65e0\u6cd5\u8fde\u63a5\u670d\u52a1\u7aef\uff0c\u5df2\u81ea\u52a8\u56de\u9000\u5230\u672c\u5730\u89e3\u6790\u6a21\u5f0f\u3002',
      }
    }

    return {
      ok: false,
      status: 502,
      normalizedInput,
      matches: [],
      error: '\u670d\u52a1\u7aef\u89e3\u6790\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
    }
  }
}
