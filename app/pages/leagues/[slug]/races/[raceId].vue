<script setup lang="ts">
import draggable from 'vuedraggable'

const route = useRoute()
const toast = useToast()
const raceId = route.params.raceId as string
const { league, leagueId, isLeagueAdmin } = useCurrentLeague()
const { data: leagues } = useLeagues()

const { data: race, status: raceStatus } = useCachedFetch(`/api/races/${raceId}`)
const { data: drivers } = useCachedFetch<any[]>('/api/drivers')

useHead({
  title: computed(() => race.value ? `${race.value.name} — ${league.value?.name ?? 'League'}` : 'Race'),
})

const { data: myPrediction, refresh: refreshPrediction } = useFetch<any>(
  () => `/api/leagues/${leagueId.value}/predictions/${raceId}`,
  { immediate: false },
)

const { data: standings, refresh: refreshStandings } = useLazyFetch<any>(
  () => `/api/leagues/${leagueId.value}/races/${raceId}/standings`,
  { immediate: false },
)

const { data: allPredictions, execute: fetchAllPredictions } = useLazyFetch<any>(
  () => `/api/leagues/${leagueId.value}/predictions/${raceId}/all`,
  { immediate: false },
)

watch(leagueId, (id) => {
  if (id) {
    refreshPrediction()
    refreshStandings()
  }
}, { immediate: true })

const activeDrivers = computed<any[]>(() => drivers.value?.filter((d: any) => d.active) ?? [])
const saving = ref(false)
const expandedStanding = ref<string | null>(null)

const isLocked = computed(() => race.value?.locked ?? false)
const isOpen = computed(() => race.value?.open ?? false)
const canPredict = computed(() => isOpen.value && !isLocked.value)

function driverById(id: string) {
  return activeDrivers.value.find((d: any) => d.id === id)
}

const { draft: predictionDraft, setFromServer: setDraftFromServer, clear: clearDraft } = usePredictionDraft(leagueId, raceId)

const predictionList = computed({
  get: () => predictionDraft.value.map(id => ({ id })),
  set: (val: { id: string }[]) => {
    predictionDraft.value = val.map(d => d.id)
  },
})

const availableDrivers = computed(() => {
  const usedIds = new Set(predictionDraft.value)
  return activeDrivers.value.filter((d: any) => !usedIds.has(d.id))
})

watch(myPrediction, (p) => {
  if (p?.positions) {
    setDraftFromServer(p.positions as string[])
  }
}, { immediate: true })

const filledCount = computed(() => predictionDraft.value.length)
const canSubmit = computed(() => canPredict.value && predictionDraft.value.length === 10)

function addDriver(driverId: string) {
  if (predictionDraft.value.length >= 10) return
  if (predictionDraft.value.includes(driverId)) return
  predictionDraft.value = [...predictionDraft.value, driverId]
}

function removeDriver(index: number) {
  predictionDraft.value = predictionDraft.value.filter((_, i) => i !== index)
}

function moveUp(index: number) {
  if (index <= 0) return
  const arr = [...predictionDraft.value]
  ;[arr[index - 1], arr[index]] = [arr[index]!, arr[index - 1]!]
  predictionDraft.value = arr
}

function moveDown(index: number) {
  if (index >= predictionDraft.value.length - 1) return
  const arr = [...predictionDraft.value]
  ;[arr[index], arr[index + 1]] = [arr[index + 1]!, arr[index]!]
  predictionDraft.value = arr
}

function clearPrediction() {
  clearDraft()
}

async function submitPrediction() {
  if (!canSubmit.value || !leagueId.value) return
  saving.value = true
  try {
    await $fetch(`/api/leagues/${leagueId.value}/predictions/${raceId}`, {
      method: 'POST',
      body: { positions: predictionDraft.value },
    })
    toast.add({ title: 'Prediction saved!', color: 'success', icon: 'i-lucide-check' })
    await Promise.all([refreshPrediction(), refreshPredictionStatus()])
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message || 'Failed to save', color: 'error' })
  } finally {
    saving.value = false
  }
}

