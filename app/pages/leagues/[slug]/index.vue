<script setup lang="ts">
const { league, leagueId, isLeagueAdmin, refreshLeagues } = useCurrentLeague()
const toast = useToast()
const copiedInvite = ref(false)

async function copyInviteLink() {
  if (!leagueId.value) return
  try {
    const detail = await $fetch<any>(`/api/leagues/${leagueId.value}`)
    if (!detail.inviteCode) return
    const link = `${useRequestURL().origin}/invite/${detail.inviteCode}`
    await navigator.clipboard.writeText(link)
    copiedInvite.value = true
    toast.add({ title: 'Invite link copied!', color: 'success', icon: 'i-lucide-check' })
    setTimeout(() => { copiedInvite.value = false }, 2000)
  }
  catch {
    toast.add({ title: 'Failed to copy link', color: 'error' })
  }
}

const leagueNotFound = ref(false)

watch(league, async (val) => {
  if (!val && !leagueNotFound.value) {
    await refreshLeagues()
    await nextTick()
    if (!league.value) leagueNotFound.value = true
  }
}, { immediate: true })

const title = computed(() => league.value?.name ? `${league.value.name} — F1 League` : 'League — F1 League')
useSeoMeta({ title })

interface Race {
  id: string
  name: string
  location: string
  startAt: string
  locked: boolean
  open: boolean
  lockTime: string
  openTime: string
  hasResult: boolean
}

const { data: races, status: racesStatus } = useCachedFetch<Race[]>('/api/races')
const { data: leaderboard, status: leaderboardStatus, refresh: refreshLeaderboard } = useFetch<any[]>(
  () => `/api/leagues/${leagueId.value}/leaderboard`,
  {
    immediate: false,
    getCachedData: (key, nuxtApp) =>
      nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  },
)

watch(leagueId, (id) => {
  if (id) refreshLeaderboard()
}, { immediate: true })

const nextRace = computed(() => {
  if (!races.value) return null
  return races.value.find(r => !r.locked) ?? null
})

const lastRaceWithResult = computed(() => {
  if (!races.value) return null
  return [...races.value].reverse().find(r => r.hasResult) ?? null
})

const completedCount = computed(() => races.value?.filter(r => r.hasResult).length ?? 0)
const totalRaces = computed(() => races.value?.length ?? 0)

const { data: nextRaceStatus, refresh: refreshNextRaceStatus } = useFetch<{
  total: number
  submitted: number
}>(
  () => `/api/leagues/${leagueId.value}/predictions/${nextRace.value?.id}/status`,
  {
    immediate: false,
    watch: false,
    pick: ['total', 'submitted'],
  },
)

watch([leagueId, nextRace], ([id, race]) => {
  if (id && race) refreshNextRaceStatus()
}, { immediate: true })
</script>

