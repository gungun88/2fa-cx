import { existsSync } from 'node:fs'

const NUMERIC_ID_RE = /^\d{5,}$/

const DEFAULT_BROWSER_PATHS = {
  win32: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: [
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ],
  darwin: [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
}

function isTruthyEnv(value, defaultValue) {
  if (value == null || value === '') {
    return defaultValue
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase())
}

function getPositiveIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isBrowserResolverEnabled() {
  return isTruthyEnv(process.env.FACEBOOK_BROWSER_RESOLVER_ENABLED, true)
}

function isHeadlessEnabled() {
  return isTruthyEnv(process.env.FACEBOOK_BROWSER_HEADLESS, true)
}

function getBrowserTimeoutMs() {
  return getPositiveIntegerEnv(process.env.FACEBOOK_BROWSER_TIMEOUT_MS, 45000)
}

function getExecutablePath() {
  const explicit = process.env.FACEBOOK_BROWSER_EXECUTABLE_PATH
  if (explicit && existsSync(explicit)) {
    return explicit
  }

  const candidates = DEFAULT_BROWSER_PATHS[process.platform] || []
  return candidates.find(candidate => existsSync(candidate)) || null
}

function buildMatch(kind, id, source, hint) {
  const labelMap = {
    account: 'Facebook 账号 ID',
    page: 'Facebook 主页 ID',
    group: 'Facebook 群组 ID',
    adPost: 'Facebook 帖子 ID',
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

function collectBrowserMatches(html, bucket) {
  const mappings = [
    { kind: 'account', source: 'browser meta fb://profile', regex: /fb:\/\/profile\/(\d{5,})/g },
    { kind: 'page', source: 'browser meta fb://page', regex: /fb:\/\/page\/(\d{5,})/g },
    { kind: 'group', source: 'browser meta fb://group', regex: /fb:\/\/group\/(\d{5,})/g },
    { kind: 'adPost', source: 'browser meta fb://post', regex: /fb:\/\/post\/(\d{5,})/g },
    { kind: 'generic', source: 'browser HTML entity_id', regex: /"entity_id"\s*:\s*"(\d{5,})"/g },
    { kind: 'account', source: 'browser HTML userID', regex: /"userID"\s*:\s*"(\d{5,})"/g },
    { kind: 'account', source: 'browser HTML profile_owner', regex: /"profile_owner"\s*:\s*"(\d{5,})"/g },
    { kind: 'page', source: 'browser HTML pageID', regex: /"pageID"\s*:\s*"(\d{5,})"/g },
    { kind: 'group', source: 'browser HTML groupID', regex: /"groupID"\s*:\s*"(\d{5,})"/g },
    { kind: 'adPost', source: 'browser HTML story_fbid', regex: /"story_fbid"\s*:\s*"(\d{5,})"/g },
  ]

  for (const mapping of mappings) {
    for (const match of html.matchAll(mapping.regex)) {
      addMatch(bucket, mapping.kind, match[1], mapping.source)
    }
  }
}

export async function resolveFacebookIdsWithBrowser(input) {
  if (!isBrowserResolverEnabled()) {
    return null
  }

  const executablePath = getExecutablePath()
  if (!executablePath) {
    return null
  }

  const { chromium } = await import('playwright-core')

  let browser
  try {
    browser = await chromium.launch({
      executablePath,
      headless: isHeadlessEnabled(),
    })

    const context = await browser.newContext({
      locale: 'en-US',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    })

    await context.route('**/*', route => {
      const resourceType = route.request().resourceType()
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        return route.abort()
      }

      return route.continue()
    })

    const page = await context.newPage()
    await page.goto(input, {
      waitUntil: 'domcontentloaded',
      timeout: getBrowserTimeoutMs(),
    })

    const html = await page.content()
    const normalizedUrl = page.url()
    const matches = new Map()
    collectBrowserMatches(html, matches)
    await context.close()

    return {
      ok: matches.size > 0,
      status: matches.size > 0 ? 200 : 422,
      normalizedUrl,
      matches: Array.from(matches.values()),
      note:
        matches.size > 0
          ? '结果来自真实浏览器打开 Facebook 公共页后的补充解析。'
          : '真实浏览器已成功打开页面，但页面中没有提取到可用数字 ID。',
    }
  } finally {
    await browser?.close()
  }
}
