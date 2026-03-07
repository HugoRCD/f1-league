<script setup lang="ts">
definePageMeta({ auth: { user: { role: 'admin' } } })

const toast = useToast()
const tab = ref('seed')

const { data: races, refresh: refreshRaces } = useFetch('/api/races')
const { data: drivers, refresh: refreshDrivers } = useFetch('/api/drivers')
const { data: stats, refresh: refreshStats } = useFetch('/api/admin/stats')
const { data: users, refresh: refreshUsers } = useFetch('/api/admin/users')

const activeDrivers = computed(() => drivers.value?.filter(d => d.active) ?? [])

async function refreshAll() {
  await Promise.all([refreshRaces(), refreshDrivers(), refreshStats(), refreshUsers()])
}

// --- Seed ---
const seeding = ref(false)
async function seedData() {
  seeding.value = true
  try {
    const result = await $fetch('/api/admin/seed', { method: 'POST' })
    toast.add({ title: 'Season data loaded', description: `${result.teams} teams, ${result.drivers} drivers, ${result.races} races`, color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Seed failed', description: e?.data?.message, color: 'error' })
  } finally {
    seeding.value = false
  }
}

// --- Simulate ---
const simulating = ref(false)
const simulateRaces = ref(5)
async function simulateChampionship() {
  simulating.value = true
  try {
    const result = await $fetch('/api/admin/simulate', { method: 'POST', body: { racesToSimulate: simulateRaces.value } })
    toast.add({ title: 'Simulation complete', description: `${result.users} players, ${result.races} races, ${result.predictions} predictions`, color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Simulation failed', description: e?.data?.message, color: 'error' })
  } finally {
    simulating.value = false
  }
}

// --- Reset ---
const resetting = ref(false)
async function resetSimulation() {
  resetting.value = true
  try {
    const result = await $fetch('/api/admin/reset', { method: 'POST', body: { target: 'simulation' } })
    toast.add({ title: 'Simulation reset', description: `Removed fake users and all results`, color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Reset failed', description: e?.data?.message, color: 'error' })
  } finally {
    resetting.value = false
  }
}

async function resetAllData() {
  resetting.value = true
  try {
    await $fetch('/api/admin/reset', { method: 'POST', body: { target: 'all' } })
    toast.add({ title: 'All predictions & results cleared', color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Reset failed', description: e?.data?.message, color: 'error' })
  } finally {
    resetting.value = false
  }
}

// --- Results entry ---
const selectedRaceId = ref('')
const resultPositions = ref<(string | null)[]>(Array.from({ length: 10 }, () => null))
const savingResult = ref(false)

watch(selectedRaceId, async (raceId) => {
  if (!raceId) return
  resultPositions.value = Array.from({ length: 10 }, () => null)
  try {
    const race = await $fetch(`/api/races/${raceId}`)
    if (race.result) resultPositions.value = [...(race.result as string[])]
  } catch { /* race may not exist yet */ }
})

function availableDriversForResult(posIndex: number) {
  const selected = new Set(resultPositions.value.filter((id, i) => id && i !== posIndex))
  return activeDrivers.value.filter(d => !selected.has(d.id))
}

async function submitResult() {
  if (!selectedRaceId.value || resultPositions.value.some(p => !p)) return
  savingResult.value = true
  try {
    await $fetch('/api/admin/results', { method: 'POST', body: { raceId: selectedRaceId.value, positions: resultPositions.value } })
    toast.add({ title: 'Result saved', color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingResult.value = false
  }
}

// --- Import from F1 API ---
const importing = ref(false)
const selectedRound = computed(() => {
  if (!selectedRaceId.value || !races.value) return null
  const index = races.value.findIndex(r => r.id === selectedRaceId.value)
  return index >= 0 ? index + 1 : null
})

async function importFromApi() {
  if (!selectedRound.value) return
  importing.value = true
  try {
    const result = await $fetch('/api/admin/results/import', {
      method: 'POST',
      body: { round: selectedRound.value },
    })
    if (result.unmatchedCount > 0) {
      toast.add({ title: 'Partial import', description: `${result.unmatchedCount} driver(s) could not be matched`, color: 'warning' })
    }
    else {
      toast.add({ title: 'Results imported', description: 'Review and save below', color: 'success', icon: 'i-lucide-check' })
    }
    resultPositions.value = result.positions as (string | null)[]
  }
  catch (e: any) {
    toast.add({ title: 'Import failed', description: e?.data?.message || 'No results available yet', color: 'error' })
  }
  finally {
    importing.value = false
  }
}

// --- Driver management ---
const newDriver = reactive({ firstName: '', lastName: '', number: 0, teamId: '' })
const savingDriver = ref(false)

const teamOptions = computed(() => {
  const teams = new Map<string, { id: string, name: string }>()
  for (const d of drivers.value ?? []) {
    if (!teams.has(d.teamId)) teams.set(d.teamId, { id: d.teamId, name: d.teamName })
  }
  return [...teams.values()].map(t => ({ label: t.name, value: t.id }))
})

async function addDriver() {
  if (!newDriver.firstName || !newDriver.lastName || !newDriver.number || !newDriver.teamId) return
  savingDriver.value = true
  try {
    await $fetch('/api/admin/drivers', { method: 'POST', body: { action: 'create', ...newDriver } })
    toast.add({ title: 'Driver added', color: 'success', icon: 'i-lucide-check' })
    Object.assign(newDriver, { firstName: '', lastName: '', number: 0, teamId: '' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingDriver.value = false
  }
}

async function toggleDriver(id: string) {
  await $fetch('/api/admin/drivers', { method: 'POST', body: { action: 'toggle', id } }).catch(() => {})
  await refreshDrivers()
}

// --- Race management ---
const newRace = reactive({ name: '', location: '', startAt: '', season: new Date().getFullYear() })
const savingRace = ref(false)
const editingRace = ref<{ id: string, name: string, location: string, startAt: string } | null>(null)
const savingEditRace = ref(false)

async function addRace() {
  if (!newRace.name || !newRace.location || !newRace.startAt) return
  savingRace.value = true
  try {
    await $fetch('/api/admin/races', { method: 'POST', body: { action: 'create', ...newRace } })
    toast.add({ title: 'Race added', color: 'success', icon: 'i-lucide-check' })
    Object.assign(newRace, { name: '', location: '', startAt: '' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingRace.value = false
  }
}

function startEditRace(r: { id: string, name: string, location: string, startAt: string }) {
  const d = new Date(r.startAt)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  editingRace.value = { id: r.id, name: r.name, location: r.location, startAt: local }
}

async function saveEditRace() {
  if (!editingRace.value) return
  savingEditRace.value = true
  try {
    await $fetch('/api/admin/races', {
      method: 'POST',
      body: { action: 'update', id: editingRace.value.id, name: editingRace.value.name, location: editingRace.value.location, startAt: editingRace.value.startAt },
    })
    toast.add({ title: 'Race updated', color: 'success', icon: 'i-lucide-check' })
    editingRace.value = null
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingEditRace.value = false
  }
}

// --- User management ---
const editingUser = ref<{ id: string, name: string, email: string } | null>(null)
const savingUser = ref(false)

function startEditUser(u: { id: string, name: string, email: string }) {
  editingUser.value = { ...u }
}

async function saveUser() {
  if (!editingUser.value) return
  savingUser.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { action: 'update', userId: editingUser.value.id, name: editingUser.value.name, email: editingUser.value.email } })
    toast.add({ title: 'User updated', color: 'success', icon: 'i-lucide-check' })
    editingUser.value = null
    await refreshUsers()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingUser.value = false
  }
}

async function setUserRole(userId: string, role: string) {
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { action: 'setRole', userId, role } })
    toast.add({ title: `Role set to ${role}`, color: 'success', icon: 'i-lucide-check' })
    await refreshUsers()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  }
}

async function deleteUser(userId: string, name: string) {
  if (!confirm(`Delete user "${name}"? This will also delete all their predictions.`)) return
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { action: 'delete', userId } })
    toast.add({ title: 'User deleted', color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  }
}

// --- Scoring config ---
const { data: scoringConfig, refresh: refreshScoring } = useFetch('/api/admin/scoring')
const editedScoring = ref<Record<string, number> | null>(null)
const savingScoring = ref(false)

function startEditScoring() {
  if (scoringConfig.value) {
    editedScoring.value = { ...scoringConfig.value }
  }
}

async function saveScoring() {
  if (!editedScoring.value) return
  savingScoring.value = true
  try {
    await $fetch('/api/admin/scoring', { method: 'POST', body: editedScoring.value })
    toast.add({ title: 'Scoring rules updated', color: 'success', icon: 'i-lucide-check' })
    editedScoring.value = null
    await refreshScoring()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingScoring.value = false
  }
}

const { user: currentUser } = useUserSession()

const tabs = [
  { label: 'Seed & Test', value: 'seed', slot: 'seed', icon: 'i-lucide-database' },
  { label: 'Users', value: 'users', slot: 'users', icon: 'i-lucide-users' },
  { label: 'Results', value: 'results', slot: 'results', icon: 'i-lucide-flag-triangle-right' },
  { label: 'Drivers', value: 'drivers', slot: 'drivers', icon: 'i-lucide-car' },
  { label: 'Races', value: 'races', slot: 'races', icon: 'i-lucide-calendar' },
  { label: 'Scoring', value: 'scoring', slot: 'scoring', icon: 'i-lucide-settings' },
]
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-8">
      <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">
        Administration
      </p>
      <h1 class="text-2xl font-black uppercase tracking-tight mt-1">
        Admin Panel
      </h1>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
      <div v-for="(stat, key) in { Teams: stats?.teams, Drivers: stats?.drivers, Races: stats?.races, Results: stats?.results, Predictions: stats?.predictions }" :key class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p class="text-2xl font-black tabular-nums">
          {{ stat ?? 0 }}
        </p>
        <p class="text-xs text-zinc-500 mt-0.5">
          {{ key }}
        </p>
      </div>
    </div>

    <ClientOnly>
      <UTabs v-model="tab" :items="tabs">
        <!-- SEED & TEST -->
        <template #seed>
          <div class="py-6 flex flex-col gap-6">
            <!-- Setup -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Setup</h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-database" class="size-4 text-f1-600 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">Import 2026 season data</p>
                      <p class="text-xs text-zinc-500">Loads the official 11 teams, 22 drivers, and 24 races. Safe to run multiple times — existing data is updated.</p>
                    </div>
                  </div>
                  <UButton label="Import" icon="i-lucide-download" :loading="seeding" size="sm" class="shrink-0" @click="seedData" />
                </div>
              </div>
            </div>

            <!-- Testing -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Testing</h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div class="flex items-center gap-3 mb-2">
                  <UIcon name="i-lucide-flask-conical" class="size-4 text-yellow-500 shrink-0" />
                  <div>
                    <p class="font-bold text-sm">Simulate a championship</p>
                    <p class="text-xs text-zinc-500">Creates 5 test players (Alice, Bob, Charlie, Diana, Eve) with random predictions, and generates random official results. Use this to verify scoring, standings, and leaderboard work correctly before the real season.</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 mt-3 pl-7">
                  <USelectMenu
                    v-model="simulateRaces"
                    :items="Array.from({ length: 24 }, (_, i) => ({ label: `${i + 1} race${i > 0 ? 's' : ''}`, value: i + 1 }))"
                    value-key="value"
                    size="sm"
                    class="w-32"
                  />
                  <UButton label="Run simulation" icon="i-lucide-play" :loading="simulating" size="sm" @click="simulateChampionship" />
                </div>
              </div>
            </div>

            <!-- Danger zone -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Danger zone</h3>
              <div class="rounded-xl border border-red-900/20 bg-red-950/10 overflow-hidden">
                <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-red-900/10">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-rotate-ccw" class="size-4 text-zinc-400 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">Reset simulation</p>
                      <p class="text-xs text-zinc-500">Removes the 5 test players and clears all race results. Your account and real players are kept.</p>
                    </div>
                  </div>
                  <UButton label="Reset" icon="i-lucide-rotate-ccw" :loading="resetting" size="sm" variant="outline" color="neutral" class="shrink-0" @click="resetSimulation" />
                </div>
                <div class="flex items-center justify-between gap-4 px-4 py-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-trash-2" class="size-4 text-red-400 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">Clear all predictions & results</p>
                      <p class="text-xs text-zinc-500">Permanently deletes every prediction and race result. Teams, drivers, races, and user accounts are preserved.</p>
                    </div>
                  </div>
                  <UButton label="Clear all" icon="i-lucide-trash-2" :loading="resetting" size="sm" variant="outline" color="error" class="shrink-0" @click="resetAllData" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- USERS -->
        <template #users>
          <div class="py-6 flex flex-col gap-2">
            <div
              v-for="u in users"
              :key="u.id"
              class="rounded-xl border bg-zinc-900/50 p-4"
              :class="u.id === currentUser?.id ? 'border-primary/30' : 'border-zinc-800'"
            >
              <!-- Edit mode -->
              <template v-if="editingUser?.id === u.id">
                <div class="flex flex-col gap-3">
                  <div class="grid grid-cols-2 gap-3">
                    <UFormField label="Name">
                      <UInput v-model="editingUser.name" size="sm" class="w-full" />
                    </UFormField>
                    <UFormField label="Email">
                      <UInput v-model="editingUser.email" size="sm" class="w-full" />
                    </UFormField>
                  </div>
                  <div class="flex gap-2">
                    <UButton label="Save" size="xs" icon="i-lucide-check" :loading="savingUser" @click="saveUser" />
                    <UButton label="Cancel" size="xs" variant="ghost" color="neutral" @click="editingUser = null" />
                  </div>
                </div>
              </template>

              <!-- Display mode -->
              <template v-else>
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="size-9 shrink-0 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                      {{ u.name?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-sm truncate">{{ u.name }}</span>
                        <span v-if="u.id === currentUser?.id" class="text-[10px] text-primary font-bold uppercase">you</span>
                      </div>
                      <p class="text-xs text-zinc-500 truncate">
                        {{ u.email }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right hidden sm:block">
                      <p class="text-sm font-bold tabular-nums">
                        {{ u.predictionsCount }}
                      </p>
                      <p class="text-[10px] text-zinc-500">
                        predictions
                      </p>
                    </div>
                    <USelectMenu
                      :model-value="u.role || 'user'"
                      :items="[{ label: 'Admin', value: 'admin' }, { label: 'User', value: 'user' }]"
                      value-key="value"
                      size="sm"
                      class="w-28"
                      :disabled="u.id === currentUser?.id"
                      @update:model-value="setUserRole(u.id, $event as string)"
                    />
                    <UDropdownMenu
                      :items="[
                        [{ label: 'Edit', icon: 'i-lucide-pencil', click: () => startEditUser(u) }],
                        ...(u.id !== currentUser?.id ? [[{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, click: () => deleteUser(u.id, u.name) }]] : []),
                      ]"
                    >
                      <UButton icon="i-lucide-ellipsis-vertical" variant="ghost" color="neutral" size="xs" />
                    </UDropdownMenu>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="!users?.length" class="p-8 text-center text-zinc-500 rounded-xl border border-zinc-800 bg-zinc-900/50">
              No users yet.
            </div>
          </div>
        </template>

        <!-- RESULTS -->
        <template #results>
          <div class="py-6 flex flex-col gap-6 max-w-xl">
            <div>
              <h2 class="text-lg font-black uppercase tracking-tight mb-4">
                Enter Race Results
              </h2>
              <USelectMenu
                v-model="selectedRaceId"
                :items="(races ?? []).map(r => ({ label: r.name + (r.hasResult ? ' ✓' : ''), value: r.id }))"
                value-key="value"
                placeholder="Select a race..."
                class="max-w-md"
              />
            </div>
            <div v-if="selectedRaceId" class="flex flex-col gap-2">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs text-zinc-500 uppercase tracking-[0.15em] font-semibold">
                  Official Top 10
                </p>
                <UButton
                  label="Import from F1 API"
                  icon="i-lucide-download"
                  size="xs"
                  variant="outline"
                  :loading="importing"
                  :disabled="!selectedRound"
                  @click="importFromApi"
                />
              </div>
              <div v-for="(pos, index) in resultPositions" :key="index" class="flex items-center gap-2">
                <PositionBadge :position="index + 1" size="sm" />
                <div class="flex-1">
                  <template v-if="pos && activeDrivers.find(d => d.id === pos)">
                    <div class="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2">
                      <DriverBadge v-bind="activeDrivers.find(d => d.id === pos)!" compact />
                      <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="resultPositions[index] = null" />
                    </div>
                  </template>
                  <USelectMenu
                    v-else
                    :model-value="pos ?? undefined"
                    :items="availableDriversForResult(index).map(d => ({ label: `#${d.number} ${d.firstName} ${d.lastName}`, value: d.id }))"
                    value-key="value"
                    placeholder="Select driver..."
                    class="w-full"
                    @update:model-value="resultPositions[index] = $event"
                  />
                </div>
              </div>
              <UButton
                label="Save result"
                icon="i-lucide-save"
                :disabled="resultPositions.some(p => !p)"
                :loading="savingResult"
                size="lg"
                class="mt-4 self-start font-bold"
                @click="submitResult"
              />
            </div>
          </div>
        </template>

        <!-- DRIVERS -->
        <template #drivers>
          <div class="py-6 flex flex-col gap-8">
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                Add Driver
              </h2>
              <div class="flex flex-wrap gap-3 items-end">
                <UFormField label="First name">
                  <UInput v-model="newDriver.firstName" placeholder="First name" />
                </UFormField>
                <UFormField label="Last name">
                  <UInput v-model="newDriver.lastName" placeholder="Last name" />
                </UFormField>
                <UFormField label="Number">
                  <UInput v-model.number="newDriver.number" type="number" placeholder="#" class="w-20" />
                </UFormField>
                <UFormField label="Team">
                  <USelectMenu v-model="newDriver.teamId" :items="teamOptions" value-key="value" placeholder="Team" class="min-w-44" />
                </UFormField>
                <UButton label="Add driver" icon="i-lucide-plus" :loading="savingDriver" @click="addDriver" />
              </div>
            </div>
            <div>
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                All Drivers ({{ drivers?.length ?? 0 }})
              </h2>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div v-for="d in drivers" :key="d.id" class="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 last:border-0" :class="d.active ? '' : 'opacity-40'">
                  <DriverBadge :first-name="d.firstName" :last-name="d.lastName" :number="d.number" :team-color="d.teamColor" />
                  <div class="flex items-center gap-3">
                    <span class="text-xs text-zinc-500 hidden sm:inline">{{ d.teamName }}</span>
                    <UButton :label="d.active ? 'Deactivate' : 'Activate'" :color="d.active ? 'neutral' : 'primary'" variant="outline" size="xs" @click="toggleDriver(d.id)" />
                  </div>
                </div>
                <div v-if="!drivers?.length" class="p-8 text-center text-zinc-500">
                  No drivers yet. Seed the database first.
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- RACES -->
        <template #races>
          <div class="py-6 flex flex-col gap-6">
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
                Add Race
              </h2>
              <div class="flex flex-wrap gap-3 items-end">
                <UFormField label="Name">
                  <UInput v-model="newRace.name" placeholder="Grand Prix name" size="sm" />
                </UFormField>
                <UFormField label="Location">
                  <UInput v-model="newRace.location" placeholder="City" size="sm" />
                </UFormField>
                <UFormField label="Start date & time">
                  <UInput v-model="newRace.startAt" type="datetime-local" size="sm" />
                </UFormField>
                <UButton label="Add" icon="i-lucide-plus" :loading="savingRace" size="sm" @click="addRace" />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <div
                v-for="(r, i) in races"
                :key="r.id"
                class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <!-- Edit mode -->
                <template v-if="editingRace?.id === r.id">
                  <div class="flex flex-col gap-3">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <UFormField label="Name">
                        <UInput v-model="editingRace.name" size="sm" class="w-full" />
                      </UFormField>
                      <UFormField label="Location">
                        <UInput v-model="editingRace.location" size="sm" class="w-full" />
                      </UFormField>
                      <UFormField label="Start date & time">
                        <UInput v-model="editingRace.startAt" type="datetime-local" size="sm" class="w-full" />
                      </UFormField>
                    </div>
                    <div class="flex gap-2">
                      <UButton label="Save" size="xs" icon="i-lucide-check" :loading="savingEditRace" @click="saveEditRace" />
                      <UButton label="Cancel" size="xs" variant="ghost" color="neutral" @click="editingRace = null" />
                    </div>
                  </div>
                </template>

                <!-- Display mode -->
                <template v-else>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3 min-w-0">
                      <div
                        class="size-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-black tabular-nums"
                        :class="r.open ? 'bg-f1-600/10 text-f1-600' : 'bg-zinc-800 text-zinc-500'"
                      >
                        {{ i + 1 }}
                      </div>
                      <div class="min-w-0">
                        <p class="font-bold text-sm truncate">
                          {{ r.name }}
                        </p>
                        <p class="text-xs text-zinc-500">
                          {{ r.location }} · {{ new Date(r.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
                          {{ new Date(r.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <RaceStatusBadge :has-result="r.hasResult" :locked="r.locked" :open="r.open" />
                      <UButton
                        icon="i-lucide-pencil"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        @click="startEditRace(r)"
                      />
                    </div>
                  </div>
                </template>
              </div>
              <div v-if="!races?.length" class="p-8 text-center text-zinc-500 rounded-xl border border-zinc-800 bg-zinc-900/50">
                No races yet. Seed the database first.
              </div>
            </div>
          </div>
        </template>
        <!-- SCORING -->
        <template #scoring>
          <div v-if="scoringConfig" class="py-6 flex flex-col gap-6">
            <!-- Points section -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Points per position
              </h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div
                  v-for="rule in [
                    { key: 'exact', label: 'Exact match', badge: 'd=0' },
                    { key: 'offBy1', label: 'Off by 1', badge: 'd=1' },
                    { key: 'offBy2', label: 'Off by 2', badge: 'd=2' },
                    { key: 'offBy3Plus', label: 'Off by 3+', badge: 'd≥3' },
                    { key: 'notInTop10', label: 'Not in Top 10', badge: '—' },
                  ]"
                  :key="rule.key"
                  class="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 last:border-0"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded tabular-nums w-8 text-center">{{ rule.badge }}</span>
                    <span class="text-sm">{{ rule.label }}</span>
                  </div>
                  <UInput
                    v-if="editedScoring"
                    v-model.number="editedScoring[rule.key]"
                    type="number"
                    :min="0"
                    class="w-16"
                    size="sm"
                  />
                  <span v-else class="font-black tabular-nums">{{ (scoringConfig as any)[rule.key] }} <span class="text-xs text-zinc-500 font-normal">pts</span></span>
                </div>
              </div>
            </div>

            <!-- Timing section -->
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Prediction window
              </h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-lucide-calendar-plus" class="size-4 text-zinc-400" />
                    <span class="text-sm">Opens before race</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UInput
                      v-if="editedScoring"
                      v-model.number="editedScoring.openDaysBefore"
                      type="number"
                      :min="1"
                      class="w-16"
                      size="sm"
                    />
                    <span v-else class="font-black tabular-nums">{{ scoringConfig.openDaysBefore }}</span>
                    <span class="text-xs text-zinc-500">days</span>
                  </div>
                </div>
                <div class="flex items-center justify-between px-4 py-2.5">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-lucide-lock" class="size-4 text-zinc-400" />
                    <span class="text-sm">Locks before start</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UInput
                      v-if="editedScoring"
                      v-model.number="editedScoring.lockMinutesBefore"
                      type="number"
                      :min="0"
                      class="w-16"
                      size="sm"
                    />
                    <span v-else class="font-black tabular-nums">{{ scoringConfig.lockMinutesBefore }}</span>
                    <span class="text-xs text-zinc-500">min</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <template v-if="editedScoring">
                <UButton label="Save" icon="i-lucide-check" :loading="savingScoring" size="sm" @click="saveScoring" />
                <UButton label="Cancel" size="sm" variant="ghost" color="neutral" @click="editedScoring = null" />
              </template>
              <UButton
                v-else
                label="Edit"
                icon="i-lucide-pencil"
                size="sm"
                variant="outline"
                @click="startEditScoring"
              />
            </div>
          </div>
        </template>
      </UTabs>
    </ClientOnly>
  </UContainer>
</template>