<template>
  <UContainer class="py-8">
    <div v-if="leagueNotFound" class="py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 mx-auto mb-4 text-zinc-700" />
      <p class="text-xl font-bold mb-2">
        League not found
      </p>
      <p class="text-zinc-400 mb-6">
        This league doesn't exist or you don't have access to it.
      </p>
      <UButton to="/" label="Back to home" variant="outline" />
    </div>

    <div v-else-if="!league" class="py-16 text-center">
      <UIcon name="i-lucide-loader" class="size-8 animate-spin text-zinc-600 mx-auto mb-4" />
      <p class="text-zinc-500">
        Loading league...
      </p>
    </div>

    <template v-else>
      <div class="flex items-center justify-between mb-8">
        <div>
          <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">
            {{ league.name }}
          </p>
          <h1 class="text-2xl font-black mt-1">
            Dashboard
          </h1>
          <p class="text-sm text-zinc-500 mt-1">
            {{ league.memberCount }} member{{ league.memberCount !== 1 ? 's' : '' }}
          </p>
        </div>
        <div class="flex items-center gap-4">
          <UTooltip :text="copiedInvite ? 'Copied!' : 'Copy invite link'">
            <UButton
              :icon="copiedInvite ? 'i-lucide-check' : 'i-lucide-share-2'"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="copyInviteLink"
            />
          </UTooltip>
          <div v-if="totalRaces" class="text-right hidden sm:block">
            <p class="text-2xl font-black tabular-nums">
              {{ completedCount }}<span class="text-zinc-600">/{{ totalRaces }}</span>
            </p>
            <p class="text-xs text-zinc-500">
              races completed
            </p>
          </div>
        </div>
      </div>

      <div v-if="racesStatus === 'pending'" class="grid gap-6 lg:grid-cols-2">
        <div v-for="i in 2" :key="i" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div class="h-1 bg-zinc-800" />
          <div class="p-6 flex flex-col gap-4">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-6 w-48" />
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-12 w-full mt-4" />
          </div>
        </div>
      </div>

      <div v-else class="grid gap-6 lg:grid-cols-2">
        <div v-if="nextRace" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div class="h-1 bg-[#E10600]" />
          <div class="p-6">
            <div class="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-4">
              <UIcon name="i-lucide-calendar" class="size-4" />
              Next Race
            </div>
            <h2 class="text-xl font-black uppercase">
              {{ nextRace.name }}
            </h2>
            <div class="flex items-center gap-2 text-sm text-zinc-400 mt-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              {{ nextRace.location }}
              <span class="text-zinc-600">|</span>
              {{ new Date(nextRace.startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}
            </div>
            <div class="mt-6 mb-6">
              <p class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-2">
                Predictions lock in
              </p>
              <CountdownTimer :target-date="nextRace.lockTime" size="lg" />
            </div>
            <div v-if="nextRaceStatus && nextRaceStatus.total > 0" class="flex items-center gap-3 mb-4 px-1">
              <div class="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  :style="{ width: `${(nextRaceStatus.submitted / nextRaceStatus.total) * 100}%` }"
                />
              </div>
              <span class="text-xs tabular-nums text-zinc-400">
                <span class="font-bold text-white">{{ nextRaceStatus.submitted }}</span><span class="text-zinc-600">/{{ nextRaceStatus.total }}</span>
                predicted
              </span>
            </div>
            <UButton
              :to="`/leagues/${league.slug}/races/${nextRace.id}`"
              label="Make your prediction"
              icon="i-lucide-arrow-right"
              trailing
              size="lg"
              class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
              block
            />
          </div>
        </div>

        <div v-if="lastRaceWithResult" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div class="h-1 bg-linear-to-r from-yellow-500 via-zinc-400 to-amber-700" />
          <div class="p-6">
            <div class="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-4">
              <UIcon name="i-lucide-flag-triangle-right" class="size-4" />
              Latest Result
            </div>
            <h2 class="text-xl font-black uppercase">
              {{ lastRaceWithResult.name }}
            </h2>
            <div class="flex items-center gap-2 text-sm text-zinc-400 mt-1">
              <UIcon name="i-lucide-map-pin" class="size-3.5" />
              {{ lastRaceWithResult.location }}
            </div>
            <div class="mt-6">
              <UButton
                :to="`/leagues/${league.slug}/races/${lastRaceWithResult.id}`"
                label="View race standings"
                icon="i-lucide-arrow-right"
                trailing
                variant="outline"
                size="lg"
                block
              />
            </div>
          </div>
        </div>

        <div v-if="!nextRace && !lastRaceWithResult" class="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <UIcon name="i-lucide-flag-triangle-right" class="size-12 mx-auto mb-4 text-zinc-700" />
          <p class="text-zinc-400">
            No races available yet. Ask an admin to seed the season data.
          </p>
        </div>
      </div>

      <div v-if="leaderboardStatus === 'pending'" class="mt-8">
        <USkeleton class="h-6 w-40 mb-4" />
        <div class="flex flex-col gap-2">
          <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
        </div>
      </div>
      <div v-else-if="(leaderboard as any[])?.length" class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-black uppercase tracking-tight">
            Season Standings
          </h2>
          <UButton :to="`/leagues/${league.slug}/leaderboard`" label="View full standings" variant="link" size="sm" trailing-icon="i-lucide-arrow-right" />
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="(player, index) in (leaderboard as any[]).slice(0, 5)"
            :key="player.userId"
            class="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
          >
            <PositionBadge :position="index + 1" />
            <UserAvatar :image="player.userImage" :name="player.userName" size="sm" />
            <span class="flex-1 font-semibold">{{ player.userName }}</span>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-zinc-500">{{ player.raceWins }}W</span>
              <span class="font-black text-lg tabular-nums">{{ player.totalPoints }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UContainer>
</template>
