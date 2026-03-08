<script setup lang="ts">
const { league, leagueId, isLeagueAdmin } = useCurrentLeague()

const title = computed(() => league.value ? `Settings — ${league.value.name}` : 'League Settings')
useSeoMeta({ title })

const { data: leagueDetail, refresh: refreshLeague } = useFetch(() => `/api/leagues/${leagueId.value}`, { watch: [leagueId] })
const { data: members, refresh: refreshMembers } = useFetch(() => `/api/leagues/${leagueId.value}/members`, { watch: [leagueId] })

const editName = ref('')
const editDescription = ref('')
const saving = ref(false)
const copied = ref(false)

watch(leagueDetail, (l) => {
  if (l) {
    editName.value = (l as any).name
    editDescription.value = (l as any).description || ''
  }
}, { immediate: true })

async function saveLeague() {
  if (!leagueId.value) return
  saving.value = true
  try {
    await $fetch(`/api/leagues/${leagueId.value}`, {
      method: 'PATCH',
      body: { name: editName.value, description: editDescription.value },
    })
    await refreshLeague()
    await refreshNuxtData('leagues')
  }
  finally {
    saving.value = false
  }
}

async function regenerateInvite() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/invite`, { method: 'POST' })
  await refreshLeague()
}

async function copyInviteCode() {
  const code = (leagueDetail.value as any)?.inviteCode
  if (!code) return
  await navigator.clipboard.writeText(code)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function removeMember(userId: string) {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/members/${userId}`, { method: 'DELETE' })
  await refreshMembers()
}

async function leaveLeague() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}/leave`, { method: 'POST' })
  await refreshNuxtData('leagues')
  navigateTo('/')
}

async function deleteLeague() {
  if (!leagueId.value) return
  await $fetch(`/api/leagues/${leagueId.value}`, { method: 'DELETE' })
  await refreshNuxtData('leagues')
  navigateTo('/')
}
</script>

<template>
  <UContainer class="py-8 max-w-2xl">
    <NuxtLink :to="`/leagues/${league?.slug}`" class="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      {{ league?.name }}
    </NuxtLink>

    <h1 class="text-2xl font-black uppercase tracking-tight mb-8">League Settings</h1>

    <template v-if="leagueDetail">
      <div v-if="isLeagueAdmin" class="mb-10">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">General</h2>
        <form class="flex flex-col gap-4" @submit.prevent="saveLeague">
          <UFormField label="Name">
            <UInput v-model="editName" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="editDescription" :rows="3" class="w-full" />
          </UFormField>
          <UButton type="submit" label="Save" :loading="saving" size="lg" class="self-start" />
        </form>
      </div>

      <div v-if="isLeagueAdmin" class="mb-10">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">Invite Code</h2>
        <div class="flex items-center gap-3">
          <div class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-sm tracking-wider">
            {{ (leagueDetail as any).inviteCode }}
          </div>
          <UButton :label="copied ? 'Copied!' : 'Copy'" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" variant="outline" @click="copyInviteCode" />
          <UButton label="Regenerate" icon="i-lucide-refresh-cw" variant="ghost" color="neutral" @click="regenerateInvite" />
        </div>
      </div>

      <div class="mb-10">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
          Members ({{ (members as any[])?.length ?? 0 }})
        </h2>
        <div class="flex flex-col gap-1">
          <div
            v-for="member in (members as any[])"
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
      </div>

      <div class="border-t border-zinc-800 pt-8">
        <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-red-400 mb-4">Danger Zone</h2>
        <div class="flex items-center gap-3">
          <UButton v-if="!isLeagueAdmin" label="Leave League" icon="i-lucide-log-out" variant="outline" color="error" @click="leaveLeague" />
          <UButton v-if="isLeagueAdmin" label="Delete League" icon="i-lucide-trash-2" variant="outline" color="error" @click="deleteLeague" />
        </div>
      </div>
    </template>
  </UContainer>
</template>