const otherLeagues = computed(() => {
  if (!leagues.value || !leagueId.value) return []
  return leagues.value.filter(l => l.id !== leagueId.value)
})

const importing = ref(false)

async function importFrom(fromLeagueId: string) {
  if (!leagueId.value) return
  importing.value = true
  try {
    await $fetch(`/api/leagues/${leagueId.value}/predictions/${raceId}/import`, {
      method: 'POST',
      body: { fromLeagueId },
    })
    toast.add({ title: 'Prediction imported!', color: 'success', icon: 'i-lucide-check' })
    await Promise.all([refreshPrediction(), refreshPredictionStatus()])
  } catch (e: any) {
    toast.add({ title: 'Import failed', description: e?.data?.message || 'Could not import', color: 'error' })
  } finally {
    importing.value = false
  }
}

watch(isLocked, async (locked) => {
  if (locked) {
    await fetchAllPredictions()
    await refreshStandings()
  }
}, { immediate: true })

const raceResult = computed(() => (race.value as any)?.result as string[] | null ?? null)

const predictionScoring = computed(() => {
  if (!myPrediction.value?.positions || !raceResult.value) return null
  const predicted = myPrediction.value.positions as string[]
  const result = raceResult.value
  const details: { driverId: string, predicted: number, actual: number | null, points: number, diff: number | null }[] = []
  let total = 0
  let exactHits = 0

  for (let i = 0; i < predicted.length; i++) {
    const driverId = predicted[i]!
    const actualIndex = result.indexOf(driverId)

    if (actualIndex === -1) {
      details.push({ driverId, predicted: i + 1, actual: null, points: 0, diff: null })
      continue
    }

    const d = Math.abs(i - actualIndex)
    let points = 1
    if (d === 0) {
      points = 5
      exactHits++
    } else if (d === 1) {
      points = 3 
    } else if (d === 2) {
      points = 2 
    }

    total += points
    details.push({ driverId, predicted: i + 1, actual: actualIndex + 1, diff: d, points })
  }

  return { details, total, exactHits }
})

function scoringColor(diff: number | null): string {
  if (diff === null) return 'text-red-400 bg-red-500/10'
  if (diff === 0) return 'text-emerald-400 bg-emerald-500/10'
  if (diff === 1) return 'text-yellow-400 bg-yellow-500/10'
  if (diff === 2) return 'text-orange-400 bg-orange-500/10'
  return 'text-zinc-500 bg-zinc-800/50'
}

function scorePrediction(positions: string[]) {
  if (!raceResult.value) return null
  const result = raceResult.value
  const details: { driverId: string, predicted: number, actual: number | null, points: number, diff: number | null }[] = []
  let total = 0
  let exactHits = 0

  for (let i = 0; i < positions.length; i++) {
    const driverId = positions[i]!
    const actualIndex = result.indexOf(driverId)

    if (actualIndex === -1) {
      details.push({ driverId, predicted: i + 1, actual: null, points: 0, diff: null })
      continue
    }

    const d = Math.abs(i - actualIndex)
    let points = 1
    if (d === 0) {
      points = 5
      exactHits++
    } else if (d === 1) {
      points = 3 
    } else if (d === 2) {
      points = 2 
    }

    total += points
    details.push({ driverId, predicted: i + 1, actual: actualIndex + 1, diff: d, points })
  }

  return { details, total, exactHits }
}

const raceRound = computed(() => (race.value as any)?.round ?? null)
const qualifyingGrid = shallowRef<any[]>([])
const hasQuali = computed(() => qualifyingGrid.value.length > 0)

const f1RaceData = shallowRef<any[]>([])
watch(raceRound, async (round) => {
  if (!round) return
  if (raceResult.value) {
    try {
      f1RaceData.value = await $fetch<any[]>(`/api/f1/race/${round}`)
    } catch {
      f1RaceData.value = [] 
    }
  }
}, { immediate: true })

watch(raceRound, async (round) => {
  if (!round) return
  try {
    const data = await $fetch<any[]>(`/api/f1/qualifying/${round}`)
    qualifyingGrid.value = data ?? []
  } catch {
    qualifyingGrid.value = [] 
  }
}, { immediate: true })

