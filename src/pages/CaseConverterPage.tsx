import { useEffect, useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { buildCaseConversionResults } from '@/utils/caseConverter'

const SITE_URL = 'https://2fa.cx'
const MAX_LENGTH = 5000
const DEFAULT_TEXT = 'Hello World. 2fa.cx'
const PAGE_TITLE = '英文字母大小写转换器 - 2FA.CX'
const PAGE_DESCRIPTION =
  '在线英文字母大小写转换器，支持 lowercase、UPPERCASE、Capitalize Words、Sentence case、Title Case。'

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

function ResultBlock({
  title,
  output,
  copied,
  onCopy,
}: {
  title: string
  output: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            copied
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      <textarea
        readOnly
        value={output}
        rows={3}
        className="mt-3 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none"
      />
    </div>
  )
}

interface CaseConverterPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function CaseConverterPage({ isWebsite, isActive }: CaseConverterPageProps) {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [copiedId, setCopiedId] = useState('')
  const clipboard = useClipboard()
  const pasteClipboard = useClipboard()

  const value = text.slice(0, MAX_LENGTH)
  const results = useMemo(() => buildCaseConversionResults(value, ''), [value])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    document.title = PAGE_TITLE
    updateMeta('meta[name="description"]', PAGE_DESCRIPTION)
    updateMeta('meta[property="og:title"]', PAGE_TITLE)
    updateMeta('meta[property="og:description"]', PAGE_DESCRIPTION)
    updateMeta('meta[property="og:url"]', `${SITE_URL}/yingwen-daxiaoxie`)
    updateMeta('meta[name="twitter:title"]', PAGE_TITLE)
    updateMeta('meta[name="twitter:description"]', PAGE_DESCRIPTION)
    updateMeta(
      'meta[name="robots"]',
      'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    )
    updateCanonical(`${SITE_URL}/yingwen-daxiaoxie`)
  }, [isWebsite, isActive])

  const handleCopy = async (id: string, output: string) => {
    const ok = await clipboard.copy(output)
    if (ok) {
      setCopiedId(id)
    }
  }

  const handlePaste = async () => {
    const content = await pasteClipboard.paste()
    if (content) {
      setText(content.slice(0, MAX_LENGTH))
      setCopiedId('')
    }
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12),0_6px_18px_rgba(24,95,165,0.06)] sm:rounded-[28px]">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                英文字母大小写转换
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                输入英文内容后，下面会实时输出常见大小写转换结果。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setText(DEFAULT_TEXT)
                  setCopiedId('')
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                示例文本
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                粘贴
              </button>
              <button
                type="button"
                onClick={() => {
                  setText('')
                  setCopiedId('')
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                清空
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>输入文本</span>
            <span>
              {value.length} / {MAX_LENGTH}
            </span>
          </div>

          <textarea
            value={value}
            onChange={event => {
              setText(event.target.value.slice(0, MAX_LENGTH))
              setCopiedId('')
            }}
            maxLength={MAX_LENGTH}
            rows={10}
            placeholder="Type or paste English text here"
            className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />
          </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-4">
        {results.map(result => (
          <ResultBlock
            key={result.id}
            title={result.name}
            output={result.output}
            copied={copiedId === result.id && clipboard.copied}
            onCopy={() => void handleCopy(result.id, result.output)}
          />
        ))}
      </section>
    </div>
  )
}
