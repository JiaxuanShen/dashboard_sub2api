<template>
  <span :class="['status-badge', `status-badge--${tone}`]">{{ label }}</span>
</template>

<script setup lang="ts">
defineProps<{ label: string; tone: 'success' | 'warning' | 'danger' | 'muted' }>()
</script>
