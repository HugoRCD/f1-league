<script setup lang="ts">
useSeoMeta({
  title: 'F1 League — Predict. Compete. Win.',
  description: 'Predict the F1 Top 10 for every Grand Prix. Compete with friends across the season.',
})

const { loggedIn, user } = useUserSession()

const { data: races, status: racesStatus } = useCachedFetch('/api/races', { immediate: loggedIn.value })
const { data: leaderboard, status: leaderboardStatus } = useCachedFetch('/api/leaderboard', { immediate: loggedIn.value })

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

const nextRaceRound = computed(() => nextRace.value?.round ?? null)
const nextRaceGrid = ref<any[]>([])
watch(nextRaceRound, async (round) => {
  if (!round) return
  try {
    nextRaceGrid.value = await $fetch<any[]>(`/api/f1/qualifying/${round}`)
  }
  catch { nextRaceGrid.value = [] }
}, { immediate: true })

const { data: f1News } = useCachedFetch('/api/f1/news', { immediate: loggedIn.value })
const { data: driverStandings } = useCachedFetch('/api/f1/standings/drivers', { immediate: loggedIn.value })

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const teamColorMap: Record<string, string> = {
  mclaren: '#FF8000',
  ferrari: '#E8002D',
  red_bull: '#3671C6',
  mercedes: '#27F4D2',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  haas: '#B6BABD',
  rb: '#6692FF',
  williams: '#64C4FF',
  audi: '#C0C0C0',
  cadillac: '#1E1E1E',
}
</script>

