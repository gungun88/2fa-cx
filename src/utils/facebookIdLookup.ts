import type { FacebookIdKind, FacebookIdMatch } from '@/utils/facebook'

export type FacebookLookupType = 'profile' | 'page' | 'group' | 'post' | 'reel' | 'watch' | 'generic'

export interface FacebookIdLookupPart {
  label: string
  value: string
  highlight?: boolean
}

export interface FacebookIdLookupResult {
  input: string
  normalizedInput: string
  lookupType: FacebookLookupType
  parts: FacebookIdLookupPart[]
  matches: FacebookIdMatch[]
  note?: string
}

const NUMERIC_ID_RE = /^\d{5,}$/

export const facebookLookupTypeMeta: Record<
  FacebookLookupType,
  {
    label: string
    description: string
  }
> = {
  profile: {
    label: '\u4e2a\u4eba\u4e3b\u9875',
    description: '\u901a\u5e38\u51fa\u73b0\u4e8e `profile.php?id=...` \u6216 `/people/.../{id}` \u8fd9\u7c7b\u4e2a\u4eba\u94fe\u63a5\u3002',
  },
  page: {
    label: '\u4e13\u9875',
    description: '\u901a\u5e38\u51fa\u73b0\u4e8e `/pages/.../{id}` \u6216\u5e26\u6709 `page_id` \u53c2\u6570\u7684\u94fe\u63a5\u3002',
  },
  group: {
    label: '\u5c0f\u7ec4',
    description: '\u901a\u5e38\u51fa\u73b0\u4e8e `/groups/{id}` \u6216 `group_id` \u53c2\u6570\u4e2d\u3002',
  },
  post: {
    label: '\u5e16\u5b50',
    description: '\u5305\u62ec `story_fbid` `fbid` `post_id` \u7b49\u5e16\u5b50\u6216\u5e7f\u544a\u7d20\u6750 ID\u3002',
  },
  reel: {
    label: 'Reel',
    description: '\u51fa\u73b0\u4e8e `/reel/{id}` \u8def\u5f84\u4e2d\u7684\u77ed\u89c6\u9891 ID\u3002',
  },
  watch: {
    label: 'Watch',
    description: '\u51fa\u73b0\u4e8e `/watch/{id}` \u8def\u5f84\u4e2d\u7684\u89c6\u9891 ID\u3002',
  },
  generic: {
    label: '\u901a\u7528',
    description: '\u65e0\u6cd5\u51c6\u786e\u5224\u65ad\u7c7b\u578b\u65f6\uff0c\u4ecd\u4f1a\u5c1d\u8bd5\u63d0\u53d6\u53ef\u80fd\u7684\u6570\u5b57 ID\u3002',
  },
}

function normalizeInput(input: string) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^(www\.|m\.|mbasic\.)?facebook\.com\//i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
}

function buildMatch(kind: FacebookIdKind, id: string, source: string, hint?: string): FacebookIdMatch {
  const labels: Record<FacebookIdKind, string> = {
    account: 'Facebook \u8d26\u53f7 ID',
    page: 'Facebook \u4e13\u9875 ID',
    group: 'Facebook \u5c0f\u7ec4 ID',
    adPost: 'Facebook \u5e16\u5b50 ID',
    generic: 'Facebook \u6570\u5b57 ID',
  }

  return {
    kind,
    label: labels[kind],
    id,
    source,
    hint,
    confidence: 'high',
  }
}

function addPart(parts: FacebookIdLookupPart[], label: string, value: string, highlight = false) {
  if (!value) {
    return
  }

  parts.push({ label, value, highlight })
}

function detectLookupType(url: URL): FacebookLookupType {
  const [first, second] = url.pathname.split('/').filter(Boolean)

  if (first === 'profile.php' || first === 'people') {
    return 'profile'
  }

  if (first === 'pages') {
    return 'page'
  }

  if (first === 'groups') {
    return 'group'
  }

  if (first === 'reel') {
    return 'reel'
  }

  if (first === 'watch') {
    return 'watch'
  }

  if (second === 'posts' || second === 'videos') {
    return 'post'
  }

  if (url.searchParams.has('story_fbid') || url.searchParams.has('fbid') || url.searchParams.has('post_id')) {
    return 'post'
  }

  return 'generic'
}

