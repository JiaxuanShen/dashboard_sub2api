import { computed, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { Account, AccountUsageInfo, UserSubscription } from '@/types/sub2api'

type DashboardApi = Pick<typeof dashboardApi, 'listSubscriptions' | 'listAccounts' | 'getAccountUsage'>

export function useDashboardData(api: DashboardApi = dashboardApi) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const subscriptions = ref<UserSubscription[]>([])
  const accounts = ref<Account[]>([])
  const accountUsages = ref<Record<number, AccountUsageInfo | null>>({})
  const subscriptionTotal = ref(0)
  const accountTotal = ref(0)
  let requestId = 0

  const summary = computed(() => ({
    subscriptions: subscriptionTotal.value,
    accounts: accountTotal.value,
  }))

  async function refreshAll() {
    const currentRequestId = ++requestId
    loading.value = true
    error.value = null
    try {
      const [subscriptionPage, accountPage] = await Promise.all([
        api.listSubscriptions({ page: 1, pageSize: 50, status: 'active' }),
        api.listAccounts({ page: 1, pageSize: 50 }),
      ])
      if (currentRequestId !== requestId) return

      const usageEntries = await Promise.all(
        accountPage.items.map(async (account) => {
          try {
            return [account.id, await api.getAccountUsage(account.id)] as const
          } catch {
            return [account.id, null] as const
          }
        })
      )
      if (currentRequestId !== requestId) return

      subscriptions.value = subscriptionPage.items
      accounts.value = accountPage.items
      accountUsages.value = Object.fromEntries(usageEntries)
      subscriptionTotal.value = subscriptionPage.total
      accountTotal.value = accountPage.total
    } catch (err) {
      if (currentRequestId !== requestId) return

      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  return { loading, error, subscriptions, accounts, accountUsages, summary, refreshAll }
}
