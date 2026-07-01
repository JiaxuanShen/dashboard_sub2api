<template>
  <section class="data-card" aria-label="账户列表">
    <div class="data-head account-grid">
      <span>账户</span>
      <span>平台</span>
      <span>容量</span>
      <span>配额</span>
      <span>状态</span>
      <span>调度</span>
      <span>到期</span>
      <span>用量</span>
    </div>

    <div v-for="row in rows" :key="row.id" class="data-row account-grid">
      <div class="identity-cell">
        <span class="avatar">{{ row.name.slice(0, 1).toUpperCase() }}</span>
        <span>
          <strong>{{ row.name }}</strong>
          <small>{{ accountMeta(row) }}</small>
        </span>
      </div>

      <div class="chip-stack">
        <span class="chip chip--green">{{ platformLabels[row.platform] }}</span>
        <span class="chip">{{ accountTypeLabel(row.type) }}</span>
      </div>

      <div class="metric-stack">
        <span>{{ capacityLabel(row) }}</span>
        <span v-if="costWindowLabel(row)">窗口 {{ costWindowLabel(row) }}</span>
        <span v-if="sessionLabel(row)">会话 {{ sessionLabel(row) }}</span>
        <span v-if="rpmLabel(row)">RPM {{ rpmLabel(row) }}</span>
      </div>
      <div class="usage-stack">
        <UsageBar
          v-if="hasQuota(row.quota_daily_limit)"
          label="每日"
          :percent="quotaPercent(row.quota_daily_used, row.quota_daily_limit)"
          :amount="quotaAmount(row.quota_daily_used, row.quota_daily_limit)"
        />
        <UsageBar
          v-if="hasQuota(row.quota_weekly_limit)"
          label="每周"
          :percent="quotaPercent(row.quota_weekly_used, row.quota_weekly_limit)"
          :amount="quotaAmount(row.quota_weekly_used, row.quota_weekly_limit)"
        />
        <UsageBar
          v-if="hasQuota(row.quota_limit)"
          label="总量"
          :percent="quotaPercent(row.quota_used, row.quota_limit)"
          :amount="quotaAmount(row.quota_used, row.quota_limit)"
        />
        <span v-if="!hasAnyQuota(row)" class="muted-text">-</span>
      </div>
      <StatusBadge :label="accountStatusLabel(row)" :tone="resolveAccountStatus(row).tone" />
      <ReadonlySwitch :model-value="row.schedulable" />
      <span>{{ formatDateOnly(row.expires_at) }}</span>
      <div class="usage-stack">
        <template v-if="usageByAccountId?.[row.id]">
          <div v-if="usageStatsLabel(usageByAccountId[row.id])" class="stats-line">
            {{ usageStatsLabel(usageByAccountId[row.id]) }}
          </div>
          <UsageBar label="5h" :percent="usagePercent(usageByAccountId[row.id]?.five_hour)" :amount="usageAmount(usageByAccountId[row.id]?.five_hour)" />
          <UsageBar label="7d" :percent="usagePercent(usageByAccountId[row.id]?.seven_day)" :amount="usageAmount(usageByAccountId[row.id]?.seven_day)" />
          <UsageBar
            v-if="usageByAccountId[row.id]?.seven_day_sonnet"
            label="7d S"
            :percent="usagePercent(usageByAccountId[row.id]?.seven_day_sonnet)"
            :amount="usageAmount(usageByAccountId[row.id]?.seven_day_sonnet)"
          />
        </template>
        <span v-else class="muted-text">{{ usageLoading ? '加载中' : '暂无数据' }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import ReadonlySwitch from '@/components/ReadonlySwitch.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import UsageBar from '@/components/UsageBar.vue'
import type { Account, AccountPlatform, AccountType, AccountUsageInfo, UsageProgress } from '@/types/sub2api'
import { resolveAccountStatus } from '@/utils/accountStatus'
import { formatCompactCount, formatCurrency, formatDateOnly } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

defineProps<{
  rows: Account[]
  usageByAccountId?: Record<number, AccountUsageInfo | null>
  usageLoading?: boolean
}>()

const platformLabels: Record<AccountPlatform, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
}

const typeLabels: Record<string, string> = {
  api_key: 'API Key',
  apikey: 'API Key',
  oauth: 'OAuth',
  'setup-token': 'Setup Token',
  upstream: 'Upstream',
  bedrock: 'Bedrock',
  service_account: 'Service Account',
}

const accountTypeLabel = (type: AccountType) => typeLabels[type] ?? type

const accountStatusLabels: Record<ReturnType<typeof resolveAccountStatus>['key'], string> = {
  overloaded: '过载中',
  rate_limited: '限流中',
  temp_unschedulable: '临时不可调度',
  error: '错误',
  unschedulable: '不可调度',
  inactive: '停用',
  active: '正常',
}

const accountStatusLabel = (account: Account) => accountStatusLabels[resolveAccountStatus(account).key]

const capacityLabel = (account: Account) => {
  const current = account.current_concurrency ?? 0
  return `${current}/${account.concurrency} 并发`
}

const accountMeta = (account: Account) => {
  const notes = account.notes?.trim()
  if (notes) return notes
  return `优先级 ${account.priority}`
}

const costWindowLabel = (account: Account) => {
  if (account.window_cost_limit == null) return ''
  return `${formatCurrency(account.current_window_cost)} / ${formatCurrency(account.window_cost_limit)}`
}

const sessionLabel = (account: Account) => {
  if (account.max_sessions == null) return ''
  return `${account.active_sessions ?? 0} / ${account.max_sessions}`
}

const rpmLabel = (account: Account) => {
  if (account.base_rpm == null) return ''
  return `${account.current_rpm ?? 0} / ${account.base_rpm}`
}

const hasQuota = (limit: number | null | undefined) => typeof limit === 'number' && Number.isFinite(limit) && limit > 0
const hasAnyQuota = (account: Account) => hasQuota(account.quota_daily_limit) || hasQuota(account.quota_weekly_limit) || hasQuota(account.quota_limit)
const quotaPercent = (used: number | null | undefined, limit: number | null | undefined) => progressPercent(used, limit).width
const quotaAmount = (used: number | null | undefined, limit: number | null | undefined) => `${used ?? 0} / ${limit ?? 0}`

const usagePercent = (item: UsageProgress | null | undefined) => {
  const raw = item?.utilization
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  const normalized = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

const usageAmount = (item: UsageProgress | null | undefined) => `${usagePercent(item)}%`

const usageStatsLabel = (usage: AccountUsageInfo | null | undefined) => {
  const stats = usage?.five_hour?.window_stats ?? usage?.seven_day?.window_stats ?? usage?.seven_day_sonnet?.window_stats
  if (!stats) return ''
  const parts = [
    `请求 ${formatCompactCount(stats.requests)}`,
    `Token ${formatCompactCount(stats.tokens)}`,
    `成本 ${formatCurrency(stats.cost)}`,
  ]
  if (stats.user_cost != null) parts.push(`用户 ${formatCurrency(stats.user_cost)}`)
  return parts.join(' · ')
}
</script>