export function lookupFacebookId(input: string): FacebookIdLookupResult {
  const normalizedInput = normalizeInput(input)
  const parts: FacebookIdLookupPart[] = []
  const matches: FacebookIdMatch[] = []

  if (!normalizedInput) {
    return {
      input,
      normalizedInput,
      lookupType: 'generic',
      parts,
      matches,
      note: '\u8bf7\u5148\u8f93\u5165 Facebook \u94fe\u63a5\u6216\u7eaf\u6570\u5b57 ID\u3002',
    }
  }

  if (NUMERIC_ID_RE.test(normalizedInput)) {
    matches.push(buildMatch('generic', normalizedInput, '\u76f4\u63a5\u8f93\u5165\u7684\u6570\u5b57 ID'))
    addPart(parts, '\u8f93\u5165\u7c7b\u578b', '\u7eaf\u6570\u5b57 ID')
    addPart(parts, 'ID', normalizedInput, true)

    return {
      input,
      normalizedInput,
      lookupType: 'generic',
      parts,
      matches,
      note: '\u8fd9\u662f\u76f4\u63a5\u8f93\u5165\u7684 ID\uff0c\u672a\u7ecf\u8fc7\u94fe\u63a5\u7ed3\u6784\u5206\u6790\u3002',
    }
  }

  try {
    const url = new URL(normalizedInput)
    const lookupType = detectLookupType(url)
    const segments = url.pathname.split('/').filter(Boolean)

    addPart(parts, '\u57df\u540d', url.hostname)
    addPart(parts, '\u8def\u5f84', url.pathname || '/')
    if (url.search) {
      addPart(parts, '\u67e5\u8be2\u53c2\u6570', url.search)
    }

    if (url.searchParams.has('id') && NUMERIC_ID_RE.test(url.searchParams.get('id') || '')) {
      matches.push(buildMatch('account', url.searchParams.get('id') || '', 'id \u53c2\u6570'))
      addPart(parts, 'id', url.searchParams.get('id') || '', true)
    }

    if (url.searchParams.has('page_id') && NUMERIC_ID_RE.test(url.searchParams.get('page_id') || '')) {
      matches.push(buildMatch('page', url.searchParams.get('page_id') || '', 'page_id \u53c2\u6570'))
      addPart(parts, 'page_id', url.searchParams.get('page_id') || '', true)
    }

    if (url.searchParams.has('group_id') && NUMERIC_ID_RE.test(url.searchParams.get('group_id') || '')) {
      matches.push(buildMatch('group', url.searchParams.get('group_id') || '', 'group_id \u53c2\u6570'))
      addPart(parts, 'group_id', url.searchParams.get('group_id') || '', true)
    }

    for (const key of ['story_fbid', 'fbid', 'post_id', 'object_story_id']) {
      const value = url.searchParams.get(key) || ''
      if (NUMERIC_ID_RE.test(value)) {
        matches.push(buildMatch('adPost', value, `${key} \u53c2\u6570`))
        addPart(parts, key, value, true)
      }
    }

    if (segments[0] === 'people' && NUMERIC_ID_RE.test(segments[2] || '')) {
      matches.push(buildMatch('account', segments[2], '/people/.../{id}'))
      addPart(parts, '\u5c3e\u90e8 ID', segments[2], true)
    }

    if (segments[0] === 'pages' && NUMERIC_ID_RE.test(segments[2] || '')) {
      matches.push(buildMatch('page', segments[2], '/pages/.../{id}'))
      addPart(parts, '\u5c3e\u90e8 ID', segments[2], true)
    }

    if (segments[0] === 'groups' && NUMERIC_ID_RE.test(segments[1] || '')) {
      matches.push(buildMatch('group', segments[1], '/groups/{id}'))
      addPart(parts, '\u5c0f\u7ec4 ID', segments[1], true)
    }

    if ((segments[0] === 'reel' || segments[0] === 'watch') && NUMERIC_ID_RE.test(segments[1] || '')) {
      matches.push(buildMatch('adPost', segments[1], `/${segments[0]}/{id}`))
      addPart(parts, `${segments[0]} ID`, segments[1], true)
    }

    if (segments[1] === 'posts' && NUMERIC_ID_RE.test(segments[2] || '')) {
      matches.push(buildMatch('adPost', segments[2], '/{name}/posts/{id}'))
      addPart(parts, '\u5e16\u5b50 ID', segments[2], true)
    }

    const uniqueMatches = Array.from(new Map(matches.map(match => [`${match.kind}:${match.id}`, match])).values())

    return {
      input,
      normalizedInput,
      lookupType,
      parts,
      matches: uniqueMatches,
      note:
        uniqueMatches.length > 0
          ? '\u5df2\u6839\u636e\u94fe\u63a5\u7ed3\u6784\u63d0\u53d6\u51fa\u53ef\u80fd\u7684 ID\u3002'
          : '\u8fd9\u4e2a\u94fe\u63a5\u7ed3\u6784\u6ca1\u6709\u76f4\u63a5\u663e\u793a\u6570\u5b57 ID\uff0c\u53ef\u4ee5\u518d\u8bd5\u4e00\u6b21\u670d\u52a1\u7aef\u89e3\u6790\u3002',
    }
  } catch {
    return {
      input,
      normalizedInput,
      lookupType: 'generic',
      parts,
      matches,
      note: '\u5f53\u524d\u8f93\u5165\u4e0d\u662f\u53ef\u89e3\u6790\u7684 URL\uff0c\u53ef\u4ee5\u6539\u4e3a Facebook \u94fe\u63a5\u6216\u7eaf\u6570\u5b57 ID\u3002',
    }
  }
}
