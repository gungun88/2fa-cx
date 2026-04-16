interface Props {
  code: string
  copied: boolean
  linkCopied: boolean
  onCopy: () => void
  onCopyLink: () => void
}

export function ActionBar({ code, copied, linkCopied, onCopy, onCopyLink }: Props) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row">
      <button
        onClick={onCopy}
        disabled={!code}
        aria-label={'\u590d\u5236\u9a8c\u8bc1\u7801'}
        className={[
          'w-full flex-[2] rounded-lg border py-2.5 text-base font-semibold transition-all duration-150',
          'disabled:cursor-not-allowed disabled:opacity-40',
          copied
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-slate-300 bg-white text-slate-800 hover:bg-[#efeee6] active:scale-[0.98]',
        ].join(' ')}
      >
        {copied ? '\u5df2\u590d\u5236\u9a8c\u8bc1\u7801' : '\u590d\u5236\u9a8c\u8bc1\u7801'}
      </button>

      <button
        onClick={onCopyLink}
        disabled={!code}
        aria-label={'\u590d\u5236\u5206\u4eab\u94fe\u63a5'}
        className="flex w-full flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-[#efeee6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 5" />
          <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19" />
        </svg>
        {linkCopied ? '\u5df2\u590d\u5236\u94fe\u63a5' : '\u590d\u5236\u94fe\u63a5'}
      </button>
    </div>
  )
}
