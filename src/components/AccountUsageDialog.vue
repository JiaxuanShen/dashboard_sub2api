<template>
  <div v-if="account" class="modal-backdrop" @click.self="$emit('close')">
    <section class="usage-dialog" role="dialog" aria-modal="true" aria-label="账号用量详情">
      <header class="usage-dialog__head">
        <div>
          <p class="eyebrow">账号用量</p>
          <h2>{{ account.name }}</h2>
          <p>{{ platformLabel(account.platform) }} / {{ account.type }}</p>
        </div>
        <button class="icon-button" type="button" aria-label="关闭" @click="$emit('close')">×</button>
      </header>

      <div v-if="loading" class="dialog-state">正在加载用量...</div>
      <div v-else-if="error" class="error-banner" role="alert">{{ error }}</div>
      <div v-else class="usage-window-grid">
        <article v-for="window in windows" :key="window.key" class="usage-window">
          <header>
            <h3>{{ window.label }}</h3>
            <span>{{ window.percent }}%</span>
          </header>

          <UsageBar :label="window.shortLabel" :percent="window.percent" :amount="`${window.percent}%`" />

          <dl class="usage-metrics">
            <div>
              <dt>费用</dt>
              <dd>{{ window.cost }}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>{{ window.tokens }}</dd>
            </div>
            <div>
              <dt>请求</dt>
              <dd>{{ window.requests }}</dd>
            </div>
            <div>
              <dt>重置</dt>
              <dd>{{ window.resetsAt }}</dd>
            </div>
          </dl>

          <p v-if="!window.hasData" class="muted-text">暂无数据</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UsageBar from '@/components/UsageBar.vue'
import type { Account, AccountPlatform, AccountUsageInfo, UsageProgress } from '@/types/sub2api'
import { formatCurrency, formatDateOnly, formatTokens } from '@/utils/format'

const props = defineProps<{
  account: Account | null
  usage: AccountUsageInfo | null
  loading: boolean
  error: string | null
}>()

defineEmits<{ close: [] }>()

const platformLabels: Record<AccountPlatform, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
}

const platformLabel = (platform: AccountPlatform) => platformLabels[platform] ?? platform

const percent = (item: UsageProgress | null | undefined) => {
  const raw = item?.utilization
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  const normalized = raw <= 1 ? raw * 100 : raw
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

const windowView = (key: string, label: string, shortLabel: string, item: UsageProgress | null | undefined) => ({
  key,
  label,
  shortLabel,
  percent: percent(item),
  cost: formatCurrency(item?.window_stats?.cost),
  tokens: `${formatTokens(item?.window_stats?.tokens)} tokens`,
  requests: String(item?.window_stats?.requests ?? 0),
  resetsAt: formatDateOnly(item?.resets_at),
  hasData: Boolean(item),
})

const windows = computed(() => [
  windowView('five_hour', '5 小时窗口', '5h', props.usage?.five_hour),
  windowView('seven_day', '7 天窗口', '7d', props.usage?.seven_day),
])
</script>
