import { useCallback, useEffect, useRef, useState } from 'react'
import { isValidBase32 } from '@/utils/base32'
import { generateTOTP, secondsLeft } from '@/utils/crypto'

export function useTOTP(secret: string) {
  const [code, setCode] = useState('')
  const [secs, setSecs] = useState(secondsLeft())
  const [error, setError] = useState('')
  const lastPeriodRef = useRef(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const generate = useCallback(async (value: string) => {
    if (!value) {
      setCode('')
      setError('')
      return
    }

    if (!isValidBase32(value)) {
      setCode('')
      setError('\u683c\u5f0f\u9519\u8bef\uff1a\u4ec5\u652f\u6301 A-Z \u548c 2-7\uff0c\u4e14\u957f\u5ea6\u81f3\u5c11\u4e3a 8 \u4f4d\u3002')
      return
    }

    setError('')

    try {
      const nextCode = await generateTOTP(value)
      setCode(nextCode)
      lastPeriodRef.current = Math.floor(Date.now() / 1000 / 30)
    } catch {
      setCode('')
      setError('\u5bc6\u94a5\u65e0\u6548\uff0c\u8bf7\u68c0\u67e5\u8f93\u5165\u5185\u5bb9\u3002')
    }
  }, [])

  useEffect(() => {
    let alive = true

    const tick = async () => {
      if (!alive) {
        return
      }

      const period = Math.floor(Date.now() / 1000 / 30)
      setSecs(secondsLeft())

      if (secret && isValidBase32(secret) && period !== lastPeriodRef.current) {
        lastPeriodRef.current = period

        try {
          const nextCode = await generateTOTP(secret)
          if (alive) {
            setCode(nextCode)
          }
        } catch {
          // Ignore refresh failures and keep showing the validation error from generate().
        }
      }

      timerRef.current = setTimeout(tick, 200)
    }

    void tick()

    return () => {
      alive = false
      clearTimeout(timerRef.current)
    }
  }, [secret])

  useEffect(() => {
    void generate(secret)
  }, [secret, generate])

  return { code, secs, error }
}
