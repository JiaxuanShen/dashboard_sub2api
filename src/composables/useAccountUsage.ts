import { ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { Account, AccountUsageInfo } from '@/types/sub2api'

type AccountUsageApi = Pick<typeof dashboardApi, 'getAccountUsage'>

export function useAccountUsage(api: AccountUsageApi = dashboardApi) {
  const selectedAccount = ref<Account | null>(null)
  const usage = ref<AccountUsageInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  async function open(account: Account) {
    const currentRequestId = ++requestId
    selectedAccount.value = account
    usage.value = null
    error.value = null
    loading.value = true

    try {
      const result = await api.getAccountUsage(account.id)
      if (currentRequestId !== requestId) return
      usage.value = result
    } catch (err) {
      if (currentRequestId !== requestId) return
      error.value = err instanceof Error ? err.message : '加载账号用量失败'
    } finally {
      if (currentRequestId === requestId) loading.value = false
    }
  }

  function close() {
    requestId += 1
    selectedAccount.value = null
    usage.value = null
    error.value = null
    loading.value = false
  }

  return { selectedAccount, usage, loading, error, open, close }
}
