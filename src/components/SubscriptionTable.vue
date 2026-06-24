<template>
  <section class="data-card" aria-label="订阅列表">
    <div class="data-head subscription-grid">
      <span>用户</span>
      <span>套餐</span>
      <span>用量</span>
      <span>到期</span>
      <span>状态</span>
      <span>操作</span>
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
          v-if="hasLimit(row.group?.weekly_limit_usd)"
          label="周"
          :percent="progressPercent(row.weekly_usage_usd, row.group?.weekly_limit_usd).width"
          :amount="usageAmount(row.weekly_usage_usd, row.group?.weekly_limit_usd)"
        />
        <UsageBar
          v-if="hasLimit(row.group?.monthly_limit_usd)"
          label="月"
          :percent="progressPercent(row.monthly_usage_usd, row.group?.monthly_limit_usd).width"
          :amount="usageAmount(row.monthly_usage_usd, row.group?.monthly_limit_usd)"
        />
        <span v-if="!hasUsageLimit(row)" class="muted-text">无限制</span>
      </div>

      <span>{{ formatDateOnly(row.expires_at) }}</span>
      <StatusBadge :label="subscriptionStatus[row.status].label" :tone="subscriptionStatus[row.status].tone" />
      <button class="link-button" type="button">详情</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import UsageBar from '@/components/UsageBar.vue'
import type { UserSubscription } from '@/types/sub2api'
import { formatCurrency, formatDateOnly } from '@/utils/format'
import { progressPercent } from '@/utils/usage'

defineProps<{ rows: UserSubscription[] }>()

const subscriptionStatus = {
  active: { label: '生效中', tone: 'success' },
  expired: { label: '已过期', tone: 'muted' },
  revoked: { label: '已撤销', tone: 'danger' },
} as const

const hasLimit = (limit: number | null | undefined) => typeof limit === 'number' && Number.isFinite(limit) && limit > 0

const hasUsageLimit = (row: UserSubscription) =>
  hasLimit(row.group?.weekly_limit_usd) || hasLimit(row.group?.monthly_limit_usd)

const usageAmount = (used: number | null | undefined, limit: number | null | undefined) =>
  `${formatCurrency(used)} / ${formatCurrency(limit)}`

const userLabel = (row: UserSubscription) => row.user?.email || row.user?.username || `User ${row.user_id}`

const userInitial = (row: UserSubscription) => userLabel(row).trim().slice(0, 1).toUpperCase()
</script>
