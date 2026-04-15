import { ChangeEvent, CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { isValidBase32 } from '@/utils/base32'
import { generateTOTP, secondsLeft } from '@/utils/crypto'
import popupBrandIcon from '../../extension/icons/icon128.png'

const STORAGE_KEY = 'twofa-popup-accounts'
const DEMO_ACCOUNT = {
  name: 'Google 演示账号',
  issuer: '2FA.CX',
  secret: 'TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73',
}

interface PopupAccount {
  id: string
  name: string
  issuer: string
  secret: string
  createdAt: number
  updatedAt: number
}

interface AccountFormState {
  name: string
  issuer: string
  secret: string
}

type NoticeTone = 'info' | 'success' | 'error'

interface NoticeState {
  message: string
  tone: NoticeTone
}

type ResolvedAccountInput =
  | {
      error: string
    }
  | {
      value: {
        name: string
        issuer: string
        secret: string
      }
    }

type ResolvedJsonImport =
  | {
      error: string
    }
  | {
      accounts: PopupAccount[]
      skippedCount: number
    }

type ResolvedQrImport =
  | {
      error: string
    }
  | {
      value: {
        name: string
        issuer: string
        secret: string
      }
    }

interface BarcodeDetectorResultLike {
  rawValue?: string
}

interface BarcodeDetectorLike {
  detect: (image: ImageBitmap) => Promise<BarcodeDetectorResultLike[]>
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
}

interface ChromeStorageAreaLike {
  get: (
    keys: string | string[] | Record<string, unknown> | null,
    callback: (items: Record<string, unknown>) => void
  ) => void
  set: (items: Record<string, unknown>, callback?: () => void) => void
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructorLike
  }

  const chrome:
    | {
        runtime?: {
          lastError?: {
            message?: string
          }
        }
        storage?: {
          local?: ChromeStorageAreaLike
        }
      }
    | undefined
}

function normalizeSecret(value: string) {
  return value.toUpperCase().replace(/\s/g, '')
}

function createAccountId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function isPopupAccount(value: unknown): value is PopupAccount {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.issuer === 'string' &&
    typeof item.secret === 'string' &&
    typeof item.createdAt === 'number' &&
    typeof item.updatedAt === 'number'
  )
}

function sanitizeAccounts(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as PopupAccount[]
  }

  return value
    .filter(isPopupAccount)
    .map(account => ({
      ...account,
      name: account.name.trim(),
      issuer: account.issuer.trim(),
      secret: normalizeSecret(account.secret),
    }))
    .filter(account => !!account.name && isValidBase32(account.secret))
}

function resolveJsonImport(value: unknown): ResolvedJsonImport {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).accounts
      : value

  if (!Array.isArray(source)) {
    return { error: '备份文件格式不对，请重新选择导出的备份文件。' }
  }

  if (!source.length) {
    return { error: '这个备份文件里没有可恢复的账号。' }
  }

  const accounts = sanitizeAccounts(source)
  const skippedCount = Math.max(0, source.length - accounts.length)

  if (!accounts.length) {
    return { error: '备份文件内容不完整，暂时无法恢复账号。' }
  }

  return {
    accounts,
    skippedCount,
  }
}

function loadAccountsFromLocalStorage() {
  if (typeof window === 'undefined') {
    return [] as PopupAccount[]
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return sanitizeAccounts(parsed)
  } catch {
    return []
  }
}

function saveAccountsToLocalStorage(accounts: PopupAccount[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

function getChromeStorageArea() {
  return (globalThis as typeof globalThis & { chrome?: { storage?: { local?: ChromeStorageAreaLike } } }).chrome
    ?.storage?.local
}

function getChromeStorageErrorMessage() {
  return (
    (globalThis as typeof globalThis & { chrome?: { runtime?: { lastError?: { message?: string } } } }).chrome
      ?.runtime?.lastError?.message ?? ''
  )
}

async function loadAccountsFromChromeStorage() {
  const storage = getChromeStorageArea()
  if (!storage) {
    return {
      hasValue: false,
      accounts: [] as PopupAccount[],
    }
  }

  return new Promise<{ hasValue: boolean; accounts: PopupAccount[] }>((resolve, reject) => {
    storage.get(STORAGE_KEY, (items: Record<string, unknown>) => {
      const errorMessage = getChromeStorageErrorMessage()
      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      const hasValue = Object.prototype.hasOwnProperty.call(items, STORAGE_KEY)
      resolve({
        hasValue,
        accounts: sanitizeAccounts(items[STORAGE_KEY]),
      })
    })
  })
}

async function saveAccountsToChromeStorage(accounts: PopupAccount[]) {
  const storage = getChromeStorageArea()
  if (!storage) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    storage.set({ [STORAGE_KEY]: accounts }, () => {
      const errorMessage = getChromeStorageErrorMessage()
      if (errorMessage) {
        reject(new Error(errorMessage))
        return
      }

      resolve()
    })
  })
}

