import { base32Decode } from './base32'

export async function generateTOTP(secret: string, timestamp = Date.now()): Promise<string> {
  const key = Uint8Array.from(base32Decode(secret))
  const counter = Math.floor(timestamp / 1000 / 30)

  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setUint32(4, counter, false)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, buf)
  const h = new Uint8Array(sig)
  const offset = h[19] & 0xf
  const code =
    (((h[offset] & 0x7f) << 24) |
      ((h[offset + 1] & 0xff) << 16) |
      ((h[offset + 2] & 0xff) << 8) |
      (h[offset + 3] & 0xff)) %
    1_000_000

  return String(code).padStart(6, '0')
}

export function timeUntilNext(): number {
  return 30000 - (Date.now() % 30000)
}

export function secondsLeft(): number {
  return Math.ceil(timeUntilNext() / 1000)
}
