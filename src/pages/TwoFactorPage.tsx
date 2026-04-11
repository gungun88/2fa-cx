import { useCallback, useEffect, useState } from 'react'
import { ActionBar } from '@/components/ActionBar'
import { CountdownRing } from '@/components/CountdownRing'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SecretInput } from '@/components/SecretInput'
import { TokenDisplay } from '@/components/TokenDisplay'
import { useClipboard } from '@/hooks/useClipboard'
import { useTOTP } from '@/hooks/useTOTP'
import { HistoryEntry } from '@/types/totp'
import { isValidBase32 } from '@/utils/base32'

const SITE_URL = 'https://2fa.cx'
const DEMO_KEY = 'TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73'
const DEMO_SHARE_URL = `${SITE_URL}/2fa/${DEMO_KEY}`
const BASE_TITLE = '2FA.CX - 在线 TOTP / 2FA 验证码生成器'
const BASE_DESCRIPTION =
  '2FA.CX 是一个本地生成 TOTP / 2FA 验证码的在线工具，支持 Base32 密钥输入、验证码复制和分享链接生成。'

function buildShareUrl(secret: string) {
  return `${SITE_URL}/2fa/${secret}`
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function normalizeSecret(value: string) {
  return value.toUpperCase().replace(/\s/g, '')
}

function getSecretFromPath(pathname: string) {
  const match = pathname.match(/^\/2fa\/([^/]+)\/?$/i)
  return match ? normalizeSecret(decodeURIComponent(match[1])) : ''
}

function maskSecret(secret: string) {
  if (secret.length <= 10) {
    return secret
  }

  return `${secret.slice(0, 6)}...${secret.slice(-4)}`
}

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

interface TwoFactorPageProps {
  isWebsite: boolean
  isActive: boolean
}

export function TwoFactorPage({ isWebsite, isActive }: TwoFactorPageProps) {
  const [secret, setSecret] = useState(() => {
    if (typeof window === 'undefined' || !isWebsite) {
      return ''
    }

    return getSecretFromPath(window.location.pathname)
  })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const { code, secs, error } = useTOTP(secret)
  const codeClipboard = useClipboard()
  const linkClipboard = useClipboard()
  const demoClipboard = useClipboard()
  const shareUrlClipboard = useClipboard()

  useEffect(() => {
    if (!isWebsite) {
      return
    }

    const handlePopState = () => {
      setSecret(getSecretFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isWebsite])

  useEffect(() => {
    if (code && secret && isValidBase32(secret)) {
      setHistory(prev => {
        const filtered = prev.filter(entry => entry.key !== secret)
        return [{ key: secret, time: Date.now() }, ...filtered].slice(0, 5)
      })
    }
  }, [code, secret])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const selection = window.getSelection()?.toString()
      if (
        !code ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 'c' ||
        isEditableTarget(event.target) ||
        selection
      ) {
        return
      }

      event.preventDefault()
      void codeClipboard.copy(code)
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [code, codeClipboard])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    const pathname = window.location.pathname
    if (!secret) {
      if (pathname !== '/' && pathname !== '/index.html') {
        window.history.replaceState({}, '', '/')
      }
      return
    }

    if (!isValidBase32(secret)) {
      return
    }

    const nextPath = `/2fa/${secret}`
    if (pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath)
    }
  }, [isWebsite, isActive, secret])

  useEffect(() => {
    if (!isWebsite || !isActive) {
      return
    }

    const validSecret = !!secret && isValidBase32(secret)
    const pageTitle = validSecret
      ? `2FA.CX - ${maskSecret(secret)} 的在线 TOTP / 2FA 验证码`
      : BASE_TITLE
    const pageDescription = validSecret
      ? `当前页面已载入 Base32 密钥 ${maskSecret(secret)}，可直接查看 6 位 TOTP / 2FA 验证码并复制分享。`
      : BASE_DESCRIPTION

    document.title = pageTitle
    updateMeta('meta[name="description"]', pageDescription)
    updateMeta('meta[property="og:title"]', pageTitle)
    updateMeta('meta[property="og:description"]', pageDescription)
    updateMeta('meta[name="twitter:title"]', pageTitle)
    updateMeta('meta[name="twitter:description"]', pageDescription)

    if (validSecret) {
      updateMeta('meta[property="og:url"]', buildShareUrl(secret))
      updateMeta('meta[name="robots"]', 'noindex,follow')
      updateCanonical(`${SITE_URL}/`)
      return
    }

    updateMeta('meta[property="og:url"]', `${SITE_URL}/`)
    updateMeta(
      'meta[name="robots"]',
      'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    )
    updateCanonical(`${SITE_URL}/`)
  }, [isWebsite, isActive, secret])

  const handlePaste = useCallback(async () => {
    const text = await codeClipboard.paste()
    if (text) {
      setSecret(normalizeSecret(text))
    }
  }, [codeClipboard])

  const handleClearSecret = useCallback(() => {
    setSecret('')
  }, [])

  const handleCopyCode = useCallback(() => {
    if (code) {
      void codeClipboard.copy(code)
    }
  }, [code, codeClipboard])

  const handleCopyLink = useCallback(() => {
    if (!secret || !isValidBase32(secret)) {
      return
    }

    void linkClipboard.copy(buildShareUrl(secret))
  }, [secret, linkClipboard])

  const handleSelectHistory = useCallback((key: string) => {
    setSecret(key)
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const handleCopyDemoKey = useCallback(() => {
    void demoClipboard.copy(DEMO_KEY)
  }, [demoClipboard])

  const handleCopyDemoShareUrl = useCallback(() => {
    void shareUrlClipboard.copy(DEMO_SHARE_URL)
  }, [shareUrlClipboard])

  return (
    <div className="w-full animate-fade-up space-y-4 sm:space-y-5">
      <div className="relative">
        <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12),0_6px_18px_rgba(24,95,165,0.06)] sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(15,23,42,0.14),0_8px_24px_rgba(24,95,165,0.08)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0)_100%)] sm:h-24 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0)_100%)]" />

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <SecretInput
              value={secret}
              onChange={setSecret}
              error={error}
              onPaste={handlePaste}
              onClear={handleClearSecret}
            />

            <div className="mt-3 flex gap-4">
              <button
                onClick={() => setSecret(DEMO_KEY)}
                className="text-xs font-semibold text-brand-600 underline decoration-dotted underline-offset-2 transition-colors hover:text-slate-700"
              >
                使用演示密钥
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100/80" />

          <div
            className="relative flex flex-col items-center gap-5 px-4 py-6 sm:px-6 sm:py-7"
            style={{ background: 'linear-gradient(180deg, #f7f6f0 0%, #f3f1e8 100%)' }}
          >
            <TokenDisplay code={code} onCopy={handleCopyCode} />
            <CountdownRing secs={secs} />
            <ActionBar
              code={code}
              copied={codeClipboard.copied}
              linkCopied={linkClipboard.copied}
              onCopy={handleCopyCode}
              onCopyLink={handleCopyLink}
            />
          </div>

          <HistoryPanel history={history} onSelect={handleSelectHistory} onClear={handleClearHistory} />

          <div className="flex items-start gap-2.5 border-t border-slate-100 px-4 py-3 sm:px-6">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3B6D11"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <p className="text-xs font-medium leading-relaxed text-slate-600">
              验证码每 30 秒自动更新。密钥仅用于当前页面计算，最近使用记录只保留在当前标签页会话中，不会写入本地持久存储。
            </p>
          </div>
        </div>
      </div>

      {isWebsite && (
        <>
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
            <h2 className="text-sm font-semibold text-slate-900">2FA 工具说明</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              <p>
                演示密钥：
                <button
                  type="button"
                  onClick={handleCopyDemoKey}
                  className="ml-1 break-all font-mono font-semibold text-brand-700 underline decoration-dotted underline-offset-2 transition-colors hover:text-slate-900"
                >
                  {DEMO_KEY}
                </button>
                <span className="ml-2 text-xs text-slate-500">
                  {demoClipboard.copied ? '已复制' : '点击密钥可复制'}
                </span>
              </p>

              <p>
                新手提示：请在倒计时结束前输入验证码，否则当前 6 位验证码会失效。测试时必须输入正确编码的 Base32 密钥，不要随意输入一串字符来测试。
              </p>

              <div className="space-y-2">
                <p>
                  你也可以把密钥直接加到网址后面使用：
                  <a
                    href={`${SITE_URL}/2fa/`}
                    target="_blank"
                    rel="noreferrer"
                    className="mx-1 text-brand-700 underline decoration-dotted underline-offset-2"
                  >
                    https://2fa.cx/2fa/
                  </a>
                  示例链接如下：
                </p>

                <a
                  href={DEMO_SHARE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all font-mono text-brand-700 underline decoration-dotted underline-offset-2"
                >
                  {DEMO_SHARE_URL}
                </a>

                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCopyDemoShareUrl}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {shareUrlClipboard.copied ? '链接已复制' : '点击复制链接'}
                  </button>
                  <span className="break-all text-xs text-slate-500">
                    复制内容为：{DEMO_SHARE_URL}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
            <h2 className="text-base font-semibold text-slate-900">在线 TOTP / 2FA 验证码生成器</h2>
            <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
              <p>
                2FA.CX 面向网页登录、后台管理和账号安全场景。输入 Base32 密钥后，页面会立刻在本地生成 6 位动态验证码，适合 Google Authenticator、双重验证和常见 OTP 登录流程。
              </p>

              <p>
                与把密钥发送到服务端的工具不同，这个页面会在当前浏览器里完成计算。对于需要快速查看 TOTP、临时分享验证码链接或给新手演示 Base32 用法的场景，这种方式更直接。
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">支持场景</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Base32 密钥生成验证码、在线 2FA 查询、TOTP 动态口令查看、验证码复制和分享链接生成。
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">适合搜索的关键词</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    TOTP、2FA、OTP、Google Authenticator、双重验证、两步验证、Base32、在线验证码生成器。
                  </p>
                </article>
              </div>

              <p>
                如果你需要把一组密钥做成可直接访问的链接，也可以使用
                <span className="mx-1 font-mono text-slate-900">https://2fa.cx/2fa/密钥</span>
                这种格式。页面会自动读取路径中的 Base32 密钥并生成验证码。
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
