<template>
  <div class="usage-bar">
    <span class="usage-bar__label">{{ label }}</span>
    <span class="usage-bar__track"><span class="usage-bar__fill" :style="{ width: `${safePercent}%` }" /></span>
    <span class="usage-bar__amount">{{ amount }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ label: string; percent: number; amount: string }>()
const safePercent = computed(() => {
  if (!Number.isFinite(props.percent)) return 0
  return Math.max(0, Math.min(100, props.percent))
})
</script>