<template>
  <!-- HERO - Logged out -->
  <div v-if="!loggedIn">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-[#E10600]/15 via-zinc-950 to-zinc-950" />
      <div class="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#E10600]/5 to-transparent" />
      <div class="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#E10600]/40 to-transparent" />

      <UContainer class="relative py-32 lg:py-44">
        <div class="max-w-2xl">
          <div class="flex items-center gap-4 mb-8">
            <F1Logo class="h-10 w-auto text-[#E10600]" />
            <div class="h-6 w-px bg-zinc-700" />
            <span class="text-zinc-400 text-sm font-bold uppercase tracking-[0.25em]">Prediction League</span>
          </div>
          <h1 class="text-5xl lg:text-7xl font-black uppercase tracking-tight leading-none">
            Predict.
            <br>
            <span class="text-[#E10600]">Compete.</span>
            <br>
            Win.
          </h1>
          <p class="mt-6 text-lg text-zinc-400 max-w-lg leading-relaxed">
            Predict the Top 10 finishing order for every Grand Prix. Earn points for accuracy. Compete with friends across the entire season.
          </p>
          <div class="flex items-center gap-4 mt-10">
            <UButton to="/register" label="Join the League" size="xl" class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
            <UButton to="/login" label="Sign in" variant="outline" size="xl" class="font-semibold" />
          </div>
        </div>
      </UContainer>
    </div>

    <div class="border-t border-zinc-800/50">
      <UContainer class="py-16">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="size-12 mx-auto mb-4 rounded-xl bg-[#E10600]/10 flex items-center justify-center">
              <UIcon name="i-lucide-list-ordered" class="size-6 text-[#E10600]" />
            </div>
            <h3 class="font-bold mb-1">
              Predict Top 10
            </h3>
            <p class="text-sm text-zinc-500">
              Submit your predicted finishing order before each race locks.
            </p>
          </div>
          <div class="text-center">
            <div class="size-12 mx-auto mb-4 rounded-xl bg-[#E10600]/10 flex items-center justify-center">
              <UIcon name="i-lucide-calculator" class="size-6 text-[#E10600]" />
            </div>
            <h3 class="font-bold mb-1">
              Score Points
            </h3>
            <p class="text-sm text-zinc-500">
              Earn up to 5 points per position based on accuracy.
            </p>
          </div>
          <div class="text-center">
            <div class="size-12 mx-auto mb-4 rounded-xl bg-[#E10600]/10 flex items-center justify-center">
              <UIcon name="i-lucide-trophy" class="size-6 text-[#E10600]" />
            </div>
            <h3 class="font-bold mb-1">
              Win the Season
            </h3>
            <p class="text-sm text-zinc-500">
              Climb the leaderboard and crown the champion at season's end.
            </p>
          </div>
        </div>
      </UContainer>
    </div>
  </div>

  <!-- DASHBOARD - Logged in -->
  <UContainer v-else class="py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">
          Dashboard
        </p>
        <h1 class="text-2xl font-black mt-1">
          Hey {{ user?.name }}
        </h1>
      </div>
      <div v-if="totalRaces" class="text-right hidden sm:block">
        <p class="text-2xl font-black tabular-nums">
          {{ completedCount }}<span class="text-zinc-600">/{{ totalRaces }}</span>
        </p>
        <p class="text-xs text-zinc-500">
          races completed
        </p>
      </div>
    </div>

    <!-- Skeleton loading -->
    <div v-if="racesStatus === 'pending'" class="grid gap-6 lg:grid-cols-2">
      <div v-for="i in 2" :key="i" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div class="h-1 bg-zinc-800" />
        <div class="p-6 flex flex-col gap-4">
          <USkeleton class="h-4 w-24" />
          <USkeleton class="h-6 w-48" />
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-12 w-full mt-4" />
          <USkeleton class="h-10 w-full mt-2" />
        </div>
      </div>
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-2">
      <!-- Next race card -->
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
          <UButton
            :to="`/races/${nextRace.id}`"
            :label="nextRace.hasPrediction ? 'Edit your prediction' : 'Make your prediction'"
            :icon="nextRace.hasPrediction ? 'i-lucide-pencil' : 'i-lucide-arrow-right'"
            :trailing="!nextRace.hasPrediction"
            size="lg"
            class="font-bold"
            :class="nextRace.hasPrediction ? '' : 'bg-[#E10600] hover:bg-[#c00500] border-0'"
            :variant="nextRace.hasPrediction ? 'outline' : undefined"
            block
          />
          <p v-if="nextRace.hasPrediction" class="text-center text-xs text-emerald-500 mt-2 flex items-center justify-center gap-1">
            <UIcon name="i-lucide-check-circle" class="size-3" />
            Prediction submitted
          </p>
        </div>
      </div>

      <!-- Last result card -->
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
              :to="`/races/${lastRaceWithResult.id}`"
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

      <!-- Starting grid card (when no results yet but qualifying data available) -->
      <div v-else-if="nextRaceGrid.length > 0" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div class="h-1 bg-linear-to-r from-zinc-600 to-zinc-800" />
        <div class="p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold">
              <UIcon name="i-lucide-grid-2x2" class="size-4" />
              Starting Grid
            </div>
            <NuxtLink v-if="nextRace" :to="`/races/${nextRace.id}`" class="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-wider font-semibold">
              Full grid
            </NuxtLink>
          </div>
          <div class="flex flex-col">
            <div
              v-for="(entry, i) in nextRaceGrid.slice(0, 10)"
              :key="i"
              class="flex items-center gap-2.5 py-1.5 border-b border-zinc-800/30 last:border-0"
            >
              <span class="w-4 text-right text-[10px] font-black tabular-nums" :class="i < 3 ? 'text-yellow-500' : 'text-zinc-600'">{{ entry.position }}</span>
              <div class="w-0.5 h-3 rounded-full" :style="{ backgroundColor: teamColorMap[entry.teamId] || '#666' }" />
              <span class="text-xs font-bold text-zinc-500">{{ entry.driverCode }}</span>
              <span class="flex-1 text-sm truncate">{{ entry.driverName }}</span>
              <span v-if="entry.q3" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q3 }}</span>
            </div>
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

    <!-- Season leaderboard preview -->
    <div v-if="leaderboardStatus === 'pending'" class="mt-8">
      <USkeleton class="h-6 w-40 mb-4" />
      <div class="flex flex-col gap-2">
        <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
      </div>
    </div>
    <div v-else-if="leaderboard?.length" class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-black uppercase tracking-tight">
          Season Standings
        </h2>
        <UButton to="/leaderboard" label="View full standings" variant="link" size="sm" trailing-icon="i-lucide-arrow-right" />
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="(player, index) in leaderboard.slice(0, 5)"
          :key="player.userId"
          class="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
        >
          <PositionBadge :position="index + 1" />
          <span class="flex-1 font-semibold">{{ player.userName }}</span>
          <div class="flex items-center gap-4 text-sm">
            <span class="text-zinc-500">{{ player.raceWins }}W</span>
            <span class="font-black text-lg tabular-nums">{{ player.totalPoints }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- F1 News + Driver Championship -->
    <div class="mt-8 grid gap-6 lg:grid-cols-2">
      <!-- F1 News -->
      <div v-if="(f1News as any[])?.length">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
          Latest F1 News
        </h2>
        <div class="flex flex-col gap-2">
          <a
            v-for="(article, i) in (f1News as any[]).slice(0, 5)"
            :key="i"
            :href="article.link"
            target="_blank"
            rel="noopener"
            class="flex items-start gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-snug line-clamp-2">{{ article.title }}</p>
              <p class="text-xs text-zinc-500 mt-1">{{ timeAgo(article.date) }}</p>
            </div>
            <UIcon name="i-lucide-external-link" class="size-3.5 text-zinc-600 shrink-0 mt-1" />
          </a>
        </div>
      </div>

      <!-- Driver Championship -->
      <div v-if="(driverStandings as any[])?.length">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
          F1 Driver Championship
        </h2>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div
            v-for="(d, i) in (driverStandings as any[]).slice(0, 10)"
            :key="i"
            class="flex items-center gap-3 px-3 py-2 border-b border-zinc-800/50 last:border-0"
          >
            <span class="w-5 text-right text-xs font-black tabular-nums" :class="i < 3 ? 'text-yellow-500' : 'text-zinc-500'">{{ d.position }}</span>
            <div class="w-0.5 h-4 rounded-full" :style="{ backgroundColor: teamColorMap[d.teamId] || '#666' }" />
            <span class="flex-1 text-sm font-medium truncate">{{ d.driverName }}</span>
            <span class="font-black tabular-nums text-sm">{{ d.points }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>
