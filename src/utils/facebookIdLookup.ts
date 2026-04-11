export type FacebookLookupType = 'account' | 'page' | 'group' | 'adPost'

export interface FacebookIdLookupPart {
  label: string
  value: string
}

export interface FacebookIdLookupResult {
  matched: boolean
  type: FacebookLookupType
  title: string
  value?: string
  confidence?: 'high' | 'medium' | 'low'
  sourceLabel?: string
  description: string
  parts: FacebookIdLookupPart[]
  tips: string[]
}

export const facebookLookupTypeMeta: Array<{
  id: FacebookLookupType
  label: string
  description: string
  example: string
}> = [
  {
    id: 'account',
    label: '账号 ID',
    description: '提取 Facebook 个人账号的数字 ID。',
    example: 'https://www.facebook.com/profile.php?id=100089112233445',
  },
  {
    id: 'page',
    label: '主页 ID',
    description: '提取 Facebook Page 的数字 ID。',
    example: 'https://www.facebook.com/profile.php?id=61558877665544',
  },
  {
    id: 'group',
    label: '群组 ID',
    description: '提取 Facebook Group 的数字 ID。',
    example: 'https://www.facebook.com/groups/123456789012345',
  },
  {
    id: 'adPost',
    label: '广告帖 ID',
    description: '提取广告帖 object_story_id，或组合 page_id + post_id。',
    example:
      'https://www.facebook.com/permalink.php?story_fbid=123456789012345&id=109876543210987',
  },
]

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function firstMatch(input: string, pattern: RegExp) {
  const match = input.match(pattern)
  return match?.[1] ?? ''
}

