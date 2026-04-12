import { useEffect, useRef, useState } from 'react'
import { CaseConverterPage } from '@/pages/CaseConverterPage'
import { DesktopPet } from '@/components/DesktopPet'
import { EmojiPage } from '@/pages/EmojiPage'
import { FacebookIdQueryPage } from '@/pages/FacebookIdQueryPage'
import { FontChangerPage } from '@/pages/FontChangerPage'
import { TwoFactorPage } from '@/pages/TwoFactorPage'

function isPopupPath(pathname: string) {
  return pathname.endsWith('/popup.html') || pathname.endsWith('popup.html')
}

type ToolView = 'totp' | 'facebook' | 'font-changer' | 'case-converter' | 'emoji'

const FACEBOOK_ID_QUERY_PATH = '/facebook-id-query'
const LEGACY_FACEBOOK_PATH = '/facebook-permission-checker'
const FONT_CHANGER_PATH = '/font-changer'
const CASE_CONVERTER_PATH = '/yingwen-daxiaoxie'
const LEGACY_CASE_CONVERTER_PATH = '/daxiaoxie'
const LEGACY_CASE_CONVERTER_HTML_PATH = '/daxiaoxie.html'
const LEGACY_AD_COPY_PATH = '/facebook-ad-copy-generator'
const EMOJI_PATH = '/emoji'
const LEGACY_EMOJI_PATH = '/emoji.html'
const TOOL_PAGE_CONTAINER_CLASS = 'mx-auto w-full max-w-[1120px]'

const toolItems: Array<{
  id: ToolView
  label: string
}> = [
  { id: 'totp', label: '2FA 工具' },
  { id: 'facebook', label: 'Facebook ID 查询' },
  { id: 'font-changer', label: '花体英文转换器' },
  { id: 'case-converter', label: '英文字母大小写转换' },
  { id: 'emoji', label: 'Emoji 表情大全' },
]

function getViewFromPath(pathname: string): ToolView {
  if (pathname.startsWith(EMOJI_PATH) || pathname.startsWith(LEGACY_EMOJI_PATH)) {
    return 'emoji'
  }

  if (
    pathname.startsWith(CASE_CONVERTER_PATH) ||
    pathname.startsWith(LEGACY_CASE_CONVERTER_PATH) ||
    pathname.startsWith(LEGACY_CASE_CONVERTER_HTML_PATH)
  ) {
    return 'case-converter'
  }

  if (
    pathname.startsWith(FONT_CHANGER_PATH) ||
    pathname.startsWith(LEGACY_AD_COPY_PATH) ||
    pathname === '/fontchanger' ||
    pathname === '/fontchanger.html' ||
    pathname === '/fontchanger/'
  ) {
    return 'font-changer'
  }

  if (pathname.startsWith(FACEBOOK_ID_QUERY_PATH) || pathname.startsWith(LEGACY_FACEBOOK_PATH)) {
    return 'facebook'
  }

  return 'totp'
}

function getPathFromView(view: ToolView) {
  switch (view) {
    case 'emoji':
      return EMOJI_PATH
    case 'facebook':
      return FACEBOOK_ID_QUERY_PATH
    case 'font-changer':
      return FONT_CHANGER_PATH
    case 'case-converter':
      return CASE_CONVERTER_PATH
    case 'totp':
    default:
      return '/'
  }
}

