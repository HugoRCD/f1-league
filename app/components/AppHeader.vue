<script setup lang="ts">
const { user, loggedIn, signOut } = useUserSession()
const route = useRoute()

const mobileOpen = ref(false)
const menuOpen = ref(false)

const { data: leagues } = useLeagues()
const lastLeague = useLastLeague()

const currentLeagueSlug = computed(() => {
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : undefined
})

const currentLeague = computed(() => {
  if (!currentLeagueSlug.value || !leagues.value) return null
  return leagues.value.find(l => l.slug === currentLeagueSlug.value) ?? null
})

const activeLeague = computed(() => currentLeague.value ?? lastLeague.value)

const otherLeagues = computed(() => {
  if (!leagues.value) return []
  const activeSlug = activeLeague.value?.slug
  return leagues.value.filter(l => l.slug !== activeSlug)
})

function leagueSwitchLink(targetSlug: string): string {
  const path = route.path
  if (currentLeagueSlug.value && path.includes(`/leagues/${currentLeagueSlug.value}`)) {
    return path.replace(`/leagues/${currentLeagueSlug.value}`, `/leagues/${targetSlug}`)
  }
  return `/leagues/${targetSlug}`
}

const isSuperAdmin = computed(() => user.value?.role === 'admin')
const isLeagueAdmin = computed(() => activeLeague.value?.role === 'admin')

const navItems = computed(() => {
  const items: { label: string, to: string, icon: string }[] = []
  if (!loggedIn.value) return items

  items.push({ label: 'Schedule', to: '/races', icon: 'i-lucide-calendar' })

  if (activeLeague.value) {
    items.push({ label: 'Standings', to: `/leagues/${activeLeague.value.slug}/leaderboard`, icon: 'i-lucide-trophy' })
  }

  return items
})

async function handleSignOut() {
  menuOpen.value = false
  await signOut()
  navigateTo('/login')
}

const avatarUrl = computed(() => user.value?.image || null)
</script>

<template>
  <header class="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800/80">
    <div class="h-[3px] bg-[#E10600]" />
    <UContainer class="flex items-center justify-between h-14">
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <F1Logo class="h-7 w-auto text-[#E10600]" />
          <div class="h-5 w-px bg-zinc-700" />
          <span class="font-black text-sm uppercase tracking-[0.2em] text-zinc-300">League</span>
        </NuxtLink>

        <UPopover v-if="loggedIn && leagues?.length" class="hidden md:block">
          <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors text-sm font-semibold">
            {{ activeLeague?.name ?? 'Select league' }}
            <UIcon name="i-lucide-chevron-down" class="size-3 text-zinc-500" />
          </button>
          <template #content>
            <div class="w-56 p-1">
              <NuxtLink
                v-for="l in leagues"
                :key="l.id"
                :to="leagueSwitchLink(l.slug)"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                :class="l.slug === activeLeague?.slug ? 'text-white bg-zinc-800' : 'text-zinc-300 hover:bg-zinc-800'"
              >
                {{ l.name }}
              </NuxtLink>
              <div class="h-px bg-zinc-800 my-1" />
              <NuxtLink
                to="/"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-white rounded-md transition-colors"
              >
                <UIcon name="i-lucide-layout-grid" class="size-3.5" />
                All leagues
              </NuxtLink>
            </div>
          </template>
        </UPopover>

        <nav class="hidden md:flex items-center">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="relative px-4 py-4 text-sm font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider"
            active-class="!text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#E10600]"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="loggedIn">
          <NuxtLink
            v-if="isLeagueAdmin && currentLeague"
            :to="`/leagues/${currentLeague.slug}/settings`"
            class="hidden md:flex items-center justify-center size-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <UIcon name="i-lucide-settings" class="size-4" />
          </NuxtLink>

          <UPopover v-model:open="menuOpen">
            <button class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <UAvatar :src="avatarUrl || undefined" :alt="user?.name || undefined" :icon="!user?.name ? 'i-lucide-user' : undefined" size="sm" />
              <span class="hidden sm:inline text-sm font-medium text-zinc-300">{{ user?.name }}</span>
              <UIcon name="i-lucide-chevron-down" class="size-3 text-zinc-500" />
            </button>

            <template #content>
              <div class="w-52 p-1">
                <div class="px-3 py-2 mb-1">
                  <p class="text-sm font-semibold">{{ user?.name }}</p>
                  <p class="text-xs text-zinc-500 truncate">{{ user?.email }}</p>
                </div>
                <div class="h-px bg-zinc-800 my-1" />
                <NuxtLink
                  to="/settings"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                  @click="menuOpen = false"
                >
                  <UIcon name="i-lucide-user" class="size-4 text-zinc-500" />
                  Account
                </NuxtLink>
                <NuxtLink
                  v-if="isSuperAdmin"
                  to="/admin"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                  @click="menuOpen = false"
                >
                  <UIcon name="i-lucide-shield" class="size-4 text-zinc-500" />
                  Super Admin
                </NuxtLink>
                <div class="h-px bg-zinc-800 my-1" />
                <button class="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-md transition-colors" @click="handleSignOut">
                  <UIcon name="i-lucide-log-out" class="size-4" />
                  Sign out
                </button>
              </div>
            </template>
          </UPopover>
        </template>
        <template v-else>
          <UButton to="/login" label="Sign In" variant="ghost" color="neutral" size="sm" class="font-semibold uppercase tracking-wider text-xs" />
          <UButton to="/register" label="Subscribe" size="sm" class="font-semibold uppercase tracking-wider text-xs bg-[#E10600] hover:bg-[#c00500] border-0" />
        </template>

        <UButton class="md:hidden" icon="i-lucide-menu" variant="ghost" color="neutral" size="sm" @click="mobileOpen = true" />
      </div>
    </UContainer>

    <USlideover v-model:open="mobileOpen" side="right" title="Menu">
      <template #body>
        <div class="flex items-center gap-3 mb-8">
          <F1Logo class="h-6 w-auto text-[#E10600]" />
          <span class="font-black text-sm uppercase tracking-[0.2em] text-zinc-300">League</span>
        </div>

        <div v-if="loggedIn && leagues?.length" class="mb-6">
          <p class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2 px-4">Your Leagues</p>
          <NuxtLink
            v-for="l in leagues"
            :key="l.id"
            :to="leagueSwitchLink(l.slug)"
            class="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
            :class="l.slug === currentLeagueSlug ? '!text-white bg-zinc-800' : ''"
            @click="mobileOpen = false"
          >
            {{ l.name }}
          </NuxtLink>
        </div>

        <nav class="flex flex-col gap-1">
          <NuxtLink
            v-for="item in navItems" :key="item.to" :to="item.to"
            class="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors uppercase tracking-wider"
            active-class="!text-white bg-zinc-800"
            @click="mobileOpen = false"
          >
            <UIcon :name="item.icon" class="size-5" />
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div v-if="loggedIn" class="mt-8 pt-4 border-t border-zinc-800 flex flex-col gap-1">
          <NuxtLink to="/settings" class="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors" @click="mobileOpen = false">
            <UIcon name="i-lucide-settings" class="size-5" />
            Settings
          </NuxtLink>
          <button class="flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800/50 rounded-lg transition-colors text-left" @click="handleSignOut; mobileOpen = false">
            <UIcon name="i-lucide-log-out" class="size-5" />
            Sign out
          </button>
        </div>
      </template>
    </USlideover>
  </header>
</template>