function useQualifyingOrder() {
  const grid = qualifyingGrid.value as any[]
  if (!grid?.length) return
  const top10 = grid.slice(0, 10)
  const ids: string[] = []
  for (const entry of top10) {
    const surname = (entry.driverName as string).split(' ').pop()?.toLowerCase() ?? ''
    const match = activeDrivers.value.find((d: any) => d.lastName.toLowerCase() === surname)
    if (match && !ids.includes(match.id)) {
      ids.push(match.id)
    }
  }
  predictionDraft.value = ids
}

const driverSearch = ref('')
const filteredAvailableDrivers = computed(() => {
  if (!driverSearch.value) return availableDrivers.value
  const q = driverSearch.value.toLowerCase()
  return availableDrivers.value.filter((d: any) =>
    d.firstName.toLowerCase().includes(q)
    || d.lastName.toLowerCase().includes(q)
    || d.teamName.toLowerCase().includes(q)
    || String(d.number).includes(q),
  )
})

const { data: predictionStatus, refresh: refreshPredictionStatus } = useFetch<{
  total: number
  submitted: number
  members: { userId: string, userName: string, userImage: string | null, hasPredicted: boolean }[]
}>(
  () => `/api/leagues/${leagueId.value}/predictions/${raceId}/status`,
  { immediate: false },
)

watch(leagueId, (id) => {
  if (id) refreshPredictionStatus()
}, { immediate: true })

const predictedMembers = computed(() => predictionStatus.value?.members?.filter(m => m.hasPredicted) ?? [])
const notPredictedMembers = computed(() => predictionStatus.value?.members?.filter(m => !m.hasPredicted) ?? [])

const { data: driverStandings } = useCachedFetch('/api/f1/standings/drivers')
const sidebarTab = ref<'grid' | 'championship'>(hasQuali.value ? 'grid' : 'championship')

watch(hasQuali, (has) => {
  if (!has) sidebarTab.value = 'championship'
})

const teamColorMap: Record<string, string> = {
  mclaren: '#FF8000', ferrari: '#E8002D', red_bull: '#3671C6', mercedes: '#27F4D2',
  aston_martin: '#229971', alpine: '#FF87BC', haas: '#B6BABD', rb: '#6692FF',
  williams: '#64C4FF', audi: '#C0C0C0', cadillac: '#1E1E1E',
}
</script>

