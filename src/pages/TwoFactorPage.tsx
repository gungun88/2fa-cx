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
import { updateCanonical, updateMeta } from '@/utils/seo'

const SITE_URL = 'https://2fa.cx'
const DEMO_KEY = 'TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73'
const DEMO_SHARE_URL = `${SITE_URL}/2fa/${DEMO_KEY}`
const BASE_TITLE = '2FA.CX - \u5728\u7ebf TOTP / 2FA \u9a8c\u8bc1\u7801\u751f\u6210\u5668'
const BASE_DESCRIPTION =
  '2FA.CX \u662f\u4e00\u4e2a\u672c\u5730\u751f\u6210 TOTP / 2FA \u9a8c\u8bc1\u7801\u7684\u5728\u7ebf\u5de5\u5177\uff0c\u652f\u6301 Base32 \u5bc6\u94a5\u8f93\u5165\u3001\u9a8c\u8bc1\u7801\u590d\u5236\u548c\u5206\u4eab\u94fe\u63a5\u751f\u6210\u3002'

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
      ? `2FA.CX - ${maskSecret(secret)} \u7684\u5728\u7ebf TOTP / 2FA \u9a8c\u8bc1\u7801`
      : BASE_TITLE
    const pageDescription = validSecret
      ? `\u5f53\u524d\u9875\u9762\u5df2\u52a0\u8f7d Base32 \u5bc6\u94a5 ${maskSecret(secret)}\uff0c\u53ef\u76f4\u63a5\u67e5\u770b 6 \u4f4d TOTP / 2FA \u9a8c\u8bc1\u7801\u5e76\u590d\u5236\u5206\u4eab\u3002`
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
                {'\u4f7f\u7528\u6f14\u793a\u5bc6\u94a5'}
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
              {
                '\u9a8c\u8bc1\u7801\u6bcf 30 \u79d2\u81ea\u52a8\u66f4\u65b0\u3002\u5bc6\u94a5\u4ec5\u7528\u4e8e\u5f53\u524d\u9875\u9762\u8ba1\u7b97\uff0c\u6700\u8fd1\u4f7f\u7528\u8bb0\u5f55\u53ea\u4fdd\u7559\u5728\u5f53\u524d\u6807\u7b7e\u9875\u4f1a\u8bdd\u4e2d\uff0c\u4e0d\u4f1a\u5199\u5165\u672c\u5730\u6301\u4e45\u5b58\u50a8\u3002'
              }
            </p>
          </div>
        </div>
      </div>

      {isWebsite && (
        <>
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
            <h2 className="text-sm font-semibold text-slate-900">{'2FA \u5de5\u5177\u8bf4\u660e'}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              <p>
                {'\u6f14\u793a\u5bc6\u94a5\uff1a'}
                <button
                  type="button"
                  onClick={handleCopyDemoKey}
                  className="ml-1 break-all font-mono font-semibold text-brand-700 underline decoration-dotted underline-offset-2 transition-colors hover:text-slate-900"
                >
                  {DEMO_KEY}
                </button>
                <span className="ml-2 text-xs text-slate-500">
                  {demoClipboard.copied
                    ? '\u5df2\u590d\u5236'
                    : '\u70b9\u51fb\u5bc6\u94a5\u53ef\u590d\u5236'}
                </span>
              </p>

              <p>
                {
                  '\u65b0\u624b\u63d0\u793a\uff1a\u8bf7\u5728\u5012\u8ba1\u65f6\u7ed3\u675f\u524d\u8f93\u5165\u9a8c\u8bc1\u7801\uff0c\u5426\u5219\u5f53\u524d 6 \u4f4d\u9a8c\u8bc1\u7801\u4f1a\u5931\u6548\u3002\u6d4b\u8bd5\u65f6\u8bf7\u8f93\u5165\u6b63\u786e\u7f16\u7801\u7684 Base32 \u5bc6\u94a5\uff0c\u4e0d\u8981\u968f\u610f\u8f93\u5165\u4e00\u4e32\u5b57\u7b26\u6765\u6d4b\u8bd5\u3002'
                }
              </p>

              <div className="space-y-2">
                <p>
                  {'\u4f60\u4e5f\u53ef\u4ee5\u628a\u5bc6\u94a5\u76f4\u63a5\u52a0\u5230\u7f51\u5740\u540e\u9762\u4f7f\u7528\uff1a'}
                  <a
                    href={`${SITE_URL}/2fa/`}
                    target="_blank"
                    rel="noreferrer"
                    className="mx-1 text-brand-700 underline decoration-dotted underline-offset-2"
                  >
                    https://2fa.cx/2fa/
                  </a>
                  {'\u793a\u4f8b\u94fe\u63a5\u5982\u4e0b\uff1a'}
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
                    {shareUrlClipboard.copied
                      ? '\u94fe\u63a5\u5df2\u590d\u5236'
                      : '\u70b9\u51fb\u590d\u5236\u94fe\u63a5'}
                  </button>
                  <span className="break-all text-xs text-slate-500">
                    {`\u590d\u5236\u5185\u5bb9\u4e3a\uff1a${DEMO_SHARE_URL}`}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_56px_rgba(15,23,42,0.1)] sm:rounded-[24px] sm:px-6 sm:py-5">
            <h2 className="text-base font-semibold text-slate-900">
              {'\u5728\u7ebf TOTP / 2FA \u9a8c\u8bc1\u7801\u751f\u6210\u5668'}
            </h2>
            <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
              <p>
                {
                  '2FA.CX \u9762\u5411\u7f51\u9875\u767b\u5f55\u3001\u540e\u53f0\u7ba1\u7406\u548c\u8d26\u53f7\u5b89\u5168\u573a\u666f\u3002\u8f93\u5165 Base32 \u5bc6\u94a5\u540e\uff0c\u9875\u9762\u4f1a\u7acb\u5373\u5728\u672c\u5730\u751f\u6210 6 \u4f4d\u52a8\u6001\u9a8c\u8bc1\u7801\uff0c\u9002\u5408 Google Authenticator\u3001\u53cc\u91cd\u9a8c\u8bc1\u548c\u5e38\u89c1 OTP \u767b\u5f55\u6d41\u7a0b\u3002'
                }
              </p>

              <p>
                {
                  '\u4e0e\u628a\u5bc6\u94a5\u53d1\u9001\u5230\u670d\u52a1\u7aef\u7684\u5de5\u5177\u4e0d\u540c\uff0c\u8fd9\u4e2a\u9875\u9762\u4f1a\u5728\u5f53\u524d\u6d4f\u89c8\u5668\u91cc\u5b8c\u6210\u8ba1\u7b97\u3002\u5bf9\u4e8e\u9700\u8981\u5feb\u901f\u67e5\u770b TOTP\u3001\u4e34\u65f6\u5206\u4eab\u9a8c\u8bc1\u7801\u94fe\u63a5\u6216\u7ed9\u65b0\u624b\u6f14\u793a Base32 \u7528\u6cd5\u7684\u573a\u666f\uff0c\u8fd9\u79cd\u65b9\u5f0f\u66f4\u76f4\u63a5\u3002'
                }
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{'\u652f\u6301\u573a\u666f'}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {
                      'Base32 \u5bc6\u94a5\u751f\u6210\u9a8c\u8bc1\u7801\u3001\u5728\u7ebf 2FA \u67e5\u8be2\u3001TOTP \u52a8\u6001\u53e3\u4ee4\u67e5\u770b\u3001\u9a8c\u8bc1\u7801\u590d\u5236\u548c\u5206\u4eab\u94fe\u63a5\u751f\u6210\u3002'
                    }
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {'\u9002\u5408\u641c\u7d22\u7684\u5173\u952e\u8bcd'}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {'TOTP\u30012FA\u3001OTP\u3001Google Authenticator\u3001\u53cc\u91cd\u9a8c\u8bc1\u3001\u4e24\u6b65\u9a8c\u8bc1\u3001Base32\u3001\u5728\u7ebf\u9a8c\u8bc1\u7801\u751f\u6210\u5668\u3002'}
                  </p>
                </article>
              </div>

              <p>
                {'\u5982\u679c\u4f60\u9700\u8981\u628a\u4e00\u7ec4\u5bc6\u94a5\u505a\u6210\u53ef\u76f4\u63a5\u8bbf\u95ee\u7684\u94fe\u63a5\uff0c\u4e5f\u53ef\u4ee5\u4f7f\u7528'}
                <span className="mx-1 font-mono text-slate-900">https://2fa.cx/2fa/{'\u5bc6\u94a5'}</span>
                {'\u8fd9\u79cd\u683c\u5f0f\u3002\u9875\u9762\u4f1a\u81ea\u52a8\u8bfb\u53d6\u8def\u5f84\u4e2d\u7684 Base32 \u5bc6\u94a5\u5e76\u751f\u6210\u9a8c\u8bc1\u7801\u3002'}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
