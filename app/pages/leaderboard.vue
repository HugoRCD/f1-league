<script setup lang="ts">
const lastLeague = useLastLeague()

watch(lastLeague, (l) => {
  if (l) {
    navigateTo(`/leagues/${l.slug}/leaderboard`, { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <UContainer class="py-16 text-center">
    <UIcon name="i-lucide-trophy" class="size-16 mx-auto mb-4 text-zinc-800" />
    <p class="text-xl font-bold mb-2">
      Join a league first
    </p>
    <p class="text-zinc-400 mb-6">
      Leaderboards are now per-league. Create or join a league to see standings.
    </p>
    <div class="flex items-center justify-center gap-3">
      <UButton to="/leagues/create" label="Create a league" class="bg-[#E10600] hover:bg-[#c00500] border-0" />
      <UButton to="/leagues/join" label="Join a league" variant="outline" />
    </div>
  </UContainer>
</template>
