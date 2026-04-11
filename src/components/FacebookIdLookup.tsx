import { useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { FacebookIdMatch, lookupFacebookIds, canUseFacebookResolver } from '@/utils/facebook'

const EXAMPLES = [
  {
    label: '账号链接',
    value: 'https://www.facebook.com/profile.php?id=100012345678901',
  },
  {
    label: '主页帖子',
    value: 'https://www.facebook.com/permalink.php?story_fbid=123456789012345&id=100098765432100',
  },
  {
    label: '群组链接',
    value: 'https://www.facebook.com/groups/123456789012345',
  },
  {
    label: '广告帖链接',
    value: 'https://www.facebook.com/somepage/posts/123456789012345',
  },
]

function ResultRow({
  match,
  copied,
  onCopy,
}: {
  match: FacebookIdMatch
  copied: boolean
  onCopy: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{match.label}</p>
          <p className="mt-1 break-all font-mono text-sm text-brand-700">{match.id}</p>
          <p className="mt-1 text-xs text-slate-500">{match.source}</p>
          {match.hint ? <p className="mt-1 text-xs text-slate-400">{match.hint}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => onCopy(match.id)}
          className={[
            'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            copied
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
          ].join(' ')}
        >
          {copied ? '已复制' : '复制 ID'}
        </button>
      </div>
    </div>
  )
}

export function FacebookIdLookup() {
  const [value, setValue] = useState('')
  const [submittedValue, setSubmittedValue] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [serverMatches, setServerMatches] = useState<FacebookIdMatch[]>([])
  const [serverNote, setServerNote] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const clipboard = useClipboard()

  const result = useMemo(() => lookupFacebookIds(submittedValue), [submittedValue])
  const displayedMatches = serverMatches.length > 0 ? serverMatches : result.matches
  const displayedNote = serverError || serverNote || result.note || ''

  const handleSubmit = async () => {
    const nextValue = value.trim()
    setSubmittedValue(nextValue)
    setCopiedId('')
    setServerMatches([])
    setServerNote('')
    setServerError('')

    const localResult = lookupFacebookIds(nextValue)
    if (!nextValue || localResult.matches.length > 0 || !canUseFacebookResolver(nextValue)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/facebook/resolve?input=${encodeURIComponent(nextValue)}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setServerError(data.error || '服务端解析失败。')
        return
      }

      setServerMatches(Array.isArray(data.matches) ? data.matches : [])
      setServerNote(data.note || '')
    } catch {
      setServerError('服务端请求失败，请确认后端接口已启动。')
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    const text = await clipboard.paste()
    if (text) {
      setValue(text)
    }
  }

  const handleCopy = async (id: string) => {
    const ok = await clipboard.copy(id)
    if (ok) {
      setCopiedId(id)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12),0_6px_18px_rgba(24,95,165,0.06)] sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14),0_8px_24px_rgba(24,95,165,0.08)]">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              Facebook ID 查询
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
              支持账号 ID、主页 ID、群组 ID、广告帖 ID
            </span>
          </div>

          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            粘贴 Facebook 链接，自动提取数字 ID
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            支持识别常见的个人主页、主页帖子、群组链接和广告帖链接，也支持直接输入数字 ID。
          </p>

          <div className="mt-4">
            <label htmlFor="facebook-id-input" className="text-xs font-semibold tracking-wide text-slate-600">
              Facebook 链接或数字 ID
            </label>
            <textarea
              id="facebook-id-input"
              value={value}
              onChange={event => setValue(event.target.value)}
              placeholder="例如：https://www.facebook.com/groups/123456789012345"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {loading ? '查询中...' : '开始查询'}
            </button>
            <button
              type="button"
              onClick={handlePaste}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              粘贴内容
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('')
                setSubmittedValue('')
                setCopiedId('')
                setServerMatches([])
                setServerNote('')
                setServerError('')
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              清空
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map(example => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setValue(example.value)
                  setSubmittedValue(example.value)
                  setCopiedId('')
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900">查询结果</h2>

        {!submittedValue ? (
          <p className="mt-3 text-sm leading-7 text-slate-500">
            先输入 Facebook 链接或数字 ID，再点击“开始查询”。
          </p>
        ) : displayedMatches.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
            {displayedNote ||
              '没有识别到可用 ID。请尽量粘贴包含数字参数的 Facebook 链接，例如 profile.php?id=...、/groups/群组ID、/posts/帖子ID。'}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {displayedNote ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-7 text-blue-800">
                {displayedNote}
              </div>
            ) : null}
            {displayedMatches.map(match => (
              <ResultRow
                key={`${match.kind}:${match.id}`}
                match={match}
                copied={copiedId === match.id && clipboard.copied}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900">支持的链接类型</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">账号 / 主页 ID</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              支持 profile.php?id=...、/people/.../数字ID、/pages/.../数字ID、permalink.php?id=... 这类链接。
            </p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">群组 / 广告帖 ID</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              支持 /groups/群组ID、/posts/帖子ID、/videos/帖子ID、story_fbid=...、fbid=... 以及广告资料库 id=...。
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
