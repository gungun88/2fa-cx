import { useEffect, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { canUseFacebookResolver, type FacebookIdKind, type FacebookIdMatch } from '@/utils/facebook'
import {
  FacebookLookupType,
  facebookLookupTypeMeta,
  type FacebookIdLookupResult,
  lookupFacebookId,
} from '@/utils/facebookIdLookup'

const SITE_URL = 'https://2fa.cx'

function updateMeta(selector: string, content: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector)
  if (element) {
    element.content = content
  }
}

function updateCanonical(href: string) {
  const element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (element) {
    element.href = href
  }
}

interface FacebookIdQueryPageProps {
  isActive: boolean
  isWebsite: boolean
}

const SERVER_KIND_BY_TYPE: Record<FacebookLookupType, FacebookIdKind> = {
  account: 'account',
  page: 'page',
  group: 'group',
  adPost: 'adPost',
}

function buildServerMatchedResult(
  type: FacebookLookupType,
  match: FacebookIdMatch,
  fallbackNote: string
): FacebookIdLookupResult {
  const exactMatch = match.kind === SERVER_KIND_BY_TYPE[type]
  const description = exactMatch
    ? `服务端已从页面源代码中解析出当前类型的数字 ID。来源：${match.source}。`
    : `服务端已从页面源代码中解析出一个可用数字 ID。来源：${match.source}。`

  if (type === 'adPost' && /^\d{5,20}_\d{5,20}$/.test(match.id)) {
    const [pageId, postId] = match.id.split('_')
    return {
      matched: true,
      type,
      title: 'Facebook 广告帖 ID',
      value: match.id,
      confidence: exactMatch ? 'high' : 'low',
      sourceLabel: match.source,
      description,
      parts: [
        { label: 'Page ID', value: pageId },
        { label: 'Post ID', value: postId },
      ],
      tips: fallbackNote ? [fallbackNote] : [],
    }
  }

  const titleMap: Record<FacebookLookupType, string> = {
    account: 'Facebook 账号 ID',
    page: 'Facebook 主页 ID',
    group: 'Facebook 群组 ID',
    adPost: '帖子 ID（服务端解析）',
  }

  return {
    matched: true,
    type,
    title: titleMap[type],
    value: match.id,
    confidence: exactMatch ? 'high' : 'low',
    sourceLabel: match.source,
    description,
    parts: [],
    tips: fallbackNote ? [fallbackNote] : [],
  }
}

function buildServerLookupResult(
  type: FacebookLookupType,
  matches: FacebookIdMatch[],
  note: string,
  error: string
): FacebookIdLookupResult | null {
  if (!matches.length && !note && !error) {
    return null
  }

  const exactMatch = matches.find(match => match.kind === SERVER_KIND_BY_TYPE[type])
  if (exactMatch) {
    return buildServerMatchedResult(type, exactMatch, note)
  }

  const genericMatch = matches.find(match => match.kind === 'generic')
  if (genericMatch) {
    return buildServerMatchedResult(type, genericMatch, note)
  }

  if (matches.length > 0) {
    return {
      matched: false,
      type,
      title: '识别到其他类型 ID',
      description:
        note || '服务端已经解析到数字 ID，但与当前选择的查询类型不一致，请切换类型后重试。',
      parts: matches.map(match => ({
        label: match.label,
        value: match.id,
      })),
      tips: [],
    }
  }

  return {
    matched: false,
    type,
    title: '未识别到可用 ID',
    description: error || note,
    parts: [],
    tips: [],
  }
}

function confidenceLabel(confidence: FacebookIdLookupResult['confidence']) {
  switch (confidence) {
    case 'high':
      return '高置信度'
    case 'medium':
      return '中置信度'
    case 'low':
      return '低置信度'
    default:
      return ''
  }
}

function confidenceClass(confidence: FacebookIdLookupResult['confidence']) {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-100 text-emerald-700'
    case 'medium':
      return 'bg-amber-100 text-amber-700'
    case 'low':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-slate-200 text-slate-700'
  }
}

