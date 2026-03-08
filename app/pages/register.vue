<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ auth: 'guest' })
useSeoMeta({ title: 'Join the League — F1 League' })

const { client, fetchSession, user } = useUserSession()
const toast = useToast()

const step = ref<'info' | 'otp'>('info')
const loading = ref(false)

const infoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, '50 characters max'),
  email: z.string().email('Enter a valid email address'),
})

type InfoSchema = z.output<typeof infoSchema>
const infoState = reactive<Partial<InfoSchema>>({ name: '', email: '' })

const otpSchema = z.object({
  otp: z.string().length(6, 'Code must be 6 digits'),
})
const otpState = reactive({ otp: '' })

async function sendCode() {
  loading.value = true
  try {
    await client!.emailOtp.sendVerificationOtp({
      email: infoState.email!,
      type: 'sign-in',
    })
    step.value = 'otp'
    toast.add({ title: 'Code sent', description: 'Check your email for the verification code', color: 'success', icon: 'i-lucide-mail' })
  } catch {
    toast.add({ title: 'Error', description: 'Could not send code', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function verifyAndRegister() {
  loading.value = true
  try {
    await client!.signIn.emailOtp({
      email: infoState.email!,
      otp: otpState.otp,
    })
    await fetchSession({ force: true })
    if (infoState.name) {
      await $fetch('/api/user/profile', { method: 'POST', body: { name: infoState.name } }).catch(() => {})
      if (user.value) user.value = { ...user.value, name: infoState.name }
    }
    navigateTo('/')
  } catch {
    toast.add({ title: 'Invalid code', description: 'The code is incorrect or expired', color: 'error' })
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
          <F1Logo class="h-8 w-auto text-[#E10600]" />
          <div class="h-5 w-px bg-zinc-700" />
          <span class="font-black text-sm uppercase tracking-[0.2em] text-zinc-300">League</span>
        </div>
        <h1 class="text-2xl font-black uppercase tracking-tight">
          Join the League
        </h1>
        <p class="text-zinc-500 text-sm mt-1">
          Create your account and start predicting
        </p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <UForm
          v-if="step === 'info'"
          :schema="infoSchema"
          :state="infoState"
          class="flex flex-col gap-4"
          @submit="sendCode"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
          <UFormField label="Name" name="name" required>
            <UInput v-model="infoState.name" placeholder="Your name" size="lg" class="w-full" autofocus />
          </UFormField>
          <UFormField label="Email" name="email" required>
            <UInput v-model="infoState.email" type="email" placeholder="you@example.com" size="lg" class="w-full" />
          </UFormField>
          <UButton
            type="submit"
            label="Send verification code"
            icon="i-lucide-mail"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
          />
        </UForm>

        <UForm
          v-else
          :schema="otpSchema"
          :state="otpState"
          class="flex flex-col gap-4"
          @submit="verifyAndRegister"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
          <p class="text-sm text-zinc-400">
            Code sent to <span class="text-white font-medium">{{ infoState.email }}</span>
          </p>
          <UFormField label="Verification code" name="otp" required>
            <UInput
              v-model="otpState.otp"
              placeholder="000000"
              size="lg"
              class="w-full text-center font-mono text-lg tracking-[0.3em]"
              maxlength="6"
              autofocus
            />
          </UFormField>
          <UButton
            type="submit"
            label="Create account"
            icon="i-lucide-user-plus"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0"
          />
          <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors" @click="step = 'info'">
            Change email
          </button>
        </UForm>
      </div>

      <p class="text-center text-sm text-zinc-500 mt-6">
        Already have an account?
        <NuxtLink to="/login" class="text-[#E10600] font-semibold hover:underline">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
