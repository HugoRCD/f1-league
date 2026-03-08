<script setup lang="ts">
definePageMeta({ auth: { user: { role: 'admin' } } })
useSeoMeta({ title: 'Admin Panel — F1 League' })

const toast = useToast()
const tab = ref('seed')

const { data: races, refresh: refreshRaces } = useFetch('/api/races')
const { data: drivers, refresh: refreshDrivers } = useFetch('/api/drivers')
const { data: stats, refresh: refreshStats } = useFetch('/api/admin/stats')
const { data: users, refresh: refreshUsers } = useFetch('/api/admin/users')
const { data: adminLeagues, refresh: refreshAdminLeagues } = useFetch('/api/admin/leagues')

const activeDrivers = computed(() => drivers.value?.filter(d => d.active) ?? [])

const ITEMS_PER_PAGE = 10

const leagueSearch = ref('')
const leaguePage = ref(1)
const filteredLeagues = computed(() => {
  if (!adminLeagues.value) return []
  const q = leagueSearch.value.toLowerCase()
  if (!q) return adminLeagues.value as any[]
  return (adminLeagues.value as any[]).filter((l: any) =>
    l.name.toLowerCase().includes(q)
    || l.slug.toLowerCase().includes(q)
    || l.creatorName?.toLowerCase().includes(q),
  )
})
const paginatedLeagues = computed(() => {
  const start = (leaguePage.value - 1) * ITEMS_PER_PAGE
  return filteredLeagues.value.slice(start, start + ITEMS_PER_PAGE)
})
watch(leagueSearch, () => {
  leaguePage.value = 1 
})

const userSearch = ref('')
const userPage = ref(1)
const filteredUsers = computed(() => {
  if (!users.value) return []
  const q = userSearch.value.toLowerCase()
  if (!q) return users.value as any[]
  return (users.value as any[]).filter((u: any) =>
    u.name?.toLowerCase().includes(q)
    || u.email?.toLowerCase().includes(q),
  )
})
const paginatedUsers = computed(() => {
  const start = (userPage.value - 1) * ITEMS_PER_PAGE
  return filteredUsers.value.slice(start, start + ITEMS_PER_PAGE)
})
watch(userSearch, () => {
  userPage.value = 1 
})

async function refreshAll() {
  clearNuxtData()
  await Promise.all([refreshRaces(), refreshDrivers(), refreshStats(), refreshUsers(), refreshAdminLeagues()])
}


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


const simulating = ref(false)
const simulateRaces = ref(5)
const simulateLeagueId = ref('')
const leagueOptions = computed(() => [
  { label: 'New simulation league', value: '' },
  ...(adminLeagues.value ?? []).map((l: any) => ({ label: l.name, value: l.id })),
])

