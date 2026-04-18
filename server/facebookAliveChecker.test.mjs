import { describe, expect, it } from 'vitest'
import { normalizeInput } from './facebookAliveChecker.mjs'

describe('normalizeInput', () => {
  it('returns null for empty/whitespace input', () => {
    expect(normalizeInput('')).toBeNull()
    expect(normalizeInput('   ')).toBeNull()
    expect(normalizeInput(null)).toBeNull()
    expect(normalizeInput(undefined)).toBeNull()
  })

  it('detects bare numeric ids', () => {
    expect(normalizeInput('100057382914736')).toEqual({
      kind: 'id',
      id: '100057382914736',
    })
  })

  it('rejects numeric strings shorter than 5 digits as usernames', () => {
    const r = normalizeInput('1234')
    expect(r.kind).toBe('url')
    expect(r.url).toContain('facebook.com/1234')
  })

  it('extracts id from profile.php?id= URL', () => {
    expect(normalizeInput('https://www.facebook.com/profile.php?id=100012345678901')).toEqual({
      kind: 'id',
      id: '100012345678901',
    })
  })

  it('extracts id from /groups/{id}', () => {
    expect(normalizeInput('https://www.facebook.com/groups/123456789012345/')).toEqual({
      kind: 'id',
      id: '123456789012345',
    })
  })

  it('extracts id from single numeric path segment', () => {
    expect(normalizeInput('https://www.facebook.com/100011111111111')).toEqual({
      kind: 'id',
      id: '100011111111111',
    })
  })

  it('keeps vanity username as url', () => {
    const r = normalizeInput('https://www.facebook.com/zuck')
    expect(r.kind).toBe('url')
    expect(r.url).toBe('https://www.facebook.com/zuck')
  })

  it('rejects non-facebook hostnames with an invalid marker', () => {
    const r = normalizeInput('https://evil.example.com/groups/100012345678901')
    expect(r).toEqual({ kind: 'invalid', reason: expect.any(String) })
  })

  it('accepts subdomains of facebook.com', () => {
    const r = normalizeInput('https://m.facebook.com/profile.php?id=100012345678901')
    expect(r).toEqual({ kind: 'id', id: '100012345678901' })
  })

  it('accepts fb.watch hostnames', () => {
    const r = normalizeInput('https://fb.watch/abcdef/')
    expect(r.kind).toBe('url')
  })

  it('auto-prefixes bare facebook.com/... into https url', () => {
    const r = normalizeInput('facebook.com/zuck')
    expect(r.kind).toBe('url')
    expect(r.url).toBe('https://facebook.com/zuck')
  })

  it('treats unknown bare strings as usernames on facebook.com', () => {
    const r = normalizeInput('zuck')
    expect(r.kind).toBe('url')
    expect(r.url).toBe('https://www.facebook.com/zuck')
  })

  it('url-encodes usernames when synthesising facebook url', () => {
    const r = normalizeInput('Mark Zuckerberg')
    expect(r.url).toBe('https://www.facebook.com/Mark%20Zuckerberg')
  })
})
