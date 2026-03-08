<script setup lang="ts">
const { league, leagueId } = useCurrentLeague()
const { user } = useUserSession()

const title = computed(() => league.value ? `Standings — ${league.value.name}` : 'Standings')
useSeoMeta({ title })

const { data: leaderboard, status } = useFetch(() => `/api/leagues/${leagueId.value}/leaderboard`, {
  watch: [leagueId],
})
</script>

<template>
  <UContainer class="py-8">
    <NuxtLink :to="`/leagues/${league?.slug}`" class="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      {{ league?.name }}
    </NuxtLink>

    <div class="mb-8">
      <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">{{ league?.name }}</p>
      <h1 class="text-2xl font-black uppercase tracking-tight mt-1">Championship Standings</h1>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-4">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <USkeleton v-for="i in 3" :key="i" class="h-48 rounded-2xl" />
      </div>
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
    </div>

    <div v-else-if="!(leaderboard as any[])?.length" class="text-center py-20">
      <UIcon name="i-lucide-trophy" class="size-16 mx-auto mb-4 text-zinc-800" />
      <p class="text-xl font-bold mb-1">No results yet</p>
      <p class="text-zinc-500">The championship standings will appear after the first race result is entered.</p>
    </div>

    <template v-else>
      <div v-if="(leaderboard as any[]).length >= 3" class="flex items-end justify-center gap-3 mb-10">
        <div class="w-40 text-center">
          <div class="flex justify-center mb-3">
            <div class="ring-2 ring-zinc-400/40 rounded-full">
              <UserAvatar :image="(leaderboard as any[])[1].userImage" :name="(leaderboard as any[])[1].userName" size="md" />
            </div>
          </div>
          <p class="font-bold text-sm truncate">{{ (leaderboard as any[])[1].userName }}</p>
          <div class="mt-3 rounded-t-xl bg-zinc-400/10 border border-zinc-400/20 border-b-0 pt-4 pb-6 px-3">
            <p class="text-3xl font-black tabular-nums text-zinc-300">{{ (leaderboard as any[])[1].totalPoints }}</p>
            <p class="text-[10px] text-zinc-500 mt-1">{{ (leaderboard as any[])[1].raceWins }}W · {{ (leaderboard as any[])[1].totalExactHits }}E</p>
          </div>
          <div class="bg-zinc-400/20 py-2 text-sm font-black text-zinc-300">2nd</div>
        </div>

        <div class="w-44 text-center -mb-2">
          <UIcon name="i-lucide-crown" class="size-6 mx-auto text-yellow-500 mb-1" />
          <div class="flex justify-center mb-3">
            <div class="ring-3 ring-yellow-500/40 rounded-full">
              <UserAvatar :image="(leaderboard as any[])[0].userImage" :name="(leaderboard as any[])[0].userName" size="lg" />
            </div>
          </div>
          <p class="font-bold truncate">{{ (leaderboard as any[])[0].userName }}</p>
          <div class="mt-3 rounded-t-xl bg-yellow-500/10 border border-yellow-500/20 border-b-0 pt-6 pb-8 px-3">
            <p class="text-4xl font-black tabular-nums text-yellow-400">{{ (leaderboard as any[])[0].totalPoints }}</p>
            <p class="text-[10px] text-zinc-500 mt-1">{{ (leaderboard as any[])[0].raceWins }}W · {{ (leaderboard as any[])[0].totalExactHits }}E</p>
          </div>
          <div class="bg-yellow-500/20 py-2 text-sm font-black text-yellow-400">1st</div>
        </div>

        <div class="w-36 text-center">
          <div class="flex justify-center mb-3">
            <div class="ring-2 ring-amber-700/40 rounded-full">
              <UserAvatar :image="(leaderboard as any[])[2].userImage" :name="(leaderboard as any[])[2].userName" size="md" />
            </div>
          </div>
          <p class="font-bold text-sm truncate">{{ (leaderboard as any[])[2].userName }}</p>
          <div class="mt-3 rounded-t-xl bg-amber-700/10 border border-amber-700/20 border-b-0 pt-3 pb-4 px-3">
            <p class="text-2xl font-black tabular-nums text-amber-500">{{ (leaderboard as any[])[2].totalPoints }}</p>
            <p class="text-[10px] text-zinc-500 mt-1">{{ (leaderboard as any[])[2].raceWins }}W · {{ (leaderboard as any[])[2].totalExactHits }}E</p>
          </div>
          <div class="bg-amber-700/20 py-2 text-sm font-black text-amber-500">3rd</div>
        </div>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <th class="text-left px-4 py-2.5 w-12">Pos</th>
              <th class="text-left py-2.5">Player</th>
              <th class="text-right px-3 py-2.5 w-14 hidden sm:table-cell">Wins</th>
              <th class="text-right px-3 py-2.5 w-14 hidden sm:table-cell">Exact</th>
              <th class="text-right px-4 py-2.5 w-20">Points</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(player, index) in (leaderboard as any[])"
              :key="player.userId"
              class="border-b border-zinc-800/50 last:border-0 transition-colors"
              :class="player.userId === user?.id ? 'bg-[#E10600]/5' : ''"
            >
              <td class="px-4 py-3">
                <PositionBadge :position="index + 1" size="sm" />
              </td>
              <td class="py-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="shrink-0 ring-1 ring-zinc-700 rounded-full">
                    <UserAvatar :image="player.userImage" :name="player.userName" size="sm" />
                  </div>
                  <span class="font-semibold truncate" :class="player.userId === user?.id ? 'text-[#E10600]' : ''">{{ player.userName }}</span>
                  <span v-if="player.userId === user?.id" class="text-[10px] text-[#E10600] font-bold uppercase">you</span>
                </div>
              </td>
              <td class="text-right px-3 py-3 text-sm text-zinc-400 tabular-nums hidden sm:table-cell">{{ player.raceWins }}</td>
              <td class="text-right px-3 py-3 text-sm text-zinc-400 tabular-nums hidden sm:table-cell">{{ player.totalExactHits }}</td>
              <td class="text-right px-4 py-3 font-black text-lg tabular-nums">{{ player.totalPoints }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </UContainer>
</template>
