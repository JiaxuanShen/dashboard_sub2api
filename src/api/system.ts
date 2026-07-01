import { createApiClient, type FetchLike } from './client'

export interface VersionInfo {
  current_version: string
  latest_version: string
  has_update: boolean
  warning?: string
  release_info?: {
    name: string
    body: string
    published_at: string
    html_url: string
  }
}

export interface UpdateResult {
  message: string
  need_restart?: boolean
  backup_dir?: string
  latest_version?: string
}

export function createSystemApi(fetcher?: FetchLike, getUpdateKey: () => string = () => '') {
  const client = createApiClient(fetcher)
  const authHeaders = () => ({ 'x-dashboard-update-key': getUpdateKey() })

  return {
    getVersion() {
      return client.get<{ version: string }>('/dashboard-system/version', { headers: authHeaders() })
    },
    checkUpdates(force = false) {
      return client.get<VersionInfo>('/dashboard-system/check-updates', {
        params: { force: force || undefined },
        headers: authHeaders()
      })
    },
    update() {
      return client.post<UpdateResult>('/dashboard-system/update', { headers: authHeaders() })
    },
    restart() {
      return client.post<UpdateResult>('/dashboard-system/restart', { headers: authHeaders() })
    },
    rollback() {
      return client.post<UpdateResult>('/dashboard-system/rollback', { headers: authHeaders() })
    }
  }
}

export const systemApi = createSystemApi()