export default function App() {
  const isWebsite = typeof window === 'undefined' ? true : !isPopupPath(window.location.pathname)
  const [activeView, setActiveView] = useState<ToolView>(() => {
    if (typeof window === 'undefined' || !isWebsite) {
      return 'totp'
    }

    return getViewFromPath(window.location.pathname)
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isWebsite) {
      return
    }

    const handlePopState = () => {
      setActiveView(getViewFromPath(window.location.pathname))
      setIsMobileMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isWebsite])

  useEffect(() => {
    if (!isWebsite || !isMobileMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen, isWebsite])

  const handleSelectView = (view: ToolView) => {
    setActiveView(view)
    setIsMobileMenuOpen(false)

    if (!isWebsite) {
      return
    }

    const nextPath = getPathFromView(view)
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip px-3 py-4 sm:px-4 sm:py-6">
      {isWebsite ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -top-10 left-1/2 h-32 w-[68%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(206,237,255,0.34)_0%,rgba(206,237,255,0.12)_36%,rgba(255,255,255,0)_70%)] blur-3xl sm:-top-16 sm:h-40 sm:w-[62%]" />
          <div className="absolute top-[82px] left-1/2 h-40 w-[54%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(206,237,255,0.34)_0%,rgba(206,237,255,0.14)_32%,rgba(255,255,255,0)_72%)] blur-3xl sm:top-[96px] sm:h-52 sm:w-[50%]" />
          <div className="absolute left-[14%] top-[246px] hidden h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(206,237,255,0.12)_0%,rgba(206,237,255,0)_72%)] blur-3xl lg:block" />
          <div className="absolute right-[11%] top-[204px] hidden h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(206,237,255,0.14)_0%,rgba(206,237,255,0)_74%)] blur-3xl lg:block" />
        </div>
      ) : null}

      {isWebsite ? <DesktopPet /> : null}

      <div className="relative z-10 mx-auto w-full max-w-[1160px]">
        <header className="sticky top-3 z-20 mb-4 sm:mb-6">
          <div
            ref={mobileMenuRef}
            className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12),0_6px_18px_rgba(24,95,165,0.06)] sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14),0_8px_24px_rgba(24,95,165,0.08)]"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => handleSelectView('totp')}
                className="shrink-0 rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-400/40"
                aria-label="Back to 2FA home"
              >
                <img src="/logo.svg" alt="2FA.CX" className="block h-auto max-h-12 w-auto shrink-0" />
              </button>

              {isWebsite ? (
                <>
                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(open => !open)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
                      aria-expanded={isMobileMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Open navigation menu"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                        <path
                          d={isMobileMenuOpen ? 'M6 8L18 8M6 16L18 16' : 'M4 7H20M4 12H20M4 17H20'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <nav className="hidden min-w-0 sm:block">
                    <div className="flex items-center justify-end gap-2 pl-2">
                      {toolItems.map(item => {
                        const selected = activeView === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectView(item.id)}
                            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
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
                  </nav>
                </>
              ) : null}
            </div>

            {isWebsite && isMobileMenuOpen ? (
              <div className="border-t border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,1)_100%)] px-3 py-3 sm:hidden">
                <nav className="grid grid-cols-1 gap-2" aria-label="Mobile navigation menu">
                  {toolItems.map(item => {
                    const selected = activeView === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectView(item.id)}
                        className={`rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                          selected
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </nav>
              </div>
            ) : null}
          </div>
        </header>

        <main className={TOOL_PAGE_CONTAINER_CLASS}>
          {activeView === 'totp' ? <TwoFactorPage isWebsite={isWebsite} isActive={activeView === 'totp'} /> : null}
          {activeView === 'facebook' ? (
            <FacebookIdQueryPage isWebsite={isWebsite} isActive={activeView === 'facebook'} />
          ) : null}
          {activeView === 'font-changer' ? (
            <FontChangerPage isWebsite={isWebsite} isActive={activeView === 'font-changer'} />
          ) : null}
          {activeView === 'case-converter' ? (
            <CaseConverterPage isWebsite={isWebsite} isActive={activeView === 'case-converter'} />
          ) : null}
          {activeView === 'emoji' ? <EmojiPage isWebsite={isWebsite} isActive={activeView === 'emoji'} /> : null}
        </main>

        {isWebsite ? (
          <footer className="mx-auto mt-6 w-full max-w-[1120px] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_18px_56px_rgba(15,23,42,0.08)] sm:px-6 sm:py-5">
            <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm leading-7 text-slate-600">
              <span>版权归</span>
              <a
                href="https://doingfb.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-700 underline decoration-dotted underline-offset-2"
              >
                doingfb
              </a>
              <span>所有</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">联系方式：</span>
              <a
                href="https://doingfb.com/d/28"
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 underline decoration-dotted underline-offset-2"
              >
                https://doingfb.com/d/28
              </a>
            </p>
          </footer>
        ) : null}
      </div>
    </div>
  )
}
