<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ auth: 'user' })
useSeoMeta({ title: 'Settings — F1 League' })

const { user, client, fetchSession } = useUserSession()
const toast = useToast()

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, '50 characters max'),
  image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type ProfileSchema = z.output<typeof profileSchema>
const profileState = reactive<Partial<ProfileSchema>>({
  name: user.value?.name || '',
  image: user.value?.image || '',
})
const savingProfile = ref(false)

async function saveProfile() {
  savingProfile.value = true
  try {
    await $fetch('/api/user/profile', {
      method: 'POST',
      body: { name: profileState.name, image: profileState.image || null },
    })
    clearNuxtData('leaderboard')
    await fetchSession({ force: true })
    profileState.name = user.value?.name || profileState.name
    profileState.image = user.value?.image || profileState.image
    toast.add({ title: 'Profile updated', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    savingProfile.value = false
  }
}

const { data: passwordInfo, refresh: refreshPasswordInfo } = useFetch('/api/user/has-password')
const savingPassword = ref(false)

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
const setPasswordState = reactive({ newPassword: '', confirmPassword: '' })

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
const changePasswordState = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

async function setPassword() {
  savingPassword.value = true
  try {
    await $fetch('/api/user/set-password', {
      method: 'POST',
      body: { password: setPasswordState.newPassword },
    })
    setPasswordState.newPassword = ''
    setPasswordState.confirmPassword = ''
    await refreshPasswordInfo()
    toast.add({ title: 'Password set', description: 'You can now sign in with your password', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message || 'Could not set password', color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

async function changePassword() {
  savingPassword.value = true
  try {
    const { error } = await client!.changePassword({
      currentPassword: changePasswordState.currentPassword,
      newPassword: changePasswordState.newPassword,
    })
    if (error) throw error
    changePasswordState.currentPassword = ''
    changePasswordState.newPassword = ''
    changePasswordState.confirmPassword = ''
    toast.add({ title: 'Password updated', color: 'success', icon: 'i-lucide-check' })
  } catch {
    toast.add({ title: 'Error', description: 'Current password is incorrect', color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

const { data: notifPref } = useFetch('/api/user/notifications')

async function setNotifications(enabled: boolean) {
  try {
    await $fetch('/api/user/notifications', { method: 'POST', body: { enabled } })
    if (notifPref.value) notifPref.value.notificationsEnabled = enabled
    toast.add({ title: enabled ? 'Notifications enabled' : 'Notifications disabled', color: 'success', icon: 'i-lucide-check' })
  } catch { /* silently fail */ }
}
</script>

<template>
  <UContainer class="py-8 max-w-xl">
    <div class="mb-8">
      <p class="text-sm text-zinc-500 uppercase tracking-[0.15em] font-semibold">
        Account
      </p>
      <h1 class="text-2xl font-black uppercase tracking-tight mt-1">
        Settings
      </h1>
    </div>

    <div class="mb-8">
      <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        Profile
      </h2>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div class="flex items-center gap-4 mb-5">
          <img
            v-if="profileState.image"
            :src="profileState.image"
            alt="Avatar"
            class="size-16 rounded-full object-cover ring-2 ring-zinc-700"
          >
          <div v-else class="size-16 rounded-full bg-zinc-800 ring-2 ring-zinc-700 flex items-center justify-center">
            <UIcon name="i-lucide-user" class="size-7 text-zinc-500" />
          </div>
          <div>
            <p class="font-bold">
              {{ user?.name }}
            </p>
            <p class="text-sm text-zinc-500">
              {{ user?.email }}
            </p>
          </div>
        </div>
        <UForm :schema="profileSchema" :state="profileState" class="flex flex-col gap-3" @submit="saveProfile" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
          <UFormField name="name" label="Name">
            <UInput v-model="profileState.name" placeholder="Your name" class="w-full" />
          </UFormField>
          <UFormField name="image" label="Avatar URL" description="Paste a link to your profile picture (GitHub, Twitter, etc.)">
            <UInput v-model="profileState.image" placeholder="https://..." class="w-full" />
          </UFormField>
          <UButton
            type="submit"
            label="Save profile"
            icon="i-lucide-check"
            :loading="savingProfile"
            size="sm"
            class="self-start mt-1"
          />
        </UForm>
      </div>
    </div>

    <div class="mb-8">
      <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        Security
      </h2>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <template v-if="passwordInfo && !passwordInfo.hasPassword">
          <div class="flex items-center gap-3 mb-4">
            <UIcon name="i-lucide-key" class="size-4 text-zinc-400" />
            <div>
              <p class="text-sm font-semibold">
                Set a password
              </p>
              <p class="text-xs text-zinc-500">
                Add a password so you can sign in without an email code
              </p>
            </div>
          </div>
          <UForm :schema="setPasswordSchema" :state="setPasswordState" class="flex flex-col gap-3" @submit="setPassword" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
            <UFormField name="newPassword" label="Password">
              <UInput v-model="setPasswordState.newPassword" type="password" placeholder="At least 8 characters" class="w-full" />
            </UFormField>
            <UFormField name="confirmPassword" label="Confirm password">
              <UInput v-model="setPasswordState.confirmPassword" type="password" placeholder="Confirm your password" class="w-full" />
            </UFormField>
            <UButton
              type="submit"
              label="Set password"
              icon="i-lucide-key"
              :loading="savingPassword"
              size="sm"
              class="self-start mt-1"
            />
          </UForm>
        </template>

        <template v-else-if="passwordInfo?.hasPassword">
          <div class="flex items-center gap-3 mb-4">
            <UIcon name="i-lucide-key" class="size-4 text-zinc-400" />
            <div>
              <p class="text-sm font-semibold">
                Change password
              </p>
              <p class="text-xs text-zinc-500">
                Update your current password
              </p>
            </div>
          </div>
          <UForm :schema="changePasswordSchema" :state="changePasswordState" class="flex flex-col gap-3" @submit="changePassword" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
            <UFormField name="currentPassword" label="Current password">
              <UInput v-model="changePasswordState.currentPassword" type="password" placeholder="Your current password" class="w-full" />
            </UFormField>
            <UFormField name="newPassword" label="New password">
              <UInput v-model="changePasswordState.newPassword" type="password" placeholder="At least 8 characters" class="w-full" />
            </UFormField>
            <UFormField name="confirmPassword" label="Confirm new password">
              <UInput v-model="changePasswordState.confirmPassword" type="password" placeholder="Confirm your new password" class="w-full" />
            </UFormField>
            <UButton
              type="submit"
              label="Update password"
              icon="i-lucide-check"
              :loading="savingPassword"
              size="sm"
              class="self-start mt-1"
            />
          </UForm>
        </template>
      </div>
    </div>

    <div>
      <h2 class="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        Notifications
      </h2>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-mail" class="size-4 text-zinc-400" />
            <div>
              <p class="text-sm font-semibold">
                Race reminders
              </p>
              <p class="text-xs text-zinc-500">
                Get an email when predictions open for a race you haven't predicted yet
              </p>
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
              <p class="text-sm font-semibold">
                Results notifications
              </p>
              <p class="text-xs text-zinc-500">
                Get notified when race results are published and standings are updated
              </p>
            </div>
          </div>
          <UBadge color="neutral" variant="outline" size="xs" class="shrink-0 whitespace-nowrap">
            Coming soon
          </UBadge>
        </div>
      </div>
    </div>
  </UContainer>
</template>
