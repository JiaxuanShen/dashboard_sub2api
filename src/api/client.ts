export type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json' | 'text'>>

export interface RequestOptions {
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string | undefined>
}

export interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
}

export function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === 'object' && value !== null && 'code' in value && 'data' in value
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
  async function request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetcher(buildUrl(path, options.params), {
      method: method === 'GET' ? undefined : method,
      headers: {
        Accept: 'application/json',
        ...Object.fromEntries(Object.entries(options.headers ?? {}).filter(([, value]) => value !== undefined))
      }
    })
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    const payload = await response.json()
    if (isApiEnvelope<T>(payload)) {
      if (payload.code !== 0) throw new Error(`API 请求失败: ${payload.message || payload.code}`)
      return payload.data
    }

    return payload as T
  }

  return {
    get<T>(path: string, options: RequestOptions = {}) {
      return request<T>('GET', path, options)
    },
    post<T>(path: string, options: RequestOptions = {}) {
      return request<T>('POST', path, options)
    }
  }
}
