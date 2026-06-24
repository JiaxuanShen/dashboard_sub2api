import { computed, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { Account, PaginatedResponse, UserSubscription } from '@/types/sub2api'

type DashboardApi = Pick<typeof dashboardApi, 'listSubscriptions' | 'listAccounts' | 'getAccountUsage'>

export function useDashboardData(api: DashboardApi = dashboardApi) {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const subscriptions = ref<UserSubscription[]>([])
  const accounts = ref<Account[]>([])
  const subscriptionTotal = ref(0)
  const accountTotal = ref(0)

  const summary = computed(() => ({
    subscriptions: subscriptionTotal.value,
    accounts: accountTotal.value
  }))

  async function refreshAll() {
    loading.value = true
    error.value = null
    try {
      const [subscriptionPage, accountPage]: [PaginatedResponse<UserSubscription>, PaginatedResponse<Account>] =
        await Promise.all([
          api.listSubscriptions({ page: 1, pageSize: 50, status: 'active' }),
          api.listAccounts({ page: 1, pageSize: 50 })
        ])
      subscriptions.value = subscriptionPage.items
      accounts.value = accountPage.items
      subscriptionTotal.value = subscriptionPage.total
      accountTotal.value = accountPage.total
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, subscriptions, accounts, summary, refreshAll }
}
