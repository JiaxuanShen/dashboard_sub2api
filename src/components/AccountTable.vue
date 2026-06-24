<template>
  <section class="data-card" aria-label="账户列表">
    <div class="data-head account-grid">
      <span>账户</span>
      <span>平台</span>
      <span>容量</span>
      <span>状态</span>
      <span>调度</span>
      <span>到期</span>
      <span>操作</span>
    </div>

    <div v-for="row in rows" :key="row.id" class="data-row account-grid">
      <div class="identity-cell">
        <span class="avatar">{{ row.name.slice(0, 1).toUpperCase() }}</span>
        <span>
          <strong>{{ row.name }}</strong>
          <small>优先级 {{ row.priority }}</small>
        </span>
      </div>

      <div class="chip-stack">
        <span class="chip chip--green">{{ platformLabels[row.platform] }}</span>
        <span class="chip">{{ accountTypeLabel(row.type) }}</span>
      </div>

      <span>{{ capacityLabel(row) }}</span>
      <StatusBadge :label="accountStatusLabel(row)" :tone="resolveAccountStatus(row).tone" />
      <ReadonlySwitch :model-value="row.schedulable" />
      <span>{{ formatDateOnly(row.expires_at) }}</span>
      <span class="readonly-action">详情</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import ReadonlySwitch from '@/components/ReadonlySwitch.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import type { Account, AccountPlatform, AccountType } from '@/types/sub2api'
import { resolveAccountStatus } from '@/utils/accountStatus'
import { formatDateOnly } from '@/utils/format'

defineProps<{ rows: Account[] }>()

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
</script>
