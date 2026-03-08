<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ auth: 'guest' })
useSeoMeta({ title: 'Sign in — F1 League' })

const { client } = useUserSession()
const toast = useToast()

const route = useRoute()

const queryEmail = route.query.email as string | undefined
const queryCode = route.query.code as string | undefined
const isMagicLink = !!(queryEmail && queryCode)

const step = ref<'email' | 'otp' | 'verifying'>(isMagicLink ? 'verifying' : 'email')
const loading = ref(isMagicLink)

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
const emailState = reactive({ email: queryEmail || '' })

const otpSchema = z.object({
  otp: z.string().length(6, 'Code must be 6 digits'),
})
const otpState = reactive({ otp: queryCode || '' })

onMounted(() => {
  if (isMagicLink) verifyCode()
})

async function sendCode() {
  loading.value = true
  try {
    await client!.emailOtp.sendVerificationOtp({
      email: emailState.email,
      type: 'sign-in',
    })
    step.value = 'otp'
    toast.add({ title: 'Code sent', description: 'Check your email for the login code', color: 'success', icon: 'i-lucide-mail' })
  }
  catch {
    toast.add({ title: 'Error', description: 'Could not send code. Make sure your email is registered.', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

async function verifyCode() {
  loading.value = true
  try {
    await client!.signIn.emailOtp({
      email: emailState.email,
      otp: otpState.otp,
    })
    navigateTo('/')
  }
  catch {
    toast.add({ title: 'Invalid code', description: 'The code is incorrect or expired', color: 'error' })
  }
  finally {
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
        <h1 class="text-2xl font-black uppercase tracking-tight">Sign in</h1>
        <p class="text-zinc-500 text-sm mt-1">We'll send you a login code by email</p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div v-if="step === 'verifying'" class="py-8 text-center">
          <UIcon name="i-lucide-loader" class="size-6 animate-spin mx-auto mb-3 text-zinc-400" />
          <p class="text-sm text-zinc-400">Signing you in...</p>
        </div>

        <UForm v-else-if="step === 'email'" :schema="emailSchema" :state="emailState" class="flex flex-col gap-4" @submit="sendCode" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
          <UFormField label="Email" name="email" required>
            <UInput v-model="emailState.email" type="email" placeholder="you@example.com" size="lg" class="w-full" autofocus />
          </UFormField>
          <UButton type="submit" label="Send login code" icon="i-lucide-mail" block :loading="loading" size="lg" class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
        </UForm>

        <UForm v-else :schema="otpSchema" :state="otpState" class="flex flex-col gap-4" @submit="verifyCode" @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()">
          <p class="text-sm text-zinc-400">
            Code sent to <span class="text-white font-medium">{{ emailState.email }}</span>
          </p>
          <UFormField label="Login code" name="otp" required>
            <UInput
              v-model="otpState.otp"
              placeholder="000000"
              size="lg"
              class="w-full text-center font-mono text-lg tracking-[0.3em]"
              maxlength="6"
              autofocus
            />
          </UFormField>
          <UButton type="submit" label="Sign in" icon="i-lucide-log-in" block :loading="loading" size="lg" class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
          <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors" @click="step = 'email'">
            Use a different email
          </button>
        </UForm>
      </div>

      <p class="text-center text-sm text-zinc-500 mt-6">
        Don't have an account?
        <NuxtLink to="/register" class="text-[#E10600] font-semibold hover:underline">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>
