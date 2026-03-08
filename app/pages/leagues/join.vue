<script setup lang="ts">
useSeoMeta({ title: 'Join a League — F1 League' })

const route = useRoute()
const code = ref((route.query.code as string) || '')
const loading = ref(false)
const error = ref('')

async function joinLeague() {
  if (!code.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch('/api/leagues/join', {
      method: 'POST',
      body: { inviteCode: code.value.trim() },
    })
    await refreshNuxtData('leagues')
    navigateTo(`/leagues/${result.league.slug}`)
  }
  catch (e: any) {
    error.value = e.data?.message || 'Failed to join league'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-lg">
    <NuxtLink to="/" class="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Back
    </NuxtLink>

    <h1 class="text-2xl font-black uppercase tracking-tight mb-2">
      Join a League
    </h1>
    <p class="text-zinc-400 text-sm mb-6">
      Enter the invite code shared by a league admin.
    </p>

    <form class="flex flex-col gap-5" @submit.prevent="joinLeague">
      <UFormField label="Invite code" required>
        <UInput v-model="code" placeholder="e.g. AbC12345" size="lg" class="w-full" autofocus />
      </UFormField>

      <p v-if="error" class="text-sm text-red-400">
        {{ error }}
      </p>

      <UButton
        type="submit"
        label="Join League"
        size="lg"
        :loading="loading"
        :disabled="!code.trim()"
        class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
        block
      />
    </form>
  </UContainer>
</template>
