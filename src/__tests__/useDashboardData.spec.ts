import { describe, expect, it, vi } from 'vitest'
import { useDashboardData } from '@/composables/useDashboardData'

describe('useDashboardData', () => {
  const subscription = {
    id: 1,
    user_id: 1,
    account_id: 1,
    model_name: 'gpt-4o',
    daily_limit: 100,
    tokens_used: 10,
    reset_time: '2026-06-24T00:00:00Z',
    status: 'active' as const,
    created_at: '2026-06-24T00:00:00Z',
    updated_at: '2026-06-24T00:00:00Z'
  }

  const account = {
    id: 1,
    name: 'Primary',
    platform: 'openai',
    api_key: 'sk-test',
    status: 'active' as const,
    created_at: '2026-06-24T00:00:00Z',
    updated_at: '2026-06-24T00:00:00Z'
  }

  function page<T>(items: T[], total = items.length) {
    return { items, total, page: 1, page_size: 50, total_pages: 1 }
  }

  it('loads active subscriptions and accounts into state', async () => {
    const api = {
      listSubscriptions: vi.fn().mockResolvedValue(page([subscription], 3)),
      listAccounts: vi.fn().mockResolvedValue(page([account], 2))
    }
    const state = useDashboardData(api)

    await state.refreshAll()

    expect(api.listSubscriptions).toHaveBeenCalledWith({ page: 1, pageSize: 50, status: 'active' })
    expect(api.listAccounts).toHaveBeenCalledWith({ page: 1, pageSize: 50 })
    expect(state.subscriptions.value).toEqual([subscription])
    expect(state.accounts.value).toEqual([account])
    expect(state.summary.value).toEqual({ subscriptions: 3, accounts: 2 })
    expect(state.error.value).toBeNull()
    expect(state.loading.value).toBe(false)
  })

  it('sets error and clears loading when refresh fails', async () => {
    const api = {
      listSubscriptions: vi.fn().mockRejectedValue(new Error('network down')),
      listAccounts: vi.fn().mockResolvedValue(page([]))
    }
    const state = useDashboardData(api)

    const refresh = state.refreshAll()

    expect(state.loading.value).toBe(true)
    await refresh

    expect(state.error.value).toBe('network down')
    expect(state.loading.value).toBe(false)
  })

  it('keeps latest refresh data when an older request resolves last', async () => {
    let resolveOldSubscriptions!: (value: ReturnType<typeof page<typeof subscription>>) => void
    let resolveOldAccounts!: (value: ReturnType<typeof page<typeof account>>) => void

    const oldSubscriptionRequest = new Promise<ReturnType<typeof page<typeof subscription>>>((resolve) => {
      resolveOldSubscriptions = resolve
    })
    const oldAccountRequest = new Promise<ReturnType<typeof page<typeof account>>>((resolve) => {
      resolveOldAccounts = resolve
    })

    const latestSubscription = { ...subscription, id: 2, model_name: 'gpt-4.1' }
    const latestAccount = { ...account, id: 2, name: 'Latest' }
    const oldSubscription = { ...subscription, id: 3, model_name: 'stale' }
    const oldAccount = { ...account, id: 3, name: 'Stale' }

    const api = {
      listSubscriptions: vi
        .fn()
        .mockReturnValueOnce(oldSubscriptionRequest)
        .mockResolvedValueOnce(page([latestSubscription], 7)),
      listAccounts: vi.fn().mockReturnValueOnce(oldAccountRequest).mockResolvedValueOnce(page([latestAccount], 5))
    }
    const state = useDashboardData(api)

    const oldRefresh = state.refreshAll()
    const latestRefresh = state.refreshAll()

    await latestRefresh

    expect(state.loading.value).toBe(false)
    expect(state.subscriptions.value).toEqual([latestSubscription])
    expect(state.accounts.value).toEqual([latestAccount])
    expect(state.summary.value).toEqual({ subscriptions: 7, accounts: 5 })

    resolveOldSubscriptions(page([oldSubscription], 1))
    resolveOldAccounts(page([oldAccount], 1))
    await oldRefresh

    expect(state.loading.value).toBe(false)
    expect(state.subscriptions.value).toEqual([latestSubscription])
    expect(state.accounts.value).toEqual([latestAccount])
    expect(state.summary.value).toEqual({ subscriptions: 7, accounts: 5 })
  })
})