function getQueryValue(input: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = input.match(new RegExp(`[?&#]${escaped}=([^&#]+)`, 'i'))
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

function getRawNumericIds(input: string) {
  return unique(input.match(/\b\d{5,20}\b/g) ?? [])
}

function buildFallbackResult(type: FacebookLookupType): FacebookIdLookupResult {
  return {
    matched: false,
    type,
    title: '未识别到可用 ID',
    description: '当前内容里没有解析出可直接使用的数字 ID。',
    parts: [],
    tips: [
      '尽量粘贴带参数的原始 Facebook 链接，例如 profile.php?id=... 或 groups/...。',
      '如果是用户名链接或新版 pfbid 链接，仅靠前端本地解析通常拿不到数字 ID。',
      '广告帖建议优先使用 object_story_id、permalink.php，或 pageId_postId 这种格式。',
    ],
  }
}

function buildSuccessResult(
  type: FacebookLookupType,
  title: string,
  value: string,
  description: string,
  sourceLabel: string,
  confidence: 'high' | 'medium' | 'low',
  parts: FacebookIdLookupPart[] = [],
  tips: string[] = []
): FacebookIdLookupResult {
  return {
    matched: true,
    type,
    title,
    value,
    confidence,
    sourceLabel,
    description,
    parts,
    tips,
  }
}

function lookupAccountId(input: string) {
  const profileId = firstMatch(input, /profile\.php[^#]*[?&]id=(\d{5,20})/i)
  if (profileId) {
    return buildSuccessResult(
      'account',
      'Facebook 账号 ID',
      profileId,
      '已从 profile.php?id 参数中提取账号 ID。',
      'profile.php?id',
      'high'
    )
  }

  const peopleId = firstMatch(input, /\/people\/[^/?#]+\/(\d{5,20})/i)
  if (peopleId) {
    return buildSuccessResult(
      'account',
      'Facebook 账号 ID',
      peopleId,
      '已从 /people/.../{id} 路径中提取账号 ID。',
      '/people/.../{id}',
      'high'
    )
  }

  const entityId = firstMatch(input, /entity_id=(\d{5,20})/i)
  if (entityId) {
    return buildSuccessResult(
      'account',
      'Facebook 账号 ID',
      entityId,
      '已从 entity_id 参数中提取账号 ID。',
      'entity_id',
      'medium'
    )
  }

  const rawIds = getRawNumericIds(input)
  if (rawIds.length > 0) {
    return buildSuccessResult(
      'account',
      '疑似 Facebook 账号 ID',
      rawIds[0],
      '当前内容里存在数字 ID，但缺少足够的路径信息来确认它一定是账号 ID。',
      'raw numeric id',
      'low',
      [],
      ['如果你需要高置信度结果，优先粘贴 profile.php?id=... 或 /people/... 链接。']
    )
  }

  return buildFallbackResult('account')
}

function lookupPageId(input: string) {
  const pageId = firstMatch(input, /page_id=(\d{5,20})/i)
  if (pageId) {
    return buildSuccessResult(
      'page',
      'Facebook 主页 ID',
      pageId,
      '已从 page_id 参数中提取主页 ID。',
      'page_id',
      'high'
    )
  }

  const fbPageId = firstMatch(input, /fb:\/\/page\/\?id=(\d{5,20})/i)
  if (fbPageId) {
    return buildSuccessResult(
      'page',
      'Facebook 主页 ID',
      fbPageId,
      '已从 fb://page/?id 链接中提取主页 ID。',
      'fb://page/?id',
      'high'
    )
  }

  const pagesPathId = firstMatch(input, /\/pages\/[^/?#]+\/(\d{5,20})/i)
  if (pagesPathId) {
    return buildSuccessResult(
      'page',
      'Facebook 主页 ID',
      pagesPathId,
      '已从 /pages/.../{id} 路径中提取主页 ID。',
      '/pages/.../{id}',
      'high'
    )
  }

  const profileId = firstMatch(input, /profile\.php[^#]*[?&]id=(\d{5,20})/i)
  if (profileId) {
    return buildSuccessResult(
      'page',
      'Facebook 主页 ID',
      profileId,
      '已从 profile.php?id 中提取数字 ID，可作为主页 ID 使用。',
      'profile.php?id',
      'medium'
    )
  }

  const rawIds = getRawNumericIds(input)
  if (rawIds.length > 0) {
    return buildSuccessResult(
      'page',
      '疑似 Facebook 主页 ID',
      rawIds[0],
      '当前内容里存在数字 ID，但缺少足够的路径信息来确认它一定是主页 ID。',
      'raw numeric id',
      'low',
      [],
      ['如果你需要高置信度结果，优先粘贴 page_id、profile.php?id 或 /pages/... 链接。']
    )
  }

  return buildFallbackResult('page')
}

function lookupGroupId(input: string) {
  const groupId = firstMatch(input, /\/groups\/(\d{5,20})/i)
  if (groupId) {
    return buildSuccessResult(
      'group',
      'Facebook 群组 ID',
      groupId,
      '已从 /groups/{id} 路径中提取群组 ID。',
      '/groups/{id}',
      'high'
    )
  }

  const groupParam = firstMatch(input, /group_id=(\d{5,20})/i)
  if (groupParam) {
    return buildSuccessResult(
      'group',
      'Facebook 群组 ID',
      groupParam,
      '已从 group_id 参数中提取群组 ID。',
      'group_id',
      'high'
    )
  }

  const rawIds = getRawNumericIds(input)
  if (rawIds.length > 0) {
    return buildSuccessResult(
      'group',
      '疑似 Facebook 群组 ID',
      rawIds[0],
      '当前内容里存在数字 ID，但缺少足够的路径信息来确认它一定是群组 ID。',
      'raw numeric id',
      'low',
      [],
      ['如果你需要高置信度结果，优先粘贴 /groups/{id} 链接。']
    )
  }

  return buildFallbackResult('group')
}

function lookupAdPostId(input: string) {
  const directComposite = firstMatch(input, /\b(\d{5,20}_\d{5,20})\b/)
  if (directComposite) {
    const [pageId, postId] = directComposite.split('_')
    return buildSuccessResult(
      'adPost',
      'Facebook 广告帖 ID',
      directComposite,
      '已直接识别到 object_story_id 格式的广告帖 ID。',
      'pageId_postId',
      'high',
      [
        { label: 'Page ID', value: pageId },
        { label: 'Post ID', value: postId },
      ]
    )
  }

  const objectStoryId = getQueryValue(input, 'object_story_id')
  if (objectStoryId && /^\d{5,20}_\d{5,20}$/.test(objectStoryId)) {
    const [pageId, postId] = objectStoryId.split('_')
    return buildSuccessResult(
      'adPost',
      'Facebook 广告帖 ID',
      objectStoryId,
      '已从 object_story_id 参数中提取广告帖 ID。',
      'object_story_id',
      'high',
      [
        { label: 'Page ID', value: pageId },
        { label: 'Post ID', value: postId },
      ]
    )
  }

  const storyFbid = getQueryValue(input, 'story_fbid')
  const pageId = getQueryValue(input, 'id') || getQueryValue(input, 'page_id')
  if (storyFbid && pageId && /^\d{5,20}$/.test(storyFbid) && /^\d{5,20}$/.test(pageId)) {
    const combined = `${pageId}_${storyFbid}`
    return buildSuccessResult(
      'adPost',
      'Facebook 广告帖 ID',
      combined,
      '已用 page_id 和 story_fbid 组合出广告帖 ID。',
      'story_fbid + id',
      'high',
      [
        { label: 'Page ID', value: pageId },
        { label: 'Post ID', value: storyFbid },
      ]
    )
  }

  const postId = firstMatch(input, /\/posts\/(\d{5,20})/i) || getQueryValue(input, 'story_fbid')
  if (postId && /^\d{5,20}$/.test(postId)) {
    return buildSuccessResult(
      'adPost',
      '帖子 ID（部分结果）',
      postId,
      '已识别出帖子 ID，但缺少主页 ID，暂时无法组合成完整广告帖 ID。',
      '/posts/{id} or story_fbid',
      'medium',
      [{ label: 'Post ID', value: postId }],
      ['如果你需要完整广告帖 ID，请补充 permalink.php?story_fbid=...&id=... 或 object_story_id。']
    )
  }

  return buildFallbackResult('adPost')
}

export function lookupFacebookId(
  input: string,
  type: FacebookLookupType
): FacebookIdLookupResult {
  const normalized = input.trim()

  if (!normalized) {
    return {
      matched: false,
      type,
      title: '等待输入',
      description: '粘贴 Facebook 链接、原始参数或数字 ID 后开始解析。',
      parts: [],
      tips: [
        '账号和主页建议优先使用 profile.php?id=... 这类原始链接。',
        '群组建议优先使用 /groups/{id} 链接。',
        '广告帖建议优先使用 object_story_id、permalink.php 或 pageId_postId。',
      ],
    }
  }

  switch (type) {
    case 'account':
      return lookupAccountId(normalized)
    case 'page':
      return lookupPageId(normalized)
    case 'group':
      return lookupGroupId(normalized)
    case 'adPost':
      return lookupAdPostId(normalized)
    default:
      return buildFallbackResult(type)
  }
}
