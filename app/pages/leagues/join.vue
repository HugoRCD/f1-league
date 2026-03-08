<script setup lang="ts">
import { z } from 'zod'

useSeoMeta({ title: 'Join a League — F1 League' })

const route = useRoute()
const toast = useToast()
const { refresh: refreshLeagues } = useLeagues()
const loading = ref(false)
const error = ref('')

const schema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ inviteCode: (route.query.code as string) || '' })

async function onSubmit() {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch('/api/leagues/join', {
      method: 'POST',
      body: { inviteCode: state.inviteCode?.trim() },
    })
    await refreshLeagues()
    toast.add({ title: `Joined ${result.league.name}!`, color: 'success', icon: 'i-lucide-check' })
    navigateTo(`/leagues/${result.league.slug}`)
  } catch (e: any) {
    const message = e.data?.message || 'Something went wrong. Please try again.'
    error.value = message
    if (e.statusCode === 401 || e.data?.statusCode === 401) {
      toast.add({ title: 'Session expired', description: 'Please sign in again.', color: 'error', icon: 'i-lucide-log-out' })
      navigateTo('/login')
      return
    }
  } finally {
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

    <UForm :schema :state class="flex flex-col gap-5" @submit="onSubmit" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
      <UFormField name="inviteCode" label="Invite code" required>
        <UInput v-model="state.inviteCode" placeholder="e.g. AbC12345" size="lg" class="w-full" autofocus />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="error"
        :close-button="{ onClick: () => error = '' }"
      />

      <UButton
        type="submit"
        label="Join League"
        size="lg"
        :loading
        class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
        block
      />
    </UForm>
  </UContainer>
</template>
