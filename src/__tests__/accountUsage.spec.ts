import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AccountTable from '@/components/AccountTable.vue'
import AccountUsageDialog from '@/components/AccountUsageDialog.vue'
import { useAccountUsage } from '@/composables/useAccountUsage'
import type { Account, AccountUsageInfo } from '@/types/sub2api'

const account: Account = {
  id: 42,
  name: 'openai-main',
  platform: 'openai',
  type: 'oauth',
  proxy_id: null,
  concurrency: 8,
  current_concurrency: 2,
  priority: 10,
  status: 'active',
  error_message: null,
  last_used_at: null,
  expires_at: 1782432000,
  auto_pause_on_expired: true,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-10T00:00:00Z',
  schedulable: true,
  rate_limited_at: null,
  rate_limit_reset_at: null,
  overload_until: null,
  temp_unschedulable_until: null,
  temp_unschedulable_reason: null,
  session_window_start: null,
  session_window_end: null,
  session_window_status: 'allowed',
}

const usage: AccountUsageInfo = {
  source: 'active',
  updated_at: '2026-06-24T12:00:00Z',
  five_hour: {
    utilization: 0.42,
    resets_at: '2026-06-24T15:00:00Z',
    remaining_seconds: 7200,
    window_stats: {
      start_time: '2026-06-24T10:00:00Z',
      end_time: '2026-06-24T15:00:00Z',
      requests: 12,
      input_tokens: 1000,
      output_tokens: 2000,
      tokens: 3000,
      cost: 1.25,
    },
  },
  seven_day: null,
  seven_day_sonnet: {
    utilization: 0.91,
    resets_at: null,
    remaining_seconds: 0,
    window_stats: null,
  },
}

describe('account usage details', () => {
  it('emits the selected account when the account detail button is clicked', async () => {
    const wrapper = mount(AccountTable, { props: { rows: [account] } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select-usage')).toEqual([[account]])
  })

  it('loads usage for the selected account and resets state on close', async () => {
    const api = { getAccountUsage: vi.fn().mockResolvedValue(usage) }
    const state = useAccountUsage(api)

    const request = state.open(account)

    expect(state.selectedAccount.value).toEqual(account)
    expect(state.loading.value).toBe(true)
    expect(api.getAccountUsage).toHaveBeenCalledWith(42)

    await request

    expect(state.usage.value).toEqual(usage)
    expect(state.error.value).toBeNull()
    expect(state.loading.value).toBe(false)

    state.close()

    expect(state.selectedAccount.value).toBeNull()
    expect(state.usage.value).toBeNull()
  })

  it('renders account usage windows as a read-only dialog', () => {
    const wrapper = mount(AccountUsageDialog, {
      props: { account, usage, loading: false, error: null },
    })

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('账号用量详情')
    expect(wrapper.text()).toContain('openai-main')
    expect(wrapper.text()).toContain('5 小时窗口')
    expect(wrapper.text()).toContain('42%')
    expect(wrapper.text()).toContain('$1.25')
    expect(wrapper.text()).toContain('3.0K tokens')
    expect(wrapper.text()).toContain('7 天窗口')
    expect(wrapper.text()).not.toContain('Sonnet 7 天')
    expect(wrapper.text()).not.toContain('91%')
    expect(wrapper.text()).toContain('暂无数据')
  })
})
