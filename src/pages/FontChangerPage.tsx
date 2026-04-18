import { useEffect, useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { buildFontVariantResults } from '@/utils/fontVariants'
import { applyPageSeo } from '@/utils/seo'

const SITE_URL = 'https://2fa.cx'
const BASE_TITLE = '\u82b1\u4f53\u82f1\u6587\u8f6c\u6362\u5668 - 2FA.CX'
const BASE_DESCRIPTION =
  '\u628a\u82f1\u6587\u3001\u6570\u5b57\u548c\u7b80\u5355\u7b26\u53f7\u8f6c\u6210\u7c97\u4f53\u3001\u659c\u4f53\u3001\u5168\u89d2\u3001\u5706\u5708\u5b57\u3001\u4e0b\u5212\u7ebf\u7b49\u591a\u79cd Unicode \u98ce\u683c\uff0c\u9002\u5408\u6635\u79f0\u3001\u7b7e\u540d\u548c\u793e\u4ea4\u5e73\u53f0\u5185\u5bb9\u3002'

interface FontChangerPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function FontChangerPage({ isWebsite, isActive }: FontChangerPageProps) {
  const [input, setInput] = useState('Hello 2FA CX')
  const [copiedKey, setCopiedKey] = useState('')
  const clipboard = useClipboard()
  const results = useMemo(() => buildFontVariantResults(input), [input])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    applyPageSeo({
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
      url: `${SITE_URL}/font-changer`,
    })
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
                {'Unicode Fonts'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {`\u5df2\u751f\u6210 ${results.length} \u79cd\u98ce\u683c`}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              {'\u82b1\u4f53\u82f1\u6587\u4e0e Unicode \u6837\u5f0f\u8f6c\u6362'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {
                '\u8f93\u5165\u4e00\u6bb5\u82f1\u6587\u6216\u6570\u5b57\u5185\u5bb9\uff0c\u4e0b\u65b9\u4f1a\u540c\u65f6\u751f\u6210\u7c97\u4f53\u3001\u659c\u4f53\u3001\u53cc\u7ebf\u4f53\u3001\u5168\u89d2\u3001\u5c0f\u578b\u5927\u5199\u3001\u5220\u9664\u7ebf\u7b49\u591a\u79cd\u98ce\u683c\uff0c\u9002\u5408\u7528\u5728\u6635\u79f0\u3001\u7b7e\u540d\u6216\u5e16\u5b50\u6807\u9898\u91cc\u3002'
              }
            </p>
          </div>

        </div>

        <div className="mt-5 space-y-3">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={4}
            placeholder={'\u8f93\u5165\u8981\u8f6c\u6362\u7684\u82f1\u6587\u3001\u6570\u5b57\u6216\u7b80\u5355\u7b26\u53f7'}
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput('Hello 2FA CX')}
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
                <div className="text-xs text-slate-500">{'\u8f93\u51fa\u9884\u89c8'}</div>
                <div
                  className="mt-2 break-all text-lg font-semibold leading-8 text-slate-900"
                  style={{
                    fontFamily:
                      "'Segoe UI Symbol', 'Noto Sans Math', 'Noto Sans Symbols 2', 'Cambria Math', 'STIX Two Math', 'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {result.output || '\u6682\u65e0\u8f93\u51fa'}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {isWebsite ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold text-slate-900">{'\u4f7f\u7528\u63d0\u793a'}</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              {
                '\u8fd9\u4e9b\u8f93\u51fa\u672c\u8d28\u4e0a\u662f Unicode \u5b57\u7b26\u66ff\u6362\uff0c\u4e0d\u662f\u771f\u6b63\u7684\u5b57\u4f53\u5b89\u88c5\u3002\u5982\u679c\u76ee\u6807\u5e73\u53f0\u4e0d\u652f\u6301\u67d0\u4e9b\u5b57\u7b26\uff0c\u53ef\u80fd\u4f1a\u663e\u793a\u6210\u65b9\u6846\u6216\u56de\u9000\u6837\u5f0f\u3002'
              }
            </p>
            <p>
              {
                '\u4e0b\u5212\u7ebf\u3001\u5220\u9664\u7ebf\u548c\u4e0a\u5212\u7ebf\u662f\u901a\u8fc7\u7ec4\u5408\u5b57\u7b26\u751f\u6210\u7684\uff0c\u6709\u4e9b App \u5728\u6362\u884c\u6216\u6587\u672c\u9009\u4e2d\u65f6\u53ef\u80fd\u663e\u793a\u4e0d\u5b8c\u5168\u4e00\u81f4\u3002'
              }
            </p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
