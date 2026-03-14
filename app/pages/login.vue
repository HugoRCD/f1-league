<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ auth: 'guest' })
useSeoMeta({ title: 'Sign in — F1 League' })

const { client } = useUserSession()
const toast = useToast()
const route = useRoute()

const queryEmail = route.query.email as string | undefined
const queryCode = route.query.code as string | undefined
const redirectTo = (route.query.redirect as string) || '/'
const isMagicLink = !!(queryEmail && queryCode)

type Mode = 'otp' | 'otp-sent' | 'password' | 'verifying' | 'forgot-sent'
const mode = ref<Mode>(isMagicLink ? 'verifying' : 'otp')
const loading = ref(isMagicLink)

const emailState = reactive({ email: queryEmail || '' })
const otpState = reactive({ otp: queryCode || '' })
const passwordState = reactive({ password: '' })

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
const otpFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  otp: z.string().length(6, 'Code must be 6 digits'),
})
const passwordFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

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
    mode.value = 'otp-sent'
    toast.add({ title: 'Code sent', description: 'Check your email for the login code', color: 'success', icon: 'i-lucide-mail' })
  } catch {
    toast.add({ title: 'Error', description: 'Could not send code. Make sure your email is registered.', color: 'error' })
  } finally {
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
    navigateTo(redirectTo)
  } catch {
    toast.add({ title: 'Invalid code', description: 'The code is incorrect or expired', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function signInWithPassword() {
  loading.value = true
  try {
    const { error } = await client!.signIn.email({
      email: emailState.email,
      password: passwordState.password,
    })
    if (error) throw error
    navigateTo(redirectTo)
  } catch {
    toast.add({ title: 'Error', description: 'Invalid email or password', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function requestPasswordReset() {
  if (!emailState.email) {
    toast.add({ title: 'Error', description: 'Enter your email address first', color: 'error' })
    return
  }
  loading.value = true
  try {
    await client!.requestPasswordReset({
      email: emailState.email,
      redirectTo: '/reset-password',
    })
    mode.value = 'forgot-sent'
    toast.add({ title: 'Email sent', description: 'Check your email for the reset link', color: 'success', icon: 'i-lucide-mail' })
  } catch {
    toast.add({ title: 'Error', description: 'Could not send reset email', color: 'error' })
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
          Sign in
        </h1>
        <p class="text-zinc-500 text-sm mt-1">
          We'll send you a login code by email
        </p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div v-if="mode === 'verifying'" class="py-8 text-center">
          <UIcon name="i-lucide-loader" class="size-6 animate-spin mx-auto mb-3 text-zinc-400" />
          <p class="text-sm text-zinc-400">
            Signing you in...
          </p>
        </div>

        <div v-else-if="mode === 'forgot-sent'" class="py-8 text-center">
          <UIcon name="i-lucide-mail-check" class="size-6 mx-auto mb-3 text-emerald-400" />
          <p class="text-sm text-zinc-400">
            If an account exists for <span class="text-white font-medium">{{ emailState.email }}</span>, you'll receive a reset link.
          </p>
          <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors mt-4" @click="mode = 'otp'">
            Back to sign in
          </button>
        </div>

        <UForm
          v-else-if="mode === 'otp'"
          :schema="emailSchema"
          :state="emailState"
          class="flex flex-col gap-4"
          @submit="sendCode"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="emailState.email"
              type="email"
              placeholder="you@example.com"
              size="lg"
              class="w-full"
              autofocus
            />
          </UFormField>
          <UButton
            type="submit"
            label="Send login code"
            icon="i-lucide-mail"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-f1-600 hover:bg-f1-700 border-0"
          />
          <button
            type="button"
            class="text-xs text-zinc-500 hover:text-white transition-colors text-center"
            @click="mode = 'password'"
          >
            Sign in with password
          </button>
        </UForm>

        <UForm
          v-else-if="mode === 'otp-sent'"
          :schema="otpFormSchema"
          :state="{ ...emailState, ...otpState }"
          class="flex flex-col gap-4"
          @submit="verifyCode"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
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
          <UButton
            type="submit"
            label="Sign in"
            icon="i-lucide-log-in"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-f1-600 hover:bg-f1-700 border-0"
          />
          <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors text-center" @click="mode = 'otp'">
            Use a different email
          </button>
        </UForm>

        <UForm
          v-else-if="mode === 'password'"
          :schema="passwordFormSchema"
          :state="{ ...emailState, ...passwordState }"
          class="flex flex-col gap-4"
          @submit="signInWithPassword"
          @keydown.meta.enter.prevent="($event.target as HTMLElement).closest('form')?.requestSubmit()"
        >
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="emailState.email"
              type="email"
              placeholder="you@example.com"
              size="lg"
              class="w-full"
              autofocus
            />
          </UFormField>
          <UFormField label="Password" name="password" required>
            <UInput
              v-model="passwordState.password"
              type="password"
              placeholder="Your password"
              size="lg"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            label="Sign in"
            icon="i-lucide-log-in"
            block
            :loading
            size="lg"
            class="mt-2 font-bold bg-f1-600 hover:bg-f1-700 border-0"
          />
          <div class="flex items-center justify-between">
            <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors" @click="mode = 'otp'">
              Use email code instead
            </button>
            <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors" @click="requestPasswordReset">
              Forgot password?
            </button>
          </div>
        </UForm>
      </div>

      <p class="text-center text-sm text-zinc-500 mt-6">
        Don't have an account?
        <NuxtLink :to="redirectTo !== '/' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'" class="text-f1-600 font-semibold hover:underline">
          Register
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
