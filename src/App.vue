<template>
  <div class="dashboard-shell">
    <main class="workspace">
      <header class="toolbar">
        <div class="brand brand--top">
          <span class="brand-mark">s2</span>
          <span>
            <strong>sub2api Dashboard</strong>
            <small>只读运维面板</small>
          </span>
        </div>

        <button class="refresh-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </header>

      <UpdatePanel />

      <div v-if="error" class="error-banner" role="alert">
        {{ error }}
      </div>

      <section class="section-stack" aria-label="Dashboard data">
        <SummaryStrip :items="summaryItems" />
        <SubscriptionTable :rows="subscriptions" />
        <AccountTable :rows="accounts" :usage-by-account-id="accountUsages" :usage-loading="loading" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AccountTable from '@/components/AccountTable.vue'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import SummaryStrip from '@/components/SummaryStrip.vue'
import UpdatePanel from '@/components/UpdatePanel.vue'
import { useDashboardData } from '@/composables/useDashboardData'

const { loading, error, subscriptions, accounts, accountUsages, summary, refreshAll } = useDashboardData()

const summaryItems = computed(() => [
  { label: '生效订阅', value: summary.value.subscriptions },
  { label: '总账号', value: summary.value.accounts },
])

onMounted(() => {
  void refreshAll()
})
</script>
