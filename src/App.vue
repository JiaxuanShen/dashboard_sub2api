<template>
  <div class="dashboard-shell">
    <aside class="sidebar" aria-label="Dashboard navigation">
      <div class="brand">
        <span class="brand-mark">s2</span>
        <span>
          <strong>sub2api</strong>
          <small>Read-only dashboard</small>
        </span>
      </div>

      <nav class="nav" aria-label="Read-only sections">
        <span class="nav-item nav-item--active">Overview</span>
        <span class="nav-item">Subscriptions</span>
        <span class="nav-item">Accounts</span>
        <span class="nav-item">Usage</span>
      </nav>
    </aside>

    <main class="workspace">
      <header class="toolbar">
        <div>
          <p class="eyebrow">Operations</p>
          <h1>Dashboard</h1>
          <p>Monitor active subscriptions and connected account capacity.</p>
        </div>

        <button class="refresh-button" type="button" :disabled="loading" @click="refreshAll">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
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
  { label: 'Active subscriptions', value: summary.value.subscriptions },
  { label: 'Accounts', value: summary.value.accounts },
])

onMounted(() => {
  void refreshAll()
})
</script>
