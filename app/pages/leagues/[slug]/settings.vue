<script setup lang="ts">
import { z } from 'zod'

const { league, leagueId, isLeagueAdmin, refreshLeagues } = useCurrentLeague()
const toast = useToast()

const title = computed(() => league.value ? `Settings — ${league.value.name}` : 'League Settings')
useSeoMeta({ title })

const tab = ref('general')

const { data: leagueDetail, refresh: refreshLeague } = useFetch<any>(
  () => `/api/leagues/${leagueId.value}`,
  { immediate: false },
)
const { data: members, refresh: refreshMembers } = useFetch<any[]>(
  () => `/api/leagues/${leagueId.value}/members`,
  { immediate: false },
)
const { data: races } = useFetch<any[]>('/api/races')
const { data: drivers } = useFetch<any[]>('/api/drivers')
const { data: scoring, refresh: refreshScoring } = useFetch<any>(
  () => `/api/leagues/${leagueId.value}/scoring`,
  { immediate: false },
)

watch(leagueId, (id) => {
  if (id) {
    refreshLeague()
    refreshMembers()
    refreshScoring()
  }
}, { immediate: true })

const activeDrivers = computed<any[]>(() => drivers.value?.filter((d: any) => d.active) ?? [])

const memberSearch = ref('')
const memberPage = ref(1)
const filteredMembers = computed(() => {
  if (!members.value) return []
  const q = memberSearch.value.toLowerCase()
  if (!q) return members.value
  return members.value.filter((m: any) =>
    m.userName?.toLowerCase().includes(q)
    || m.userEmail?.toLowerCase().includes(q),
  )
})
const paginatedMembers = computed(() => {
  const start = (memberPage.value - 1) * 10
  return filteredMembers.value.slice(start, start + 10)
})
watch(memberSearch, () => { memberPage.value = 1 })

const leagueSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(50, '50 characters max'),
  description: z.string().optional(),
})

type LeagueSchema = z.output<typeof leagueSchema>
const leagueState = reactive<Partial<LeagueSchema>>({
  name: league.value?.name || '',
  description: league.value?.description || '',
})
const saving = ref(false)
const copied = ref(false)

watch(leagueDetail, (l) => {
  if (l) {
    leagueState.name = l.name
    leagueState.description = l.description || ''
  }
})

watch(league, (l) => {
  if (l && !leagueState.name) {
    leagueState.name = l.name
    leagueState.description = l.description || ''
  }
}, { immediate: true })

async function saveLeague() {
  if (!leagueId.value) return
  saving.value = true
  try {
    await $fetch(`/api/leagues/${leagueId.value}`, {
      method: 'PATCH',
      body: { name: leagueState.name, description: leagueState.description },
    })
    toast.add({ title: 'League updated', color: 'success', icon: 'i-lucide-check' })
    await Promise.all([refreshLeague(), refreshLeagues()])
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  }
  finally {
    saving.value = false
  }
}

async function regenerateInvite() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/invite`, { method: 'POST' })
  toast.add({ title: 'Invite code regenerated', color: 'success', icon: 'i-lucide-check' })
  await refreshLeague()
}

async function copyInviteCode() {
  const code = leagueDetail.value?.inviteCode
  if (!code) return
  await navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function removeMember(userId: string) {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/members/${userId}`, { method: 'DELETE' })
  toast.add({ title: 'Member removed', color: 'success', icon: 'i-lucide-check' })
  await refreshMembers()
}

async function leaveLeague() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/leave`, { method: 'POST' })
  await refreshLeagues()
  navigateTo('/')
}

async function deleteLeague() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}`, { method: 'DELETE' })
  await refreshLeagues()
  navigateTo('/')
}

const scoringSchema = z.object({
  exact: z.number().min(0),
  offBy1: z.number().min(0),
  offBy2: z.number().min(0),
  offBy3Plus: z.number().min(0),
  notInTop10: z.number().min(0),
  lockMinutesBefore: z.number().min(0),
  openDaysBefore: z.number().min(1),
})

type ScoringSchema = z.output<typeof scoringSchema>
const savingScoring = ref(false)
const scoringForm = reactive<Partial<ScoringSchema>>({
  exact: 5, offBy1: 3, offBy2: 2, offBy3Plus: 1, notInTop10: 0,
  lockMinutesBefore: 5, openDaysBefore: 4,
})

watch(scoring, (s) => {
  if (s) Object.assign(scoringForm, s)
}, { immediate: true })

async function saveScoring() {
  if (!leagueId.value) return
  savingScoring.value = true
  try {
    await $fetch(`/api/leagues/${leagueId.value}/scoring`, {
      method: 'POST',
      body: { ...scoringForm },
    })
    toast.add({ title: 'Scoring updated', color: 'success', icon: 'i-lucide-check' })
    await refreshScoring()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  }
  finally {
    savingScoring.value = false
  }
}

