import { describe, expect, it } from 'vitest'
import { buildFontVariantResults, fontVariants } from './fontVariants'

function run(id: string, input: string) {
  const variant = fontVariants.find(v => v.id === id)
  if (!variant) throw new Error(`variant ${id} not found`)
  return variant.transform(input)
}

describe('fontVariants', () => {
  it('bold maps ASCII letters and digits to math bold', () => {
    expect(run('bold', 'Ab9')).toBe('\u{1D400}\u{1D41B}\u{1D7D7}')
  })

  it('script applies override for letters that have canonical glyphs', () => {
    expect(run('script', 'B')).toBe('\u212C')
    expect(run('script', 'e')).toBe('\u212F')
    expect(run('script', 'A')).toBe('\u{1D49C}')
  })

  it('double-struck applies overrides for C/H/N/P/Q/R/Z', () => {
    expect(run('double-struck', 'RxZ')).toBe('\u211D\u{1D569}\u2124')
  })

  it('full-width converts ASCII space and printable range', () => {
    expect(run('full-width', 'A ')).toBe('\uFF21\u3000')
  })

  it('circled converts letters and digits', () => {
    expect(run('circled', 'A1')).toBe('\u24B6\u2460')
    expect(run('circled', '0')).toBe('\u24EA')
  })

  it('upside-down reverses order and maps B to the real Deseret letter', () => {
    const out = run('upside-down', 'AB')
    expect(Array.from(out)).toEqual(['\u{10412}', '\u2200'])
  })

  it('upside-down handles mixed ASCII + punctuation without mojibake', () => {
    const out = run('upside-down', 'hi!')
    expect(Array.from(out)).toEqual(['\u00A1', '\u1D09', '\u0265'])
  })

  it('mirrored reverses order and maps uppercase E to reverse epsilon', () => {
    expect(run('mirrored', 'ME')).toBe('\u018EM')
  })

  it('small-caps preserves non-letters untouched', () => {
    expect(run('small-caps', 'Hi!')).toBe('\u029C\u026A!')
  })

  it('buildFontVariantResults returns every registered variant', () => {
    const results = buildFontVariantResults('A')
    expect(results.length).toBe(fontVariants.length)
    for (const r of results) {
      expect(typeof r.output).toBe('string')
    }
  })
})
