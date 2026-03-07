<script setup lang="ts">
import draggable from 'vuedraggable'

definePageMeta({ auth: 'user' })

const route = useRoute()
const toast = useToast()
const raceId = route.params.raceId as string

const { data: race, status: raceStatus } = useFetch(`/api/races/${raceId}`)

useHead({
  title: computed(() => race.value ? `${race.value.name} — F1 League` : 'Race — F1 League'),
})

const { data: drivers } = useFetch('/api/drivers')
const { data: myPrediction, refresh: refreshPrediction } = useFetch(`/api/predictions/${raceId}`)
const { data: standings, refresh: refreshStandings } = useFetch(`/api/races/${raceId}/standings`)
const { data: allPredictions, execute: fetchAllPredictions } = useFetch(`/api/predictions/${raceId}/all`, { immediate: false })

const activeDrivers = computed(() => drivers.value?.filter(d => d.active) ?? [])
const saving = ref(false)

const isLocked = computed(() => race.value?.locked ?? false)
const isOpen = computed(() => race.value?.open ?? false)
const canPredict = computed(() => isOpen.value && !isLocked.value)

function driverById(id: string) {
  return activeDrivers.value.find(d => d.id === id)
}

const predictionList = ref<{ id: string }[]>([])

const availableDrivers = computed(() => {
  const usedIds = new Set(predictionList.value.map(d => d.id))
  return activeDrivers.value.filter(d => !usedIds.has(d.id))
})

watch(myPrediction, (p) => {
  if (p?.positions) {
    predictionList.value = (p.positions as string[]).map(id => ({ id }))
  }
}, { immediate: true })

const filledCount = computed(() => predictionList.value.length)
const canSubmit = computed(() => canPredict.value && predictionList.value.length === 10)

function addDriver(driverId: string) {
  if (predictionList.value.length >= 10) return
  if (predictionList.value.some(d => d.id === driverId)) return
  predictionList.value.push({ id: driverId })
}

function removeDriver(index: number) {
  predictionList.value.splice(index, 1)
}

function moveUp(index: number) {
  if (index <= 0) return
  const item = predictionList.value.splice(index, 1)[0]
  predictionList.value.splice(index - 1, 0, item)
}

function moveDown(index: number) {
  if (index >= predictionList.value.length - 1) return
  const item = predictionList.value.splice(index, 1)[0]
  predictionList.value.splice(index + 1, 0, item)
}

function clearPrediction() {
  predictionList.value = []
}

async function submitPrediction() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await $fetch(`/api/predictions/${raceId}`, {
      method: 'POST',
      body: { positions: predictionList.value.map(d => d.id) },
    })
    toast.add({ title: 'Prediction saved!', color: 'success', icon: 'i-lucide-check' })
    await refreshPrediction()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message || 'Failed to save', color: 'error' })
  } finally {
    saving.value = false
  }
}

watch(isLocked, async (locked) => {
  if (locked) {
    await fetchAllPredictions()
    await refreshStandings()
  }
}, { immediate: true })

const raceRound = computed(() => race.value?.round ?? null)
const qualifyingGrid = ref<any[]>([])
const hasQuali = computed(() => qualifyingGrid.value.length > 0)

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
  const newList: { id: string }[] = []
  for (const entry of top10) {
    const surname = (entry.driverName as string).split(' ').pop()?.toLowerCase() ?? ''
    const match = activeDrivers.value.find(d => d.lastName.toLowerCase() === surname)
    if (match && !newList.some(x => x.id === match.id)) {
      newList.push({ id: match.id })
    }
  }
  predictionList.value = newList
}

const driverSearch = ref('')
const filteredAvailableDrivers = computed(() => {
  if (!driverSearch.value) return availableDrivers.value
  const q = driverSearch.value.toLowerCase()
  return availableDrivers.value.filter(d =>
    d.firstName.toLowerCase().includes(q)
    || d.lastName.toLowerCase().includes(q)
    || d.teamName.toLowerCase().includes(q)
    || String(d.number).includes(q),
  )
})