const aiRaceId = ref('')
const aiPredicting = ref(false)
async function runAiPrediction() {
  if (!aiRaceId.value || !leagueId.value) return
  aiPredicting.value = true
  try {
    const result = await $fetch<any>('/api/admin/ai-predict', { method: 'POST', body: { raceId: aiRaceId.value, leagueId: leagueId.value } })
    toast.add({ title: 'Pitwall has spoken', description: result.driverNames.slice(0, 5).join(' → ') + ' ...', color: 'success', icon: 'i-lucide-bot' })
  }
  catch (e: any) {
    toast.add({ title: 'AI prediction failed', description: e?.data?.message, color: 'error' })
  }
  finally {
    aiPredicting.value = false
  }
}

const tabs = [
  { label: 'General', value: 'general', slot: 'general', icon: 'i-lucide-settings' },
  { label: 'Members', value: 'members', slot: 'members', icon: 'i-lucide-users' },
  { label: 'Scoring', value: 'scoring', slot: 'scoring', icon: 'i-lucide-calculator' },
  { label: 'Pitwall', value: 'pitwall', slot: 'pitwall', icon: 'i-lucide-bot' },
]
</script>

<template>
  <UContainer class="py-8">
    <NuxtLink :to="`/leagues/${league?.slug}`" class="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      {{ league?.name }}
    </NuxtLink>

    <h1 class="text-2xl font-black uppercase tracking-tight mb-6">League Settings</h1>

    <ClientOnly>
      <UTabs v-model="tab" :items="tabs" variant="link" color="neutral" size="sm">
        <template #general>
          <div class="py-6 max-w-lg flex flex-col gap-8">
            <div v-if="isLeagueAdmin">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">General</h2>
              <UForm :schema="leagueSchema" :state="leagueState" class="flex flex-col gap-4" @submit="saveLeague" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
                <UFormField name="name" label="Name">
                  <UInput v-model="leagueState.name" size="lg" class="w-full" />
                </UFormField>
                <UFormField name="description" label="Description">
                  <UTextarea v-model="leagueState.description" :rows="3" class="w-full" />
                </UFormField>
                <UButton type="submit" label="Save" :loading="saving" size="lg" class="self-start" />
              </UForm>
            </div>

            <div v-if="isLeagueAdmin && leagueDetail">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Invite Code</h2>
              <div class="flex items-center gap-3">
                <div class="flex-1 flex items-center px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-sm tracking-wider">
                  {{ leagueDetail.inviteCode }}
                </div>
                <UButton :label="copied ? 'Copied!' : 'Copy'" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" variant="outline" @click="copyInviteCode" />
                <UButton label="Regenerate" icon="i-lucide-refresh-cw" variant="ghost" color="neutral" @click="regenerateInvite" />
              </div>
            </div>

            <div class="border-t border-zinc-800 pt-8">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-red-400 mb-4">Danger Zone</h2>
              <div class="flex items-center gap-3">
                <UButton v-if="!isLeagueAdmin" label="Leave League" icon="i-lucide-log-out" variant="outline" color="error" @click="leaveLeague" />
                <UButton v-if="isLeagueAdmin" label="Delete League" icon="i-lucide-trash-2" variant="outline" color="error" @click="deleteLeague" />
              </div>
            </div>
          </div>
        </template>

        <template #members>
          <div class="py-6 max-w-lg">
            <div class="flex items-center justify-between mb-4 gap-3">
              <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500">
                Members ({{ members?.length ?? 0 }})
              </h2>
              <UInput v-if="(members?.length ?? 0) > 5" v-model="memberSearch" placeholder="Search..." icon="i-lucide-search" size="xs" class="w-40" />
            </div>
            <div class="flex flex-col gap-1">
              <div
                v-for="member in paginatedMembers"
                :key="member.userId"
                class="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50"
              >
                <UserAvatar :image="member.userImage" :name="member.userName" size="sm" />
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm truncate">{{ member.userName }}</p>
                  <p class="text-xs text-zinc-500 truncate">{{ member.userEmail }}</p>
                </div>
                <UBadge v-if="member.role === 'admin'" color="warning" variant="subtle" size="sm">Admin</UBadge>
                <UButton
                  v-if="isLeagueAdmin && member.role !== 'admin'"
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="removeMember(member.userId)"
                />
              </div>
            </div>
            <div v-if="filteredMembers.length > 10" class="flex justify-center mt-4">
              <UPagination v-model:page="memberPage" :total="filteredMembers.length" :items-per-page="10" size="sm" />
            </div>
          </div>
        </template>

        <template #scoring>
          <div class="py-6 max-w-xl">
            <UForm :schema="scoringSchema" :state="scoringForm" class="flex flex-col gap-6" @submit="saveScoring" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
              <div>
                <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Points per position</h2>
                <p class="text-xs text-zinc-600 mb-4">How many points a player earns based on how close their predicted position is to the actual result.</p>
                <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  <div
                    v-for="rule in [
                      { key: 'exact', name: 'exact', label: 'Exact match', badge: 'd=0', desc: 'Predicted the exact finishing position' },
                      { key: 'offBy1', name: 'offBy1', label: 'Off by 1', badge: 'd=1', desc: 'One position away from actual result' },
                      { key: 'offBy2', name: 'offBy2', label: 'Off by 2', badge: 'd=2', desc: 'Two positions away from actual result' },
                      { key: 'offBy3Plus', name: 'offBy3Plus', label: 'Off by 3+', badge: 'd\u22653', desc: 'Three or more positions away' },
                      { key: 'notInTop10', name: 'notInTop10', label: 'Not in Top 10', badge: '\u2014', desc: 'Driver predicted but finished outside Top 10' },
                    ]"
                    :key="rule.key"
                    class="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 last:border-0"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded tabular-nums w-8 text-center shrink-0">{{ rule.badge }}</span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium">{{ rule.label }}</p>
                        <p class="text-xs text-zinc-600">{{ rule.desc }}</p>
                      </div>
                    </div>
                    <UFormField :name="rule.name" class="w-20 shrink-0">
                      <UInput
                        v-model.number="(scoringForm as any)[rule.key]"
                        type="number"
                        :min="0"
                        size="sm"
                        class="w-full text-center"
                      />
                    </UFormField>
                  </div>
                </div>
              </div>

              <div>
                <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Prediction window</h2>
                <p class="text-xs text-zinc-600 mb-4">When players can submit or edit their predictions relative to race start.</p>
                <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                    <div class="flex items-center gap-3">
                      <UIcon name="i-lucide-calendar-plus" class="size-4 text-zinc-400 shrink-0" />
                      <div>
                        <p class="text-sm font-medium">Opens before race</p>
                        <p class="text-xs text-zinc-600">How many days before the race predictions become available</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <UFormField name="openDaysBefore" class="w-16">
                        <UInput v-model.number="scoringForm.openDaysBefore" type="number" :min="1" size="sm" class="w-full text-center" />
                      </UFormField>
                      <span class="text-xs text-zinc-500">days</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                      <UIcon name="i-lucide-lock" class="size-4 text-zinc-400 shrink-0" />
                      <div>
                        <p class="text-sm font-medium">Locks before start</p>
                        <p class="text-xs text-zinc-600">How many minutes before race start predictions are locked</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <UFormField name="lockMinutesBefore" class="w-16">
                        <UInput v-model.number="scoringForm.lockMinutesBefore" type="number" :min="0" size="sm" class="w-full text-center" />
                      </UFormField>
                      <span class="text-xs text-zinc-500">min</span>
                    </div>
                  </div>
                </div>
              </div>

              <UButton type="submit" label="Save scoring" icon="i-lucide-check" :loading="savingScoring" :disabled="!isLeagueAdmin" class="self-start" />
            </UForm>
          </div>
        </template>

        <template #pitwall>
          <div class="py-6 max-w-lg">
            <UAlert
              v-if="leagueDetail && !(leagueDetail as any).pitwallEnabled"
              color="warning"
              variant="subtle"
              icon="i-lucide-lock"
              title="Pitwall is disabled for this league"
              description="A super admin must enable Pitwall for this league. Contact your app administrator."
              class="mb-4"
            />

            <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4" :class="leagueDetail && !(leagueDetail as any).pitwallEnabled ? 'opacity-50 pointer-events-none' : ''">
              <div class="flex items-center gap-3 mb-4">
                <UIcon name="i-lucide-bot" class="size-5 text-violet-400 shrink-0" />
                <div>
                  <p class="font-bold text-sm">Pitwall — AI Competitor</p>
                  <p class="text-xs text-zinc-500">Pitwall analyzes the starting grid, standings, and recent form to predict the Top 10. It plays as a regular competitor in this league.</p>
                </div>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <USelectMenu
                  v-model="aiRaceId"
                  :items="(races ?? []).map((r: any) => ({ label: r.name, value: r.id }))"
                  value-key="value"
                  placeholder="Select race..."
                  size="sm"
                  class="w-52"
                />
                <UButton label="Let Pitwall predict" icon="i-lucide-bot" :loading="aiPredicting" :disabled="!aiRaceId" size="sm" @click="runAiPrediction" />
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </ClientOnly>
  </UContainer>
</template>
