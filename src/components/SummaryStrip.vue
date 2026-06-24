<template>
  <dl class="summary-strip">
    <div v-for="(item, index) in items" :key="`${item.label}-${index}`" class="summary-strip__item">
      <dt class="summary-strip__label">{{ item.label }}</dt>
      <dd class="summary-strip__value">{{ item.value }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
defineProps<{ items: Array<{ label: string; value: string | number }> }>()
</script>
