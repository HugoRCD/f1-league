<script setup lang="ts">
defineProps<{
  hasResult: boolean
  locked: boolean
  open: boolean
}>()
</script>

<template>
  <UBadge v-if="hasResult" color="success" variant="subtle" size="sm">
    <UIcon name="i-lucide-flag-triangle-right" class="size-3 mr-1" />
    Completed
  </UBadge>
  <UBadge v-else-if="locked" color="warning" variant="subtle" size="sm">
    <UIcon name="i-lucide-lock" class="size-3 mr-1" />
    Locked
  </UBadge>
  <UBadge v-else-if="open" color="info" variant="subtle" size="sm">
    <UIcon name="i-lucide-pencil" class="size-3 mr-1" />
    Open
  </UBadge>
  <UBadge v-else color="neutral" variant="subtle" size="sm">
    <UIcon name="i-lucide-clock" class="size-3 mr-1" />
    Upcoming
  </UBadge>
</template>
