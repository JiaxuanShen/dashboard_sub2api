<template>
  <div class="dashboard-shell">
    <aside class="sidebar" aria-label="Dashboard 导航">
      <div class="brand">
        <span class="brand-mark">s2</span>
        <span>
          <strong>sub2api</strong>
          <small>只读 Dashboard</small>
        </span>
      </div>

      <nav class="nav" aria-label="只读区域">
        <span class="nav-item nav-item--active">概览</span>
        <span class="nav-item">订阅管理</span>
        <span class="nav-item">账户管理</span>
        <span class="nav-item">用量记录</span>
      </nav>
    </aside>

    <main class="workspace">
      <header class="toolbar">
        <div>
          <p class="eyebrow">运维浏览</p>
          <h1>sub2api Dashboard</h1>
          <p>查看订阅用量、账户状态和总账户容量。</p>
        </div>

        <button class="refresh-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </header>

      <div v-if="error" class="error-banner" role="alert">
        {{ error }}
      </div>

      <section class="section-stack" aria-label="Dashboard data">
        <SummaryStrip :items="summaryItems" />
        <SubscriptionTable :rows="subscriptions" />
        <AccountTable :rows="accounts" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AccountTable from '@/components/AccountTable.vue'
import SubscriptionTable from '@/components/SubscriptionTable.vue'
import SummaryStrip from '@/components/SummaryStrip.vue'
import { useDashboardData } from '@/composables/useDashboardData'

const { loading, error, subscriptions, accounts, summary, refreshAll } = useDashboardData()

const summaryItems = computed(() => [
  { label: '生效订阅', value: summary.value.subscriptions },
  { label: '总账户', value: summary.value.accounts },
])

onMounted(() => {
  void refreshAll()
})
</script>
