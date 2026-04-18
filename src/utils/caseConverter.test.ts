import { describe, expect, it } from 'vitest'
import { buildCaseConversionResults } from './caseConverter'

function pick(input: string, id: string) {
  const hit = buildCaseConversionResults(input).find(r => r.id === id)
  if (!hit) throw new Error(`case ${id} not found`)
  return hit.output
}

describe('buildCaseConversionResults', () => {
  it('handles basic upper/lower', () => {
    expect(pick('Hello World', 'uppercase')).toBe('HELLO WORLD')
    expect(pick('Hello World', 'lowercase')).toBe('hello world')
  })

  it('title-case capitalises each english word run (digits are boundaries)', () => {
    expect(pick('hello world from 2fa', 'title-case')).toBe('Hello World From 2Fa')
  })

  it('sentence-case starts sentences after . ! ?', () => {
    expect(pick('hello. again! ok?', 'sentence-case')).toBe('Hello. Again! Ok?')
  })

  it('toggle flips case', () => {
    expect(pick('Hello World', 'toggle-case')).toBe('hELLO wORLD')
  })

  it('camel/pascal collapse separators', () => {
    expect(pick("user's-full_name", 'camel-case')).toBe('userSFullName')
    expect(pick("user's-full_name", 'pascal-case')).toBe('UserSFullName')
  })

  it('snake/kebab/constant/dot join english words only', () => {
    expect(pick('Hello World 你好', 'snake-case')).toBe('hello_world')
    expect(pick('Hello World', 'kebab-case')).toBe('hello-world')
    expect(pick('Hello World', 'constant-case')).toBe('HELLO_WORLD')
    expect(pick('Hello World', 'dot-case')).toBe('hello.world')
  })

  it('returns empty compound output for purely non-english input', () => {
    expect(pick('你好 世界', 'camel-case')).toBe('')
    expect(pick('你好 世界', 'snake-case')).toBe('')
  })
})
