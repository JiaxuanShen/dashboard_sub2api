import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDashboardApi } from '@/api/dashboard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard api', () => {
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
})
