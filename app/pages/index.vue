<script setup lang="ts">
useSeoMeta({
  title: 'F1 League — Predict. Compete. Win.',
  description: 'Predict the F1 Top 10 for every Grand Prix. Compete with friends across the season.',
})

const { loggedIn, user } = useUserSession()
const { data: leagues, status: leaguesStatus } = useLeagues()
const { data: races } = useCachedFetch<any[]>('/api/races', { immediate: loggedIn.value })

const nextRace = computed(() => {
  if (!races.value) return null
  return races.value.find((r: any) => !r.locked) ?? null
})

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
  mclaren: '#FF8000', ferrari: '#E8002D', red_bull: '#3671C6', mercedes: '#27F4D2',
  aston_martin: '#229971', alpine: '#FF87BC', haas: '#B6BABD', rb: '#6692FF',
  williams: '#64C4FF', audi: '#C0C0C0', cadillac: '#1E1E1E',
}
</script>

<template>
  <div v-if="!loggedIn">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-[#E10600]/15 via-zinc-950 to-zinc-950" />
      <div class="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#E10600]/5 to-transparent" />
      <div class="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#E10600]/40 to-transparent" />

      <UContainer class="relative py-32 lg:py-44">
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 mb-8">Prediction League — 2026 Season</p>
          <h1 class="text-5xl lg:text-7xl font-black uppercase tracking-tight leading-none">
            Predict.
            <br>
            <span class="text-[#E10600]">Compete.</span>
            <br>
            Win.
          </h1>
          <p class="mt-6 text-lg text-zinc-400 max-w-lg leading-relaxed">
            Predict the Top 10 finishing order for every Grand Prix. Create or join leagues, earn points for accuracy, and compete with friends across the entire season.
          </p>
          <div class="flex items-center gap-4 mt-10">
            <UButton to="/register" label="Get Started" size="xl" class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
            <UButton to="/login" label="Sign in" variant="outline" size="xl" class="font-semibold" />
          </div>
        </div>
      </UContainer>
    </div>
  </div>

  <UContainer v-else class="py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">Dashboard</p>
        <h1 class="text-2xl font-black mt-1">Hey {{ user?.name }}</h1>
      </div>
    </div>

    <div v-if="leaguesStatus === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 3" :key="i" class="h-48 rounded-2xl" />
    </div>

    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-black uppercase tracking-tight">Your Leagues</h2>
        <div class="flex items-center gap-2">
          <UButton to="/leagues/join" label="Join" icon="i-lucide-log-in" variant="outline" size="sm" />
          <UButton to="/leagues/create" label="Create" icon="i-lucide-plus" size="sm" class="bg-[#E10600] hover:bg-[#c00500] border-0" />
        </div>
      </div>

      <div v-if="!leagues?.length" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center mb-8">
        <UIcon name="i-lucide-users" class="size-12 mx-auto mb-4 text-zinc-700" />
        <p class="text-xl font-bold mb-2">No leagues yet</p>
        <p class="text-zinc-400 mb-6 max-w-sm mx-auto">
          Create a league to play with friends, or join one with an invite code.
        </p>
        <div class="flex items-center justify-center gap-3">
          <UButton to="/leagues/create" label="Create a league" icon="i-lucide-plus" size="lg" class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
          <UButton to="/leagues/join" label="Join a league" icon="i-lucide-log-in" variant="outline" size="lg" />
        </div>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <NuxtLink
          v-for="league in leagues"
          :key="league.id"
          :to="`/leagues/${league.slug}`"
          class="group rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-600 transition-all"
        >
          <div class="h-1 bg-[#E10600]" />
          <div class="p-5">
            <h3 class="font-black text-lg uppercase tracking-tight group-hover:text-[#E10600] transition-colors">{{ league.name }}</h3>
            <p v-if="league.description" class="text-sm text-zinc-500 mt-1 line-clamp-2">{{ league.description }}</p>
            <div class="flex items-center gap-3 mt-4 text-xs text-zinc-500">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-users" class="size-3.5" />
                {{ league.memberCount }} member{{ league.memberCount !== 1 ? 's' : '' }}
              </span>
              <UBadge v-if="league.role === 'admin'" color="warning" variant="subtle" size="xs">Admin</UBadge>
            </div>
          </div>
        </NuxtLink>
      </div>
    </template>

    <div v-if="nextRace" class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-8">
      <div class="h-1 bg-[#E10600]" />
      <div class="p-6">
        <div class="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-4">
          <UIcon name="i-lucide-calendar" class="size-4" />
          Next Race
        </div>
        <h2 class="text-xl font-black uppercase">{{ nextRace.name }}</h2>
        <div class="flex items-center gap-2 text-sm text-zinc-400 mt-1">
          <UIcon name="i-lucide-map-pin" class="size-3.5" />
          {{ nextRace.location }}
          <span class="text-zinc-600">|</span>
          {{ new Date(nextRace.startAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }}
        </div>
        <div class="mt-4">
          <p class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-2">Predictions lock in</p>
          <CountdownTimer :target-date="(nextRace as any).lockTime" size="lg" />
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div v-if="(f1News as any[])?.length">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Latest F1 News</h2>
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

      <div v-if="(driverStandings as any[])?.length">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">F1 Driver Championship</h2>
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
