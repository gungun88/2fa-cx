import {
  FacebookIdLookupResult,
  facebookLookupTypeMeta,
} from '@/utils/facebookIdLookup'

interface FacebookIdLookupProps {
  result: FacebookIdLookupResult
  copied: boolean
  copiedKey: string
  onCopy: (key: string, value: string) => void
}

const kindBadgeMap = {
  account: 'bg-sky-50 text-sky-700',
  page: 'bg-violet-50 text-violet-700',
  group: 'bg-emerald-50 text-emerald-700',
  adPost: 'bg-amber-50 text-amber-700',
  generic: 'bg-slate-100 text-slate-600',
} as const

export function FacebookIdLookup({ result, copied, copiedKey, onCopy }: FacebookIdLookupProps) {
  const typeMeta = facebookLookupTypeMeta[result.lookupType]

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">{'\u94fe\u63a5\u7ed3\u6784\u89e3\u6790'}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {typeMeta.label}
            </span>
          </div>
          <p className="mt-1 text-sm leading-7 text-slate-600">{typeMeta.description}</p>
          {result.note ? <p className="mt-2 text-xs leading-6 text-slate-500">{result.note}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <div>{`\u5df2\u8bc6\u522b ${result.matches.length} \u4e2a ID`}</div>
          <div className="mt-1 break-all">{result.normalizedInput}</div>
        </div>
      </div>

      {result.parts.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {result.parts.map(part => (
            <div
              key={`${part.label}:${part.value}`}
              className={[
                'rounded-full border px-3 py-1.5 text-xs',
                part.highlight
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600',
              ].join(' ')}
            >
              <span className="font-semibold">{part.label}</span>
              <span className="mx-1 text-slate-300">/</span>
              <span className="break-all">{part.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {result.matches.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.matches.map(match => {
            const key = `${match.kind}:${match.id}`
            const isCopied = copied && copiedKey === key
            return (
              <article key={key} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      kindBadgeMap[match.kind]
                    }`}
                  >
                    {match.label}
                  </span>
                  <span className="text-[11px] text-slate-400">{match.confidence}</span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <div className="text-[11px] text-slate-500">{'\u63d0\u53d6\u5230\u7684 ID'}</div>
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
                  onClick={() => onCopy(key, match.id)}
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
          <h3 className="text-sm font-semibold text-slate-900">{'\u6682\u672a\u89e3\u6790\u5230 ID'}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {
              '\u6709\u4e9b Facebook \u94fe\u63a5\u4e0d\u4f1a\u76f4\u63a5\u5728\u8def\u5f84\u6216\u53c2\u6570\u91cc\u66b4\u9732 ID\uff0c\u8fd9\u65f6\u53ef\u4ee5\u518d\u8bd5\u4e00\u6b21\u670d\u52a1\u7aef\u89e3\u6790\u3002'
            }
          </p>
        </div>
      )}
    </section>
  )
}
