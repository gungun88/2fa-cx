export interface FacebookAliveResult {
  ok: boolean
  status: number
  alive: boolean
  input: string
  id?: string
  url?: string
  reason?: string
  error?: string
  transient?: boolean
}

export async function checkFacebookAlive(
  input: string,
  signal?: AbortSignal
): Promise<FacebookAliveResult> {
  try {
    const response = await fetch(`/api/facebook/check?input=${encodeURIComponent(input)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    })

    const data = (await response.json()) as FacebookAliveResult
    return { ...data, input: data.input ?? input }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw error
    }
    return {
      ok: false,
      status: 502,
      alive: false,
      input,
      error: '\u65e0\u6cd5\u8fde\u63a5\u68c0\u6d4b\u670d\u52a1',
    }
  }
}
