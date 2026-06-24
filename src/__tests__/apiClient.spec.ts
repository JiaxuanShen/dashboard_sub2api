import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '@/api/client'
import { createDashboardApi } from '@/api/dashboard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard api', () => {
  it('appends params to paths that already include a query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    })
    const api = createApiClient(fetchMock)

    await api.get('/dashboard-api/subscriptions?existing=1', { params: { page: 2 } })

    expect(fetchMock).toHaveBeenCalledWith('/dashboard-api/subscriptions?existing=1&page=2', {
      headers: { Accept: 'application/json' }
    })
  })

  it('loads subscriptions from the dashboard proxy path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 })
    })
    const api = createDashboardApi(fetchMock)

    await api.listSubscriptions({ page: 1, pageSize: 20, status: 'active' })

    expect(fetchMock).toHaveBeenCalledWith('/dashboard-api/subscriptions?page=1&page_size=20&status=active', {
      headers: { Accept: 'application/json' }
    })
  })

  it('throws a readable error when proxy returns non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'invalid token'
    })
    const api = createDashboardApi(fetchMock)

    await expect(api.listAccounts({ page: 1, pageSize: 20 })).rejects.toThrow('API 请求失败: 401 Unauthorized')
  })

  it('unwraps successful Sub2API envelopes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        message: 'success',
        data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }
      })
    })
    const api = createDashboardApi(fetchMock)

    await expect(api.listAccounts({ page: 1, pageSize: 20 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    })
  })

  it('throws the Sub2API message when an envelope reports failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 401,
        message: 'INVALID_ADMIN_KEY',
        data: null
      })
    })
    const api = createDashboardApi(fetchMock)

    await expect(api.listAccounts({ page: 1, pageSize: 20 })).rejects.toThrow('API 请求失败: INVALID_ADMIN_KEY')
  })
})
