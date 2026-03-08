<script setup lang="ts">
useSeoMeta({ title: '2026 Schedule — F1 League', description: 'Full 2026 F1 race calendar with countdown timers.' })

interface Race {
  id: string
  name: string
  location: string
  startAt: string
  season: number
  round: number
  locked: boolean
  open: boolean
  lockTime: string
  openTime: string
  hasResult: boolean
}

const { data: races, status } = useCachedFetch<Race[]>('/api/races')
const { data: leagues } = useLeagues()
const { loggedIn } = useUserSession()

const racesByMonth = computed(() => {
  if (!races.value) return []
  const groups: { month: string, races: Race[] }[] = []
  for (const race of races.value) {
    const month = new Date(race.startAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const existing = groups.find(g => g.month === month)
    if (existing) existing.races.push(race)
    else groups.push({ month, races: [race] })
  }
  return groups
})

const nextRaceId = computed(() => races.value?.find(r => !r.locked)?.id ?? null)

function raceLink(raceId: string): string {
  if (leagues.value?.length) {
    return `/leagues/${leagues.value[0].slug}/races/${raceId}`
  }
  return `/races/${raceId}`
}
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">2026 Season</p>
        <h1 class="text-2xl font-black uppercase tracking-tight mt-1">Schedule</h1>
      </div>
      <div v-if="races" class="text-sm text-zinc-500 tabular-nums">
        {{ races.filter((r: any) => r.hasResult).length }}/{{ races.length }} completed
      </div>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-6">
      <div v-for="i in 3" :key="i">
        <USkeleton class="h-4 w-32 mb-3" />
        <div class="flex flex-col gap-2">
          <USkeleton v-for="j in 3" :key="j" class="h-[72px] w-full rounded-xl" />
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-8">
      <div v-for="group in racesByMonth" :key="group.month">
        <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3 pl-1">{{ group.month }}</h2>
        <div class="flex flex-col gap-2">
          <NuxtLink
            v-for="race in group.races"
            :key="race.id"
            :to="loggedIn ? raceLink(race.id) : '/login'"
            class="group flex items-center gap-4 p-4 rounded-xl border transition-all"
            :class="[
              race.id === nextRaceId
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : race.hasResult
                  ? 'border-zinc-800/50 bg-zinc-900/30'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
              race.locked && !race.hasResult ? 'opacity-50' : '',
            ]"
          >
            <div
              class="size-10 rounded-lg flex items-center justify-center text-sm font-black tabular-nums shrink-0"
              :class="race.id === nextRaceId ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : race.hasResult ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-800 text-zinc-300'"
            >
              {{ races!.indexOf(race) + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold truncate" :class="race.id === nextRaceId ? 'text-white' : ''">{{ race.name }}</p>
              <p class="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <UIcon name="i-lucide-map-pin" class="size-3" />
                {{ race.location }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right hidden sm:block">
                <p class="text-sm font-medium tabular-nums">
                  {{ new Date(race.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
                </p>
                <p class="text-xs text-zinc-500">
                  {{ new Date(race.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
              <RaceStatusBadge :has-result="race.hasResult" :locked="race.locked" :open="race.open" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </UContainer>
</template>
