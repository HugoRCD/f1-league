<script setup lang="ts">
const props = defineProps<{
  image?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
}>()

const avatarSize = computed(() => {
  if (props.size === 'lg') return 'xl'
  if (props.size === 'md') return 'md'
  return 'sm'
})
</script>

<template>
  <UAvatar
    :src="image || undefined"
    :alt="name || undefined"
    :icon="!name ? 'i-lucide-user' : undefined"
    :size="avatarSize"
  />
</template>
