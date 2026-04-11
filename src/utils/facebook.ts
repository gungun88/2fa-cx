export type FacebookIdKind = 'account' | 'page' | 'group' | 'adPost' | 'generic'

export interface FacebookIdMatch {
  kind: FacebookIdKind
  label: string
  id: string
  source: string
  hint?: string
}

export interface FacebookLookupResult {
  normalizedInput: string
  hostname?: string
  matches: FacebookIdMatch[]
  note?: string
}

const FACEBOOK_HOST_PATTERNS = ['facebook.com', 'fb.com', 'fb.watch']
const NUMERIC_ID_RE = /^\d{5,}$/

function isFacebookHost(hostname: string) {
  return FACEBOOK_HOST_PATTERNS.some(pattern => hostname === pattern || hostname.endsWith(`.${pattern}`))
}

function normalizeUrlInput(input: string) {
  const trimmed = input.trim()
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

function parseUrl(input: string) {
  const normalized = normalizeUrlInput(input)
  try {
    return normalized ? new URL(normalized) : null
  } catch {
    return null
  }
}

function getNumericSegments(pathname: string) {
  return pathname
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
    .filter(segment => NUMERIC_ID_RE.test(segment))
}

function getLastNumericSegment(pathname: string) {
  const segments = getNumericSegments(pathname)
  return segments.length > 0 ? segments[segments.length - 1] : undefined
}

function addMatch(
  bucket: Map<string, FacebookIdMatch>,
  kind: FacebookIdKind,
  id: string | null,
  source: string,
  hint?: string
) {
  if (!id || !NUMERIC_ID_RE.test(id)) {
    return
  }

  const key = `${kind}:${id}`
  if (bucket.has(key)) {
    return
  }

  const labelMap: Record<FacebookIdKind, string> = {
    account: 'Facebook 账号 ID',
    page: 'Facebook 主页 ID',
    group: 'Facebook 群组 ID',
    adPost: 'Facebook 广告帖 ID',
    generic: 'Facebook 数字 ID',
  }

  bucket.set(key, {
    kind,
    label: labelMap[kind],
    id,
    source,
    hint,
  })
}

function collectFromSearchParams(url: URL, bucket: Map<string, FacebookIdMatch>) {
  const pathname = url.pathname.toLowerCase()
  const params = url.searchParams

  addMatch(bucket, 'adPost', params.get('story_fbid'), 'story_fbid 参数', '常见于帖子或广告帖链接')
  addMatch(bucket, 'adPost', params.get('fbid'), 'fbid 参数', '常见于帖子、图片或视频链接')
  addMatch(bucket, 'adPost', params.get('post_id'), 'post_id 参数', '常见于广告帖或帖子预览链接')
  addMatch(bucket, 'adPost', params.get('multi_permalinks')?.split(',')[0] ?? null, 'multi_permalinks 参数')
  addMatch(bucket, 'group', params.get('group_id'), 'group_id 参数')
  addMatch(bucket, 'page', params.get('page_id'), 'page_id 参数')

  if (pathname === '/profile.php') {
    addMatch(bucket, 'account', params.get('id'), 'profile.php?id 参数')
  }

  if (pathname === '/permalink.php' || pathname === '/story.php') {
    addMatch(bucket, 'page', params.get('id'), '帖子归属 id 参数', '通常是主页或账号 ID')
  }

  if (pathname.includes('/ads/library')) {
    addMatch(bucket, 'adPost', params.get('id'), '广告资料库 id 参数')
  }
}

function collectFromPath(url: URL, bucket: Map<string, FacebookIdMatch>) {
  const segments = url.pathname
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  const lowerSegments = segments.map(segment => segment.toLowerCase())

  const groupsIndex = lowerSegments.indexOf('groups')
  if (groupsIndex >= 0) {
    addMatch(bucket, 'group', segments[groupsIndex + 1] ?? null, '/groups/{id}')

    const permalinkIndex = lowerSegments.indexOf('permalink')
    if (permalinkIndex >= 0) {
      addMatch(bucket, 'adPost', segments[permalinkIndex + 1] ?? null, '/groups/{groupId}/permalink/{postId}')
    }
  }

  const peopleIndex = lowerSegments.indexOf('people')
  if (peopleIndex >= 0) {
    addMatch(bucket, 'account', getLastNumericSegment(url.pathname) ?? null, '/people/.../{accountId}')
  }

  const pagesIndex = lowerSegments.indexOf('pages')
  if (pagesIndex >= 0) {
    addMatch(bucket, 'page', getLastNumericSegment(url.pathname) ?? null, '/pages/.../{pageId}')
  }

  const pageIndex = lowerSegments.indexOf('page')
  if (pageIndex >= 0) {
    addMatch(bucket, 'page', segments[pageIndex + 1] ?? null, '/page/{pageId}')
  }

  const postsIndex = lowerSegments.indexOf('posts')
  if (postsIndex >= 0) {
    addMatch(bucket, 'adPost', segments[postsIndex + 1] ?? null, '/posts/{postId}')
  }

  const videosIndex = lowerSegments.indexOf('videos')
  if (videosIndex >= 0) {
    addMatch(bucket, 'adPost', segments[videosIndex + 1] ?? null, '/videos/{postId}')
  }

  const reelIndex = lowerSegments.indexOf('reel')
  if (reelIndex >= 0) {
    addMatch(bucket, 'adPost', segments[reelIndex + 1] ?? null, '/reel/{postId}')
  }

  const permalinkIndex = lowerSegments.indexOf('permalink')
  if (permalinkIndex >= 0) {
    addMatch(bucket, 'adPost', segments[permalinkIndex + 1] ?? null, '/permalink/{postId}')
  }

  const numericTail = getLastNumericSegment(url.pathname) ?? null
  if (numericTail && bucket.size === 0) {
    addMatch(bucket, 'generic', numericTail, '路径中的数字 ID')
  }
}

export function canUseFacebookResolver(input: string) {
  const normalized = normalizeUrlInput(input)
  try {
    const url = new URL(normalized)
    return isFacebookHost(url.hostname)
  } catch {
    return false
  }
}

export function lookupFacebookIds(input: string): FacebookLookupResult {
  const normalizedInput = input.trim()
  const matches = new Map<string, FacebookIdMatch>()

  if (!normalizedInput) {
    return { normalizedInput: '', matches: [] }
  }

  if (NUMERIC_ID_RE.test(normalizedInput)) {
    addMatch(matches, 'generic', normalizedInput, '直接输入的数字 ID', '可作为账号、主页、群组或广告帖 ID 使用')
    return {
      normalizedInput,
      matches: Array.from(matches.values()),
    }
  }

  const url = parseUrl(normalizedInput)
  if (!url || !isFacebookHost(url.hostname)) {
    return {
      normalizedInput,
      hostname: url?.hostname,
      matches: [],
      note: normalizedInput ? '当前输入不是可识别的 Facebook 链接或数字 ID。' : undefined,
    }
  }

  collectFromSearchParams(url, matches)
  collectFromPath(url, matches)

  let note: string | undefined
  if (matches.size === 0) {
    const segments = url.pathname
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean)

    if (segments.length === 1 && !NUMERIC_ID_RE.test(segments[0])) {
      note =
        '这是用户名主页链接，地址里只有用户名，没有数字 ID。当前工具是本地解析，只能提取链接里已经出现的数字 ID；如果要把用户名解析成真实 Facebook ID，需要服务端请求 Facebook 或第三方接口。'
    } else {
      note = '没有识别到可用数字 ID，请尽量粘贴包含数字参数的 Facebook 原始链接。'
    }
  }

  return {
    normalizedInput: url.toString(),
    hostname: url.hostname,
    matches: Array.from(matches.values()),
    note,
  }
}
