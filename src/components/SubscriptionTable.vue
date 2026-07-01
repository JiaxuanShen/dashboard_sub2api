<template>
  <section class="data-card" aria-label="订阅列表">
    <div class="data-head subscription-grid">
      <span>用户</span>
      <span>套餐</span>
      <span>用量窗口</span>
      <span>到期时间</span>
      <span>状态</span>
    </div>

    <div v-for="row in rows" :key="row.id" class="data-row subscription-grid">
      <div class="identity-cell">
        <span class="avatar">{{ userInitial(row) }}</span>
        <span>
          <strong>{{ userLabel(row) }}</strong>
          <small>ID {{ row.user_id }}</small>
        </span>
      </div>

      <div>
        <span class="chip chip--green">{{ row.group?.name ?? `Group ${row.group_id}` }}</span>
        <small v-if="row.group?.subscription_type">{{ row.group.subscription_type }}</small>
      </div>

      <div class="usage-stack">
        <UsageBar
          v-if="hasLimit(row.group?.daily_limit_usd)"
          label="每日"
          :percent="progressPercent(row.daily_usage_usd, row.group?.daily_limit_usd).width"
          :amount="usageAmount(row.daily_usage_usd, row.group?.daily_limit_usd)"
        />
        <small v-if="hasLimit(row.group?.daily_limit_usd)" class="reset-text">
          {{ resetText(row.daily_window_start, 'daily') }}
        </small>
        <UsageBar
          v-if="hasLimit(row.group?.weekly_limit_usd)"
          label="每周"
          :percent="progressPercent(row.weekly_usage_usd, row.group?.weekly_limit_usd).width"
          :amount="usageAmount(row.weekly_usage_usd, row.group?.weekly_limit_usd)"
        />
        <small v-if="hasLimit(row.group?.weekly_limit_usd)" class="reset-text">
          {{ resetText(row.weekly_window_start, 'weekly') }}
        </small>
        <UsageBar
          v-if="hasLimit(row.group?.monthly_limit_usd)"
          label="每月"
          :percent="progressPercent(row.monthly_usage_usd, row.group?.monthly_limit_usd).width"
          :amount="usageAmount(row.monthly_usage_usd, row.group?.monthly_limit_usd)"
        />
        <small v-if="hasLimit(row.group?.monthly_limit_usd)" class="reset-text">
          {{ resetText(row.monthly_window_start, 'monthly') }}
        </small>
        <span v-if="!hasUsageLimit(row)" class="muted-text">无限制</span>
      </div>

      <span class="date-stack">
        <strong>{{ formatDateOnly(row.expires_at) }}</strong>
        <small>{{ formatDaysUntil(row.expires_at, now) }}</small>
      </span>
      <StatusBadge :label="subscriptionStatus[row.status].label" :tone="subscriptionStatus[row.status].tone" />
    </div>
  </section>
</template>

<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import UsageBar from '@/components/UsageBar.vue'
import type { UserSubscription } from '@/types/sub2api'
import { formatCurrency, formatDateOnly, formatDaysUntil, formatDurationUntil } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

const props = defineProps<{ rows: UserSubscription[]; now?: number }>()

const subscriptionStatus = {
  active: { label: '生效中', tone: 'success' },
  expired: { label: '已过期', tone: 'muted' },
  revoked: { label: '已失效', tone: 'danger' },
} as const

const hasLimit = (limit: number | null | undefined) => typeof limit === 'number' && Number.isFinite(limit) && limit > 0

const hasUsageLimit = (row: UserSubscription) =>
  hasLimit(row.group?.daily_limit_usd) ||
  hasLimit(row.group?.weekly_limit_usd) ||
  hasLimit(row.group?.monthly_limit_usd)

const usageAmount = (used: number | null | undefined, limit: number | null | undefined) =>
  `${formatCurrency(used)} / ${formatCurrency(limit)}`

const windowMs = {
  daily: 86_400_000,
  weekly: 7 * 86_400_000,
  monthly: 30 * 86_400_000,
} as const

const resetText = (start: string | null | undefined, window: keyof typeof windowMs) => {
  if (!start) return '-'
  const startMs = new Date(start).getTime()
  if (!Number.isFinite(startMs)) return '-'
  return formatDurationUntil(new Date(startMs + windowMs[window]).toISOString(), props.now)
}

const userLabel = (row: UserSubscription) => row.user?.email || row.user?.username || `User ${row.user_id}`

const userInitial = (row: UserSubscription) => userLabel(row).trim().slice(0, 1).toUpperCase()
</script>
