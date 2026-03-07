<script setup lang="ts">
definePageMeta({ auth: 'user' })
useSeoMeta({ title: 'Settings — F1 League' })

const { user, fetchSession } = useUserSession()
const toast = useToast()

const profileForm = reactive({
  name: user.value?.name || '',
  image: user.value?.image || '',
})
const savingProfile = ref(false)

async function saveProfile() {
  savingProfile.value = true
  try {
    const saved = await $fetch('/api/user/profile', {
      method: 'POST',
      body: { name: profileForm.name, image: profileForm.image || null },
    })
    profileForm.name = saved.name || profileForm.name
    clearNuxtData('leaderboard')
    await fetchSession({ force: true })
    toast.add({ title: 'Profile updated', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingProfile.value = false
  }
}

const { data: notifPref } = useFetch('/api/user/notifications')
const savingNotif = ref(false)

async function setNotifications(enabled: boolean) {
  savingNotif.value = true
  try {
    await $fetch('/api/user/notifications', { method: 'POST', body: { enabled } })
    if (notifPref.value) notifPref.value.notificationsEnabled = enabled
    toast.add({ title: enabled ? 'Notifications enabled' : 'Notifications disabled', color: 'success', icon: 'i-lucide-check' })
  }
  catch {}
  finally {
    savingNotif.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-xl">
    <div class="mb-8">
      <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">Account</p>
      <h1 class="text-2xl font-black uppercase tracking-tight mt-1">Settings</h1>
    </div>

    <div class="mb-8">
      <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Profile</h2>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div class="flex items-center gap-4 mb-5">
          <img
            v-if="profileForm.image"
            :src="profileForm.image"
            alt="Avatar"
            class="size-16 rounded-full object-cover ring-2 ring-zinc-700"
          >
          <div v-else class="size-16 rounded-full bg-zinc-800 ring-2 ring-zinc-700 flex items-center justify-center">
            <UIcon name="i-lucide-user" class="size-7 text-zinc-500" />
          </div>
          <div>
            <p class="font-bold">{{ user?.name }}</p>
            <p class="text-sm text-zinc-500">{{ user?.email }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <UFormField label="Name">
            <UInput v-model="profileForm.name" placeholder="Your name" class="w-full" />
          </UFormField>
          <UFormField label="Avatar URL" description="Paste a link to your profile picture (GitHub, Twitter, etc.)">
            <UInput v-model="profileForm.image" placeholder="https://..." class="w-full" />
          </UFormField>
          <UButton label="Save profile" icon="i-lucide-check" :loading="savingProfile" size="sm" class="self-start mt-1" @click="saveProfile" />
        </div>
      </div>
    </div>

    <div>
      <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Notifications</h2>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-mail" class="size-4 text-zinc-400" />
            <div>
              <p class="text-sm font-semibold">Race reminders</p>
              <p class="text-xs text-zinc-500">Get an email when predictions open for a race you haven't predicted yet</p>
            </div>
          </div>
          <USwitch
            :model-value="notifPref?.notificationsEnabled ?? true"
            @update:model-value="setNotifications($event)"
          />
        </div>
        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-trophy" class="size-4 text-zinc-400" />
            <div>
              <p class="text-sm font-semibold">Results notifications</p>
              <p class="text-xs text-zinc-500">Get notified when race results are published and standings are updated</p>
            </div>
          </div>
          <UBadge color="neutral" variant="outline" size="xs">Coming soon</UBadge>
        </div>
      </div>
    </div>
  </UContainer>
</template>