const { data: driverStandings } = useCachedFetch('/api/f1/standings/drivers')
const sidebarTab = ref<'grid' | 'championship'>('grid')

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
      <NuxtLink to="/races" class="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4">
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Back to calendar
      </NuxtLink>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden mb-8">
        <div class="h-1" :class="race.result ? 'bg-linear-to-r from-yellow-500 via-zinc-400 to-amber-700' : 'bg-[#E10600]'" />
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
            <RaceStatusBadge :has-result="!!race.result" :locked="isLocked" :open="isOpen" />
          </div>

          <div v-if="!isLocked" class="mt-4 pt-4 border-t border-zinc-800">
            <div v-if="isOpen">
              <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Predictions lock in
              </p>
              <CountdownTimer :target-date="race.lockTime" />
            </div>
            <div v-else>
              <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                Predictions open in
              </p>
              <CountdownTimer :target-date="race.openTime" />
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
              Predictions open {{ new Date(race.openTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
              at {{ new Date(race.openTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}.
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
              <draggable
                v-model="predictionList"
                item-key="id"
                handle=".drag-handle"
                :animation="200"
                ghost-class="opacity-30"
                class="flex flex-col"
              >
                <template #item="{ element, index }">
                  <div class="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 last:border-0 bg-zinc-900/80 hover:bg-zinc-800/50 transition-colors">
                    <UIcon name="i-lucide-grip-vertical" class="drag-handle size-4 text-zinc-600 cursor-grab active:cursor-grabbing shrink-0 hidden sm:block" />
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

          <div v-if="isLocked && myPrediction" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              Your Prediction
            </h2>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div v-for="(driverId, index) in (myPrediction.positions as string[])" :key="driverId" class="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0">
                <PositionBadge :position="index + 1" size="sm" />
                <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" />
              </div>
            </div>
          </div>

          <div v-if="race.result" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              Official Result
            </h2>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div v-for="(driverId, index) in (race.result as string[])" :key="driverId" class="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0" :class="index < 3 ? 'bg-zinc-800/30' : ''">
                <PositionBadge :position="index + 1" size="sm" />
                <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" />
              </div>
            </div>
          </div>

          <div v-if="standings?.standings" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              Race Standings
            </h2>
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div v-for="(player, index) in standings.standings" :key="player.userId" class="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 last:border-0">
                <PositionBadge :position="index + 1" size="sm" />
                <span class="flex-1 font-semibold">{{ player.userName }}</span>
                <div class="flex items-center gap-4 text-sm">
                  <span class="text-zinc-500">{{ player.exactHits }} exact</span>
                  <span class="font-black text-lg tabular-nums">{{ player.total }}<span class="text-xs text-zinc-500 font-normal ml-0.5">pts</span></span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="canPredict" class="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 text-center">
            <UIcon name="i-lucide-eye-off" class="size-8 mx-auto mb-2 text-zinc-600" />
            <p class="text-sm text-zinc-400">
              Everyone's predictions will be revealed once the race is locked.
            </p>
          </div>

          <div v-if="allPredictions?.length" class="mb-8">
            <h2 class="text-lg font-black uppercase tracking-tight mb-4">
              All Predictions
              <span class="text-sm font-normal text-zinc-500 ml-2">{{ allPredictions.length }} player{{ allPredictions.length > 1 ? 's' : '' }}</span>
            </h2>
            <div class="grid gap-4" :class="allPredictions.length > 1 ? 'sm:grid-cols-2' : ''">
              <div v-for="pred in allPredictions" :key="pred.id" class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div class="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30">
                  <span class="font-bold text-sm">{{ pred.userName }}</span>
                </div>
                <div v-for="(driverId, index) in (pred.positions as string[])" :key="driverId" class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0 text-sm">
                  <span class="w-5 text-right text-xs font-bold text-zinc-500 tabular-nums">{{ index + 1 }}</span>
                  <DriverBadge v-if="driverById(driverId)" v-bind="driverById(driverId)!" compact />
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
              <div
                v-for="(entry, index) in (qualifyingGrid as any[])"
                :key="index"
                class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0"
                :class="index < 10 ? '' : 'opacity-40'"
              >
                <span class="w-4 text-right text-[10px] font-black tabular-nums" :class="index < 3 ? 'text-yellow-500' : 'text-zinc-600'">{{ entry.position }}</span>
                <div class="w-0.5 h-3 rounded-full" :style="{ backgroundColor: teamColorMap[entry.teamId] || '#666' }" />
                <span class="text-xs font-bold text-zinc-500 w-7">{{ entry.driverCode }}</span>
                <span class="flex-1 text-xs truncate">{{ entry.driverName }}</span>
                <span v-if="entry.q3" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q3 }}</span>
                <span v-else-if="entry.q2" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q2 }}</span>
                <span v-else-if="entry.q1" class="text-[10px] text-zinc-600 tabular-nums">{{ entry.q1 }}</span>
              </div>
            </div>

            <div v-if="sidebarTab === 'championship' && (driverStandings as any[])?.length">
              <div v-for="(d, i) in (driverStandings as any[]).slice(0, 22)" :key="i" class="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/20 last:border-0">
                <span class="w-4 text-right text-[10px] font-black tabular-nums" :class="i < 3 ? 'text-yellow-500' : 'text-zinc-600'">{{ d.position }}</span>
                <div class="w-0.5 h-3 rounded-full" :style="{ backgroundColor: teamColorMap[d.teamId] || '#666' }" />
                <span class="flex-1 text-xs truncate">{{ d.driverName }}</span>
                <span class="text-[10px] font-bold tabular-nums text-zinc-400">{{ d.points }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UContainer>
</template>
