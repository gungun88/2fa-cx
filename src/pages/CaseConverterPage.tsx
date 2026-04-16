import { useEffect, useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { buildCaseConversionResults, countEnglishWords } from '@/utils/caseConverter'

const SITE_URL = 'https://2fa.cx'
const BASE_TITLE = '\u82f1\u6587\u5927\u5c0f\u5199\u8f6c\u6362 - 2FA.CX'
const BASE_DESCRIPTION =
  '\u652f\u6301\u82f1\u6587\u5168\u5927\u5199\u3001\u5168\u5c0f\u5199\u3001\u9996\u5b57\u6bcd\u5927\u5199\u3001camelCase\u3001PascalCase\u3001snake_case\u3001kebab-case \u7b49\u591a\u79cd\u8f6c\u6362\u65b9\u5f0f\u3002'

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

interface CaseConverterPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function CaseConverterPage({ isWebsite, isActive }: CaseConverterPageProps) {
  const [input, setInput] = useState('hello world from 2fa cx')
  const [copiedKey, setCopiedKey] = useState('')
  const clipboard = useClipboard()
  const results = useMemo(() => buildCaseConversionResults(input), [input])
  const wordCount = useMemo(() => countEnglishWords(input), [input])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    document.title = BASE_TITLE
    updateMeta('meta[name="description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:title"]', BASE_TITLE)
    updateMeta('meta[property="og:description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:url"]', `${SITE_URL}/yingwen-daxiaoxie`)
    updateMeta('meta[name="twitter:title"]', BASE_TITLE)
    updateMeta('meta[name="twitter:description"]', BASE_DESCRIPTION)
    updateCanonical(`${SITE_URL}/yingwen-daxiaoxie`)
  }, [isActive, isWebsite])

  const handleCopy = async (key: string, value: string) => {
    const ok = await clipboard.copy(value)
    if (ok) {
      setCopiedKey(key)
    }
  }

  const handlePaste = async () => {
    const value = await clipboard.paste()
    if (value) {
      setInput(value)
    }
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {'Case Converter'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {`\u5df2\u751f\u6210 ${results.length} \u79cd\u8f6c\u6362`}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              {'\u82f1\u6587\u5927\u5c0f\u5199\u4e0e\u547d\u540d\u98ce\u683c\u8f6c\u6362'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {
                '\u9002\u5408\u5904\u7406\u82f1\u6587\u6807\u9898\u3001\u7a0b\u5e8f\u53d8\u91cf\u540d\u3001\u914d\u7f6e\u9879\u547d\u540d\u6216 SEO \u6807\u9898\u3002\u8f93\u5165\u4efb\u610f\u82f1\u6587\u53e5\u5b50\u540e\uff0c\u4f1a\u7acb\u5373\u751f\u6210\u591a\u79cd\u5e38\u7528\u5199\u6cd5\u3002'
              }
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
            <div>{`\u82f1\u6587\u5355\u8bcd\u6570\uff1a${wordCount}`}</div>
            <div>{`\u603b\u5b57\u7b26\u6570\uff1a${input.length}`}</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={4}
            placeholder={'\u8f93\u5165\u8981\u8f6c\u6362\u7684\u82f1\u6587\u53e5\u5b50\u6216\u53d8\u91cf\u540d'}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput('facebook ad account manager')}
              className="rounded-[16px] bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {'\u586b\u5165\u793a\u4f8b'}
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
              onClick={() => setInput('')}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {'\u6e05\u7a7a'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {results.map(result => {
          const isCopied = clipboard.copied && copiedKey === result.id
          return (
            <article
              key={result.id}
              className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:px-6 sm:py-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{result.label}</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{result.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(result.id, result.output)}
                  className={[
                    'rounded-[16px] border px-3 py-2 text-sm font-semibold transition-colors',
                    isCopied
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white',
                  ].join(' ')}
                >
                  {isCopied ? '\u5df2\u590d\u5236' : '\u590d\u5236'}
                </button>
              </div>

              <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs text-slate-500">{'\u8f6c\u6362\u7ed3\u679c'}</div>
                <div className="mt-2 break-all font-mono text-sm leading-7 text-slate-900">
                  {result.output || '\u6682\u65e0\u8f93\u51fa'}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {isWebsite ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold text-slate-900">{'\u8f6c\u6362\u89c4\u5219\u8bf4\u660e'}</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              {
                '`camelCase` \u548c `PascalCase` \u4f1a\u53ea\u4fdd\u7559\u82f1\u6587\u5355\u8bcd\u5e76\u505a\u5408\u5e76\uff0c\u8fde\u5b57\u7b26\u6216\u5f15\u53f7\u4f1a\u88ab\u89c6\u4e3a\u5206\u8bcd\u8fb9\u754c\u3002'
              }
            </p>
            <p>
              {
                '`snake_case`\u3001`kebab-case`\u3001`CONSTANT_CASE` \u4f1a\u8f93\u51fa\u66f4\u9002\u5408\u7a0b\u5e8f\u547d\u540d\u7684\u7ed3\u679c\uff0c\u5bf9\u4e2d\u6587\u548c\u5f02\u5e38\u7b26\u53f7\u4e0d\u505a\u5f3a\u5236\u8f6c\u6362\u3002'
              }
            </p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
