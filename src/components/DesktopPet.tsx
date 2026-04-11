import { useCallback, useEffect, useRef, useState } from 'react'
import { getPetMessagePool, getPetPoetryMessagePool, PetMessage } from '@/utils/petMessages'

const BUBBLE_DURATION_MS = 2600
const POETRY_BUBBLE_DURATION_MS = 4200
const STREAK_WINDOW_MS = 6000
const RETURN_AFTER_MS = 90000
const DOUBLE_CLICK_DELAY_MS = 220

function pickMessage(pool: PetMessage[], recentTexts: string[]) {
  const filtered = pool.filter(message => !recentTexts.includes(message.text))
  const source = filtered.length > 0 ? filtered : pool
  return source[Math.floor(Math.random() * source.length)]
}

export function DesktopPet() {
  const [bubble, setBubble] = useState<PetMessage | null>(null)
  const [isNudging, setIsNudging] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const recentTextsRef = useRef<string[]>([])
  const lastClickAtRef = useRef<number>(0)
  const streakRef = useRef(0)

  const showBubble = useCallback((nextMessage: PetMessage, duration: number) => {
    recentTextsRef.current = [nextMessage.text, ...recentTextsRef.current].slice(0, 6)
    setBubble(nextMessage)
    setIsNudging(true)

    clearTimeout(nudgeTimerRef.current)
    nudgeTimerRef.current = setTimeout(() => setIsNudging(false), 320)

    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setBubble(null), duration)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(hideTimerRef.current)
      clearTimeout(nudgeTimerRef.current)
      clearTimeout(clickTimerRef.current)
    }
  }, [])

  const handleClick = useCallback(() => {
    clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => {
      const now = Date.now()
      const isWelcomeBack = now - lastClickAtRef.current > RETURN_AFTER_MS
      const isContinuingStreak = now - lastClickAtRef.current <= STREAK_WINDOW_MS

      streakRef.current = isContinuingStreak ? streakRef.current + 1 : 1
      lastClickAtRef.current = now

      const nextMessage = pickMessage(
        getPetMessagePool(new Date(now), isWelcomeBack, streakRef.current >= 3),
        recentTextsRef.current
      )

      showBubble(nextMessage, BUBBLE_DURATION_MS)
    }, DOUBLE_CLICK_DELAY_MS)
  }, [showBubble])

  const handleDoubleClick = useCallback(() => {
    clearTimeout(clickTimerRef.current)
    lastClickAtRef.current = Date.now()

    const nextMessage = pickMessage(
      getPetPoetryMessagePool(),
      recentTextsRef.current
    )

    showBubble(nextMessage, POETRY_BUBBLE_DURATION_MS)
  }, [showBubble])

  return (
    <div className="fixed bottom-5 right-5 z-20 hidden lg:block">
      <div className="relative h-[188px] w-[220px]">
        {bubble && (
          <div
            className={[
              'pet-bubble absolute right-[54px] top-1 rounded-2xl border px-4 py-3 text-sm leading-6 shadow-[0_18px_32px_rgba(15,23,42,0.14)]',
              bubble.tone === 'poetry'
                ? 'max-w-[208px] border-violet-200 bg-violet-50 text-violet-900'
                : bubble.tone === 'cheer'
                  ? 'max-w-[178px] border-amber-200 bg-amber-50 text-amber-900'
                  : bubble.tone === 'warm'
                    ? 'max-w-[178px] border-rose-100 bg-rose-50 text-slate-700'
                    : 'max-w-[178px] border-slate-200 bg-white text-slate-700',
            ].join(' ')}
          >
            {bubble.tone === 'poetry' ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500/80">Special Praise</p>
                <p className="mt-1 font-semibold leading-6">「{bubble.text}」</p>
              </>
            ) : (
              <p className="font-medium">{bubble.text}</p>
            )}
            <span className="absolute -bottom-2 right-9 h-4 w-4 rotate-45 rounded-[4px] border-b border-r border-inherit bg-inherit" />
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          aria-label="点击桌面宠物获取鼓励，双击触发特别夸夸"
          className="absolute bottom-0 right-0 h-[120px] w-[112px] cursor-pointer outline-none transition-transform duration-200 hover:scale-[1.02] focus-visible:scale-[1.02]"
        >
          <div className={`relative h-full w-full opacity-90 ${isNudging ? 'pet-nudge' : 'pet-float'}`}>
            <div className="absolute bottom-0 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900/8 blur-md" />

            <div className="absolute bottom-5 left-1/2 h-[84px] w-[84px] -translate-x-1/2 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f5f2e8_100%)] shadow-[0_14px_30px_rgba(24,95,165,0.14)]">
              <div className="absolute left-1/2 top-2 h-5 w-10 -translate-x-1/2 rounded-full bg-white/70 blur-md" />
              <div className="pet-blink absolute left-4 top-7 h-2.5 w-2 rounded-full bg-slate-700" />
              <div className="pet-blink absolute right-4 top-7 h-2.5 w-2 rounded-full bg-slate-700" />
              <div className="absolute left-1/2 top-[42px] h-2 w-6 -translate-x-1/2 rounded-full border-b-2 border-brand-600/70" />
              <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-md border border-white/80 bg-[linear-gradient(135deg,#6db5ff_0%,#185FA5_100%)] shadow-[0_8px_18px_rgba(24,95,165,0.24)]" />
              <div className="absolute bottom-3 left-3 h-2.5 w-2.5 rounded-full bg-[#ffd18f]" />
              <div className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full bg-[#b8dbff]" />
            </div>

            <div className="absolute bottom-[84px] left-[12px] h-7 w-7 rounded-full border border-white/70 bg-[radial-gradient(circle_at_30%_30%,#fff8e3_0%,#ffe0a4_48%,#f3b54f_100%)] shadow-[0_10px_22px_rgba(243,181,79,0.24)]" />
          </div>
        </button>
      </div>
    </div>
  )
}
