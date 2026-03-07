<script setup lang="ts">
const props = defineProps<{
  position: number
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClass = computed(() => {
  if (props.size === 'lg') return 'size-10 text-lg'
  if (props.size === 'sm') return 'size-6 text-xs'
  return 'size-8 text-sm'
})

const colorClass = computed(() => {
  if (props.position === 1) return 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
  if (props.position === 2) return 'bg-zinc-400/20 text-zinc-300 ring-1 ring-zinc-400/30'
  if (props.position === 3) return 'bg-amber-700/20 text-amber-500 ring-1 ring-amber-700/30'
  return 'bg-zinc-800 text-zinc-400'
})
</script>

<template>
  <div
    class="inline-flex items-center justify-center rounded-lg font-black tabular-nums shrink-0"
    :class="[sizeClass, colorClass]"
  >
    {{ position }}
  </div>
</template>
