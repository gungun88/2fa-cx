const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(input: string): Uint8Array {
  const s = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let val = 0
  const out: number[] = []
  for (const c of s) {
    val = (val << 5) | ALPHABET.indexOf(c)
    bits += 5
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

export function isValidBase32(s: string): boolean {
  return /^[A-Z2-7]{8,}$/i.test(s.replace(/\s/g, ''))
}
