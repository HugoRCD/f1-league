<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'

const { user, loggedIn } = useUserSession()

const isSuperAdmin = computed(() => loggedIn.value && user.value?.role === 'admin')
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
        <AdminChatSidebar v-if="isSuperAdmin" />
      </ClientOnly>
    </div>
    <Analytics />
  </UApp>
</template>
