import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AccountTable from '@/components/AccountTable.vue'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import type { Account, AccountUsageInfo, UserSubscription } from '@/types/sub2api'

const activeSubscription: UserSubscription = {
  id: 1,
  user_id: 10,
  group_id: 20,
  status: 'active',
  expires_at: '2026-07-24T00:00:00Z',
  weekly_usage_usd: 18,
  monthly_usage_usd: 62,
  weekly_window_start: '2026-06-29T00:00:00Z',
  monthly_window_start: '2026-07-01T00:00:00Z',
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
  current_window_cost: 12.5,
  window_cost_limit: 50,
  active_sessions: 3,
  max_sessions: 10,
  current_rpm: 12,
  base_rpm: 60,
  quota_daily_used: 120,
  quota_daily_limit: 500,
  quota_weekly_used: 700,
  quota_weekly_limit: 2000,
  quota_used: 1500,
  quota_limit: 10000,
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

const accountUsage: AccountUsageInfo = {
  source: 'active',
  updated_at: '2026-06-24T12:00:00Z',
  five_hour: {
    utilization: 0.42,
    resets_at: '2026-06-24T15:00:00Z',
    remaining_seconds: 7200,
    window_stats: null,
  },
  seven_day: {
    utilization: 91,
    resets_at: null,
    remaining_seconds: 0,
    window_stats: null,
  },
  seven_day_sonnet: null,
}

const accountUsageWithStats: AccountUsageInfo = {
  ...accountUsage,
  five_hour: {
    utilization: 0.42,
    resets_at: '2026-07-01T05:00:00Z',
    remaining_seconds: 18000,
    window_stats: {
      start_time: '2026-07-01T00:00:00Z',
      end_time: '2026-07-01T05:00:00Z',
      requests: 12450,
      input_tokens: 1000000,
      output_tokens: 250000,
      tokens: 1250000,
      cost: 8.75,
      user_cost: 9.5,
    },
  },
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

  it('renders subscription reset countdowns and expiry remaining days', () => {
    const wrapper = mount(SubscriptionTable, { props: { rows: [activeSubscription], now: new Date('2026-07-01T00:00:00Z').getTime() } })

    expect(wrapper.text()).toContain('每周')
    expect(wrapper.text()).toContain('$18.00 / $100.00')
    expect(wrapper.text()).toContain('5 天 0 小时后重置')
    expect(wrapper.text()).toContain('2026/07/24')
    expect(wrapper.text()).toContain('23 天剩余')
  })

  it('renders an active OpenAI OAuth account row with inline usage', () => {
    const wrapper = mount(AccountTable, {
      props: { rows: [activeOpenAiAccount], usageByAccountId: { 1: accountUsage }, usageLoading: false },
    })

    expect(wrapper.text()).toContain('openai-main')
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('正常')
    expect(wrapper.text()).toContain('5h')
    expect(wrapper.text()).toContain('42%')
    expect(wrapper.text()).toContain('7d')
    expect(wrapper.text()).toContain('91%')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('renders rich account capacity and compact usage windows without quota or spend stats', () => {
    const wrapper = mount(AccountTable, {
      props: {
        rows: [activeOpenAiAccount],
        usageByAccountId: { 1: accountUsageWithStats },
        usageLoading: false,
        now: new Date('2026-07-01T00:00:00Z').getTime(),
      },
    })

    expect(wrapper.text()).toContain('窗口 $12.50 / $50.00')
    expect(wrapper.text()).toContain('会话 3 / 10')
    expect(wrapper.text()).toContain('RPM 12 / 60')
    expect(wrapper.text()).toContain('用量窗口')
    expect(wrapper.text()).toContain('5h')
    expect(wrapper.text()).toContain('42%')
    expect(wrapper.text()).toContain('5 小时 0 分钟后重置')
    expect(wrapper.text()).not.toContain('配额')
    expect(wrapper.text()).not.toContain('每日')
    expect(wrapper.text()).not.toContain('120 / 500')
    expect(wrapper.text()).not.toContain('请求 12.5K')
    expect(wrapper.text()).not.toContain('Token 1.3M')
    expect(wrapper.text()).not.toContain('成本 $8.75')
    expect(wrapper.text()).not.toContain('用户 $9.50')
  })

  it('renders upstream account type aliases instead of blank chips', () => {
    const wrapper = mount(AccountTable, {
      props: { rows: [{ ...activeOpenAiAccount, type: 'setup-token' }] },
    })

    expect(wrapper.text()).toContain('Setup Token')
  })

  it('renders inactive account status', () => {
    const wrapper = mount(AccountTable, { props: { rows: [inactiveOpenAiAccount] } })

    expect(wrapper.text()).toContain('openai-paused')
    expect(wrapper.text()).toContain('停用')
  })

  it('does not render fake detail actions', () => {
    const subscription = mount(SubscriptionTable, {
      props: { rows: [activeSubscription] },
    })
    const account = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })

    expect(subscription.text()).not.toContain('详情')
    expect(account.text()).not.toContain('详情')
    expect(subscription.findAll('button')).toHaveLength(0)
    expect(account.findAll('button')).toHaveLength(0)
  })

  it('does not render mutating action labels', () => {
    const subscription = mount(SubscriptionTable, {
      props: { rows: [activeSubscription, revokedSubscription] },
    })
    const account = mount(AccountTable, { props: { rows: [activeOpenAiAccount] } })
    const combinedText = `${subscription.text()} ${account.text()}`

    expect(combinedText).not.toMatch(/编辑|删除|重置配额|撤销|分配|操作/)
  })
})
