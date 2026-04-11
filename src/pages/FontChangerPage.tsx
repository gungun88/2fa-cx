import { useEffect, useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { buildFontVariantResults } from '@/utils/fontVariants'

const SITE_URL = 'https://2fa.cx'
const MAX_LENGTH = 500
const DEFAULT_TEXT = 'Hello World. 2fa.cx'
const BASE_TITLE = '花体英文转换器 - 2FA.CX'
const BASE_DESCRIPTION =
  '在线花体英文转换器，支持英文字母和数字 0-9 的多种 Unicode 花体样式，结果可直接复制。'

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

function VariantCard({
  title,
  description,
  output,
  copied,
  onCopy,
}: {
  title: string
  description: string
  output: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className={[
            'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            copied
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
          ].join(' ')}
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      <div className="mt-4 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4">
        <p className="break-words text-lg leading-8 text-slate-800 sm:text-[20px]">{output}</p>
      </div>
    </article>
  )
}

interface FontChangerPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function FontChangerPage({ isWebsite, isActive }: FontChangerPageProps) {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [copiedId, setCopiedId] = useState('')
  const clipboard = useClipboard()
  const pasteClipboard = useClipboard()

  const value = text.slice(0, MAX_LENGTH)
  const results = useMemo(() => buildFontVariantResults(value), [value])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    document.title = BASE_TITLE
    updateMeta('meta[name="description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:title"]', BASE_TITLE)
    updateMeta('meta[property="og:description"]', BASE_DESCRIPTION)
    updateMeta('meta[property="og:url"]', `${SITE_URL}/font-changer`)
    updateMeta('meta[name="twitter:title"]', BASE_TITLE)
    updateMeta('meta[name="twitter:description"]', BASE_DESCRIPTION)
    updateMeta(
      'meta[name="robots"]',
      'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    )
    updateCanonical(`${SITE_URL}/font-changer`)
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

  const handleClear = () => {
    setText('')
    setCopiedId('')
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">输入内容</h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              仅转换英文字母和数字，其他符号会原样保留。最多 500 个字符。
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
              onClick={handleClear}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              清空
            </button>
          </div>
        </div>

        <div className="mt-4">
          <textarea
            value={value}
            onChange={event => {
              setText(event.target.value.slice(0, MAX_LENGTH))
              setCopiedId('')
            }}
            maxLength={MAX_LENGTH}
            rows={5}
            placeholder="Type English letters and numbers here"
            className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>示例：Hello World 2026</span>
            <span>
              {value.length} / {MAX_LENGTH}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map(result => (
          <VariantCard
            key={result.id}
            title={result.name}
            description={result.description}
            output={result.output}
            copied={copiedId === result.id && clipboard.copied}
            onCopy={() => handleCopy(result.id, result.output)}
          />
        ))}
      </section>

    </div>
  )
}
