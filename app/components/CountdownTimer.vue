<script setup lang="ts">
const props = defineProps<{
  targetDate: string
  size?: 'sm' | 'lg'
}>()

const mounted = ref(false)
onMounted(() => { mounted.value = true })

const now = useNow({ interval: 1000 })

const remaining = computed(() => {
  const diff = new Date(props.targetDate).getTime() - now.value.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  }
})

const isUrgent = computed(() => !remaining.value.expired && remaining.value.days === 0 && remaining.value.hours < 2)
</script>

<template>
  <div v-if="!mounted" class="flex items-center" :class="size === 'lg' ? 'gap-3' : 'gap-2'">
    <div class="text-center">
      <div class="font-black tabular-nums" :class="size === 'lg' ? 'text-3xl' : 'text-lg'">--</div>
      <div class="text-[10px] uppercase tracking-wider text-muted">days</div>
    </div>
    <span class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="size === 'lg' ? 'text-3xl' : 'text-lg'">--</div>
      <div class="text-[10px] uppercase tracking-wider text-muted">hrs</div>
    </div>
    <span class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="size === 'lg' ? 'text-3xl' : 'text-lg'">--</div>
      <div class="text-[10px] uppercase tracking-wider text-muted">min</div>
    </div>
    <span class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="size === 'lg' ? 'text-3xl' : 'text-lg'">--</div>
      <div class="text-[10px] uppercase tracking-wider text-muted">sec</div>
    </div>
  </div>
  <div v-else-if="remaining.expired" class="text-primary font-bold" :class="size === 'lg' ? 'text-2xl' : 'text-sm'">
    LOCKED
  </div>
  <div v-else class="flex items-center" :class="size === 'lg' ? 'gap-3' : 'gap-2'">
    <div v-if="remaining.days > 0" class="text-center">
      <div class="font-black tabular-nums" :class="[size === 'lg' ? 'text-3xl' : 'text-lg', isUrgent ? 'text-primary' : '']">
        {{ String(remaining.days).padStart(2, '0') }}
      </div>
      <div class="text-[10px] uppercase tracking-wider text-muted">days</div>
    </div>
    <span v-if="remaining.days > 0" class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="[size === 'lg' ? 'text-3xl' : 'text-lg', isUrgent ? 'text-primary' : '']">
        {{ String(remaining.hours).padStart(2, '0') }}
      </div>
      <div class="text-[10px] uppercase tracking-wider text-muted">hrs</div>
    </div>
    <span class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="[size === 'lg' ? 'text-3xl' : 'text-lg', isUrgent ? 'text-primary' : '']">
        {{ String(remaining.minutes).padStart(2, '0') }}
      </div>
      <div class="text-[10px] uppercase tracking-wider text-muted">min</div>
    </div>
    <span class="text-muted font-light" :class="size === 'lg' ? 'text-2xl' : 'text-lg'">:</span>
    <div class="text-center">
      <div class="font-black tabular-nums" :class="[size === 'lg' ? 'text-3xl' : 'text-lg', isUrgent ? 'text-primary' : '']">
        {{ String(remaining.seconds).padStart(2, '0') }}
      </div>
      <div class="text-[10px] uppercase tracking-wider text-muted">sec</div>
    </div>
  </div>
</template>
