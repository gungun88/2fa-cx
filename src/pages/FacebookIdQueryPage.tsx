import { useEffect, useMemo, useState } from 'react'
import { FacebookIdLookup } from '@/components/FacebookIdLookup'
import { useClipboard } from '@/hooks/useClipboard'
import { FacebookLookupResult, canUseFacebookResolver, lookupFacebookIds } from '@/utils/facebook'
import { facebookLookupTypeMeta, lookupFacebookId } from '@/utils/facebookIdLookup'

const SITE_URL = 'https://2fa.cx'
const BASE_TITLE = 'Facebook ID \u67e5\u8be2 - 2FA.CX'
const BASE_DESCRIPTION =
  '\u8f93\u5165 Facebook \u4e2a\u4eba\u4e3b\u9875\u3001\u4e13\u9875\u3001\u5c0f\u7ec4\u6216\u5e16\u5b50\u94fe\u63a5\uff0c\u5feb\u901f\u63d0\u53d6\u53ef\u80fd\u7684\u6570\u5b57 ID\uff0c\u652f\u6301\u672c\u5730\u89e3\u6790\u548c\u670d\u52a1\u7aef\u56de\u9000\u89e3\u6790\u3002'

const sampleInputs = [
  'https://www.facebook.com/profile.php?id=100012345678901',
  'https://www.facebook.com/people/John-Doe/100012345678901/',
  'https://www.facebook.com/groups/123456789012345/',
  'https://www.facebook.com/permalink.php?story_fbid=123456789012345&id=100012345678901',
]

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
  isWebsite: boolean
  isActive: boolean
}

