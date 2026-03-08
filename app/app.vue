<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'
</script>

<template>
  <UApp>
    <div class="min-h-dvh bg-zinc-950 text-zinc-100">
      <AppHeader />
      <main>
        <NuxtPage />
      </main>
      <AppFooter />
    </div>
    <Analytics />
  </UApp>
</template>
