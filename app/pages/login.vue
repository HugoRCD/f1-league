<script setup lang="ts">
definePageMeta({ auth: 'guest' })

const { signIn } = useUserSession()
const toast = useToast()

const state = reactive({ email: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await signIn.email(
      { email: state.email, password: state.password },
      { onSuccess: () => navigateTo('/') },
    )
  }
  catch (e: any) {
    toast.add({ title: 'Login failed', description: e?.message || 'Invalid credentials', color: 'error', icon: 'i-lucide-x-circle' })
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
        <p class="text-zinc-500 text-sm mt-1">Welcome back to the prediction league</p>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <UForm :state="state" class="flex flex-col gap-4" @submit="onSubmit">
          <UFormField label="Email" name="email" required>
            <UInput v-model="state.email" type="email" placeholder="you@example.com" size="lg" class="w-full" />
          </UFormField>
          <UFormField label="Password" name="password" required>
            <UInput v-model="state.password" type="password" placeholder="Your password" size="lg" class="w-full" />
          </UFormField>
          <UButton type="submit" label="Sign in" block :loading="loading" size="lg" class="mt-2 font-bold bg-[#E10600] hover:bg-[#c00500] border-0" />
        </UForm>
      </div>

      <p class="text-center text-sm text-zinc-500 mt-6">
        Don't have an account?
        <NuxtLink to="/register" class="text-[#E10600] font-semibold hover:underline">Register</NuxtLink>
      </p>
    </div>
  </div>
</template>
