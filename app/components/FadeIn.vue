<script setup lang="ts">
import { Motion } from 'motion-v'

defineProps<{
  delay?: number
  y?: number
}>()
</script>

<template>
  <Motion
    as="div"
    :initial="{ opacity: 0, y: y ?? 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.4, ease: 'easeOut', delay: delay ?? 0 }"
  >
    <slot />
  </Motion>
</template>
