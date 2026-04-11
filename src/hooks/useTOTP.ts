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
      setError('格式错误：仅支持 A-Z 和 2-7，且长度至少为 8 位。')
      return
    }

    setError('')

    try {
      const nextCode = await generateTOTP(value)
      setCode(nextCode)
      lastPeriodRef.current = Math.floor(Date.now() / 1000 / 30)
    } catch {
      setCode('')
      setError('密钥无效，请检查输入内容。')
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
