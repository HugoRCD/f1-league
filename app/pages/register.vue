<script setup lang="ts">
definePageMeta({ auth: 'guest' })
useSeoMeta({ title: 'Join the League — F1 League' })

const { client, fetchSession, updateUser } = useUserSession()
const toast = useToast()

const step = ref<'info' | 'otp'>('info')
const name = ref('')
const email = ref('')
const otp = ref('')
const loading = ref(false)

async function sendCode() {
  if (!name.value || !email.value) return
  loading.value = true
  try {
    await client.emailOtp.sendVerificationOtp({
      email: email.value,
      type: 'sign-in',
    })
    step.value = 'otp'
    toast.add({ title: 'Code sent', description: 'Check your email for the verification code', color: 'success', icon: 'i-lucide-mail' })
  }
  catch {
    toast.add({ title: 'Error', description: 'Could not send code', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

async function verifyAndRegister() {
  if (!otp.value) return
  loading.value = true
  try {
    await client.signIn.emailOtp({
      email: email.value,
      otp: otp.value,
    })
    await fetchSession({ force: true })
    if (name.value) {
      try {
        await updateUser({ name: name.value })
      }
      catch (e) {
        log.error({ action: 'set_name_failed', error: String(e) })
      }
    }
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
        <h1 class="text-2xl font-black uppercase tracking-tight">Join the League</h1>
        <p class="text-zinc-500 text-sm mt-1">Create your account and start predicting</p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <form v-if="step === 'info'" class="flex flex-col gap-4" @submit.prevent="sendCode">
          <UFormField label="Name" name="name" required>
            <UInput v-model="name" placeholder="Your name" size="lg" class="w-full" autofocus />
          </UFormField>
          <UFormField label="Email" name="email" required>
            <UInput v-model="email" type="email" placeholder="you@example.com" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" label="Send verification code" icon="i-lucide-mail" block :loading="loading" size="lg" class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
        </form>

        <form v-else class="flex flex-col gap-4" @submit.prevent="verifyAndRegister">
          <p class="text-sm text-zinc-400">
            Code sent to <span class="text-white font-medium">{{ email }}</span>
          </p>
          <UFormField label="Verification code" name="otp" required>
            <UInput
              v-model="otp"
              placeholder="000000"
              size="lg"
              class="w-full text-center font-mono text-lg tracking-[0.3em]"
              maxlength="6"
              autofocus
            />
          </UFormField>
          <UButton type="submit" label="Create account" icon="i-lucide-user-plus" block :loading="loading" size="lg" class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
          <button type="button" class="text-xs text-zinc-500 hover:text-white transition-colors" @click="step = 'info'">
            Change email
          </button>
        </form>
      </div>

      <p class="text-center text-sm text-zinc-500 mt-6">
        Already have an account?
        <NuxtLink to="/login" class="text-[#E10600] font-semibold hover:underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>
