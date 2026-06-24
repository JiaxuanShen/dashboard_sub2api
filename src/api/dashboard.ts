import { createApiClient, type FetchLike } from './client'
import type { Account, AccountUsageInfo, PaginatedResponse, UserSubscription } from '@/types/sub2api'

interface PageParams {
  page: number
  pageSize: number
  search?: string
}

interface SubscriptionParams extends PageParams {
  status?: 'active' | 'expired' | 'revoked' | ''
}

interface AccountParams extends PageParams {
  platform?: string
  type?: string
  status?: string
}

export function createDashboardApi(fetcher?: FetchLike) {
  const client = createApiClient(fetcher)

  return {
    listSubscriptions(params: SubscriptionParams) {
      return client.get<PaginatedResponse<UserSubscription>>('/dashboard-api/subscriptions', {
        params: {
          page: params.page,
          page_size: params.pageSize,
          status: params.status || undefined
        }
      })
    },
    listAccounts(params: AccountParams) {
      return client.get<PaginatedResponse<Account>>('/dashboard-api/accounts', {
        params: {
          page: params.page,
          page_size: params.pageSize,
          search: params.search,
          platform: params.platform,
          type: params.type,
          status: params.status
        }
      })
    },
    getAccountUsage(accountId: number) {
      return client.get<AccountUsageInfo>(`/dashboard-api/accounts/${accountId}/usage`)
    }
  }
}

export const dashboardApi = createDashboardApi()
