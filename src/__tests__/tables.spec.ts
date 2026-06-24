import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AccountTable from '@/components/AccountTable.vue'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import type { Account, UserSubscription } from '@/types/sub2api'

const activeSubscription: UserSubscription = {
  id: 1,
  user_id: 10,
  group_id: 20,
  status: 'active',
  expires_at: '2026-07-24T00:00:00Z',
  weekly_usage_usd: 18,
  monthly_usage_usd: 62,
  user: {
    id: 10,
    email: 'shevbing@hotmail.com',
    username: 'shevbing',
  },
  group: {
    id: 20,
    name: '企业月卡',
    weekly_limit_usd: 100,
    monthly_limit_usd: 300,
  },
}

const activeOpenAiAccount: Account = {
  id: 1,
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

describe('read-only dashboard tables', () => {
  it('renders an active subscription row', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [activeSubscription] } })

    expect(wrapper.text()).toContain('shevbing@hotmail.com')
    expect(wrapper.text()).toContain('企业月卡')
    expect(wrapper.text()).toContain('生效中')
  })

  it('renders an active OpenAI OAuth account row', () => {
    const wrapper = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })

    expect(wrapper.text()).toContain('openai-main')
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('正常')
  })

  it('does not render mutating action labels', () => {
    const subscription = mount(SubscriptionTable, { props: { rows: [activeSubscription] } })
    const account = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })
    const combinedText = `${subscription.text()} ${account.text()}`

    expect(combinedText).not.toMatch(/编辑|删除|重置|撤销/)
  })
})
