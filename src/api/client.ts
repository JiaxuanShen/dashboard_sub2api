export type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json' | 'text'>>

export interface RequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>
}

const buildUrl = (path: string, params?: RequestOptions['params']) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path
}

export function createApiClient(fetcher: FetchLike = fetch) {
  async function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetcher(buildUrl(path, options.params), {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  return { get }
}
