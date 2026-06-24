import { describe, expect, it } from 'vitest'
import { resolveAccountStatus } from '@/utils/accountStatus'
import type { Account } from '@/types/sub2api'

const baseAccount: Account = {
  id: 1,
  name: 'openai-main',
  platform: 'openai',
  type: 'oauth',
  status: 'active',
  schedulable: true,
  error_message: null,
  rate_limit_reset_at: null,
  overload_until: null,
  temp_unschedulable_until: null,
  expires_at: null,
  auto_pause_on_expired: false,
  concurrency: 20,
  priority: 0,
  proxy_id: null,
  created_at: '2026-06-24T00:00:00Z',
  updated_at: '2026-06-24T00:00:00Z',
  last_used_at: null,
  rate_limited_at: null,
  temp_unschedulable_reason: null,
  session_window_start: null,
  session_window_end: null,
  session_window_status: null
}

describe('resolveAccountStatus', () => {
  it('prioritizes overloaded over all other account states', () => {
    const result = resolveAccountStatus({
      ...baseAccount,
      status: 'error',
      schedulable: false,
      overload_until: '2099-01-01T00:00:00Z',
      rate_limit_reset_at: '2099-01-01T00:00:00Z'
    })
    expect(result.key).toBe('overloaded')
    expect(result.label).toBe('过载中')
  })

  it('shows rate limited before temporary unschedulable', () => {
    const result = resolveAccountStatus({
      ...baseAccount,
      rate_limit_reset_at: '2099-01-01T00:00:00Z',
      temp_unschedulable_until: '2099-01-01T00:00:00Z'
    })
    expect(result.key).toBe('rate_limited')
  })

  it('shows unschedulable when active account is not schedulable', () => {
    const result = resolveAccountStatus({ ...baseAccount, schedulable: false })
    expect(result.key).toBe('unschedulable')
    expect(result.label).toBe('不可调度')
  })

  it('shows active for healthy schedulable account', () => {
    const result = resolveAccountStatus(baseAccount)
    expect(result.key).toBe('active')
    expect(result.tone).toBe('success')
  })
})
