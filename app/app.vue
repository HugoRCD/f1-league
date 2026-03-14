<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'

const { loggedIn } = useUserSession()
</script>

<template>
  <UApp>
    <div class="flex">
      <div class="flex-1 min-w-0 min-h-dvh bg-zinc-950 text-zinc-100">
        <AppHeader />
        <main>
          <NuxtPage />
        </main>
        <AppFooter />
      </div>

      <ClientOnly>
        <PitwallChatSidebar v-if="loggedIn" />
      </ClientOnly>
    </div>
    <Analytics />
  </UApp>
</template>
