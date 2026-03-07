<script setup lang="ts">
defineProps<{
  image?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <img
    v-if="image"
    :src="image"
    :alt="name || ''"
    class="rounded-full object-cover"
    :class="size === 'lg' ? 'size-16' : size === 'md' ? 'size-10' : 'size-7'"
  >
  <div
    v-else
    class="rounded-full bg-zinc-800 flex items-center justify-center"
    :class="size === 'lg' ? 'size-16' : size === 'md' ? 'size-10' : 'size-7'"
  >
    <UIcon
      name="i-lucide-user"
      :class="size === 'lg' ? 'size-7 text-zinc-500' : size === 'md' ? 'size-4.5 text-zinc-500' : 'size-3.5 text-zinc-500'"
    />
  </div>
</template>