async function loadAccounts() {
  const chromeStorage = await loadAccountsFromChromeStorage()
  if (chromeStorage.hasValue) {
    saveAccountsToLocalStorage(chromeStorage.accounts)
    return chromeStorage.accounts
  }

  const legacyAccounts = loadAccountsFromLocalStorage()
  if (legacyAccounts.length) {
    await saveAccountsToChromeStorage(legacyAccounts)
  }

  return legacyAccounts
}

async function persistAccounts(accounts: PopupAccount[]) {
  saveAccountsToLocalStorage(accounts)
  await saveAccountsToChromeStorage(accounts)
}

function formatCode(code: string, visible: boolean) {
  if (!code) {
    return '--- ---'
  }

  if (!visible) {
    return '*** ***'
  }

  return `${code.slice(0, 3)} ${code.slice(3)}`
}

function parseOtpAuthPayload(rawValue: string) {
  try {
    const url = new URL(rawValue)
    if (url.protocol !== 'otpauth:' || url.hostname !== 'totp') {
      return null
    }

    const label = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const [issuerFromLabel = '', ...nameParts] = label.split(':')
    const labelName = nameParts.length > 0 ? nameParts.join(':').trim() : issuerFromLabel.trim()
    const secret = normalizeSecret(url.searchParams.get('secret') ?? '')
    const issuer = (url.searchParams.get('issuer') ?? (nameParts.length > 0 ? issuerFromLabel : '')).trim()

    return {
      name: labelName,
      issuer,
      secret,
    }
  } catch {
    return null
  }
}

function resolveAccountInput(form: AccountFormState): ResolvedAccountInput {
  const parsed = parseOtpAuthPayload(form.secret.trim())
  const secret = parsed ? parsed.secret : normalizeSecret(form.secret)
  const issuer = (form.issuer.trim() || parsed?.issuer || '').trim()
  const name = (form.name.trim() || parsed?.name || issuer).trim()

  if (!name) {
    return { error: '请填写账号名称。' }
  }

  if (!isValidBase32(secret)) {
    return { error: '请输入正确的验证码密钥，不会填的话，建议直接导入二维码。' }
  }

  return {
    value: {
      name,
      issuer,
      secret,
    },
  }
}

function filterAccounts(accounts: PopupAccount[], keyword: string) {
  const query = keyword.trim().toLowerCase()
  if (!query) {
    return accounts
  }

  return accounts.filter(account => {
    return [account.name, account.issuer, account.secret].some(value =>
      value.toLowerCase().includes(query)
    )
  })
}

async function readQrPayloadWithBarcodeDetector(file: File) {
  if (!window.BarcodeDetector) {
    return ''
  }

  const bitmap = await createImageBitmap(file)

  try {
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    const results = await detector.detect(bitmap)
    return results.find(item => item.rawValue)?.rawValue?.trim() ?? ''
  } finally {
    bitmap.close?.()
  }
}

async function readQrPayloadWithJsQr(file: File) {
  const bitmap = await createImageBitmap(file)

  try {
    const width = bitmap.width
    const height = bitmap.height
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height })
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return ''
    }

    context.drawImage(bitmap, 0, 0, width, height)
    const imageData = context.getImageData(0, 0, width, height)
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    })

    return result?.data?.trim() ?? ''
  } finally {
    bitmap.close?.()
  }
}

async function readQrPayload(file: File) {
  const nativePayload = await readQrPayloadWithBarcodeDetector(file)
  if (nativePayload) {
    return nativePayload
  }

  return readQrPayloadWithJsQr(file)
}

function buildAccountIdentity(account: Pick<PopupAccount, 'name' | 'issuer' | 'secret'>) {
  return [account.name.trim(), account.issuer.trim(), normalizeSecret(account.secret)].join('\u0000')
}

function normalizeImportedAccount(account: PopupAccount) {
  const now = Date.now()
  return {
    id: account.id || createAccountId(),
    name: account.name.trim(),
    issuer: account.issuer.trim(),
    secret: normalizeSecret(account.secret),
    createdAt: Number.isFinite(account.createdAt) ? account.createdAt : now,
    updatedAt: Number.isFinite(account.updatedAt) ? account.updatedAt : now,
  }
}

function resolveQrImportPayload(rawValue: string): ResolvedQrImport {
  if (!rawValue) {
    return { error: '没有识别到二维码，请换一张清晰一点的图片再试。' }
  }

  const parsed = parseOtpAuthPayload(rawValue)
  if (!parsed) {
    if (rawValue.startsWith('otpauth://')) {
      return { error: '这个二维码格式暂不支持，请换常见登录验证码二维码。' }
    }

    return { error: '这张图片里的内容不是登录验证码二维码。' }
  }

  if (!isValidBase32(parsed.secret)) {
    return { error: '二维码内容不完整，请重新截图或换一张图片。' }
  }

  return {
    value: {
      name: parsed.name || parsed.issuer || '导入账号',
      issuer: parsed.issuer,
      secret: parsed.secret,
    },
  }
}

