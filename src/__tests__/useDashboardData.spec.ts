import { describe, expect, it, vi } from 'vitest'
import { useDashboardData } from '@/composables/useDashboardData'

describe('useDashboardData', () => {
  it('loads subscriptions and accounts without write calls', async () => {
    const api = {
      listSubscriptions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      listAccounts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
      getAccountUsage: vi.fn()
    }
    const state = useDashboardData(api)

    await state.refreshAll()

    expect(api.listSubscriptions).toHaveBeenCalled()
    expect(api.listAccounts).toHaveBeenCalled()
    expect(state.error.value).toBeNull()
  })
})