async function simulateChampionship() {
  simulating.value = true
  try {
    const result = await $fetch('/api/admin/simulate', {
      method: 'POST',
      body: {
        racesToSimulate: simulateRaces.value,
        leagueId: simulateLeagueId.value || undefined,
      },
    })
    toast.add({
      title: 'Simulation complete',
      description: `${result.users} players, ${result.races} races, ${result.predictions} predictions in "${result.leagueSlug}"`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Simulation failed', description: e?.data?.message, color: 'error' })
  } finally {
    simulating.value = false
  }
}


async function togglePitwall(leagueId: string, enabled: boolean) {
  try {
    await $fetch('/api/admin/leagues', { method: 'POST', body: { leagueId, pitwallEnabled: enabled } })
    toast.add({ title: `Pitwall ${enabled ? 'enabled' : 'disabled'}`, color: 'success', icon: 'i-lucide-bot' })
    await refreshAdminLeagues()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  }
}

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


const { data: notifSettings, refresh: refreshNotif } = useFetch('/api/admin/notifications')

async function toggleGlobalNotifications() {
  if (!notifSettings.value) return
  const updated = { ...notifSettings.value, enabled: !notifSettings.value.enabled }
  await $fetch('/api/admin/notifications', { method: 'POST', body: updated })
  toast.add({ title: `Reminders ${updated.enabled ? 'enabled' : 'disabled'}`, color: 'success', icon: 'i-lucide-check' })
  await refreshNotif()
}

async function updateReminderDays(days: number[]) {
  if (!notifSettings.value) return
  await $fetch('/api/admin/notifications', { method: 'POST', body: { ...notifSettings.value, reminderDaysBefore: days } })
  toast.add({ title: 'Reminder schedule updated', color: 'success', icon: 'i-lucide-check' })
  await refreshNotif()
}

const { user: currentUser } = useUserSession()

const exporting = ref(false)
async function exportData() {
  exporting.value = true
  try {
    const data = await $fetch('/api/admin/export', { responseType: 'json' })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `f1-league-${(data as any).season}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Data exported', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Export failed', description: e?.data?.message, color: 'error' })
  } finally {
    exporting.value = false
  }
}

const dataImporting = ref(false)
const importFileRef = ref<HTMLInputElement>()

function triggerImportFile() {
  importFileRef.value?.click()
}

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  dataImporting.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const result = await $fetch<{ predictionsImported: number, predictionsSkipped: number, resultsImported: number, resultsSkipped: number }>('/api/admin/import', { method: 'POST', body: data })
    toast.add({
      title: 'Data imported',
      description: `${result.predictionsImported} predictions, ${result.resultsImported} results imported`,
      color: 'success',
      icon: 'i-lucide-check',
    })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Import failed', description: e?.data?.message ?? 'Invalid file', color: 'error' })
  } finally {
    dataImporting.value = false
    if (importFileRef.value) importFileRef.value.value = ''
  }
}

const autoImporting = ref(false)
const autoImportResult = ref<{ imported: number, skipped: number, errors?: string[] } | null>(null)

async function autoImportResults() {
  autoImporting.value = true
  autoImportResult.value = null
  try {
    const result = await $fetch<{ imported: number, skipped: number, errors?: string[] }>('/api/admin/results/auto-import', { method: 'POST' })
    autoImportResult.value = result
    if (result.imported > 0) {
      toast.add({ title: `${result.imported} result(s) imported`, color: 'success', icon: 'i-lucide-check' })
      await refreshAll()
    } else {
      toast.add({ title: 'No new results to import', description: 'All completed races already have results, or the F1 API has no data yet', color: 'neutral', icon: 'i-lucide-info' })
    }
  } catch (e: any) {
    toast.add({ title: 'Auto-import failed', description: e?.data?.message, color: 'error' })
  } finally {
    autoImporting.value = false
  }
}

const selectedResultRaceId = ref('')
const resultPositions = ref<(string | null)[]>(Array.from({ length: 10 }, () => null))
const savingResult = ref(false)
const importingResult = ref(false)

watch(selectedResultRaceId, async (raceId) => {
  if (!raceId) return
  resultPositions.value = Array.from({ length: 10 }, () => null)
  try {
    const race = await $fetch<any>(`/api/races/${raceId}`)
    if (race.result) resultPositions.value = [...(race.result as string[])]
  } catch { /* race may not have results yet */ }
})

function availableDriversForResult(posIndex: number) {
  const selected = new Set(resultPositions.value.filter((id, i) => id && i !== posIndex))
  return activeDrivers.value.filter((d: any) => !selected.has(d.id))
}

async function submitResult() {
  if (!selectedResultRaceId.value || resultPositions.value.some(p => !p)) return
  savingResult.value = true
  try {
    await $fetch('/api/admin/results', { method: 'POST', body: { raceId: selectedResultRaceId.value, positions: resultPositions.value } })
    toast.add({ title: 'Result saved', color: 'success', icon: 'i-lucide-check' })
    await refreshAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingResult.value = false
  }
}

const selectedResultRound = computed(() => {
  if (!selectedResultRaceId.value || !races.value) return null
  const index = (races.value as any[]).findIndex((r: any) => r.id === selectedResultRaceId.value)
  return index >= 0 ? index + 1 : null
})

async function importResultFromApi() {
  if (!selectedResultRound.value) return
  importingResult.value = true
  try {
    const result = await $fetch<any>('/api/admin/results/import', { method: 'POST', body: { round: selectedResultRound.value } })
    if (result.unmatchedCount > 0) {
      toast.add({ title: 'Partial import', description: `${result.unmatchedCount} driver(s) could not be matched`, color: 'warning' })
    } else {
      toast.add({ title: 'Results imported', description: 'Review and save below', color: 'success', icon: 'i-lucide-check' })
    }
    resultPositions.value = result.positions as (string | null)[]
  } catch (e: any) {
    toast.add({ title: 'Import failed', description: e?.data?.message || 'No results available yet', color: 'error' })
  } finally {
    importingResult.value = false
  }
}

const tabs = [
  { label: 'Seed & Test', value: 'seed', slot: 'seed', icon: 'i-lucide-database' },
  { label: 'Results', value: 'results', slot: 'results', icon: 'i-lucide-flag-triangle-right' },
  { label: 'Leagues', value: 'leagues', slot: 'leagues', icon: 'i-lucide-trophy' },
  { label: 'Users', value: 'users', slot: 'users', icon: 'i-lucide-users' },
  { label: 'Drivers', value: 'drivers', slot: 'drivers', icon: 'i-lucide-car' },
  { label: 'Races', value: 'races', slot: 'races', icon: 'i-lucide-calendar' },
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

    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
      <div v-for="(stat, key) in { Leagues: stats?.leagues, Teams: stats?.teams, Drivers: stats?.drivers, Races: stats?.races, Results: stats?.results, Predictions: stats?.predictions }" :key class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p class="text-2xl font-black tabular-nums">
          {{ stat ?? 0 }}
        </p>
        <p class="text-xs text-zinc-500 mt-0.5">
          {{ key }}
        </p>
      </div>
    </div>

    <ClientOnly>
      <UTabs v-model="tab" :items="tabs" variant="link" color="neutral" size="sm">
        <template #seed>
          <div class="py-6 flex flex-col gap-6">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Setup
              </h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-database" class="size-4 text-f1-600 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">
                        Import 2026 season data
                      </p>
                      <p class="text-xs text-zinc-500">
                        Loads the official 11 teams, 22 drivers, and 24 races. Safe to run multiple times — existing data is updated.
                      </p>
                    </div>
                  </div>
                  <UButton
                    label="Import"
                    icon="i-lucide-download"
                    :loading="seeding"
                    size="sm"
                    class="shrink-0"
                    @click="seedData"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Testing
              </h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div class="flex items-center gap-3 mb-2">
                  <UIcon name="i-lucide-flask-conical" class="size-4 text-yellow-500 shrink-0" />
                  <div>
                    <p class="font-bold text-sm">
                      Simulate a championship
                    </p>
                    <p class="text-xs text-zinc-500">
                      Creates 5 test players with random predictions and results. You can inject them into an existing league to test standings, scoring and leaderboard.
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3 mt-3 pl-7 flex-wrap">
                  <USelectMenu
                    v-model="simulateLeagueId"
                    :items="leagueOptions"
                    value-key="value"
                    placeholder="Target league..."
                    size="sm"
                    class="w-48"
                  />
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

            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Danger zone
              </h3>
              <div class="rounded-xl border border-red-900/20 bg-red-950/10 overflow-hidden">
                <div class="flex items-center justify-between gap-4 px-4 py-3 border-b border-red-900/10">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-rotate-ccw" class="size-4 text-zinc-400 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">
                        Reset simulation
                      </p>
                      <p class="text-xs text-zinc-500">
                        Removes the 5 test players and clears all race results. Your account and real players are kept.
                      </p>
                    </div>
                  </div>
                  <UButton
                    label="Reset"
                    icon="i-lucide-rotate-ccw"
                    :loading="resetting"
                    size="sm"
                    variant="outline"
                    color="neutral"
                    class="shrink-0"
                    @click="resetSimulation"
                  />
                </div>
                <div class="flex items-center justify-between gap-4 px-4 py-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-trash-2" class="size-4 text-red-400 shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">
                        Clear all predictions & results
                      </p>
                      <p class="text-xs text-zinc-500">
                        Permanently deletes every prediction and race result. Teams, drivers, races, and user accounts are preserved.
                      </p>
                    </div>
                  </div>
                  <UButton
                    label="Clear all"
                    icon="i-lucide-trash-2"
                    :loading="resetting"
                    size="sm"
                    variant="outline"
                    color="error"
                    class="shrink-0"
                    @click="resetAllData"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #results>
          <div class="py-6 flex flex-col gap-6 max-w-xl">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Auto-import
              </h3>
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <UIcon name="i-lucide-cloud-download" class="size-4 text-[#E10600] shrink-0" />
                    <div class="min-w-0">
                      <p class="font-bold text-sm">
                        Import all missing results
                      </p>
                      <p class="text-xs text-zinc-500">
                        Fetches results from the F1 API for all completed races. Also runs automatically every hour via cron.
                      </p>
                    </div>
                  </div>
                  <UButton
                    label="Import"
                    icon="i-lucide-download"
                    :loading="autoImporting"
                    size="sm"
                    class="shrink-0"
                    @click="autoImportResults"
                  />
                </div>
                <div v-if="autoImportResult" class="mt-3 ml-7 flex flex-wrap gap-3 text-xs">
                  <span class="flex items-center gap-1.5">
                    <span class="size-2 rounded-full bg-green-500" />
                    {{ autoImportResult.imported }} imported
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="size-2 rounded-full bg-zinc-500" />
                    {{ autoImportResult.skipped }} skipped
                  </span>
                  <span v-if="autoImportResult.errors?.length" class="flex items-center gap-1.5">
                    <span class="size-2 rounded-full bg-red-500" />
                    {{ autoImportResult.errors.length }} error(s)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Manual entry
              </h3>
              <div class="flex items-center gap-3 mb-4">
                <USelectMenu
                  v-model="selectedResultRaceId"
                  :items="(races ?? []).map((r: any) => ({ label: r.name + (r.hasResult ? ' ✓' : ''), value: r.id }))"
                  value-key="value"
                  placeholder="Select a race..."
                  class="flex-1"
                  size="sm"
                />
                <UButton
                  v-if="selectedResultRound"
                  label="Import from F1 API"
                  icon="i-lucide-download"
                  size="sm"
                  variant="outline"
                  :loading="importingResult"
                  @click="importResultFromApi"
                />
              </div>

              <div v-if="selectedResultRaceId" class="flex flex-col gap-2 mb-4">
                <div v-for="(_, i) in 10" :key="i" class="flex items-center gap-3">
                  <span class="w-6 text-right text-xs font-black tabular-nums text-zinc-500">{{ i + 1 }}</span>
                  <USelectMenu
                    v-model="resultPositions[i]"
                    :items="availableDriversForResult(i).map((d: any) => ({ label: `#${d.number} ${d.firstName} ${d.lastName}`, value: d.id }))"
                    value-key="value"
                    placeholder="Select driver..."
                    size="sm"
                    class="flex-1"
                  />
                </div>
              </div>

              <UButton
                v-if="selectedResultRaceId"
                label="Save result"
                icon="i-lucide-check"
                :loading="savingResult"
                :disabled="resultPositions.some(p => !p)"
                @click="submitResult"
              />
            </div>
          </div>
        </template>

        <template #leagues>
          <div class="py-6">
            <div class="flex items-center justify-between mb-4 gap-4">
              <h2 class="text-lg font-black uppercase tracking-tight">
                All Leagues
              </h2>
              <div class="flex items-center gap-3">
                <UInput v-model="leagueSearch" placeholder="Search leagues..." icon="i-lucide-search" size="sm" class="w-52" />
                <UBadge v-if="adminLeagues" color="neutral" variant="subtle">
                  {{ filteredLeagues.length }}
                </UBadge>
              </div>
            </div>

            <div v-if="!filteredLeagues.length" class="text-center py-12 text-zinc-500">
              <UIcon name="i-lucide-trophy" class="size-10 mx-auto mb-3 text-zinc-700" />
              <p>{{ leagueSearch ? 'No leagues match your search.' : 'No leagues created yet.' }}</p>
            </div>

            <div v-else class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <th class="text-left px-4 py-2.5">
                      Name
                    </th>
                    <th class="text-left px-3 py-2.5 hidden sm:table-cell">
                      Slug
                    </th>
                    <th class="text-right px-3 py-2.5 w-20">
                      Members
                    </th>
                    <th class="text-left px-3 py-2.5 hidden sm:table-cell">
                      Created by
                    </th>
                    <th class="text-center px-3 py-2.5 w-20">
                      Pitwall
                    </th>
                    <th class="text-left px-4 py-2.5 w-28">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="league in paginatedLeagues"
                    :key="league.id"
                    class="border-b border-zinc-800/50 last:border-0"
                  >
                    <td class="px-4 py-3 font-semibold">
                      {{ league.name }}
                    </td>
                    <td class="px-3 py-3 text-sm text-zinc-500 font-mono hidden sm:table-cell">
                      {{ league.slug }}
                    </td>
                    <td class="px-3 py-3 text-right tabular-nums text-sm">
                      {{ league.memberCount }}
                    </td>
                    <td class="px-3 py-3 text-sm text-zinc-400 hidden sm:table-cell">
                      {{ league.creatorName }}
                    </td>
                    <td class="px-3 py-3 text-center">
                      <USwitch :model-value="league.pitwallEnabled" @update:model-value="togglePitwall(league.id, $event)" />
                    </td>
                    <td class="px-4 py-3 text-xs text-zinc-500">
                      {{ new Date(league.createdAt).toLocaleDateString() }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredLeagues.length > ITEMS_PER_PAGE" class="flex justify-center mt-4">
              <UPagination v-model:page="leaguePage" :total="filteredLeagues.length" :items-per-page="ITEMS_PER_PAGE" size="sm" />
            </div>
          </div>
        </template>

        <template #users>
          <div class="py-6">
            <div class="flex items-center justify-between mb-4 gap-4">
              <UBadge color="neutral" variant="subtle">
                {{ filteredUsers.length }} user{{ filteredUsers.length !== 1 ? 's' : '' }}
              </UBadge>
              <UInput v-model="userSearch" placeholder="Search users..." icon="i-lucide-search" size="sm" class="w-52" />
            </div>

            <div class="flex flex-col gap-2">
              <div
                v-for="u in paginatedUsers"
                :key="u.id"
                class="rounded-xl border bg-zinc-900/50 p-4"
                :class="u.id === currentUser?.id ? 'border-primary/30' : 'border-zinc-800'"
              >
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

                <template v-else>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3 min-w-0">
                      <UserAvatar :image="u.image" :name="u.name" size="md" />
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
                          [{ label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => startEditUser(u) }],
                          ...(u.id !== currentUser?.id ? [[{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteUser(u.id, u.name) }]] : []),
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

              <div v-if="filteredUsers.length > ITEMS_PER_PAGE" class="flex justify-center mt-4">
                <UPagination v-model:page="userPage" :total="filteredUsers.length" :items-per-page="ITEMS_PER_PAGE" size="sm" />
              </div>
            </div>
          </div>
        </template>


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
      </UTabs>
    </ClientOnly>
  </UContainer>
</template>
