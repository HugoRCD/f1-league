<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ auth: 'guest' })
useSeoMeta({ title: 'Reset password — F1 League' })

const { client } = useUserSession()
const toast = useToast()
const route = useRoute()

const token = route.query.token as string | undefined
const hasError = route.query.error === 'INVALID_TOKEN' || !token

const loading = ref(false)
const success = ref(false)

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const state = reactive({ password: '', confirmPassword: '' })

async function resetPassword() {
  loading.value = true
  try {
    const { error } = await client!.resetPassword({
      newPassword: state.password,
      token: token!,
    })
    if (error) throw error
    success.value = true
    toast.add({ title: 'Password reset', description: 'You can now sign in with your new password', color: 'success', icon: 'i-lucide-check' })
  } catch {
    toast.add({ title: 'Error', description: 'Could not reset password. The link may be expired.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100dvh-60px)] px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-3 mb-6">
          <F1Logo class="h-8 w-auto text-f1-600" />
          <div class="h-5 w-px bg-zinc-700" />
          <span class="font-black text-sm uppercase tracking-[0.2em] text-zinc-300">League</span>
        </div>
        <h1 class="text-2xl font-black uppercase tracking-tight">
          Reset password
        </h1>
        <p class="text-zinc-500 text-sm mt-1">
          Choose a new password for your account
        </p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div v-if="hasError" class="py-8 text-center">
          <UIcon name="i-lucide-alert-triangle" class="size-6 mx-auto mb-3 text-amber-400" />
          <p class="text-sm text-zinc-400 mb-4">
            This reset link is invalid or expired.
          </p>
          <NuxtLink to="/login" class="text-sm text-f1-600 font-semibold hover:underline">
            Back to sign in
          </NuxtLink>
        </div>

        <div v-else-if="success" class="py-8 text-center">
          <UIcon name="i-lucide-check-circle" class="size-6 mx-auto mb-3 text-emerald-400" />
          <p class="text-sm text-zinc-400 mb-4">
            Your password has been reset.
          </p>
          <NuxtLink to="/login" class="text-sm text-f1-600 font-semibold hover:underline">
            Sign in
          </NuxtLink>
        </div>

        <UForm
          v-else
          :schema
          :state
          class="flex flex-col gap-4"
          @submit="resetPassword"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
          <UFormField label="New password" name="password" required>
            <UInput
              v-model="state.password"
              type="password"
              placeholder="At least 8 characters"
              size="lg"
              class="w-full"
              autofocus
            />
          </UFormField>
          <UFormField label="Confirm password" name="confirmPassword" required>
            <UInput
              v-model="state.confirmPassword"
              type="password"
              placeholder="Confirm your password"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            label="Reset password"
            icon="i-lucide-key"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-f1-600 hover:bg-f1-700 border-0"
          />
        </UForm>
      </div>
    </div>
  </div>
</template>
