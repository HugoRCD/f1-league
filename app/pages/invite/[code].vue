<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { loggedIn } = useUserSession()
const { refresh: refreshLeagues } = useLeagues()
const invalidateCache = useInvalidateCache()

const code = computed(() => route.params.code as string)

const { data: league, error: fetchError } = await useFetch(
  () => `/api/invite/${code.value}`,
  { key: `invite-${code.value}` },
)

const ogTitle = computed(() => league.value ? `Join ${league.value.name} — F1 League` : 'Join a League — F1 League')
const ogDescription = computed(() => league.value?.description || (league.value ? `Join ${league.value.name} on F1 League and compete in the ${league.value.season} season!` : ''))

useSeoMeta({
  title: ogTitle,
  description: ogDescription,
})

defineOgImage({
  component: 'Invite',
  leagueName: league.value?.name ?? 'F1 League',
})

const joining = ref(false)

async function joinLeague() {
  joining.value = true
  try {
    const result = await $fetch(`/api/invite/${code.value}`, { method: 'POST' })
    invalidateCache('leagues')
    await refreshLeagues()
    toast.add({ title: `Joined ${result.league.name}!`, color: 'success', icon: 'i-lucide-check' })
    navigateTo(`/leagues/${result.league.slug}`)
  }
  catch (e: any) {
    const message = e.data?.message || 'Something went wrong. Please try again.'
    toast.add({ title: 'Error', description: message, color: 'error' })

    if (e.statusCode === 401 || e.data?.statusCode === 401) {
      toast.add({ title: 'Session expired', description: 'Please sign in again.', color: 'error', icon: 'i-lucide-log-out' })
      navigateTo(`/login?redirect=/invite/${code.value}`)
    }
  }
  finally {
    joining.value = false
  }
}

const redirectPath = computed(() => `/invite/${code.value}`)
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100dvh-60px)] px-4">
    <div class="w-full max-w-md">
      <div v-if="fetchError" class="text-center">
        <div class="inline-flex items-center justify-center size-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6">
          <UIcon name="i-lucide-link-2-off" class="size-8 text-zinc-500" />
        </div>
        <h1 class="text-2xl font-black uppercase tracking-tight mb-2">
          Invalid Invite
        </h1>
        <p class="text-zinc-400 text-sm mb-6">
          This invite link is invalid or has expired.
        </p>
        <UButton to="/" label="Go home" variant="outline" icon="i-lucide-home" />
      </div>

      <div v-else-if="league" class="flex flex-col items-center">
        <div class="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div class="flex items-center justify-center gap-3 mb-6">
            <F1Logo class="h-8 w-auto text-f1-600" />
            <div class="h-5 w-px bg-zinc-700" />
            <span class="font-black text-sm uppercase tracking-[0.2em] text-zinc-300">League</span>
          </div>

          <p class="text-xs font-bold uppercase tracking-[0.15em] text-f1-600 mb-3">
            You're invited to join
          </p>

          <h1 class="text-3xl font-black uppercase tracking-tight mb-2">
            {{ league.name }}
          </h1>

          <p v-if="league.description" class="text-zinc-400 text-sm mb-6">
            {{ league.description }}
          </p>

          <div class="flex items-center justify-center gap-6 mb-8" :class="{ 'mt-6': !league.description }">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-4 text-zinc-500" />
              <span class="text-sm text-zinc-400">
                <span class="font-bold text-white">{{ league.memberCount }}</span>
                {{ league.memberCount === 1 ? 'member' : 'members' }}
              </span>
            </div>
            <div class="h-4 w-px bg-zinc-700" />
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trophy" class="size-4 text-zinc-500" />
              <span class="text-sm text-zinc-400">
                Season <span class="font-bold text-white">{{ league.season }}</span>
              </span>
            </div>
          </div>

          <div v-if="loggedIn" class="flex flex-col gap-3">
            <UButton
              label="Join League"
              icon="i-lucide-log-in"
              size="xl"
              :loading="joining"
              block
              class="font-bold bg-f1-600 hover:bg-f1-700 border-0"
              @click="joinLeague"
            />
          </div>

          <div v-else class="flex flex-col gap-3">
            <UButton
              :to="`/login?redirect=${redirectPath}`"
              label="Sign in to join"
              icon="i-lucide-log-in"
              size="xl"
              block
              class="font-bold bg-f1-600 hover:bg-f1-700 border-0"
            />
            <UButton
              :to="`/register?redirect=${redirectPath}`"
              label="Create account"
              icon="i-lucide-user-plus"
              size="xl"
              block
              variant="outline"
              color="neutral"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
