import { useRef } from 'react'
import { isValidBase32 } from '@/utils/base32'

interface Props {
  value: string
  onChange: (v: string) => void
  error: string
  onPaste: () => void
  onClear: () => void
}

export function SecretInput({ value, onChange, error, onPaste, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value.toUpperCase().replace(/\s/g, ''))
  }

  const hasError = !!error && value.length > 0 && !isValidBase32(value)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="secret" className="text-xs font-semibold tracking-wide text-slate-600">
          {'\u5bc6\u94a5\uff08Base32 \u683c\u5f0f\uff09'}
        </label>
        <button
          type="button"
          onClick={onClear}
          title={'\u6e05\u7a7a\u5bc6\u94a5'}
          aria-label={'\u6e05\u7a7a\u5bc6\u94a5'}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
          </svg>
        </button>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="15" r="4" />
            <path d="M12 11.354l9-9M18 5l2 2M15 8l2 2" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id="secret"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="JBSWY3DPEHPK3PXP"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'secret-error' : undefined}
          className={[
            'w-full rounded-lg border py-2.5 pl-9 pr-20 text-[15px] font-semibold tracking-[0.12em]',
            'bg-slate-50 text-slate-800 outline-none placeholder:font-medium placeholder:tracking-[0.08em] placeholder:text-slate-400',
            'transition-all duration-150',
            hasError
              ? 'animate-shake border-red-400 ring-2 ring-red-100'
              : 'border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={onPaste}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          {'\u7c98\u8d34'}
        </button>
      </div>

      <div id="secret-error" className="min-h-[16px] text-xs font-medium text-red-600" role="alert">
        {hasError ? error : ''}
      </div>
    </div>
  )
}