<template>
  <UContainer class="py-8">
    <div v-if="raceStatus === 'pending'" class="flex flex-col gap-4">
      <USkeleton class="h-4 w-32" />
      <USkeleton class="h-44 w-full rounded-2xl" />
      <USkeleton class="h-6 w-40 mt-4" />
      <div class="flex flex-col gap-2">
        <USkeleton v-for="i in 10" :key="i" class="h-12 w-full rounded-xl" />
      </div>
    </div>

    <template v-else-if="race">
      <NuxtLink :to="`/leagues/${league?.slug}`" class="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4">
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ league?.name }}
      </NuxtLink>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-8">
        <div class="h-1" :class="(race as any).result ? 'bg-linear-to-r from-yellow-500 via-zinc-400 to-amber-700' : 'bg-[#E10600]'" />
        <div class="p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black uppercase tracking-tight">
                {{ race.name }}
              </h1>
              <div class="flex items-center gap-3 text-sm text-zinc-400 mt-2">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-map-pin" class="size-3.5" />
                  {{ race.location }}
                </span>
                <span class="text-zinc-600">|</span>
                <span>{{ new Date(race.startAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }}</span>
              </div>
            </div>
            <RaceStatusBadge :has-result="!!(race as any).result" :locked="isLocked" :open="isOpen" />
          </div>
          <div v-if="!isLocked" class="mt-4 pt-4 border-t border-zinc-800">
            <div v-if="isOpen">
              <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Predictions lock in
              </p>
              <CountdownTimer :target-date="(race as any).lockTime" />
            </div>
            <div v-else>
              <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Predictions open in
              </p>
              <CountdownTimer :target-date="(race as any).openTime" />
            </div>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div v-if="!isLocked && !isOpen" class="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <UIcon name="i-lucide-clock" class="size-10 mx-auto mb-3 text-zinc-600" />
            <p class="font-bold mb-1">
              Predictions not open yet
            </p>
            <p class="text-sm text-zinc-500">
              Predictions open {{ new Date((race as any).openTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
              at {{ new Date((race as any).openTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}.
            </p>
          </div>

          <div v-if="canPredict" class="mb-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-black uppercase tracking-tight">
                Your Prediction
              </h2>
              <div class="flex items-center gap-3">
                <span class="text-sm text-zinc-500 tabular-nums">{{ filledCount }}/10</span>
                <UButton
                  v-if="filledCount > 0"
                  label="Clear"
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="clearPrediction"
                />
              </div>
            </div>

            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-4">
              <draggable v-model="predictionList" item-key="id" :animation="200" ghost-class="opacity-30" class="flex flex-col">
                <template #item="{ element, index }">
                  <div class="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 last:border-0 bg-zinc-900/80 hover:bg-zinc-800/50 transition-colors cursor-grab active:cursor-grabbing">
                    <UIcon name="i-lucide-grip-vertical" class="size-4 text-zinc-600 shrink-0 hidden sm:block" />
                    <PositionBadge :position="index + 1" size="sm" />
                    <div class="flex-1 min-w-0">
                      <DriverBadge v-if="driverById(element.id)" v-bind="driverById(element.id)!" compact />
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <UButton
                        icon="i-lucide-chevron-up"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        :disabled="index === 0"
                        class="sm:hidden"
                        @click="moveUp(index)"
                      />
                      <UButton
                        icon="i-lucide-chevron-down"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        :disabled="index === predictionList.length - 1"
                        class="sm:hidden"
                        @click="moveDown(index)"
                      />
                      <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="removeDriver(index)" />
                    </div>
                  </div>
                </template>
              </draggable>
              <div v-for="i in Math.max(0, 10 - predictionList.length)" :key="`empty-${i}`" class="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/20 last:border-0">
                <div class="size-4 shrink-0 hidden sm:block" />
                <PositionBadge :position="predictionList.length + i" size="sm" />
                <div class="flex-1 flex items-center gap-2">
                  <div class="h-4 rounded bg-zinc-800/50 animate-pulse" :style="{ width: `${60 + (i * 7) % 40}%` }" />
                </div>
              </div>
            </div>

            <div v-if="availableDrivers.length > 0">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold">
                  Tap to add
                </p>
                <UInput
                  v-if="availableDrivers.length > 6"
                  v-model="driverSearch"
                  placeholder="Filter..."
                  icon="i-lucide-search"
                  size="xs"
                  class="w-36"
                />
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="d in filteredAvailableDrivers"
                  :key="d.id"
                  class="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-600 hover:scale-105 active:scale-95 transition-all text-left"
                  :class="predictionList.length >= 10 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'"
                  :disabled="predictionList.length >= 10"
                  @click="addDriver(d.id)"
                >
                  <div class="w-0.5 h-4 rounded-full shrink-0" :style="{ backgroundColor: d.teamColor }" />
                  <span class="text-xs text-zinc-400">#{{ d.number }}</span>
                  <span class="text-xs font-semibold text-zinc-200">{{ d.lastName }}</span>
                </button>
              </div>
            </div>

            <div class="mt-5">
              <UButton
                :label="myPrediction ? 'Update prediction' : 'Lock in your Top 10'"
                :icon="myPrediction ? 'i-lucide-check' : 'i-lucide-send'"
                :disabled="!canSubmit"
                :loading="saving"
                size="xl"
                block
                class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
                @click="submitPrediction"
              />
              <p v-if="myPrediction" class="text-center text-xs text-zinc-500 mt-2">
                Last saved {{ new Date(myPrediction.updatedAt).toLocaleString() }}
              </p>
            </div>
          </div>

          <div v-if="isLocked && !myPrediction" class="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <UIcon name="i-lucide-circle-slash" class="size-8 mx-auto mb-2 text-zinc-600" />
            <p class="font-bold text-sm mb-1">
              No prediction submitted
            </p>
            <p class="text-xs text-zinc-500">
              You didn't submit a prediction for this race in this league.
            </p>
          </div>

          <div v-if="isLocked && !(race as any)?.result" class="mb-8 rounded-xl border border-yellow-900/30 bg-yellow-950/10 p-6 text-center">
            <UIcon name="i-lucide-clock" class="size-8 mx-auto mb-2 text-yellow-500/60" />
            <p class="font-bold text-sm mb-1">
              Waiting for race results
            </p>
            <p class="text-xs text-zinc-500 mb-3">
              Results will appear here once the race is finished and data is imported.
            </p>
            <UButton
              v-if="isLeagueAdmin"
              :to="`/leagues/${league?.slug}/settings`"
              label="Import results"
              icon="i-lucide-download"
              variant="outline"
              size="sm"
            />
          </div>

          <div v-if="isLocked && myPrediction" class="mb-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-black uppercase tracking-tight">
                Your Prediction
              </h2>
              <div v-if="predictionScoring" class="flex items-center gap-3">
                <span class="text-sm text-zinc-500">{{ predictionScoring.exactHits }} exact</span>
                <span class="font-black text-lg tabular-nums">{{ predictionScoring.total }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
              </div>
            </div>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div
                v-for="(driverId, index) in (myPrediction.positions as string[])"
                :key="driverId"
                class="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0"
              >
                <PositionBadge :position="index + 1" size="sm" />
                <div class="flex-1 min-w-0">
                  <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" />
                </div>
                <template v-if="predictionScoring?.details?.[index]">
                  <span
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0"
                    :class="scoringColor(predictionScoring.details[index]?.diff ?? null)"
                  >
                    {{ predictionScoring.details[index]?.actual ? `P${predictionScoring.details[index]!.actual}` : '—' }}
                  </span>
                  <span class="text-xs font-bold tabular-nums w-6 text-right shrink-0" :class="(predictionScoring.details[index]?.points ?? 0) > 0 ? 'text-white' : 'text-zinc-600'">
                    +{{ predictionScoring.details[index]?.points ?? 0 }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <div v-if="(race as any).result" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              Official Result
            </h2>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div
                v-for="(driverId, index) in ((race as any).result as string[])"
                :key="driverId"
                class="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0"
                :class="index < 3 ? 'bg-zinc-800/30' : ''"
              >
                <PositionBadge :position="index + 1" size="sm" />
                <div class="flex-1 min-w-0">
                  <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" />
                </div>
                <template v-if="f1RaceData.length > 0">
                  <span v-if="f1RaceData[index]?.time" class="text-xs text-zinc-500 tabular-nums hidden sm:inline">{{ f1RaceData[index].time }}</span>
                  <span
                    v-if="f1RaceData[index]?.status && f1RaceData[index].status !== 'Finished' && f1RaceData[index].status !== 'Lapped'"
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400"
                  >
                    {{ f1RaceData[index].status }}
                  </span>
                  <span
                    v-else-if="f1RaceData[index]?.status === 'Lapped'"
                    class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500"
                  >
                    Lapped
                  </span>
                </template>
              </div>
            </div>
          </div>

          <div v-if="(standings as any)?.standings" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              Race Standings
            </h2>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <template v-for="(player, index) in ((standings as any).standings as any[])" :key="player.userId">
                <div
                  class="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  @click="expandedStanding = expandedStanding === player.userId ? null : player.userId"
                >
                  <PositionBadge :position="(index as number) + 1" size="sm" />
                  <UserAvatar :image="player.userImage" :name="player.userName" size="sm" />
                  <span class="flex-1 font-semibold">{{ player.userName }}</span>
                  <div class="flex items-center gap-4 text-sm">
                    <span class="text-zinc-500">{{ player.exactHits }} exact</span>
                    <span class="font-black text-lg tabular-nums">{{ player.total }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
                    <UIcon :name="expandedStanding === player.userId ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-zinc-600" />
                  </div>
                </div>
                <div v-if="expandedStanding === player.userId && player.details" class="border-b border-zinc-800/50 bg-zinc-900/80 px-4 py-2">
                  <div v-for="(detail, di) in player.details" :key="di" class="flex items-center gap-2 py-1">
                    <span class="w-5 text-right text-xs font-bold text-zinc-500 tabular-nums">{{ detail.predicted }}</span>
                    <div class="flex-1 min-w-0">
                      <DriverBadge v-if="driverById(detail.driverId)" v-bind="driverById(detail.driverId)!" compact />
                    </div>
                    <span
                      class="text-[10px] font-bold px-1 py-0.5 rounded tabular-nums shrink-0"
                      :class="scoringColor(detail.actual !== null ? Math.abs(detail.predicted - detail.actual) : null)"
                    >
                      {{ detail.actual ? `P${detail.actual}` : '—' }}
                    </span>
                    <span class="text-[10px] font-bold tabular-nums w-5 text-right shrink-0" :class="detail.points > 0 ? 'text-white' : 'text-zinc-700'">
                      +{{ detail.points }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="canPredict" class="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-center">
            <UIcon name="i-lucide-eye-off" class="size-8 mx-auto mb-2 text-zinc-600" />
            <p class="text-sm text-zinc-400">
              Everyone's predictions will be revealed once the race is locked.
            </p>
          </div>

          <div v-if="(allPredictions as any[])?.length" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              All Predictions
              <span class="text-sm font-normal text-zinc-500 ml-2">{{ (allPredictions as any[]).length }} player{{ (allPredictions as any[]).length > 1 ? 's' : '' }}</span>
            </h2>
            <div class="grid gap-4" :class="(allPredictions as any[]).length > 1 ? 'sm:grid-cols-2' : ''">
              <div v-for="pred in (allPredictions as any[])" :key="pred.userId" class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div class="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UserAvatar :image="pred.userImage" :name="pred.userName" size="sm" />
                    <span class="font-bold text-sm">{{ pred.userName }}</span>
                  </div>
                  <span v-if="raceResult && scorePrediction(pred.positions as string[])" class="font-black tabular-nums text-sm">
                    {{ scorePrediction(pred.positions as string[])!.total }}<span class="text-[10px] text-zinc-500 font-normal ml-0.5">pts</span>
                  </span>
                </div>
                <div v-for="(driverId, index) in (pred.positions as string[])" :key="driverId" class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0 text-sm">
                  <span class="w-5 text-right text-xs font-bold text-zinc-500 tabular-nums">{{ index + 1 }}</span>
                  <div class="flex-1 min-w-0">
                    <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" compact />
                  </div>
                  <template v-if="raceResult">
                    <span
                      class="text-[10px] font-bold px-1 py-0.5 rounded tabular-nums shrink-0"
                      :class="scoringColor(scorePrediction(pred.positions as string[])?.details[index]?.diff ?? null)"
                    >
                      {{ scorePrediction(pred.positions as string[])?.details[index as number]?.actual ? `P${scorePrediction(pred.positions as string[])!.details[index as number]!.actual}` : '—' }}
                    </span>
                    <span class="text-[10px] font-bold tabular-nums w-5 text-right shrink-0" :class="(scorePrediction(pred.positions as string[])?.details[index]?.points ?? 0) > 0 ? 'text-white' : 'text-zinc-700'">
                      +{{ scorePrediction(pred.positions as string[])?.details[index]?.points ?? 0 }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="canPredict && hasQuali"
            class="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            @click="useQualifyingOrder"
          >
            <UIcon name="i-lucide-wand-sparkles" class="size-3.5" />
            Auto-fill from starting grid
          </button>

          <UPopover v-if="canPredict && otherLeagues.length > 0">
            <button
              class="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              :disabled="importing"
            >
              <UIcon name="i-lucide-download" class="size-3.5" />
              Import from another league
            </button>
            <template #content>
              <div class="w-56 p-1">
                <button
                  v-for="l in otherLeagues"
                  :key="l.id"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
                  @click="importFrom(l.id)"
                >
                  {{ l.name }}
                </button>
              </div>
            </template>
          </UPopover>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div class="flex border-b border-zinc-800">
              <button
                v-if="hasQuali"
                class="flex-1 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors"
                :class="sidebarTab === 'grid' ? 'text-white bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'"
                @click="sidebarTab = 'grid'"
              >
                Starting Grid
              </button>
              <button
                class="flex-1 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors"
                :class="sidebarTab === 'championship' ? 'text-white bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'"
                @click="sidebarTab = 'championship'"
              >
                Championship
              </button>
            </div>

            <div v-if="sidebarTab === 'grid' && hasQuali">
              <UTooltip v-for="(entry, index) in (qualifyingGrid as any[])" :key="index" :text="`P${entry.position} ${entry.driverName} — ${entry.teamName}`">
                <div class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0 cursor-default" :class="index < 10 ? '' : 'opacity-40'">
                  <span class="w-4 text-right text-[10px] font-black tabular-nums" :class="index < 3 ? 'text-yellow-500' : 'text-zinc-600'">{{ entry.position }}</span>
                  <div class="w-0.5 h-3 rounded-full" :style="{ backgroundColor: teamColorMap[entry.teamId] || '#666' }" />
                  <span class="text-xs font-bold text-zinc-500 w-7">{{ entry.driverCode }}</span>
                  <span class="flex-1 text-xs truncate">{{ entry.driverName }}</span>
                  <span v-if="entry.q3" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q3 }}</span>
                  <span v-else-if="entry.q2" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q2 }}</span>
                  <span v-else-if="entry.q1" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q1 }}</span>
                </div>
              </UTooltip>
            </div>

            <div v-if="sidebarTab === 'championship' && (driverStandings as any[])?.length">
              <UTooltip v-for="(d, i) in (driverStandings as any[]).slice(0, 22)" :key="i" :text="`${d.driverName} — ${d.teamId?.replace('_', ' ')} — ${d.points}pts, ${d.wins}W`">
                <div class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0 cursor-default">
                  <span class="w-4 text-right text-[10px] font-black tabular-nums" :class="i < 3 ? 'text-yellow-500' : 'text-zinc-600'">{{ d.position }}</span>
                  <div class="w-0.5 h-3 rounded-full" :style="{ backgroundColor: teamColorMap[d.teamId] || '#666' }" />
                  <span class="flex-1 text-xs truncate">{{ d.driverName }}</span>
                  <span class="text-[10px] font-bold tabular-nums text-zinc-400">{{ d.points }}</span>
                </div>
              </UTooltip>
            </div>
          </div>

          <div v-if="predictionStatus && !isLocked" class="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div class="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">Predictions</span>
              <span class="text-xs font-bold tabular-nums">
                <span class="text-white">{{ predictionStatus.submitted }}</span>
                <span class="text-zinc-600">/{{ predictionStatus.total }}</span>
              </span>
            </div>
            <div class="px-3 py-2">
              <div class="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-3">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  :style="{ width: `${predictionStatus.total > 0 ? (predictionStatus.submitted / predictionStatus.total) * 100 : 0}%` }"
                />
              </div>
              <div v-if="predictedMembers.length > 0" class="mb-2">
                <p class="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-semibold mb-1.5">
                  Submitted
                </p>
                <div class="flex flex-col gap-1">
                  <div v-for="m in predictedMembers" :key="m.userId" class="flex items-center gap-2 py-0.5">
                    <UserAvatar :image="m.userImage" :name="m.userName" size="sm" />
                    <span class="text-xs text-zinc-300 truncate">{{ m.userName }}</span>
                    <UIcon name="i-lucide-check" class="size-3.5 text-emerald-500 shrink-0 ml-auto" />
                  </div>
                </div>
              </div>
              <div v-if="notPredictedMembers.length > 0">
                <p class="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-semibold mb-1.5">
                  Waiting
                </p>
                <div class="flex flex-col gap-1">
                  <div v-for="m in notPredictedMembers" :key="m.userId" class="flex items-center gap-2 py-0.5">
                    <UserAvatar :image="m.userImage" :name="m.userName" size="sm" />
                    <span class="text-xs text-zinc-500 truncate">{{ m.userName }}</span>
                    <UIcon name="i-lucide-clock" class="size-3.5 text-zinc-700 shrink-0 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UContainer>
</template>
