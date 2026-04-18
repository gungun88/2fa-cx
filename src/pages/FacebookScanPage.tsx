import { useEffect, useMemo, useRef, useState } from 'react'
import { FacebookAliveResult, checkFacebookAlive } from '@/utils/facebookAlive'
import { applyPageSeo } from '@/utils/seo'

const SITE_URL = 'https://2fa.cx'
const BASE_TITLE = 'Facebook \u8d26\u53f7\u6279\u91cf\u6d3b\u68c0\u6d4b - 2FA.CX'
const BASE_DESCRIPTION =
  '\u6279\u91cf\u68c0\u6d4b Facebook \u8d26\u53f7\u662f\u5426\u5b58\u6d3b\uff0c\u652f\u6301\u4e2a\u4eba\u4e3b\u9875\u94fe\u63a5\u3001\u6570\u5b57 ID \u6216\u7528\u6237\u540d\uff0c\u5b9e\u65f6\u8fdb\u5ea6\u4e0e\u6d3b/\u6b7b\u5217\u8868\u3002'

const CONCURRENCY = 5
const MAX_RETRIES = 2

async function sleep(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

type ItemStatus = 'pending' | 'checking' | 'alive' | 'dead' | 'error'

interface ScanItem {
  id: string
  input: string
  status: ItemStatus
  result?: FacebookAliveResult
}

function parseInputs(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

interface FacebookScanPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function FacebookScanPage({ isWebsite, isActive }: FacebookScanPageProps) {
  const [input, setInput] = useState('')
  const [items, setItems] = useState<ScanItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isWebsite || !isActive) return
    applyPageSeo({
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
      url: `${SITE_URL}/facebook-scan`,
    })
  }, [isActive, isWebsite])

  const { liveCount, deadCount, doneCount, total, progress } = useMemo(() => {
    const t = items.length
    let live = 0
    let dead = 0
    let done = 0
    for (const it of items) {
      if (it.status === 'alive') {
        live += 1
        done += 1
      } else if (it.status === 'dead' || it.status === 'error') {
        dead += 1
        done += 1
      }
    }
    return {
      liveCount: live,
      deadCount: dead,
      doneCount: done,
      total: t,
      progress: t === 0 ? 0 : Math.round((done / t) * 100),
    }
  }, [items])

  const liveItems = items.filter(it => it.status === 'alive')
  const deadItems = items.filter(it => it.status === 'dead' || it.status === 'error')

  const runScan = async () => {
    const lines = parseInputs(input)
    if (lines.length === 0) {
      return
    }

    const initial: ScanItem[] = lines.map((line, idx) => ({
      id: `${Date.now()}:${idx}:${line}`,
      input: line,
      status: 'pending',
    }))
    setItems(initial)
    setIsScanning(true)

    const controller = new AbortController()
    abortRef.current = controller

    let cursor = 0
    const updateItem = (idx: number, patch: Partial<ScanItem>) => {
      setItems(prev => {
        const next = prev.slice()
        if (next[idx]) {
          next[idx] = { ...next[idx], ...patch }
        }
        return next
      })
    }

    const worker = async () => {
      while (!controller.signal.aborted) {
        const idx = cursor++
        if (idx >= initial.length) return
        updateItem(idx, { status: 'checking' })
        try {
          let result = await checkFacebookAlive(initial[idx].input, controller.signal)
          for (let attempt = 0; attempt < MAX_RETRIES && result.transient; attempt++) {
            await sleep(500 * (attempt + 1), controller.signal)
            result = await checkFacebookAlive(initial[idx].input, controller.signal)
          }
          if (controller.signal.aborted) return
          if (result.ok && result.alive) {
            updateItem(idx, { status: 'alive', result })
          } else if (result.ok) {
            updateItem(idx, { status: 'dead', result })
          } else {
            updateItem(idx, { status: 'error', result })
          }
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return
          updateItem(idx, {
            status: 'error',
            result: {
              ok: false,
              status: 500,
              alive: false,
              input: initial[idx].input,
              error: (err as Error)?.message || '\u68c0\u6d4b\u5f02\u5e38',
            },
          })
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, initial.length) }, () => worker())
    try {
      await Promise.all(workers)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsScanning(false)
    }
  }

  const stopScan = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsScanning(false)
  }

  const handleClear = () => {
    if (isScanning) stopScan()
    setInput('')
    setItems([])
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {'Facebook \u6279\u91cf'}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {'\u8d26\u53f7\u5b58\u6d3b\u68c0\u6d4b'}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">
          {'\u8f93\u5165\u8d26\u53f7\u5217\u8868'}
        </h2>

        <div className="mt-4 space-y-3">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            rows={8}
            placeholder={
              '\u6bcf\u884c\u4e00\u4e2a\u8d26\u53f7 URL \u6216\u8d26\u53f7 ID\uff0c\u4f8b\u5982\uff1a\nhttps://www.facebook.com/profile.php?id=100057382914736\n100057382914736'
            }
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runScan}
              disabled={isScanning || !input.trim()}
              className="rounded-[16px] bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning ? '\u68c0\u6d4b\u4e2d...' : '\u5f00\u59cb\u68c0\u6d4b'}
            </button>
            <button
              type="button"
              onClick={stopScan}
              disabled={!isScanning}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {'\u505c\u6b62'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[16px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {'\u6e05\u7a7a'}
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-green-100 px-2 text-xs font-bold text-green-700">
                  {liveCount}
                </span>
                <span className="text-slate-500">{'\u6d3b'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-rose-100 px-2 text-xs font-bold text-rose-700">
                  {deadCount}
                </span>
                <span className="text-slate-500">{'\u6b7b'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-slate-200 px-2 text-xs font-bold text-slate-700">
                  {total}
                </span>
                <span className="text-slate-500">{'\u603b\u6570'}</span>
              </span>
            </div>
          </div>

          <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="flex h-full items-center justify-center bg-brand-500 text-[11px] font-semibold text-white transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            >
              {total > 0 ? `${progress}% (${doneCount}/${total})` : '0%'}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
            {`\u6d3b\u8dc3\u5217\u8868\uff08${liveCount}\uff09`}
          </div>
          <div className="min-h-[240px] max-h-[420px] overflow-y-auto px-3 py-3">
            {liveItems.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-slate-400">
                {'\u6682\u65e0\u6d3b\u8dc3\u8d26\u53f7'}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {liveItems.map(item => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-[12px] border border-green-200 bg-green-50/60 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-mono text-slate-800" title={item.input}>
                      {item.input}
                    </span>
                    {item.result?.id ? (
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-green-700">
                        {`ID ${item.result.id}`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_56px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
            {`\u5c01\u7981\u5217\u8868\uff08${deadCount}\uff09`}
          </div>
          <div className="min-h-[240px] max-h-[420px] overflow-y-auto px-3 py-3">
            {deadItems.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-slate-400">
                {'\u6682\u65e0\u5c01\u7981\u8d26\u53f7'}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {deadItems.map(item => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-[12px] border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-mono text-slate-800" title={item.input}>
                      {item.input}
                    </span>
                    <span className="shrink-0 text-[11px] text-rose-600">
                      {item.status === 'error'
                        ? item.result?.error || '\u5f02\u5e38'
                        : item.result?.reason || '\u5df2\u5c01\u7981'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {isWebsite ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:rounded-[24px] sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold text-slate-900">{'\u4f7f\u7528\u8bf4\u660e'}</h2>
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            <p>{'\u6bcf\u884c\u586b\u5199\u4e00\u4e2a Facebook \u4e2a\u4eba\u4e3b\u9875 URL\u3001\u6570\u5b57 ID \u6216\u7528\u6237\u540d\uff0c\u70b9\u51fb\u5f00\u59cb\u68c0\u6d4b\u540e\u4f1a\u5e76\u53d1\u8bf7\u6c42\u3002'}</p>
            <p>{'\u7ed3\u679c\u4ec5\u4f5c\u53c2\u8003\uff1aFacebook \u9488\u5bf9\u672a\u767b\u5f55\u8bbf\u95ee\u5b58\u5728\u767b\u5f55\u5899\u4e0e\u9650\u6d41\uff0c\u5076\u5c14\u4f1a\u628a\u6b63\u5e38\u8d26\u53f7\u8bef\u5224\u4e3a\u5c01\u7981\u3002'}</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
