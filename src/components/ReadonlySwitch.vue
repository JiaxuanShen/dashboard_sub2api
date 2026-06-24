<template>
  <span
    :class="['readonly-switch', { 'readonly-switch--on': modelValue }]"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="modelValue ? '调度已开启' : '调度已关闭'"
  />
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
</script>