export function FacebookIdQueryPage({ isWebsite, isActive }: FacebookIdQueryPageProps) {
  const [input, setInput] = useState('')
  const [serverResult, setServerResult] = useState<FacebookLookupResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')
  const clipboard = useClipboard()
  const localResult = useMemo(() => lookupFacebookId(input), [input])
  const resolverAvailable = canUseFacebookResolver()
  const localTypeMeta = facebookLookupTypeMeta[localResult.lookupType]

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    document.title = BASE_TITLE
    updateMeta('meta[name="description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:title"]', BASE_TITLE)
    updateMeta('meta[property="og:description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:url"]', `${SITE_URL}/facebook-id-query`)
    updateMeta('meta[name="twitter:title"]', BASE_TITLE)
    updateMeta('meta[name="twitter:description"]', BASE_DESCRIPTION)
    updateCanonical(`${SITE_URL}/facebook-id-query`)
  }, [isActive, isWebsite])

  const handlePaste = async () => {
    const value = await clipboard.paste()
    if (value) {
      setInput(value)
      setServerResult(null)
    }
  }

  const handleCopy = async (key: string, value: string) => {
    const ok = await clipboard.copy(value)
    if (ok) {
      setCopiedKey(key)
    }
  }

  const handleLookup = async () => {
    if (!input.trim()) {
      setServerResult({
        ok: false,
        status: 400,
        matches: [],
        error: '\u8bf7\u5148\u8f93\u5165\u9700\u8981\u89e3\u6790\u7684 Facebook \u94fe\u63a5\u6216 ID',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await lookupFacebookIds(input)
      setServerResult(result)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {'Facebook ID'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {resolverAvailable ? '\u652f\u6301\u670d\u52a1\u7aef\u89e3\u6790' : '\u4ec5\u672c\u5730\u89e3\u6790'}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              {'\u4ece Facebook \u94fe\u63a5\u63d0\u53d6\u6570\u5b57 ID'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {
                '\u8fd9\u4e2a\u5de5\u5177\u4f1a\u5148\u5728\u5f53\u524d\u9875\u9762\u89e3\u6790 URL \u7ed3\u6784\uff0c\u80fd\u76f4\u63a5\u8bc6\u522b `profile.php?id=...`\u3001`/people/.../{id}`\u3001`/groups/{id}`\u3001`story_fbid`\u3001`fbid` \u7b49\u5e38\u89c1\u683c\u5f0f\u3002'
              }
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            <div className="font-semibold text-slate-700">{'\u5f53\u524d\u8bc6\u522b\u7c7b\u578b'}</div>
            <div className="mt-1">{localTypeMeta.label}</div>
            <div>{`\u672c\u5730\u5339\u914d ${localResult.matches.length} \u4e2a ID`}</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <textarea
            value={input}
            onChange={event => {
              setInput(event.target.value)
              setServerResult(null)
            }}
            rows={4}
            placeholder={'\u7c98\u8d34 Facebook \u4e2a\u4eba\u4e3b\u9875\u3001\u4e13\u9875\u3001\u5c0f\u7ec4\u3001\u5e16\u5b50\u6216 Reel \u94fe\u63a5'}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleLookup}
              disabled={isLoading}
              className="rounded-[16px] bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? '\u89e3\u6790\u4e2d...' : '\u5f00\u59cb\u89e3\u6790'}
            </button>
            <button
              type="button"
              onClick={handlePaste}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {'\u4ece\u526a\u8d34\u677f\u7c98\u8d34'}
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('')
                setServerResult(null)
              }}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {'\u6e05\u7a7a'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {sampleInputs.map(sample => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setInput(sample)
                setServerResult(null)
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-slate-300 hover:bg-white"
            >
              {sample}
            </button>
          ))}
        </div>
      </section>

      <FacebookIdLookup
        result={localResult}
        copied={clipboard.copied}
        copiedKey={copiedKey}
        onCopy={handleCopy}
      />

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-base font-semibold text-slate-900">{'\u670d\u52a1\u7aef\u89e3\u6790\u7ed3\u679c'}</h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              {
                resolverAvailable
                  ? '\u5982\u679c\u94fe\u63a5\u672c\u8eab\u6ca1\u6709\u76f4\u63a5\u66b4\u9732 ID\uff0c\u53ef\u4ee5\u518d\u8bd5\u8ba9\u670d\u52a1\u7aef\u6293\u53d6\u9875\u9762 HTML \u5e76\u505a\u989d\u5916\u89e3\u6790\u3002'
                  : '\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u8bf7\u6c42 `/api/facebook/resolve`\uff0c\u56e0\u6b64\u8fd9\u91cc\u53ea\u4f1a\u663e\u793a\u672c\u5730\u56de\u4f20\u7684\u7ed3\u679c\u6216\u9519\u8bef\u63d0\u793a\u3002'
              }
            </p>
          </div>

          {serverResult ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <div>{`\u72b6\u6001\u7801\uff1a${serverResult.status}`}</div>
              <div>{`\u5339\u914d\u6570\uff1a${serverResult.matches.length}`}</div>
            </div>
          ) : null}
        </div>

        {!serverResult ? (
          <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <h3 className="text-sm font-semibold text-slate-900">{'\u8fd8\u6ca1\u6709\u6267\u884c\u89e3\u6790'}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {'\u8f93\u5165\u94fe\u63a5\u540e\u70b9\u51fb\u201c\u5f00\u59cb\u89e3\u6790\u201d\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u6700\u7ec8\u7684\u5408\u5e76\u7ed3\u679c\u3002'}
            </p>
          </div>
        ) : serverResult.ok && serverResult.matches.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {serverResult.matches.map(match => {
              const key = `server:${match.kind}:${match.id}`
              const isCopied = clipboard.copied && copiedKey === key
              return (
                <article key={key} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {match.label}
                    </span>
                    <span className="text-[11px] text-slate-400">{match.confidence}</span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] text-slate-500">{'\u6700\u7ec8 ID'}</div>
                    <div className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                      {match.id}
                    </div>
                  </div>

                  <div className="mt-3 text-xs leading-6 text-slate-500">
                    <div>{`\u6765\u6e90\uff1a${match.source}`}</div>
                    {match.hint ? <div>{`\u8bf4\u660e\uff1a${match.hint}`}</div> : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(key, match.id)}
                    className={[
                      'mt-4 w-full rounded-[16px] border px-3 py-2 text-sm font-semibold transition-colors',
                      isCopied
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {isCopied ? '\u5df2\u590d\u5236 ID' : '\u590d\u5236 ID'}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <h3 className="text-sm font-semibold text-slate-900">{'\u672a\u83b7\u53d6\u5230\u6709\u6548\u7ed3\u679c'}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {serverResult.error || serverResult.note || '\u8fd9\u6761\u94fe\u63a5\u6ca1\u6709\u89e3\u6790\u51fa\u53ef\u7528 ID\u3002'}
            </p>
          </div>
        )}

        {serverResult?.note ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
            {serverResult.note}
          </div>
        ) : null}
      </section>

      {isWebsite ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold text-slate-900">{'\u4f7f\u7528\u8bf4\u660e'}</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              {
                '\u5982\u679c\u4f60\u62ff\u5230\u7684\u662f `profile.php?id=...` \u6216 `/groups/{id}` \u8fd9\u79cd\u94fe\u63a5\uff0c\u672c\u5730\u89e3\u6790\u57fa\u672c\u5c31\u80fd\u76f4\u63a5\u5b8c\u6210\u3002'
              }
            </p>
            <p>
              {
                '\u5982\u679c\u94fe\u63a5\u4e0d\u5305\u542b\u660e\u663e\u7684\u6570\u5b57\u53c2\u6570\uff0c\u5de5\u5177\u4f1a\u4f18\u5148\u5c55\u793a\u672c\u5730\u5206\u6790\u7ed3\u679c\uff0c\u7136\u540e\u518d\u7528\u670d\u52a1\u7aef\u505a\u4e00\u6b21 HTML \u7ea7\u522b\u7684\u8865\u5145\u89e3\u6790\u3002'
              }
            </p>
            <p>
              {
                '\u670d\u52a1\u7aef\u89e3\u6790\u4ecd\u53ef\u80fd\u53d7 Facebook \u767b\u5f55\u5899\u3001\u5730\u533a\u9650\u5236\u6216\u53cd\u6293\u53d6\u7b56\u7565\u5f71\u54cd\uff0c\u6240\u4ee5\u8fd9\u91cc\u63d0\u4f9b\u7684\u7ed3\u679c\u66f4\u9002\u5408\u4f5c\u4e3a\u5feb\u901f\u9a8c\u8bc1\u800c\u4e0d\u662f\u7edd\u5bf9\u4f9d\u636e\u3002'
              }
            </p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
