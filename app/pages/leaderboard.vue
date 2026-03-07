<script setup lang="ts">
definePageMeta({ auth: 'user' })
useSeoMeta({ title: 'Championship Standings — F1 League', description: 'Season leaderboard with cumulative points, race wins, and exact predictions.' })

const { user } = useUserSession()
const { data: leaderboard, status } = useCachedFetch('/api/leaderboard')
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-8">
      <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">2026 Season</p>
      <h1 class="text-2xl font-black uppercase tracking-tight mt-1">Championship Standings</h1>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-4">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <USkeleton v-for="i in 3" :key="i" class="h-40 rounded-2xl" />
      </div>
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
    </div>

    <div v-else-if="!leaderboard?.length" class="text-center py-20">
      <UIcon name="i-lucide-trophy" class="size-16 mx-auto mb-4 text-zinc-800" />
      <p class="text-xl font-bold mb-1">No results yet</p>
      <p class="text-zinc-500">The championship standings will appear after the first race result is entered.</p>
    </div>

    <template v-else>
      <div v-if="leaderboard.length >= 3" class="grid grid-cols-3 gap-3 mb-8">
        <div class="rounded-2xl border border-zinc-400/20 bg-zinc-900/50 p-5 text-center mt-8">
          <div class="size-12 mx-auto rounded-full bg-zinc-400/20 ring-2 ring-zinc-400/30 flex items-center justify-center text-xl font-black text-zinc-300 mb-3">2</div>
          <p class="font-bold truncate">{{ leaderboard[1].userName }}</p>
          <p class="text-2xl font-black mt-1 tabular-nums">{{ leaderboard[1].totalPoints }}</p>
          <p class="text-xs text-zinc-500">{{ leaderboard[1].raceWins }}W / {{ leaderboard[1].totalExactHits }}E</p>
        </div>
        <div class="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-center">
          <UIcon name="i-lucide-crown" class="size-6 mx-auto text-yellow-500 mb-2" />
          <div class="size-14 mx-auto rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/30 flex items-center justify-center text-2xl font-black text-yellow-400 mb-3">1</div>
          <p class="font-bold text-lg truncate">{{ leaderboard[0].userName }}</p>
          <p class="text-3xl font-black mt-1 tabular-nums text-yellow-400">{{ leaderboard[0].totalPoints }}</p>
          <p class="text-xs text-zinc-500">{{ leaderboard[0].raceWins }}W / {{ leaderboard[0].totalExactHits }}E</p>
        </div>
        <div class="rounded-2xl border border-amber-700/20 bg-zinc-900/50 p-5 text-center mt-12">
          <div class="size-12 mx-auto rounded-full bg-amber-700/20 ring-2 ring-amber-700/30 flex items-center justify-center text-xl font-black text-amber-500 mb-3">3</div>
          <p class="font-bold truncate">{{ leaderboard[2].userName }}</p>
          <p class="text-2xl font-black mt-1 tabular-nums">{{ leaderboard[2].totalPoints }}</p>
          <p class="text-xs text-zinc-500">{{ leaderboard[2].raceWins }}W / {{ leaderboard[2].totalExactHits }}E</p>
        </div>
      </div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          <span class="w-8">Pos</span>
          <span>Driver</span>
          <span class="text-center hidden sm:block">Wins</span>
          <span class="text-center hidden sm:block">Exact</span>
          <span class="text-right">Points</span>
        </div>
        <div
          v-for="(player, index) in leaderboard"
          :key="player.userId"
          class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-zinc-800/50 last:border-0 transition-colors"
          :class="player.userId === user?.id ? 'bg-[#E10600]/5' : ''"
        >
          <PositionBadge :position="index + 1" size="sm" />
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-semibold truncate" :class="player.userId === user?.id ? 'text-[#E10600]' : ''">{{ player.userName }}</span>
            <span v-if="player.userId === user?.id" class="text-[10px] text-[#E10600] font-bold uppercase tracking-wider">You</span>
          </div>
          <span class="text-center text-sm text-zinc-400 tabular-nums hidden sm:block">{{ player.raceWins }}</span>
          <span class="text-center text-sm text-zinc-400 tabular-nums hidden sm:block">{{ player.totalExactHits }}</span>
          <span class="text-right font-black text-lg tabular-nums">{{ player.totalPoints }}</span>
        </div>
      </div>
    </template>
  </UContainer>
</template>
