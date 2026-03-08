<script setup lang="ts">
useSeoMeta({ title: 'Create a League — F1 League' })

const name = ref('')
const description = ref('')
const loading = ref(false)
const error = ref('')

async function createLeague() {
  if (!name.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const league = await $fetch<{ slug: string }>('/api/leagues', {
      method: 'POST',
      body: { name: name.value, description: description.value || undefined },
    })
    await refreshNuxtData('leagues')
    navigateTo(`/leagues/${league.slug}`)
  }
  catch (e: any) {
    error.value = e.data?.message || 'Failed to create league'
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

    <h1 class="text-2xl font-black uppercase tracking-tight mb-6">
      Create a League
    </h1>

    <form class="flex flex-col gap-5" @submit.prevent="createLeague">
      <UFormField label="League name" required>
        <UInput v-model="name" placeholder="e.g. The Pit Lane Gang" size="lg" class="w-full" autofocus />
      </UFormField>

      <UFormField label="Description" hint="Optional">
        <UTextarea v-model="description" placeholder="What's this league about?" :rows="3" class="w-full" />
      </UFormField>

      <p v-if="error" class="text-sm text-red-400">
        {{ error }}
      </p>

      <UButton
        type="submit"
        label="Create League"
        size="lg"
        :loading="loading"
        :disabled="!name.trim()"
        class="font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
        block
      />
    </form>
  </UContainer>
</template>
