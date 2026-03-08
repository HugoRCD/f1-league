<script setup lang="ts">
import { z } from 'zod'

useSeoMeta({ title: 'Create a League — F1 League' })

const toast = useToast()
const { refresh: refreshLeagues } = useLeagues()
const loading = ref(false)
const error = ref('')

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(50, '50 characters max'),
  description: z.string().optional(),
})

type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ name: '', description: '' })

async function onSubmit() {
  loading.value = true
  error.value = ''

  try {
    const league = await $fetch<{ slug: string }>('/api/leagues', {
      method: 'POST',
      body: { name: state.name, description: state.description || undefined },
    })
    await refreshLeagues()
    toast.add({ title: 'League created!', color: 'success', icon: 'i-lucide-check' })
    navigateTo(`/leagues/${league.slug}`)
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

    <h1 class="text-2xl font-black uppercase tracking-tight mb-6">
      Create a League
    </h1>

    <UForm :schema :state class="flex flex-col gap-5" @submit="onSubmit" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
      <UFormField name="name" label="League name" required>
        <UInput v-model="state.name" placeholder="e.g. The Pit Lane Gang" size="lg" class="w-full" autofocus />
      </UFormField>

      <UFormField name="description" label="Description" hint="Optional">
        <UTextarea v-model="state.description" placeholder="What's this league about?" :rows="3" class="w-full" />
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
        label="Create League"
        size="lg"
        :loading
        class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
        block
      />
    </UForm>
  </UContainer>
</template>
