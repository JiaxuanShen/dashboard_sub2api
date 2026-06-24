import type { Account } from '@/types/sub2api'

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted'

export interface AccountStatusView {
  key: 'overloaded' | 'rate_limited' | 'temp_unschedulable' | 'error' | 'unschedulable' | 'inactive' | 'active'
  label: string
  tone: StatusTone
  detail?: string
}

const isFuture = (value: string | null | undefined): boolean => {
  if (!value) return false
  return new Date(value).getTime() > Date.now()
}

export function resolveAccountStatus(account: Account): AccountStatusView {
  if (isFuture(account.overload_until)) {
    return { key: 'overloaded', label: '过载中', tone: 'danger', detail: account.overload_until ?? undefined }
  }
  if (isFuture(account.rate_limit_reset_at)) {
    return { key: 'rate_limited', label: '限流中', tone: 'warning', detail: account.rate_limit_reset_at ?? undefined }
  }
  if (isFuture(account.temp_unschedulable_until)) {
    return { key: 'temp_unschedulable', label: '临时不可调度', tone: 'warning', detail: account.temp_unschedulable_until ?? undefined }
  }
  if (account.status === 'error') {
    return { key: 'error', label: '错误', tone: 'danger', detail: account.error_message ?? undefined }
  }
  if (!account.schedulable) {
    return { key: 'unschedulable', label: '不可调度', tone: 'muted' }
  }
  if (account.status === 'inactive') {
    return { key: 'inactive', label: '停用', tone: 'muted' }
  }
  return { key: 'active', label: '正常', tone: 'success' }
}
