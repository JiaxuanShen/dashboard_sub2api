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

const revokedSubscription: UserSubscription = {
  ...activeSubscription,
  id: 2,
  user_id: 11,
  status: 'revoked',
  user: {
    id: 11,
    email: 'revoked@example.com',
    username: 'revoked-user',
  },
}

const dailyOnlySubscription: UserSubscription = {
  ...activeSubscription,
  id: 3,
  user_id: 12,
  daily_usage_usd: 7,
  weekly_usage_usd: null,
  monthly_usage_usd: null,
  user: {
    id: 12,
    email: 'daily@example.com',
    username: 'daily-user',
  },
  group: {
    id: 21,
    name: '日卡',
    daily_limit_usd: 20,
    weekly_limit_usd: null,
    monthly_limit_usd: null,
  },
}

const unlimitedSubscription: UserSubscription = {
  ...activeSubscription,
  id: 4,
  user_id: 13,
  daily_usage_usd: null,
  weekly_usage_usd: null,
  monthly_usage_usd: null,
  user: {
    id: 13,
    email: 'unlimited@example.com',
    username: 'unlimited-user',
  },
  group: {
    id: 22,
    name: '无限套餐',
    daily_limit_usd: null,
    weekly_limit_usd: null,
    monthly_limit_usd: null,
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

const inactiveOpenAiAccount: Account = {
  ...activeOpenAiAccount,
  id: 2,
  name: 'openai-paused',
  status: 'inactive',
}

describe('read-only dashboard tables', () => {
  it('renders an active subscription row', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [activeSubscription] } })

    expect(wrapper.text()).toContain('shevbing@hotmail.com')
    expect(wrapper.text()).toContain('企业月卡')
    expect(wrapper.text()).toContain('生效中')
  })

  it('renders revoked subscriptions as invalid without mutating labels', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [revokedSubscription] } })

    expect(wrapper.text()).toContain('revoked@example.com')
    expect(wrapper.text()).toContain('已失效')
    expect(wrapper.text()).not.toContain('撤销')
  })

  it('renders daily-only subscription usage without showing unlimited', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [dailyOnlySubscription] } })

    expect(wrapper.text()).toContain('每日')
    expect(wrapper.text()).not.toContain('无限制')
  })

  it('renders unlimited for subscriptions without usage limits', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [unlimitedSubscription] } })

    expect(wrapper.text()).toContain('无限制')
  })

  it('renders an active OpenAI OAuth account row', () => {
    const wrapper = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })

    expect(wrapper.text()).toContain('openai-main')
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('正常')
  })

  it('renders inactive account status', () => {
    const wrapper = mount(AccountTable, { props: { rows: [inactiveOpenAiAccount] } })

    expect(wrapper.text()).toContain('openai-paused')
    expect(wrapper.text()).toContain('停用')
  })

  it('does not render inert detail buttons in table components', () => {
    const subscription = mount(SubscriptionTable, {
      props: { rows: [activeSubscription] },
    })
    const account = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })

    expect(subscription.findAll('button')).toHaveLength(0)
    expect(account.findAll('button')).toHaveLength(0)
  })

  it('does not render mutating action labels', () => {
    const subscription = mount(SubscriptionTable, {
      props: { rows: [activeSubscription, revokedSubscription] },
    })
    const account = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })
    const combinedText = `${subscription.text()} ${account.text()}`

    expect(combinedText).not.toMatch(/编辑|删除|重置|撤销|分配/)
  })
})
