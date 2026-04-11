import { useState } from 'react'
import { HistoryEntry } from '@/types/totp'

interface Props {
  history: HistoryEntry[]
  onSelect: (key: string) => void
  onClear: () => void
}

function maskKey(key: string) {
  return key.length <= 8 ? `${key.slice(0, 2)}...${key.slice(-2)}` : `${key.slice(0, 4)}...${key.slice(-4)}`
}

export function HistoryPanel({ history, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClear = () => {
    if (confirmClear) {
      onClear()
      setConfirmClear(false)
      return
    }

    setConfirmClear(true)
    setTimeout(() => setConfirmClear(false), 3000)
  }

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:px-6"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          最近使用
          {history.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
              {history.length}
            </span>
          )}
        </span>
        <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-4 sm:px-6">
          {history.length === 0 ? (
            <p className="py-2 text-xs font-medium text-slate-500">当前会话还没有记录</p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {history.map((entry, index) => (
                  <li key={index} className="flex flex-col items-start justify-between gap-2 py-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-700">{maskKey(entry.key)}</p>
                      <p className="text-xs font-medium text-slate-500">{new Date(entry.time).toLocaleString('zh-CN')}</p>
                    </div>
                    <button
                      onClick={() => onSelect(entry.key)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      填入
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleClear}
                className="mt-2 text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
              >
                {confirmClear ? '再次点击确认清空' : '清空记录'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