function mergeImportedAccounts(existing: PopupAccount[], incoming: PopupAccount[]) {
  const byIdentity = new Map(existing.map(account => [buildAccountIdentity(account), account]))
  const byId = new Map(existing.map(account => [account.id, account]))
  let added = 0
  let updated = 0

  for (const rawAccount of incoming) {
    const account = normalizeImportedAccount(rawAccount)
    const identity = buildAccountIdentity(account)
    const match = byIdentity.get(identity) ?? byId.get(account.id)

    if (match) {
      const merged = {
        ...match,
        ...account,
        id: match.id,
        createdAt: Math.min(match.createdAt, account.createdAt),
        updatedAt: Math.max(match.updatedAt, account.updatedAt),
      }

      byIdentity.delete(buildAccountIdentity(match))
      byId.set(match.id, merged)
      byIdentity.set(buildAccountIdentity(merged), merged)
      updated += 1
      continue
    }

    byId.set(account.id, account)
    byIdentity.set(identity, account)
    added += 1
  }

  return {
    accounts: Array.from(byId.values()).sort((left, right) => right.updatedAt - left.updatedAt),
    added,
    updated,
  }
}

function createBackupFilename() {
  const now = new Date()
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ]

  return `2fa-guard-backup-${parts.join('')}.json`
}

const popupThemeStyle = {
  '--popup-page': '#F8F9FA',
  '--popup-canvas': '#F1F3F4',
  '--popup-surface': '#FFFFFF',
  '--popup-surface-soft': '#E8F0FE',
  '--popup-surface-soft-strong': '#D2E3FC',
  '--popup-surface-muted': '#F1F3F4',
  '--popup-border': '#DADCE0',
  '--popup-border-strong': '#BDC1C6',
  '--popup-text': '#202124',
  '--popup-text-muted': '#5F6368',
  '--popup-text-soft': '#80868B',
  '--popup-accent': '#4285F4',
  '--popup-accent-strong': '#1A73E8',
  '--popup-accent-soft': '#E8F0FE',
  '--popup-success': '#34A853',
  '--popup-success-soft': '#E6F4EA',
  '--popup-warning': '#FBBC05',
  '--popup-warning-soft': '#FEF7E0',
  '--popup-danger': '#EA4335',
  '--popup-danger-soft': '#FCE8E6',
} as CSSProperties

function IconButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
        active
          ? 'border-[var(--popup-accent)]/35 bg-[var(--popup-accent-soft)] text-[var(--popup-accent-strong)] shadow-none'
          : 'border-[var(--popup-border)] bg-[var(--popup-surface)]/82 text-[var(--popup-text-muted)] hover:border-[var(--popup-border-strong)] hover:bg-[var(--popup-surface)] hover:text-[var(--popup-text)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function ExtensionPopupPage() {
  const [accounts, setAccounts] = useState<PopupAccount[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [seconds, setSeconds] = useState(secondsLeft())
  const [query, setQuery] = useState('')
  const [showCodes, setShowCodes] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null)
  const [recentlyUpdatedAccountIds, setRecentlyUpdatedAccountIds] = useState<string[]>([])
  const [highlightedAccountId, setHighlightedAccountId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountFormState>({ name: '', issuer: '', secret: '' })
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [accountsReady, setAccountsReady] = useState(false)
  const [importPending, setImportPending] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const qrFileInputRef = useRef<HTMLInputElement | null>(null)
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null)
  const accountsRef = useRef<PopupAccount[]>([])
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const recentUpdateTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const lastPeriodRef = useRef(-1)

  const filteredAccounts = useMemo(() => {
    return filterAccounts(accounts, query)
  }, [accounts, query])

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    setNotice({ message, tone })
  }

  const markAccountsRecentlyUpdated = (accountIds: string[]) => {
    if (!accountIds.length) {
      return
    }

    clearTimeout(recentUpdateTimerRef.current)
    setRecentlyUpdatedAccountIds(prev => Array.from(new Set([...prev, ...accountIds])))
    recentUpdateTimerRef.current = setTimeout(() => {
      setRecentlyUpdatedAccountIds([])
    }, 2200)
  }

  const commitAccounts = (nextAccounts: PopupAccount[]) => {
    accountsRef.current = nextAccounts
    setAccounts(nextAccounts)
  }

  const updateAccounts = (updater: (currentAccounts: PopupAccount[]) => PopupAccount[]) => {
    const nextAccounts = updater(accountsRef.current)
    commitAccounts(nextAccounts)
    return nextAccounts
  }

  useEffect(() => {
    let alive = true

    void loadAccounts()
      .then(nextAccounts => {
        if (!alive) {
          return
        }

        commitAccounts(nextAccounts)
        setAccountsReady(true)
      })
      .catch(() => {
        if (!alive) {
          return
        }

        commitAccounts([])
        setAccountsReady(true)
        showNotice('读取本地账号失败，已使用空列表继续。', 'error')
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!accountsReady) {
      return
    }

    void persistAccounts(accounts).catch(() => {
      showNotice('账号保存失败，请检查浏览器存储权限后重试。', 'error')
    })
  }, [accounts, accountsReady])

  useEffect(() => {
    if (!notice?.message) {
      return
    }

    clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null)
    }, 2200)

    return () => clearTimeout(noticeTimerRef.current)
  }, [notice])

  useEffect(() => {
    return () => {
      clearTimeout(highlightTimerRef.current)
      clearTimeout(copyFeedbackTimerRef.current)
      clearTimeout(recentUpdateTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let alive = true

    const refreshCodes = async () => {
      const nextEntries = await Promise.all(
        accounts.map(async account => {
          try {
            const code = await generateTOTP(account.secret)
            return [account.id, code] as const
          } catch {
            return [account.id, ''] as const
          }
        })
      )

      if (!alive) {
        return
      }

      setCodes(Object.fromEntries(nextEntries))
    }

    const tick = async () => {
      if (!alive) {
        return
      }

      const period = Math.floor(Date.now() / 1000 / 30)
      setSeconds(secondsLeft())

      if (period !== lastPeriodRef.current) {
        lastPeriodRef.current = period
        await refreshCodes()
      }

      refreshTimerRef.current = setTimeout(tick, 250)
    }

    void tick()

    return () => {
      alive = false
      clearTimeout(refreshTimerRef.current)
    }
  }, [accounts])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setComposerOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openCreateComposer = () => {
    setEditingId(null)
    setForm({ name: '', issuer: '', secret: '' })
    setFormError('')
    setComposerOpen(true)
    setMenuOpen(false)
  }

  const openEditComposer = (account: PopupAccount) => {
    setEditingId(account.id)
    setForm({
      name: account.name,
      issuer: account.issuer,
      secret: account.secret,
    })
    setFormError('')
    setComposerOpen(true)
    setMenuOpen(false)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setEditingId(null)
    setFormError('')
  }

  const handleCopyCode = async (account: PopupAccount) => {
    const code = codes[account.id]
    if (!code) {
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      clearTimeout(copyFeedbackTimerRef.current)
      setCopiedAccountId(account.id)
      copyFeedbackTimerRef.current = setTimeout(() => {
        setCopiedAccountId(current => (current === account.id ? null : current))
      }, 1200)
      clearTimeout(highlightTimerRef.current)
      setHighlightedAccountId(account.id)
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedAccountId(current => (current === account.id ? null : current))
      }, 1200)
      showNotice(`已复制 ${account.name} 的验证码`, 'success')
    } catch {
      showNotice('复制失败，请手动复制当前验证码。', 'error')
    }
  }

  const handleSaveAccount = () => {
    const resolved = resolveAccountInput(form)
    if ('error' in resolved) {
      setFormError(resolved.error)
      return
    }

    const now = Date.now()

    if (editingId) {
      updateAccounts(currentAccounts =>
        currentAccounts
          .map(account =>
            account.id === editingId
              ? {
                  ...account,
                  ...resolved.value,
                  updatedAt: now,
                }
              : account
          )
          .sort((left, right) => right.updatedAt - left.updatedAt)
      )
      markAccountsRecentlyUpdated([editingId])
      showNotice('账号信息已保存', 'success')
    } else {
      const nextAccount: PopupAccount = {
        id: createAccountId(),
        ...resolved.value,
        createdAt: now,
        updatedAt: now,
      }
      updateAccounts(currentAccounts =>
        [nextAccount, ...currentAccounts].sort((left, right) => right.updatedAt - left.updatedAt)
      )
      markAccountsRecentlyUpdated([nextAccount.id])
      showNotice('账号已添加', 'success')
    }

    closeComposer()
  }

  const handleDeleteAccount = (account: PopupAccount) => {
    if (!window.confirm(`确定删除“${account.name}”吗？删除后需要重新添加。`)) {
      return
    }

    updateAccounts(currentAccounts => currentAccounts.filter(item => item.id !== account.id))
    setCodes(prev => {
      const next = { ...prev }
      delete next[account.id]
      return next
    })
    showNotice('账号已删除', 'success')
  }

  const handleAddDemoAccount = () => {
    const now = Date.now()
    const existing = accountsRef.current.find(
      account =>
        account.secret === DEMO_ACCOUNT.secret &&
        account.name === DEMO_ACCOUNT.name &&
        account.issuer === DEMO_ACCOUNT.issuer
    )
    const touchedAccountId = existing?.id ?? createAccountId()
    const nextAccounts = existing
      ? accountsRef.current
          .map(account =>
            account.id === existing.id
              ? {
                  ...account,
                  updatedAt: now,
                }
              : account
          )
          .sort((left, right) => right.updatedAt - left.updatedAt)
      : [
          {
            id: touchedAccountId,
            ...DEMO_ACCOUNT,
            createdAt: now,
            updatedAt: now,
          },
          ...accountsRef.current,
        ].sort((left, right) => right.updatedAt - left.updatedAt)

    commitAccounts(nextAccounts)
    setMenuOpen(false)
    markAccountsRecentlyUpdated([touchedAccountId])
    showNotice('示例账号已添加', 'success')
  }

  const handleClearAll = () => {
    if (!accounts.length) {
      setMenuOpen(false)
      return
    }

    if (!window.confirm('确定删除所有账号吗？删除后不能恢复。')) {
      return
    }

    commitAccounts([])
    setCodes({})
    setQuery('')
    setMenuOpen(false)
    showNotice('所有账号已清空', 'success')
  }

  const handleQrImportClick = () => {
    setMenuOpen(false)
    qrFileInputRef.current?.click()
  }

  const handleJsonImportClick = () => {
    setMenuOpen(false)
    jsonFileInputRef.current?.click()
  }

  const handleExportJson = () => {
    if (!accounts.length) {
      setMenuOpen(false)
      showNotice('当前还没有可备份的账号。', 'error')
      return
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      accounts,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download = createBackupFilename()
    link.click()
    URL.revokeObjectURL(objectUrl)
    setMenuOpen(false)
    showNotice(`备份文件已下载，包含 ${accounts.length} 个账号。`, 'success')
  }

  const handleImportJsonFileFriendly = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImportPending(true)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const resolved = resolveJsonImport(parsed)

      if ('error' in resolved) {
        showNotice(resolved.error, 'error')
        return
      }

      const merged = mergeImportedAccounts(accountsRef.current, resolved.accounts)
      commitAccounts(merged.accounts)
      markAccountsRecentlyUpdated(
        resolved.accounts
          .map(account => {
            const matched = merged.accounts.find(
              item =>
                item.name.trim() === account.name.trim() &&
                item.issuer.trim() === account.issuer.trim() &&
                normalizeSecret(item.secret) === normalizeSecret(account.secret)
            )
            return matched?.id ?? ''
          })
          .filter(Boolean)
      )
      const skippedText = resolved.skippedCount ? `，另有 ${resolved.skippedCount} 个条目无法恢复` : ''
      showNotice(`已恢复 ${merged.added} 个账号，更新 ${merged.updated} 个账号${skippedText}。`, 'success')
    } catch (error) {
      showNotice(
        error instanceof SyntaxError
          ? '备份文件打不开，请确认文件内容完整。'
          : '恢复失败，请换一个备份文件再试。',
        'error'
      )
    } finally {
      setImportPending(false)
    }
  }

  const handleImportQrFileFriendly = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImportPending(true)

    try {
      const payload = await readQrPayload(file)
      const resolved = resolveQrImportPayload(payload)

      if ('error' in resolved) {
        showNotice(resolved.error, 'error')
        return
      }

      const now = Date.now()
      const nextAccountId = createAccountId()
      updateAccounts(currentAccounts =>
        [
          {
            id: nextAccountId,
            ...resolved.value,
            createdAt: now,
            updatedAt: now,
          },
          ...currentAccounts,
        ].sort((left, right) => right.updatedAt - left.updatedAt)
      )
      markAccountsRecentlyUpdated([nextAccountId])
      showNotice('二维码里的账号已添加', 'success')
    } catch {
      showNotice('图片读取失败，请换一张清晰的二维码图片。', 'error')
    } finally {
      setImportPending(false)
    }
  }

  const progress = Math.max(0, Math.min(100, (seconds / 30) * 100))

  return (
    <div className="min-h-[620px] bg-[var(--popup-page)] text-[var(--popup-text)]" style={popupThemeStyle}>
      <div
        className="relative flex min-h-[620px] flex-col"
        style={{
          backgroundImage:
            'radial-gradient(circle at top, rgba(66,133,244,0.16) 0%, rgba(66,133,244,0) 40%), radial-gradient(circle at 18% 18%, rgba(251,188,5,0.14) 0%, rgba(251,188,5,0) 24%), radial-gradient(circle at 82% 10%, rgba(234,67,53,0.12) 0%, rgba(234,67,53,0) 22%), linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 42%, #F1F3F4 100%)',
        }}
      >
        <div className="relative z-30 px-3 py-3">
          <div className="relative flex items-center justify-between gap-3 rounded-full border border-[var(--popup-border)] bg-[rgba(255,255,255,0.76)] px-3 py-2.5 shadow-[0_8px_20px_rgba(60,64,67,0.08)] backdrop-blur-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMenuOpen(open => {
                    if (!open) {
                      searchInputRef.current?.blur()
                    }
                    return !open
                  })
                }
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--popup-border)] bg-[var(--popup-surface)]/78 text-[var(--popup-text-muted)] transition-colors hover:bg-[var(--popup-surface)] hover:text-[var(--popup-text)]"
                aria-expanded={menuOpen}
                aria-label="打开菜单"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={[
                    'h-5 w-5 shrink-0 transition-colors',
                    query.trim() ? 'text-[var(--popup-accent-strong)]' : 'text-[var(--popup-text-soft)]',
                  ].join(' ')}
                >
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onFocus={() => setMenuOpen(false)}
                  placeholder="搜索已保存的账号"
                  className="w-full min-w-0 bg-transparent text-[15px] text-[var(--popup-text)] outline-none placeholder:text-[var(--popup-text-muted)]"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <IconButton
                title="数据保存说明"
                onClick={() => showNotice('账号只保存在当前浏览器里，不会上传到网络。')}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M8 16.5L12 19L16 16.5M8 8.5L12 11L16 8.5M4 8.5L12 4L20 8.5V15.5L12 20L4 15.5V8.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M9.5 12L11.25 13.75L14.75 10.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </IconButton>

              <IconButton
                title={
                  showCodes
                    ? '隐藏验证码'
                    : '显示验证码'
                }
                onClick={() => setShowCodes(visible => !visible)}
                active={!showCodes}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  {showCodes ? (
                    <>
                      <path
                        d="M2 12C4.6 7.8 8 5.75 12 5.75C16 5.75 19.4 7.8 22 12C19.4 16.2 16 18.25 12 18.25C8 18.25 4.6 16.2 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.8" />
                    </>
                  ) : (
                    <>
                      <path
                        d="M2 12C4.6 7.8 8 5.75 12 5.75C16 5.75 19.4 7.8 22 12C19.4 16.2 16 18.25 12 18.25C8 18.25 4.6 16.2 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </>
                  )}
                </svg>
              </IconButton>

              <button
                type="button"
                onClick={() => showNotice(`已保存 ${accounts.length} 个账号`)}
                className="inline-flex h-8 min-w-[44px] items-center justify-center rounded-full border border-[var(--popup-border)] bg-[var(--popup-surface)]/82 px-3 text-xs font-semibold text-[var(--popup-text-muted)] transition-colors hover:border-[var(--popup-border-strong)] hover:bg-[var(--popup-surface)] hover:text-[var(--popup-text)]"
                aria-label="账号数量"
              >
                {String(Math.min(accounts.length || 1, 99)).padStart(2, '0')}
              </button>
            </div>

          </div>
        </div>

        {menuOpen ? (
          <div className="absolute inset-0 z-40" onClick={() => setMenuOpen(false)}>
            <div
              className="absolute left-3 top-[72px] w-[238px] rounded-3xl border border-[var(--popup-border)] bg-[var(--popup-surface)] p-2 shadow-[0_22px_46px_rgba(60,64,67,0.22)]"
              onClick={event => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={openCreateComposer}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--popup-accent-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-accent-soft)] text-[var(--popup-accent-strong)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path
                      d="M5 16.25V19H7.75L17.1 9.65L14.35 6.9L5 16.25Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12.9 8.35L15.65 11.1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14.35 6.9L15.5 5.75C15.9 5.35 16.55 5.35 16.95 5.75L18.25 7.05C18.65 7.45 18.65 8.1 18.25 8.5L17.1 9.65"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {'手动输入'}
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--popup-accent-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-warning-soft)] text-[var(--popup-text)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path d="M12 4V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8.5 10.5L12 14L15.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 16.5V18C5 18.55 5.45 19 6 19H18C18.55 19 19 18.55 19 18V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                {'下载备份文件'}
              </button>
              <button
                type="button"
                onClick={handleJsonImportClick}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--popup-accent-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-success-soft)] text-[var(--popup-success)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path d="M12 20V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8.5 13.5L12 10L15.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 7.5V6C5 5.45 5.45 5 6 5H18C18.55 5 19 5.45 19 6V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                {'从备份恢复'}
              </button>
              <button
                type="button"
                onClick={handleQrImportClick}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--popup-accent-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-accent-soft)] text-[var(--popup-accent-strong)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path d="M4 8V5.5C4 4.67 4.67 4 5.5 4H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16 4H18.5C19.33 4 20 4.67 20 5.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M20 16V18.5C20 19.33 19.33 20 18.5 20H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8 20H5.5C4.67 20 4 19.33 4 18.5V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M9 9H11V11H9V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M13 9H15V11H13V9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M9 13H11V15H9V13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M13 13H15V15H13V13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                {'扫码添加账号'}
              </button>
              <button
                type="button"
                onClick={handleAddDemoAccount}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--popup-accent-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-warning-soft)] text-[var(--popup-text)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path d="M12 5L13.85 9.15L18 11L13.85 12.85L12 17L10.15 12.85L6 11L10.15 9.15L12 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                {'看看示例'}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[var(--popup-danger)] transition-colors hover:bg-[var(--popup-danger-soft)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--popup-danger-soft)]">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
                    <path d="M6 7H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M9.5 7V5.75C9.5 5.34 9.84 5 10.25 5H13.75C14.16 5 14.5 5.34 14.5 5.75V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M8 9.5V17.25C8 17.66 8.34 18 8.75 18H15.25C15.66 18 16 17.66 16 17.25V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.5 11V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M13.5 11V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                {'删除所有账号'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 overflow-hidden bg-[var(--popup-canvas)] px-3 pb-24">
          {notice ? (
            <div
              className={[
                'mb-3 rounded-2xl border px-4 py-3 text-sm shadow-sm backdrop-blur',
                notice.tone === 'error'
                  ? 'border-[var(--popup-danger)]/20 bg-[var(--popup-danger-soft)] text-[var(--popup-danger)]'
                  : notice.tone === 'success'
                    ? 'border-[var(--popup-success)]/20 bg-[var(--popup-success-soft)] text-[var(--popup-success)]'
                    : 'border-[var(--popup-border)] bg-[var(--popup-surface)]/90 text-[var(--popup-text)]',
              ].join(' ')}
            >
              {notice.message}
            </div>
          ) : null}

          {filteredAccounts.length ? (
            <div className="space-y-3 overflow-y-auto pb-6 pt-1">
              {filteredAccounts.map(account => (
                <article
                  key={account.id}
                  className={[
                    'overflow-hidden rounded-[28px] border bg-[var(--popup-surface)] px-4 py-4 transition-[border-color,box-shadow,transform] duration-300',
                    highlightedAccountId === account.id
                      ? 'border-[var(--popup-accent)] shadow-[0_16px_36px_rgba(66,133,244,0.2)]'
                      : 'border-[var(--popup-border)] shadow-[0_12px_32px_rgba(60,64,67,0.1)]',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-[var(--popup-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--popup-text-muted)]">
                          {account.issuer || '未填写来源'}
                        </span>
                        {recentlyUpdatedAccountIds.includes(account.id) ? (
                          <span className="inline-flex rounded-full bg-[var(--popup-success-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--popup-success)]">
                            刚刚更新
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-[17px] font-semibold leading-6 text-[var(--popup-text)]">{account.name}</p>
                      <p className="mt-1 text-xs text-[var(--popup-text-soft)]">当前登录验证码</p>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => openEditComposer(account)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--popup-border)] bg-[var(--popup-surface)] text-[var(--popup-text-muted)] transition-colors hover:border-[var(--popup-accent)] hover:bg-[var(--popup-accent-soft)] hover:text-[var(--popup-accent-strong)]"
                        aria-label={`编辑 ${account.name}`}
                        title="编辑"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                          <path
                            d="M4 20H8L18 10C18.5 9.5 18.5 8.7 18 8.2L15.8 6C15.3 5.5 14.5 5.5 14 6L4 16V20Z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--popup-border)] bg-[var(--popup-surface)] text-[var(--popup-text-muted)] transition-colors hover:border-[var(--popup-danger)] hover:bg-[var(--popup-danger-soft)] hover:text-[var(--popup-danger)]"
                        aria-label={`删除 ${account.name}`}
                        title="删除"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                          <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path
                            d="M9 7V5.8C9 5.36 9.36 5 9.8 5H14.2C14.64 5 15 5.36 15 5.8V7M7.5 7L8.2 18.2C8.24 18.66 8.62 19 9.08 19H14.92C15.38 19 15.76 18.66 15.8 18.2L16.5 7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCopyCode(account)}
                    className="mt-4 block w-full rounded-[24px] border border-transparent bg-[var(--popup-surface-muted)] px-4 py-4 text-left transition-colors hover:border-[var(--popup-surface-soft-strong)] hover:bg-[var(--popup-accent-soft)]"
                  >
                    <span
                      className={[
                        'block text-[11px] font-medium uppercase tracking-[0.18em]',
                        copiedAccountId === account.id
                          ? 'text-[var(--popup-success)]'
                          : 'text-[var(--popup-text-soft)]',
                      ].join(' ')}
                    >
                      {copiedAccountId === account.id ? '已复制' : '轻点复制'}
                    </span>
                    <span className="block text-[31px] font-semibold tracking-[0.16em] text-[var(--popup-text)]">
                      {formatCode(codes[account.id] ?? '', showCodes)}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--popup-text-muted)]">
                      {copiedAccountId === account.id
                        ? '验证码已复制到剪贴板'
                        : showCodes
                          ? '点击即可复制当前验证码'
                          : '当前已隐藏验证码，点击后仍可直接复制'}
                    </span>
                  </button>

                  <div className="mt-4 rounded-[22px] bg-[var(--popup-page)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--popup-text-muted)]">本轮剩余时间</span>
                      <span className="font-semibold text-[var(--popup-text)]">{seconds} 秒</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--popup-border)]">
                          <div
                            className="h-full rounded-full bg-[var(--popup-accent)] transition-[width] duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="rounded-full bg-[var(--popup-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--popup-text-muted)]">
                        30s
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[var(--popup-text-soft)]">
                    <span className="truncate">{`密钥尾号 ${account.secret.slice(-4)}`}</span>
                    <span className="shrink-0">完整密钥请点编辑查看</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-[36px] bg-[linear-gradient(180deg,#FFFFFF_0%,#E8F0FE_65%,#FEF7E0_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_38px_rgba(60,64,67,0.1)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[var(--popup-surface)] bg-[var(--popup-surface)]/80">
                  <img src={popupBrandIcon} alt="2FA.CX" className="h-14 w-14 object-contain" />
                </div>
              </div>
              <p className="mt-5 text-lg font-semibold text-[var(--popup-text)]">
                {accounts.length
                  ? '没有匹配的账号'
                  : '还没有账号'}
              </p>
              <p className="mt-2 max-w-[260px] text-sm leading-6 text-[var(--popup-text-muted)]">
                {accounts.length
                  ? '试试别的关键词，或者清空当前搜索。'
                  : '可以直接扫码添加，也可以手动输入账号信息。'}
              </p>
              {accounts.length && query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-4 rounded-full bg-[var(--popup-surface)] px-4 py-2 text-sm font-medium text-[var(--popup-text)] shadow-[0_8px_18px_rgba(60,64,67,0.1)]"
                >
                  {'清空搜索'}
                </button>
              ) : accounts.length ? null : (
                <div className="mt-5 flex w-full max-w-[280px] gap-3">
                  <button
                    type="button"
                    onClick={handleQrImportClick}
                    className="flex-1 rounded-2xl bg-[var(--popup-accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(26,115,232,0.24)] transition-opacity hover:opacity-95"
                  >
                    {'扫码添加'}
                  </button>
                  <button
                    type="button"
                    onClick={openCreateComposer}
                    className="flex-1 rounded-2xl border border-[var(--popup-border)] bg-[var(--popup-surface)] px-4 py-3 text-sm font-semibold text-[var(--popup-text)] transition-colors hover:bg-[var(--popup-surface-muted)]"
                  >
                    {'手动输入'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={qrFileInputRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={event => void handleImportQrFileFriendly(event)}
        />
        <input
          ref={jsonFileInputRef}
          type="file"
          className="hidden"
          accept=".json,application/json"
          onChange={event => void handleImportJsonFileFriendly(event)}
        />

        <div className="fixed bottom-4 right-4">
          <button
            type="button"
            onClick={openCreateComposer}
            className="relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--popup-accent)] bg-[var(--popup-accent)] text-white shadow-[0_20px_32px_rgba(66,133,244,0.28)] transition-transform hover:scale-[1.02] hover:bg-[var(--popup-accent-strong)]"
            aria-label="添加账号"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {composerOpen ? (
          <div className="fixed inset-0 z-30 flex items-end bg-[rgba(32,33,36,0.26)] backdrop-blur-[1px]">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={closeComposer}
              aria-label="关闭弹窗"
            />
            <div className="relative w-full rounded-t-[32px] bg-[var(--popup-surface)] px-4 pb-6 pt-4 shadow-[0_-20px_48px_rgba(60,64,67,0.22)] animate-fade-up">
              <div className="mx-auto h-1.5 w-14 rounded-full bg-[var(--popup-border)]" />
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[var(--popup-text)]">
                    {editingId
                      ? '编辑账户'
                      : '添加账户'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--popup-text-muted)]">
                    {editingId
                      ? '修改账户名称、服务名称或密钥信息。'
                      : '手动输入账户信息和密钥，或从菜单中扫描二维码快速添加。'}
                  </p>
                </div>
                {importPending ? (
                  <span className="rounded-full bg-[var(--popup-warning-soft)] px-3 py-1 text-xs font-medium text-[var(--popup-text)]">
                    {'正在导入...'}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--popup-text)]">
                    {'给这个账号起个名字'}
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder="比如：Google 工作号"
                    className="w-full rounded-2xl border border-[var(--popup-border)] bg-[var(--popup-surface-muted)] px-4 py-3 text-sm text-[var(--popup-text)] outline-none transition-colors focus:border-[var(--popup-accent)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--popup-text)]">
                    {'它来自哪个网站或 App'}
                  </span>
                  <input
                    type="text"
                    value={form.issuer}
                    onChange={event => setForm(prev => ({ ...prev, issuer: event.target.value }))}
                    placeholder="比如：Google、GitHub、飞书"
                    className="w-full rounded-2xl border border-[var(--popup-border)] bg-[var(--popup-surface-muted)] px-4 py-3 text-sm text-[var(--popup-text)] outline-none transition-colors focus:border-[var(--popup-accent)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--popup-text)]">
                    {'粘贴登录验证码密钥'}
                  </span>
                  <textarea
                    value={form.secret}
                    onChange={event => setForm(prev => ({ ...prev, secret: event.target.value }))}
                    placeholder="把网站或 App 给你的那串密钥粘贴到这里"
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-[var(--popup-border)] bg-[var(--popup-surface-muted)] px-4 py-3 text-sm text-[var(--popup-text)] outline-none transition-colors focus:border-[var(--popup-accent)]"
                  />
                </label>
              </div>

              <div className="min-h-[24px] pt-3 text-sm text-[var(--popup-danger)]">{formError}</div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="flex-1 rounded-2xl border border-[var(--popup-border)] px-4 py-3 text-sm font-semibold text-[var(--popup-text-muted)] transition-colors hover:bg-[var(--popup-surface-muted)]"
                >
                  {'取消'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  className="flex-1 rounded-2xl bg-[var(--popup-accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(26,115,232,0.24)] transition-opacity hover:opacity-92"
                >
                  {editingId
                    ? '保存'
                    : '添加'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
