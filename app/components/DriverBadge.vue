<script setup lang="ts">
defineProps<{
  firstName: string
  lastName: string
  number: number
  teamColor: string
  teamName?: string
  compact?: boolean
}>()
</script>

<template>
  <UTooltip v-if="teamName" :text="`#${number} ${firstName} ${lastName} — ${teamName}`">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-1 shrink-0 rounded-full" :class="compact ? 'h-5' : 'h-7'" :style="{ backgroundColor: teamColor }" />
      <span v-if="!compact" class="text-xs font-bold text-muted tabular-nums w-6 text-right shrink-0">#{{ number }}</span>
      <span class="truncate text-sm" :class="!compact && 'font-medium'">
        <span class="text-muted">{{ firstName }}&nbsp;</span><span class="font-semibold text-default uppercase">{{ lastName }}</span>
      </span>
    </div>
  </UTooltip>
  <div v-else class="flex items-center gap-2.5 min-w-0">
    <div class="w-1 shrink-0 rounded-full" :class="compact ? 'h-5' : 'h-7'" :style="{ backgroundColor: teamColor }" />
    <span v-if="!compact" class="text-xs font-bold text-muted tabular-nums w-6 text-right shrink-0">#{{ number }}</span>
    <span class="truncate text-sm" :class="!compact && 'font-medium'">
      <span class="text-muted">{{ firstName }}&nbsp;</span><span class="font-semibold text-default uppercase">{{ lastName }}</span>
    </span>
  </div>
</template>