export function FacebookIdQueryPage({ isActive, isWebsite }: FacebookIdQueryPageProps) {
  const [lookupType, setLookupType] = useState<FacebookLookupType>('account')
  const [input, setInput] = useState('')
  const [submittedInput, setSubmittedInput] = useState('')
  const [serverMatches, setServerMatches] = useState<FacebookIdMatch[]>([])
  const [serverNote, setServerNote] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const clipboard = useClipboard()

  const localResult = lookupFacebookId(submittedInput, lookupType)
  const serverResult =
    submittedInput && !localResult.matched
      ? buildServerLookupResult(lookupType, serverMatches, serverNote, serverError)
      : null
  const result = serverResult ?? localResult
  const typeMeta =
    facebookLookupTypeMeta.find(item => item.id === lookupType) ?? facebookLookupTypeMeta[0]

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    const pageTitle = 'Facebook ID 查询'
    const pageDescription =
      '支持查询 Facebook 账号 ID、主页 ID、群组 ID、广告帖 ID，支持从链接和参数中直接提取。'

    document.title = `${pageTitle} - 2FA.CX`
    updateMeta('meta[name="description"]', pageDescription)
    updateMeta('meta[property="og:title"]', `${pageTitle} - 2FA.CX`)
    updateMeta('meta[property="og:description"]', pageDescription)
    updateMeta('meta[property="og:url"]', `${SITE_URL}/facebook-id-query`)
    updateMeta('meta[name="twitter:title"]', `${pageTitle} - 2FA.CX`)
    updateMeta('meta[name="twitter:description"]', pageDescription)
    updateMeta(
      'meta[name="robots"]',
      'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    )
    updateCanonical(`${SITE_URL}/facebook-id-query`)
  }, [isActive, isWebsite])

  const handleQuery = async () => {
    const nextValue = input.trim()
    setSubmittedInput(nextValue)
    setServerMatches([])
    setServerNote('')
    setServerError('')

    if (!nextValue) {
      return
    }

    const nextLocalResult = lookupFacebookId(nextValue, lookupType)
    if (nextLocalResult.matched || !canUseFacebookResolver(nextValue)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/facebook/resolve?input=${encodeURIComponent(nextValue)}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setServerError(data.error || '服务端解析失败，请稍后重试。')
        return
      }

      setServerMatches(Array.isArray(data.matches) ? data.matches : [])
      setServerNote(data.note || '')
    } catch {
      setServerError('服务端解析请求失败，请确认后端接口已经启动。')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResult = () => {
    if (result.value) {
      void clipboard.copy(result.value)
    }
  }

  const handleClear = () => {
    setInput('')
    setSubmittedInput('')
    setServerMatches([])
    setServerNote('')
    setServerError('')
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[28px] sm:px-6 sm:py-5">
        <div className="flex flex-wrap gap-2">
          {facebookLookupTypeMeta.map(item => {
            const selected = item.id === lookupType
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLookupType(item.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-900">输入链接、参数或数字 ID</span>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              rows={6}
              placeholder={typeMeta.example}
              className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition-colors focus:border-brand-400"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleQuery}
              disabled={!input.trim() || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '查询中...' : '查询'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              清空
            </button>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">解析结果</h2>
              {result.matched && result.value ? (
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {clipboard.copied ? '已复制' : '复制结果'}
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{result.title}</span>
                {result.confidence ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceClass(result.confidence)}`}
                  >
                    {confidenceLabel(result.confidence)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="break-all font-mono text-base font-semibold text-slate-900">
                  {result.value ?? '暂无结果'}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{result.description}</p>

              {result.sourceLabel ? (
                <p className="mt-2 text-xs font-medium text-slate-500">来源：{result.sourceLabel}</p>
              ) : null}

              {result.parts.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.parts.map(part => (
                    <article
                      key={`${part.label}-${part.value}`}
                      className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {part.label}
                      </div>
                      <div className="mt-2 break-all font-mono text-sm font-semibold text-slate-900">
                        {part.value}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[28px] sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900">支持的查询类型</h2>
        <div className="mt-4 overflow-x-auto rounded-[20px] border border-slate-200">
          <table className="min-w-[760px] w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  类型
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  说明
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  示例
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {facebookLookupTypeMeta.map(item => (
                <tr key={item.id} className="align-top">
                  <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                    {item.label}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">
                    {item.description}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4 font-mono text-xs leading-6 text-slate-600">
                    {item.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
