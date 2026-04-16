import { useEffect, useRef } from 'react'

interface Props {
  code: string
  onCopy: () => void
}

export function TokenDisplay({ code, onCopy }: Props) {
  const prevCode = useRef(code)
  const dispRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (code && code !== prevCode.current && dispRef.current) {
      dispRef.current.classList.remove('animate-pop')
      void dispRef.current.offsetWidth
      dispRef.current.classList.add('animate-pop')
      prevCode.current = code
    }
  }, [code])

  const formatted = code ? `${code.slice(0, 3)} ${code.slice(3)}` : '--- ---'
  const ariaLabel = code
    ? `\u5f53\u524d\u9a8c\u8bc1\u7801 ${formatted}\uff0c\u70b9\u51fb\u53ef\u590d\u5236`
    : '\u5f53\u524d\u8fd8\u6ca1\u6709\u53ef\u7528\u9a8c\u8bc1\u7801'

  return (
    <div
      ref={dispRef}
      onClick={onCopy}
      title={'\u70b9\u51fb\u590d\u5236'}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          onCopy()
        }
      }}
      className={[
        'font-mono text-[2.6rem] sm:text-7xl lg:text-8xl font-bold tracking-[0.12em] sm:tracking-[0.16em] text-center select-all break-all',
        'cursor-pointer outline-none transition-colors duration-200',
        code ? 'text-slate-800' : 'text-slate-400',
      ].join(' ')}
    >
      {formatted}
    </div>
  )
}
