import { useEffect, useMemo, useState } from 'react'
import { useClipboard } from '@/hooks/useClipboard'
import { emojiCatalog } from '@/data/emojiCatalog'
import { applyPageSeo } from '@/utils/seo'

const SITE_URL = 'https://2fa.cx'
const BASE_TITLE = 'Emoji 表情大全 - 2FA.CX'
const BASE_DESCRIPTION =
  'Emoji 表情大全页面，支持按分类浏览笑脸、爱心、手势、动物、美食、符号等常用 Emoji，并可一键复制单个表情或整组内容。'

interface EmojiPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function EmojiPage({ isWebsite, isActive }: EmojiPageProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [copiedKey, setCopiedKey] = useState('')
  const clipboard = useClipboard()

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    applyPageSeo({
      title: BASE_TITLE,
      description: BASE_DESCRIPTION,
      url: `${SITE_URL}/emoji`,
    })
  }, [isActive, isWebsite])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      return emojiCatalog
    }

    return emojiCatalog
      .map(category => {
        const items = category.items.filter(item => {
          const haystack = [item.emoji, item.label, ...item.keywords].join(' ').toLowerCase()
          return haystack.includes(normalizedQuery)
        })

        return { ...category, items }
      })
      .filter(category => category.items.length > 0)
  }, [normalizedQuery])

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setActiveCategory('')
      return
    }

    const stillExists = filteredCategories.some(category => category.id === activeCategory)
    if (!stillExists) {
      setActiveCategory(filteredCategories[0].id)
    }
  }, [activeCategory, filteredCategories])

  const handleCopy = async (key: string, value: string) => {
    const ok = await clipboard.copy(value)
    if (ok) {
      setCopiedKey(key)
    }
  }

  const handleJumpToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)

    requestAnimationFrame(() => {
      document.getElementById(`emoji-section-${categoryId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h2 className="text-base font-semibold text-slate-900">搜索 Emoji</h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              支持输入中文名称、英文关键词，或者直接输入 Emoji 本体，例如 `heart`、`中国`、`🔥`。
            </p>
          </div>

          <div className="text-xs text-slate-500">
            {normalizedQuery ? `当前关键词：${query}` : '当前为全部分类'}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索 Emoji / 名称 / 关键词"
            className="h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
          />
          <button
            type="button"
            onClick={() => setQuery('')}
            className="h-12 shrink-0 rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            清空
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filteredCategories.map(category => {
            const selected = activeCategory === category.id
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleJumpToCategory(category.id)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  selected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white',
                ].join(' ')}
              >
                {category.title}
                <span className="ml-1 text-[11px] opacity-80">{category.items.length}</span>
              </button>
            )
          })}
        </div>
      </section>

      {filteredCategories.length === 0 ? (
        <section className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_18px_56px_rgba(15,23,42,0.08)]">
          <h2 className="text-lg font-semibold text-slate-900">没有匹配结果</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            可以换成更短的关键词，或者试试 `smile`、`heart`、`cat`、`party` 这类常见英文词。
          </p>
        </section>
      ) : null}

      <div className="space-y-4">
        {filteredCategories.map(category => {
          const joinedEmoji = category.items.map(item => item.emoji).join(' ')
          const groupCopied = copiedKey === `group:${category.id}` && clipboard.copied

          return (
            <section
              key={category.id}
              id={`emoji-section-${category.id}`}
              className="scroll-mt-24 overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{category.title}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {category.items.length} 个
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{category.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(`group:${category.id}`, joinedEmoji)}
                  className={[
                    'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    groupCopied
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  {groupCopied ? '已复制整组' : '复制本组 Emoji'}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {category.items.map(item => {
                  const key = `${category.id}:${item.emoji}`
                  const copied = copiedKey === key && clipboard.copied

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCopy(key, item.emoji)}
                      className="group rounded-[20px] border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-3xl leading-none sm:text-4xl">{item.emoji}</span>
                        <span
                          className={[
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                            copied
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                          ].join(' ')}
                        >
                          {copied ? '已复制' : '复制'}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
